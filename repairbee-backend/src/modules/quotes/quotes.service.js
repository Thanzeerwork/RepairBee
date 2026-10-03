const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const { ORDER_STATUS, ROLES } = require('../../utils/constants');
const logger = require('../../utils/logger');
const notificationsService = require('../notifications/notifications.service');
const outboundMessagesService = require('../notifications/outboundMessages.service');

class QuotesService {
  /**
   * Shop sends a quote for an order.
   */
  async sendQuote(orderId, userId, { price, estimated_time, warranty_days }) {
    // Get shop for this user
    const shopResult = await db.query('SELECT id, commission_rate FROM shops WHERE user_id = $1', [userId]);
    if (shopResult.rows.length === 0) throw ApiError.notFound('Shop not found');
    const shop = shopResult.rows[0];

    // Get order and validate
    const orderResult = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (orderResult.rows.length === 0) throw ApiError.notFound('Order not found');
    const order = orderResult.rows[0];

    if (order.current_status !== ORDER_STATUS.REPAIR_REQUESTED) {
      throw ApiError.badRequest('Can only send quote for orders in repair_requested status');
    }

    // Calculate commission and payout
    const commissionAmount = parseFloat((price * shop.commission_rate).toFixed(2));
    const shopPayout = parseFloat((price - commissionAmount).toFixed(2));

    const result = await db.query(
      `UPDATE repair_orders SET 
        shop_id = $1, quote_amount = $2, estimated_repair_time = $3, 
        warranty_days = $4, commission_amount = $5, shop_payout = $6,
        current_status = 'quote_sent', updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [shop.id, price, estimated_time, warranty_days || 30, commissionAmount, shopPayout, orderId]
    );

    // Log status
    await db.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, 'quote_sent', 'shop_owner', $2, $3)`,
      [orderId, userId, `Quote: ₹${price}, ETA: ${estimated_time}`]
    );

    // Notify customer: official bench quote received
    if (order.customer_id) {
      notificationsService.send(order.customer_id, {
        title: `💬 Official Bench Quote Received — ₹${Number(price).toLocaleString('en-IN')}`,
        body: `Your device has been inspected. The certified workshop has quoted ₹${Number(price).toLocaleString('en-IN')} with ${estimated_time || '45 min'} turnaround and ${warranty_days || 30}-day warranty. Review and approve to proceed.`,
        type: 'order',
        referenceId: orderId
      }).catch(err => logger.warn('Notification dispatch failed:', err?.message));

      // Dispatch simulated WhatsApp & SMS for diagnostic quote ready
      outboundMessagesService.dispatch({
        orderId,
        templateKey: 'DIAGNOSTIC_QUOTE_READY',
        channel: 'both'
      }).catch(err => logger.warn('Outbound SMS/WhatsApp dispatch failed:', err?.message));
    }

    return result.rows[0];
  }

  /**
   * Customer approves a quote.
   */
  async approveQuote(orderId, customerId, data = {}) {
    const order = await this._getOrderForCustomer(orderId, customerId);
    if (order.current_status !== ORDER_STATUS.QUOTE_SENT) {
      throw ApiError.badRequest('No pending quote to approve');
    }

    let promoCodeId = order.promo_code_id;
    let discountAmount = parseFloat(order.discount_amount || 0);

    // If promo code provided in request, validate and apply
    if (data.promo_code && typeof data.promo_code === 'string') {
      const cleanCode = data.promo_code.trim().toUpperCase();
      try {
        const promosService = require('../promos/promos.service');
        const promoRes = await promosService.validateAndApply(cleanCode, order.quote_amount);
        promoCodeId = promoRes.promo_id;
        discountAmount = promoRes.discount_amount;
        await promosService.incrementUsage(promoCodeId);
      } catch (promoErr) {
        // Fallback: check referral code
        try {
          const referralsService = require('../referrals/referrals.service');
          const refRes = await referralsService.applyReferralCode(customerId, cleanCode);
          if (refRes?.discount_amount) {
            discountAmount = parseFloat(refRes.discount_amount);
          }
        } catch {
          throw promoErr; // throw original promo validation error
        }
      }
    } else if (promoCodeId && (!discountAmount || discountAmount === 0)) {
      // Re-evaluate discount against quote_amount if promo was pre-attached during booking
      try {
        const pRes = await db.query('SELECT * FROM promo_codes WHERE id = $1', [promoCodeId]);
        if (pRes.rows.length > 0) {
          const promo = pRes.rows[0];
          if (promo.discount_type === 'percent') {
            discountAmount = (parseFloat(order.quote_amount) * parseFloat(promo.discount_value)) / 100;
            if (promo.max_discount_amount) discountAmount = Math.min(discountAmount, parseFloat(promo.max_discount_amount));
          } else {
            discountAmount = parseFloat(promo.discount_value);
          }
        }
      } catch (err) {
        logger.warn(`Error evaluating pre-attached promo: ${err.message}`);
      }
    }

    // Protection plan tier calculation
    let warrantyTier = data.warranty_tier || order.warranty_tier || 'standard';
    let warrantyDays = 30;
    let warrantyAmount = 0.00;

    if (warrantyTier === 'gold') {
      warrantyDays = 90;
      warrantyAmount = 299.00;
    } else if (warrantyTier === 'diamond') {
      warrantyDays = 180;
      warrantyAmount = 599.00;
    } else {
      warrantyTier = 'standard';
      warrantyDays = 30;
      warrantyAmount = 0.00;
    }

    const totalAmount = Math.max(
      0,
      parseFloat(order.quote_amount) + parseFloat(order.delivery_charge || 0) + warrantyAmount - discountAmount
    );

    const result = await db.query(
      `UPDATE repair_orders 
       SET current_status = 'quote_approved', 
           promo_code_id = $1, 
           discount_amount = $2, 
           total_amount = $3, 
           warranty_tier = $4,
           warranty_days = $5,
           warranty_amount = $6,
           updated_at = NOW() 
       WHERE id = $7 RETURNING *`,
      [promoCodeId, discountAmount, totalAmount, warrantyTier, warrantyDays, warrantyAmount, orderId]
    );

    await db.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, 'quote_approved', 'customer', $2, $3)`,
      [orderId, customerId, `Quote approved by customer (Plan: ${warrantyTier.toUpperCase()}, Total: ₹${totalAmount}, Discount: ₹${discountAmount})`]
    );

    // If use_wallet requested, pay directly from customer's wallet balance
    if (data.use_wallet) {
      try {
        const paymentsService = require('../payments/payments.service');
        await paymentsService.payFromWallet(orderId, customerId);
        const paidOrder = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
        return {
          ...paidOrder.rows[0],
          paid_via_wallet: true,
          message: 'Quote approved and escrow funded from wallet balance'
        };
      } catch (walletErr) {
        logger.error('Failed to pay from wallet during quote approval:', walletErr);
        throw walletErr;
      }
    }

    // Notify workshop owner: quote approved & escrow funded
    if (order.shop_id) {
      db.query('SELECT user_id FROM shops WHERE id = $1', [order.shop_id]).then(shopRes => {
        if (shopRes.rows[0]?.user_id) {
          notificationsService.send(shopRes.rows[0].user_id, {
            title: `✅ Quote Approved & Escrow Funded — ₹${Number(totalAmount).toLocaleString('en-IN')}`,
            body: `Customer has approved your bench quote for Order #${orderId.slice(0, 8).toUpperCase()}. Net escrow total: ₹${Number(totalAmount).toLocaleString('en-IN')}. Proceed with repair.`,
            type: 'payment',
            referenceId: orderId
          }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
        }
      }).catch(() => {});
    }

    return result.rows[0];
  }

  /**
   * Customer rejects a quote.
   */
  async rejectQuote(orderId, customerId) {
    const order = await this._getOrderForCustomer(orderId, customerId);
    if (order.current_status !== ORDER_STATUS.QUOTE_SENT) {
      throw ApiError.badRequest('No pending quote to reject');
    }

    const result = await db.query(
      `UPDATE repair_orders SET current_status = 'quote_rejected', shop_id = NULL,
       quote_amount = NULL, commission_amount = NULL, shop_payout = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [orderId]
    );

    await db.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, 'quote_rejected', 'customer', $2, 'Quote rejected by customer')`,
      [orderId, customerId]
    );

    // Notify workshop owner: quote rejected
    if (order.shop_id) {
      db.query('SELECT user_id FROM shops WHERE id = $1', [order.shop_id]).then(shopRes => {
        if (shopRes.rows[0]?.user_id) {
          notificationsService.send(shopRes.rows[0].user_id, {
            title: `❌ Quote Rejected by Customer`,
            body: `The customer has rejected your bench quote for Order #${orderId.slice(0, 8).toUpperCase()}. The order is now open for a new quote.`,
            type: 'order',
            referenceId: orderId
          }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
        }
      }).catch(() => {});
    }

    return result.rows[0];
  }

  async _getOrderForCustomer(orderId, customerId) {
    const result = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (result.rows.length === 0) throw ApiError.notFound('Order not found');
    if (result.rows[0].customer_id !== customerId) throw ApiError.forbidden('Access denied');
    return result.rows[0];
  }
}

module.exports = new QuotesService();
