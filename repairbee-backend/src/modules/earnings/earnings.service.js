const db = require('../../config/database');
const ApiError = require('../../utils/apiError');

class EarningsService {
  /** Shop earnings dashboard. */
  async getShopEarnings(userId) {
    const shopRes = await db.query(
      `SELECT id, shop_name, commission_rate, bank_account_name, bank_account_number, bank_ifsc, bank_name
       FROM shops WHERE user_id = $1`,
      [userId]
    );
    if (shopRes.rows.length === 0) throw ApiError.notFound('Shop not found');
    const shop = shopRes.rows[0];
    const shopId = shop.id;

    // 1. Repair orders earnings and active escrow
    const stats = await db.query(
      `SELECT 
        COALESCE(SUM(COALESCE(shop_payout, quote_amount * 0.85)) FILTER (WHERE current_status = 'delivery_confirmed'), 0) AS total_earnings,
        COALESCE(SUM(COALESCE(shop_payout, quote_amount * 0.85)) FILTER (WHERE current_status = 'delivery_confirmed' AND created_at >= date_trunc('week', NOW())), 0) AS this_week,
        COALESCE(SUM(COALESCE(shop_payout, quote_amount * 0.85)) FILTER (WHERE current_status = 'delivery_confirmed' AND created_at >= date_trunc('month', NOW())), 0) AS this_month,
        COALESCE(SUM(COALESCE(commission_amount, quote_amount * 0.15)) FILTER (WHERE current_status = 'delivery_confirmed'), 0) AS total_commission_paid,
        COALESCE(SUM(COALESCE(shop_payout, quote_amount * 0.85)) FILTER (WHERE current_status IN ('quote_approved', 'repair_in_progress', 'repair_completed', 'out_for_delivery')), 0) AS in_escrow_holding,
        COUNT(*) FILTER (WHERE current_status = 'delivery_confirmed') AS completed_jobs,
        COUNT(*) FILTER (WHERE current_status IN ('quote_approved', 'repair_in_progress', 'repair_completed', 'out_for_delivery')) AS active_in_progress_jobs
       FROM repair_orders WHERE shop_id = $1`,
      [shopId]
    );

    // 2. Withdrawals history & status
    const withRes = await db.query(
      `SELECT 
        COALESCE(SUM(amount) FILTER (WHERE status = 'processed'), 0) AS processed_withdrawals,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_withdrawals
       FROM withdrawals WHERE user_id = $1`,
      [userId]
    );

    const totalEarned = parseFloat(stats.rows[0].total_earnings || 0);
    const processedWithdrawals = parseFloat(withRes.rows[0].processed_withdrawals || 0);
    const pendingWithdrawals = parseFloat(withRes.rows[0].pending_withdrawals || 0);
    const availableBalance = parseFloat((totalEarned - processedWithdrawals - pendingWithdrawals).toFixed(2));

    const summary = {
      ...stats.rows[0],
      total_earnings: totalEarned,
      processed_withdrawals: processedWithdrawals,
      pending_withdrawals: pendingWithdrawals,
      available_balance: availableBalance >= 0 ? availableBalance : 0.00,
      in_escrow_holding: parseFloat(stats.rows[0].in_escrow_holding || 0),
      bank_details: {
        bank_account_name: shop.bank_account_name,
        bank_account_number: shop.bank_account_number,
        bank_ifsc: shop.bank_ifsc,
        bank_name: shop.bank_name,
        is_linked: !!(shop.bank_account_number && shop.bank_ifsc)
      }
    };

    // 3. Per-job breakdown (all settled & in-progress orders)
    const jobs = await db.query(
      `SELECT ro.id, ro.quote_amount,
              COALESCE(ro.commission_amount, ro.quote_amount * 0.15) AS commission_amount,
              COALESCE(ro.shop_payout, ro.quote_amount * 0.85) AS shop_payout,
              ro.current_status, ro.created_at, ro.updated_at,
              p.product_name, u.name AS customer_name
       FROM repair_orders ro
       JOIN products p ON ro.product_id = p.id
       JOIN users u ON ro.customer_id = u.id
       WHERE ro.shop_id = $1 AND ro.quote_amount IS NOT NULL
       ORDER BY ro.created_at DESC LIMIT 30`,
      [shopId]
    );

    // 4. Past withdrawals ledger
    const pastWithdrawals = await db.query(
      `SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );

    return {
      summary,
      recent_jobs: jobs.rows,
      withdrawals: pastWithdrawals.rows
    };
  }

  /** Delivery partner earnings. */
  async getPartnerEarnings(partnerId) {
    const stats = await db.query(
      `SELECT 
        COALESCE(SUM(earnings), 0) AS total_earnings,
        COALESCE(SUM(earnings) FILTER (WHERE created_at >= date_trunc('week', NOW())), 0) AS this_week,
        COALESCE(SUM(earnings) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) AS this_month,
        COALESCE(SUM(distance_km), 0) AS total_km,
        COUNT(*) AS total_deliveries
       FROM deliveries WHERE partner_id = $1 AND status = 'delivered'`,
      [partnerId]
    );

    const jobs = await db.query(
      `SELECT d.*, p.product_name FROM deliveries d
       JOIN repair_orders ro ON d.order_id = ro.id
       JOIN products p ON ro.product_id = p.id
       WHERE d.partner_id = $1 AND d.status = 'delivered'
       ORDER BY d.completed_at DESC LIMIT 20`,
      [partnerId]
    );

    return { summary: stats.rows[0], recent_deliveries: jobs.rows };
  }
}

module.exports = new EarningsService();
