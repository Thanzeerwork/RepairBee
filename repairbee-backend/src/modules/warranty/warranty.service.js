const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const { generateOTP } = require('../../utils/helpers');
const logger = require('../../utils/logger');
const notificationsService = require('../notifications/notifications.service');

class WarrantyService {
  /** Raise a 1-click warranty claim on a completed order. */
  async raiseClaim(orderId, customerId, data = {}) {
    const orderRes = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) throw ApiError.notFound('Order not found');
    const repair = orderRes.rows[0];

    if (repair.customer_id !== customerId) {
      throw ApiError.forbidden('Access denied');
    }

    if (repair.current_status !== 'delivery_confirmed' && repair.current_status !== 'completed') {
      throw ApiError.badRequest('Order must be delivered & confirmed before claiming warranty');
    }

    let expiresAt = repair.warranty_expires_at ? new Date(repair.warranty_expires_at) : null;
    const now = new Date();

    // If legacy order had no warranty_expires_at, activate appropriate window
    if (!expiresAt) {
      const wDays = repair.warranty_days && Number(repair.warranty_days) > 0 ? Number(repair.warranty_days) : 30;
      expiresAt = new Date(Date.now() + wDays * 24 * 60 * 60 * 1000);
      await db.query(
        "UPDATE repair_orders SET warranty_expires_at = $1, warranty_days = $2 WHERE id = $3",
        [expiresAt, wDays, orderId]
      );
    }

    if (now > expiresAt) {
      const tierLabel = repair.warranty_tier === 'diamond' ? '180-Day Diamond VIP' : repair.warranty_tier === 'gold' ? '90-Day Gold' : '30-Day Platform';
      throw ApiError.badRequest(`The ${tierLabel} warranty guarantee period has expired`);
    }

    // Check if an active warranty re-repair claim is already open for this order
    const activeClaim = await db.query(
      `SELECT id, current_status FROM repair_orders 
       WHERE parent_order_id = $1 AND is_warranty_claim = true AND current_status NOT IN ('cancelled', 'delivery_confirmed')`,
      [orderId]
    );

    if (activeClaim.rows.length > 0) {
      const existing = activeClaim.rows[0];
      throw ApiError.badRequest(
        `A warranty re-repair order (#${existing.id.slice(0, 8).toUpperCase()}) is already active in status "${existing.current_status.replace(/_/g, ' ')}"`
      );
    }

    const pickupOtp = generateOTP(6);
    const defectNote = data.issue_description || data.description || '30-Day Warranty: Free cleanroom re-service requested';

    // Create linked child re-repair order
    const result = await db.query(
      `INSERT INTO repair_orders 
       (customer_id, shop_id, product_id, issue_ids, description, media_urls, order_type,
        pickup_address_id, delivery_address_id, current_status, quote_amount, commission_amount,
        shop_payout, parent_order_id, is_warranty_claim, total_amount, delivery_charge, pickup_otp)
       VALUES ($1, $2, $3, $4, $5, $6, 'sos',
        $7, $8, 'pickup_requested', 0.00, 0.00,
        0.00, $9::uuid, true, 0.00, 0.00, $10)
       RETURNING *`,
      [
        customerId, 
        repair.shop_id, 
        repair.product_id, 
        repair.issue_ids || [],
        defectNote, 
        data.media_urls || repair.media_urls || [],
        repair.pickup_address_id, 
        repair.delivery_address_id, 
        orderId,
        pickupOtp
      ]
    );

    const newOrder = result.rows[0];

    // Log status transition
    await db.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, 'pickup_requested', 'customer', $2, $3)`,
      [newOrder.id, customerId, `30-Day Warranty claim initiated: ${defectNote}`]
    );

    // Notify customer: warranty re-repair created
    notificationsService.send(customerId, {
      title: '🛡️ Free Warranty Re-Repair Initiated — ₹0.00',
      body: `Your 30-day warranty claim has been filed. A free re-repair order #${newOrder.id.slice(0, 8).toUpperCase()} has been created with ₹0.00 charges. A courier will be dispatched for doorstep pickup.`,
      type: 'warranty',
      referenceId: newOrder.id
    }).catch(err => logger.warn('Notification dispatch failed:', err?.message));

    // Notify workshop: priority warranty rework incoming
    if (repair.shop_id) {
      db.query('SELECT user_id FROM shops WHERE id = $1', [repair.shop_id]).then(shopRes => {
        if (shopRes.rows[0]?.user_id) {
          notificationsService.send(shopRes.rows[0].user_id, {
            title: '🛡️ Warranty Re-Repair Claim — Priority Cleanroom Queue',
            body: `Customer has filed a 30-day warranty claim on Order #${orderId.slice(0, 8).toUpperCase()}. A priority re-repair order #${newOrder.id.slice(0, 8).toUpperCase()} (₹0.00) has been created. Prepare cleanroom bench for rework.`,
            type: 'warranty',
            referenceId: orderId
          }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
        }
      }).catch(() => {});
    }

    return newOrder;
  }

  /** Get warranty info for an order. */
  async getWarrantyInfo(orderId) {
    const result = await db.query(
      `SELECT id, warranty_tier, warranty_days, warranty_amount, warranty_expires_at, current_status,
              CASE WHEN warranty_expires_at > NOW() THEN true ELSE false END AS is_warranty_active,
              GREATEST(0, CEIL(EXTRACT(EPOCH FROM (COALESCE(warranty_expires_at, NOW()) - NOW())) / 86400))::int AS days_remaining
       FROM repair_orders WHERE id = $1`,
      [orderId]
    );
    if (result.rows.length === 0) throw ApiError.notFound('Order not found');
    const info = result.rows[0];

    // Check for any linked re-repair order
    const claimRes = await db.query(
      `SELECT id, current_status, created_at 
       FROM repair_orders 
       WHERE parent_order_id = $1 AND is_warranty_claim = true 
       ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );

    return {
      ...info,
      active_claim_order: claimRes.rows[0] || null
    };
  }
}

module.exports = new WarrantyService();
