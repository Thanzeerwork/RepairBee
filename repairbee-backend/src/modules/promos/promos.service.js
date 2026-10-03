const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const { parsePagination } = require('../../utils/helpers');

class PromosService {
  async validateAndApply(code, orderAmount) {
    if (!code) throw ApiError.badRequest('Promo code is required');
    const result = await db.query(
      'SELECT * FROM promo_codes WHERE UPPER(code) = UPPER($1) AND is_active = true',
      [code.trim()]
    );
    if (result.rows.length === 0) throw ApiError.badRequest('Invalid promo code');
    const promo = result.rows[0];

    if (promo.expiry_date && new Date() > new Date(promo.expiry_date)) {
      throw ApiError.badRequest('Promo code has expired');
    }
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      throw ApiError.badRequest('Promo code usage limit reached');
    }

    const numAmount = orderAmount !== undefined && orderAmount !== null ? parseFloat(orderAmount) : 0;
    if (numAmount > 0 && promo.min_order_amount && numAmount < parseFloat(promo.min_order_amount)) {
      throw ApiError.badRequest(`Minimum order amount for this promo is ₹${Number(promo.min_order_amount).toLocaleString('en-IN')}`);
    }

    let discount = 0;
    if (promo.discount_type === 'percent') {
      if (numAmount > 0) {
        discount = (numAmount * parseFloat(promo.discount_value)) / 100;
        if (promo.max_discount_amount) discount = Math.min(discount, parseFloat(promo.max_discount_amount));
      } else {
        discount = parseFloat(promo.discount_value); // representation as %
      }
    } else {
      discount = parseFloat(promo.discount_value);
    }

    return {
      promo_id: promo.id,
      discount_amount: parseFloat(discount.toFixed(2)),
      promo
    };
  }

  async incrementUsage(promoId) {
    await db.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1', [promoId]);
  }

  // Admin CRUD
  async createPromo(data) {
    const { code, discount_type, discount_value, min_order_amount, max_discount_amount, expiry_date, max_uses } = data;
    const result = await db.query(
      `INSERT INTO promo_codes (code, discount_type, discount_value, min_order_amount, max_discount_amount, expiry_date, max_uses)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [code.toUpperCase(), discount_type, discount_value, min_order_amount || 0, max_discount_amount, expiry_date, max_uses]
    );
    return result.rows[0];
  }

  async listActivePromos() {
    const result = await db.query(
      `SELECT * FROM promo_codes WHERE is_active = true AND (expiry_date IS NULL OR expiry_date > NOW()) ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async listPromos(query) {
    const { page, limit, offset } = parsePagination(query);
    const countResult = await db.query('SELECT COUNT(*) FROM promo_codes');
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await db.query('SELECT * FROM promo_codes ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return { promos: result.rows, total, page, limit };
  }

  async updatePromo(promoId, data) {
    const result = await db.query(
      `UPDATE promo_codes SET discount_type = COALESCE($1, discount_type), discount_value = COALESCE($2, discount_value),
       min_order_amount = COALESCE($3, min_order_amount), max_discount_amount = COALESCE($4, max_discount_amount),
       expiry_date = COALESCE($5, expiry_date), max_uses = COALESCE($6, max_uses), is_active = COALESCE($7, is_active)
       WHERE id = $8 RETURNING *`,
      [data.discount_type, data.discount_value, data.min_order_amount, data.max_discount_amount,
       data.expiry_date, data.max_uses, data.is_active, promoId]
    );
    if (result.rows.length === 0) throw ApiError.notFound('Promo code not found');
    return result.rows[0];
  }

  async deletePromo(promoId) {
    await db.query('UPDATE promo_codes SET is_active = false WHERE id = $1', [promoId]);
    return { message: 'Promo code deactivated' };
  }
}

module.exports = new PromosService();
