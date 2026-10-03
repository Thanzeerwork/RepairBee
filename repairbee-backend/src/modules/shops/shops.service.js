const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const { parsePagination, calculateDistance } = require('../../utils/helpers');

class ShopsService {
  async register(userId, data) {
    // Check if user already has a shop
    const existing = await db.query('SELECT id FROM shops WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) throw ApiError.conflict('You already have a registered shop');

    const { shop_name, description, category, address, city, state, pincode, lat, lng,
            bank_account_name, bank_account_number, bank_ifsc, bank_name, opening_time, closing_time } = data;

    const result = await db.query(
      `INSERT INTO shops (user_id, shop_name, description, category, address, city, state, pincode, lat, lng,
        bank_account_name, bank_account_number, bank_ifsc, bank_name, opening_time, closing_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [userId, shop_name, description, category || 'both', address, city, state, pincode, lat, lng,
       bank_account_name, bank_account_number, bank_ifsc, bank_name, opening_time, closing_time]
    );
    return result.rows[0];
  }

  async browseShops(query) {
    const { page, limit, offset } = parsePagination(query);
    const { lat, lng, category, min_rating, search, product_type } = query;

    let whereClause = 'WHERE s.is_approved = true AND s.is_active = true';
    const whereParams = [];
    let paramIndex = 1;

    if (category && category !== 'both') {
      whereClause += ` AND (s.category = $${paramIndex} OR s.category = 'both')`;
      whereParams.push(category);
      paramIndex++;
    }
    if (min_rating) {
      whereClause += ` AND s.avg_rating >= $${paramIndex++}`;
      whereParams.push(parseFloat(min_rating));
    }
    if (search) {
      whereClause += ` AND (s.shop_name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex} OR s.address ILIKE $${paramIndex} OR s.city ILIKE $${paramIndex})`;
      whereParams.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM shops s ${whereClause}`,
      whereParams
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const queryParams = [...whereParams];

    // Build ORDER BY — proximity if lat/lng provided, else by rating
    let orderClause;
    let distanceSelect = '';
    if (lat && lng) {
      distanceSelect = `, (
        6371 * acos(
          cos(radians($${paramIndex})) * cos(radians(s.lat)) *
          cos(radians(s.lng) - radians($${paramIndex + 1})) +
          sin(radians($${paramIndex})) * sin(radians(s.lat))
        )
      ) AS distance_km`;
      queryParams.push(parseFloat(lat), parseFloat(lng));
      paramIndex += 2;
      orderClause = 'ORDER BY distance_km ASC, s.avg_rating DESC';
    } else {
      orderClause = 'ORDER BY s.avg_rating DESC, s.total_jobs DESC';
    }

    queryParams.push(limit, offset);
    const result = await db.query(
      `SELECT s.id, s.shop_name, s.description, s.category, s.address, s.city, s.lat, s.lng,
              s.avg_rating, s.total_ratings, s.total_jobs, s.opening_time, s.closing_time,
              u.name AS owner_name ${distanceSelect}
       FROM shops s
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       ${orderClause}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      queryParams
    );

    return { shops: result.rows, total, page, limit };
  }

  async getShopById(shopId) {
    const result = await db.query(
      `SELECT s.*, u.name AS owner_name, u.email AS owner_email
       FROM shops s JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [shopId]
    );
    if (result.rows.length === 0) throw ApiError.notFound('Shop not found');
    return result.rows[0];
  }

  async getShopByUserId(userId) {
    const result = await db.query('SELECT * FROM shops WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) throw ApiError.notFound('Shop not found');
    return result.rows[0];
  }

  async updateShop(userId, data) {
    const shop = await this.getShopByUserId(userId);
    const { shop_name, description, category, address, city, state, pincode, lat, lng,
            bank_account_name, bank_account_number, bank_ifsc, bank_name, opening_time, closing_time } = data;

    const result = await db.query(
      `UPDATE shops SET
        shop_name = COALESCE($1, shop_name), description = COALESCE($2, description),
        category = COALESCE($3, category), address = COALESCE($4, address),
        city = COALESCE($5, city), state = COALESCE($6, state), pincode = COALESCE($7, pincode),
        lat = COALESCE($8, lat), lng = COALESCE($9, lng),
        bank_account_name = COALESCE($10, bank_account_name),
        bank_account_number = COALESCE($11, bank_account_number),
        bank_ifsc = COALESCE($12, bank_ifsc), bank_name = COALESCE($13, bank_name),
        opening_time = COALESCE($14, opening_time), closing_time = COALESCE($15, closing_time),
        updated_at = NOW()
       WHERE id = $16 RETURNING *`,
      [shop_name, description, category, address, city, state, pincode, lat, lng,
       bank_account_name, bank_account_number, bank_ifsc, bank_name, opening_time, closing_time, shop.id]
    );
    return result.rows[0];
  }

  async getDashboard(userId) {
    const shop = await this.getShopByUserId(userId);
    
    const stats = await db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE current_status NOT IN ('cancelled', 'delivery_confirmed')) AS active_jobs,
        COUNT(*) FILTER (WHERE current_status = 'delivery_confirmed') AS completed_jobs,
        COALESCE(SUM(COALESCE(shop_payout, quote_amount * 0.85)) FILTER (WHERE current_status = 'delivery_confirmed'), 0) AS total_earnings,
        COALESCE(SUM(COALESCE(shop_payout, quote_amount * 0.85)) FILTER (WHERE current_status IN ('quote_approved', 'repair_in_progress', 'repair_completed', 'out_for_delivery')), 0) AS in_escrow_holding
       FROM repair_orders WHERE shop_id = $1`,
      [shop.id]
    );

    const withRes = await db.query(
      `SELECT 
        COALESCE(SUM(amount) FILTER (WHERE status = 'processed'), 0) AS processed_withdrawals,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS pending_withdrawals
       FROM withdrawals WHERE user_id = $1`,
      [userId]
    );

    const totalEarned = parseFloat(stats.rows[0].total_earnings || 0);
    const processedWith = parseFloat(withRes.rows[0].processed_withdrawals || 0);
    const pendingWith = parseFloat(withRes.rows[0].pending_withdrawals || 0);
    const availableBalance = parseFloat((totalEarned - processedWith - pendingWith).toFixed(2));

    return { 
      shop, 
      stats: {
        ...stats.rows[0],
        total_earnings: totalEarned,
        available_balance: availableBalance >= 0 ? availableBalance : 0.00,
        in_escrow_holding: parseFloat(stats.rows[0].in_escrow_holding || 0),
        pending_withdrawals: pendingWith,
        processed_withdrawals: processedWith
      } 
    };
  }

  // ─── Admin ───────────────────────────────────────────────
  async getPendingShops() {
    const result = await db.query(
      `SELECT s.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
       FROM shops s JOIN users u ON s.user_id = u.id
       WHERE s.is_approved = false ORDER BY s.created_at ASC`
    );
    return result.rows;
  }

  async approveShop(shopId) {
    const result = await db.query(
      'UPDATE shops SET is_approved = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [shopId]
    );
    if (result.rows.length === 0) throw ApiError.notFound('Shop not found');
    return result.rows[0];
  }

  async rejectShop(shopId) {
    const result = await db.query('DELETE FROM shops WHERE id = $1 RETURNING id', [shopId]);
    if (result.rows.length === 0) throw ApiError.notFound('Shop not found');
    return { message: 'Shop registration rejected and removed' };
  }

  async toggleBlockShop(shopId) {
    const result = await db.query(
      'UPDATE shops SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, shop_name, is_active',
      [shopId]
    );
    if (result.rows.length === 0) throw ApiError.notFound('Shop not found');
    return result.rows[0];
  }

  async updateCommissionRate(shopId, commissionRate) {
    const result = await db.query(
      'UPDATE shops SET commission_rate = $1, updated_at = NOW() WHERE id = $2 RETURNING id, shop_name, commission_rate',
      [commissionRate, shopId]
    );
    if (result.rows.length === 0) throw ApiError.notFound('Shop not found');
    return result.rows[0];
  }
}

module.exports = new ShopsService();
