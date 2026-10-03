const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const { parsePagination } = require('../../utils/helpers');

class WithdrawalsService {
  async requestWithdrawal(userId, userRole, { amount, bank_account_name, bank_account_number, bank_ifsc, bank_name }) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      throw ApiError.badRequest('Minimum withdrawal amount is ₹100');
    }

    let finalAccName = bank_account_name;
    let finalAccNum = bank_account_number;
    let finalIfsc = bank_ifsc;
    let finalBankName = bank_name;

    // 1. Balance validation for shop owners
    if (userRole === 'shop_owner') {
      const shopRes = await db.query('SELECT * FROM shops WHERE user_id = $1', [userId]);
      if (shopRes.rows.length === 0) throw ApiError.notFound('Shop profile not found');
      const shop = shopRes.rows[0];

      // Auto-fallback to saved shop bank details if not provided in payload
      finalAccName = finalAccName || shop.bank_account_name;
      finalAccNum = finalAccNum || shop.bank_account_number;
      finalIfsc = finalIfsc || shop.bank_ifsc;
      finalBankName = finalBankName || shop.bank_name;

      if (!finalAccNum || !finalIfsc) {
        throw ApiError.badRequest('Please link your bank account details before requesting a withdrawal.');
      }

      // Calculate total settled earnings (quote_amount * 0.85 or shop_payout on delivery_confirmed orders)
      const earnRes = await db.query(
        `SELECT COALESCE(SUM(COALESCE(shop_payout, quote_amount * 0.85)), 0) AS total_earned
         FROM repair_orders WHERE shop_id = $1 AND current_status = 'delivery_confirmed'`,
        [shop.id]
      );
      const totalEarned = parseFloat(earnRes.rows[0].total_earned || 0);

      // Calculate already requested/settled withdrawals
      const withRes = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_withdrawn
         FROM withdrawals WHERE user_id = $1 AND status IN ('pending', 'processed')`,
        [userId]
      );
      const totalWithdrawn = parseFloat(withRes.rows[0].total_withdrawn || 0);

      const availableBalance = parseFloat((totalEarned - totalWithdrawn).toFixed(2));
      if (numAmount > availableBalance) {
        throw ApiError.badRequest(
          `Insufficient available balance. You can withdraw up to ₹${availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`
        );
      }
    } else if (userRole === 'delivery_partner') {
      // Balance validation for couriers
      const earnRes = await db.query(
        `SELECT COALESCE(SUM(earnings), 0) AS total_earned FROM deliveries WHERE partner_id = $1 AND status = 'delivered'`,
        [userId]
      );
      const totalEarned = parseFloat(earnRes.rows[0].total_earned || 0);

      const withRes = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_withdrawn
         FROM withdrawals WHERE user_id = $1 AND status IN ('pending', 'processed')`,
        [userId]
      );
      const totalWithdrawn = parseFloat(withRes.rows[0].total_withdrawn || 0);
      const availableBalance = parseFloat((totalEarned - totalWithdrawn).toFixed(2));

      if (numAmount > availableBalance) {
        throw ApiError.badRequest(
          `Insufficient available balance. You can withdraw up to ₹${availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`
        );
      }
    }

    const result = await db.query(
      `INSERT INTO withdrawals (user_id, user_role, amount, bank_account_name, bank_account_number, bank_ifsc, bank_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, userRole, numAmount, finalAccName || 'Registered Account', finalAccNum, finalIfsc, finalBankName || 'Bank Transfer']
    );
    return result.rows[0];
  }

  async getWithdrawals(userId, userRole, query) {
    const { page, limit, offset } = parsePagination(query);
    const isAdmin = userRole === 'admin';
    const { status } = query;

    let whereClause = isAdmin ? 'WHERE 1=1' : 'WHERE w.user_id = $1';
    const params = isAdmin ? [] : [userId];
    let paramIdx = isAdmin ? 1 : 2;

    if (status) {
      whereClause += ` AND w.status = $${paramIdx++}`;
      params.push(status);
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM withdrawals w ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Summary calculations
    let summary = {
      total_withdrawn: 0,
      pending_amount: 0,
      available_balance: 0
    };

    if (!isAdmin && userRole === 'shop_owner') {
      const shopRes = await db.query('SELECT id FROM shops WHERE user_id = $1', [userId]);
      if (shopRes.rows.length > 0) {
        const shopId = shopRes.rows[0].id;
        const [earnRes, withSummaryRes] = await Promise.all([
          db.query(
            `SELECT COALESCE(SUM(COALESCE(shop_payout, quote_amount * 0.85)), 0) AS total_earned
             FROM repair_orders WHERE shop_id = $1 AND current_status = 'delivery_confirmed'`,
            [shopId]
          ),
          db.query(
            `SELECT 
              COALESCE(SUM(amount) FILTER (WHERE status = 'processed'), 0) AS processed_amount,
              COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_amount
             FROM withdrawals WHERE user_id = $1`,
            [userId]
          )
        ]);

        const totalEarned = parseFloat(earnRes.rows[0].total_earned || 0);
        const processed = parseFloat(withSummaryRes.rows[0].processed_amount || 0);
        const pending = parseFloat(withSummaryRes.rows[0].pending_amount || 0);
        summary = {
          total_earned: totalEarned,
          total_withdrawn: processed,
          pending_amount: pending,
          available_balance: parseFloat((totalEarned - processed - pending).toFixed(2))
        };
      }
    }

    params.push(limit, offset);
    const result = await db.query(
      `SELECT w.*, u.name AS user_name, u.email,
              s.shop_name
       FROM withdrawals w
       JOIN users u ON w.user_id = u.id
       LEFT JOIN shops s ON s.user_id = u.id
       ${whereClause} ORDER BY w.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params
    );

    return { withdrawals: result.rows, summary, total, page, limit };
  }

  async processWithdrawal(withdrawalId, adminId, { status, admin_note }) {
    const result = await db.query(
      `UPDATE withdrawals SET status = $1, admin_note = $2, processed_by_id = $3, processed_at = NOW()
       WHERE id = $4 AND status = 'pending' RETURNING *`,
      [status, admin_note || `Processed by admin`, adminId, withdrawalId]
    );
    if (result.rows.length === 0) throw ApiError.notFound('Withdrawal not found or already processed');
    return result.rows[0];
  }
}

module.exports = new WithdrawalsService();
