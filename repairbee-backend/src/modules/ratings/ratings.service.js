const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const { parsePagination } = require('../../utils/helpers');

class RatingsService {
  async rateShop(orderId, userId, { stars, review_text }) {
    const order = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (order.rows.length === 0) throw ApiError.notFound('Order not found');
    if (order.rows[0].customer_id !== userId) throw ApiError.forbidden('Access denied');
    if (order.rows[0].current_status !== 'delivery_confirmed') throw ApiError.badRequest('Can only rate after delivery confirmed');

    // Check if customer already rated this shop for this order
    const existing = await db.query(
      "SELECT id FROM ratings WHERE order_id = $1 AND entity_type = 'shop'",
      [orderId]
    );
    if (existing.rows.length > 0) {
      throw ApiError.badRequest('You have already submitted a review for this workshop order');
    }

    const result = await db.query(
      `INSERT INTO ratings (order_id, rated_by_id, entity_type, entity_id, stars, review_text)
       VALUES ($1, $2, 'shop', $3, $4, $5) RETURNING *`,
      [orderId, userId, order.rows[0].shop_id, stars, review_text]
    );

    // Update shop average rating and total counts
    await db.query(
      `UPDATE shops SET 
        avg_rating = (SELECT ROUND(AVG(stars)::numeric, 2) FROM ratings WHERE entity_type = 'shop' AND entity_id = $1),
        total_ratings = (SELECT COUNT(*) FROM ratings WHERE entity_type = 'shop' AND entity_id = $1)
       WHERE id = $1`,
      [order.rows[0].shop_id]
    );

    return result.rows[0];
  }

  async ratePartner(orderId, userId, { stars, review_text }) {
    const order = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (order.rows.length === 0) throw ApiError.notFound('Order not found');
    if (order.rows[0].customer_id !== userId) throw ApiError.forbidden('Access denied');

    const delivery = await db.query('SELECT partner_id FROM deliveries WHERE order_id = $1 LIMIT 1', [orderId]);
    if (delivery.rows.length === 0) throw ApiError.badRequest('No delivery partner found for this order');

    // Check if customer already rated delivery partner for this order
    const existing = await db.query(
      "SELECT id FROM ratings WHERE order_id = $1 AND entity_type = 'partner'",
      [orderId]
    );
    if (existing.rows.length > 0) {
      throw ApiError.badRequest('You have already submitted a rating for this courier delivery');
    }

    const result = await db.query(
      `INSERT INTO ratings (order_id, rated_by_id, entity_type, entity_id, stars, review_text)
       VALUES ($1, $2, 'partner', $3, $4, $5) RETURNING *`,
      [orderId, userId, delivery.rows[0].partner_id, stars, review_text || null]
    );
    return result.rows[0];
  }

  async getOrderRatings(orderId, userId) {
    const order = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (order.rows.length === 0) throw ApiError.notFound('Order not found');

    const result = await db.query(
      `SELECT r.*, u.name AS reviewer_name
       FROM ratings r
       JOIN users u ON r.rated_by_id = u.id
       WHERE r.order_id = $1`,
      [orderId]
    );

    const shopRating = result.rows.find((r) => r.entity_type === 'shop') || null;
    const partnerRating = result.rows.find((r) => r.entity_type === 'partner') || null;

    return {
      order_id: orderId,
      shopRating,
      partnerRating,
      hasRated: Boolean(shopRating || partnerRating),
    };
  }

  async getShopReviews(shopId, query = {}) {
    const { page, limit, offset } = parsePagination(query);
    const countResult = await db.query("SELECT COUNT(*) FROM ratings WHERE entity_type = 'shop' AND entity_id = $1", [shopId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await db.query(
      `SELECT r.*, u.name AS reviewer_name, p.product_name
       FROM ratings r 
       JOIN users u ON r.rated_by_id = u.id
       LEFT JOIN repair_orders ro ON r.order_id = ro.id
       LEFT JOIN products p ON ro.product_id = p.id
       WHERE r.entity_type = 'shop' AND r.entity_id = $1 
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [shopId, limit, offset]
    );

    const distResult = await db.query(
      `SELECT stars, COUNT(*) as count
       FROM ratings
       WHERE entity_type = 'shop' AND entity_id = $1
       GROUP BY stars`,
      [shopId]
    );
    const starDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    distResult.rows.forEach((row) => {
      starDistribution[row.stars] = parseInt(row.count, 10);
    });

    return { reviews: result.rows, total, page, limit, starDistribution };
  }

  async getMyShopReviews(userId, query = {}) {
    const shopResult = await db.query(
      'SELECT id, shop_name, avg_rating, total_ratings, total_jobs, category, is_approved FROM shops WHERE user_id = $1',
      [userId]
    );
    if (shopResult.rows.length === 0) throw ApiError.notFound('Workshop profile not found for current user');
    const shop = shopResult.rows[0];
    const data = await this.getShopReviews(shop.id, query);
    return {
      shop,
      ...data,
    };
  }
}

module.exports = new RatingsService();
