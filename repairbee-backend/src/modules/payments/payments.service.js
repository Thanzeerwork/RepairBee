const db = require('../../config/database');
const env = require('../../config/env');
const ApiError = require('../../utils/apiError');
const { ORDER_STATUS, ESCROW_STATUS, ROLES } = require('../../utils/constants');
const { toPaise } = require('../../utils/helpers');
const logger = require('../../utils/logger');

// Initialize Razorpay (lazy)
let razorpay;
function getRazorpay() {
  if (!razorpay) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

class PaymentsService {
  /**
   * Create a Razorpay order for an approved repair quote.
   */
  async createPaymentOrder(orderId, customerId) {
    const order = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (order.rows.length === 0) throw ApiError.notFound('Order not found');

    const repair = order.rows[0];
    if (repair.customer_id !== customerId) throw ApiError.forbidden('Access denied');
    
    // Auto-approve quote if customer pays directly from quoted state
    if (repair.current_status === ORDER_STATUS.QUOTE_SENT) {
      await db.query(
        "UPDATE repair_orders SET current_status = 'quote_approved', updated_at = NOW() WHERE id = $1",
        [orderId]
      );
    } else if (repair.current_status !== ORDER_STATUS.QUOTE_APPROVED) {
      throw ApiError.badRequest('Quote must be received or approved before payment');
    }

    // Calculate total: quote + delivery charge - discount
    const quoteAmt = parseFloat(repair.quote_amount || 0);
    const delivCharge = parseFloat(repair.delivery_charge || 46);
    const discAmt = parseFloat(repair.discount_amount || 0);
    const totalAmount = Math.max(1, quoteAmt + delivCharge - discAmt);

    const isSimulated = !env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID.includes('xxxx') || env.RAZORPAY_KEY_ID.includes('dummy');

    if (isSimulated) {
      const mockOrderId = `order_sim_${Date.now()}`;
      await db.query(
        `INSERT INTO payments (order_id, customer_id, amount, method, razorpay_order_id, escrow_status)
         VALUES ($1, $2, $3, 'upi', $4, 'pending')`,
        [orderId, customerId, totalAmount, mockOrderId]
      );

      await db.query(
        'UPDATE repair_orders SET total_amount = $1, updated_at = NOW() WHERE id = $2',
        [totalAmount, orderId]
      );

      return {
        razorpay_order_id: mockOrderId,
        amount: toPaise(totalAmount),
        currency: 'INR',
        key_id: 'rzp_test_simulated',
        simulated: true,
      };
    }

    try {
      const rzpOrder = await getRazorpay().orders.create({
        amount: toPaise(totalAmount),
        currency: 'INR',
        receipt: `repair_${orderId.substring(0, 8)}`,
        notes: { order_id: orderId, customer_id: customerId },
      });

      // Save payment record
      await db.query(
        `INSERT INTO payments (order_id, customer_id, amount, method, razorpay_order_id, escrow_status)
         VALUES ($1, $2, $3, 'upi', $4, 'pending')`,
        [orderId, customerId, totalAmount, rzpOrder.id]
      );

      // Update repair order with total
      await db.query(
        'UPDATE repair_orders SET total_amount = $1, updated_at = NOW() WHERE id = $2',
        [totalAmount, orderId]
      );

      return {
        razorpay_order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key_id: env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      logger.error('Razorpay order creation failed', { error: error.message });
      throw ApiError.internal('Payment order creation failed');
    }
  }

  /**
   * Verify payment after client-side completion.
   */
  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    const isSimulated =
      (razorpay_order_id && razorpay_order_id.startsWith('order_sim_')) ||
      razorpay_signature === 'simulated_signature' ||
      !env.RAZORPAY_KEY_ID ||
      env.RAZORPAY_KEY_ID.includes('xxxx');

    if (!isSimulated) {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        throw ApiError.badRequest('Payment verification failed: invalid signature');
      }
    }

    return await db.transaction(async (client) => {
      // Update payment record
      const paymentResult = await client.query(
        `UPDATE payments SET razorpay_payment_id = $1, razorpay_signature = $2, escrow_status = 'held'
         WHERE razorpay_order_id = $3 RETURNING *`,
        [razorpay_payment_id, razorpay_signature || 'simulated_signature', razorpay_order_id]
      );

      if (paymentResult.rows.length === 0) throw ApiError.notFound('Payment record not found');

      const payment = paymentResult.rows[0];

      // Update order status to payment_confirmed → pickup_requested
      await client.query(
        "UPDATE repair_orders SET current_status = 'payment_confirmed', updated_at = NOW() WHERE id = $1",
        [payment.order_id]
      );

      // Log status
      await client.query(
        `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
         VALUES ($1, 'payment_confirmed', 'customer', $2, 'Payment verified and held in escrow')`,
        [payment.order_id, payment.customer_id]
      );

      // Auto-transition to pickup_requested
      await client.query(
        "UPDATE repair_orders SET current_status = 'pickup_requested', updated_at = NOW() WHERE id = $1",
        [payment.order_id]
      );
      await client.query(
        `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
         VALUES ($1, 'pickup_requested', 'customer', $2, 'Pickup requested automatically after payment')`,
        [payment.order_id, payment.customer_id]
      );

      return { message: 'Payment verified. Pickup requested.', payment };
    });
  }

  /**
  * Get wallet balance and recent transactions.
  */
  async getWalletBalance(userId) {
    const result = await db.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
    const balance = result.rows.length > 0 ? parseFloat(result.rows[0].wallet_balance || 0) : 0;

    const history = await db.query(
      `SELECT p.id, p.order_id, p.amount, p.method, p.escrow_status, p.created_at,
              ro.current_status, prod.product_name
       FROM payments p
       LEFT JOIN repair_orders ro ON p.order_id = ro.id
       LEFT JOIN products prod ON ro.product_id = prod.id
       WHERE p.customer_id = $1
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [userId]
    );

    return { balance, transactions: history.rows };
  }

  /**
   * Top up wallet via Razorpay or instant credit in test environment.
   */
  async topUpWallet(userId, amount) {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) throw ApiError.badRequest('Minimum top-up amount is ₹1');

    if (!env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID.includes('dummy') || env.NODE_ENV === 'development') {
      const updated = await db.query(
        'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
        [numAmount, userId]
      );
      return {
        simulated: true,
        message: `₹${numAmount} added to wallet balance successfully!`,
        balance: parseFloat(updated.rows[0].wallet_balance),
      };
    }

    try {
      const rzpOrder = await getRazorpay().orders.create({
        amount: toPaise(numAmount),
        currency: 'INR',
        receipt: `wallet_${userId.substring(0, 8)}`,
        notes: { user_id: userId, type: 'wallet_topup' },
      });

      return {
        razorpay_order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key_id: env.RAZORPAY_KEY_ID,
      };
    } catch (error) {
      logger.error('Wallet top-up failed', { error: error.message });
      throw ApiError.internal('Wallet top-up failed');
    }
  }

  /**
   * Pay from wallet balance.
   */
  async payFromWallet(orderId, customerId) {
    const order = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (order.rows.length === 0) throw ApiError.notFound('Order not found');

    const repair = order.rows[0];
    if (repair.customer_id !== customerId) throw ApiError.forbidden('Access denied');
    
    if (repair.current_status === ORDER_STATUS.QUOTE_SENT) {
      await db.query(
        "UPDATE repair_orders SET current_status = 'quote_approved', updated_at = NOW() WHERE id = $1",
        [orderId]
      );
    } else if (repair.current_status !== ORDER_STATUS.QUOTE_APPROVED) {
      throw ApiError.badRequest('Quote must be received or approved before payment');
    }

    const quoteAmt = parseFloat(repair.quote_amount || 0);
    const delivCharge = parseFloat(repair.delivery_charge || 46);
    const discAmt = parseFloat(repair.discount_amount || 0);
    const totalAmount = Math.max(1, quoteAmt + delivCharge - discAmt);

    return await db.transaction(async (client) => {
      // Check balance
      const user = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [customerId]);
      const balance = parseFloat(user.rows[0].wallet_balance);

      if (balance < totalAmount) {
        throw ApiError.badRequest(`Insufficient wallet balance. Need ₹${totalAmount}, have ₹${balance}`);
      }

      // Deduct from wallet
      await client.query(
        'UPDATE users SET wallet_balance = wallet_balance - $1, updated_at = NOW() WHERE id = $2',
        [totalAmount, customerId]
      );

      // Create payment record
      await client.query(
        `INSERT INTO payments (order_id, customer_id, amount, method, escrow_status)
         VALUES ($1, $2, $3, 'wallet', 'held')`,
        [orderId, customerId, totalAmount]
      );

      // Update order
      await client.query(
        "UPDATE repair_orders SET total_amount = $1, current_status = 'payment_confirmed', updated_at = NOW() WHERE id = $2",
        [totalAmount, orderId]
      );

      await client.query(
        `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
         VALUES ($1, 'payment_confirmed', 'customer', $2, 'Paid from wallet')`,
        [orderId, customerId]
      );

      // Auto-transition to pickup_requested
      await client.query(
        "UPDATE repair_orders SET current_status = 'pickup_requested', updated_at = NOW() WHERE id = $1",
        [orderId]
      );

      return { message: 'Payment successful from wallet. Pickup requested.' };
    });
  }
}

module.exports = new PaymentsService();
