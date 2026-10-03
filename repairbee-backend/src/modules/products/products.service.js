const db = require('../../config/database');
const ApiError = require('../../utils/apiError');

class ProductsService {
  async listProducts() {
    const result = await db.query(
      'SELECT * FROM products WHERE is_active = true ORDER BY display_order ASC'
    );
    // Group by category
    const grouped = { electronics: [], appliances: [] };
    result.rows.forEach((p) => {
      if (grouped[p.category]) grouped[p.category].push(p);
    });
    return grouped;
  }

  async getIssuesByProduct(productId) {
    const result = await db.query(
      'SELECT * FROM issue_types WHERE product_id = $1 AND is_active = true ORDER BY display_order ASC',
      [productId]
    );
    return result.rows;
  }

  async addProduct(data) {
    const { category, product_name, icon_url, display_order } = data;
    const result = await db.query(
      'INSERT INTO products (category, product_name, icon_url, display_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [category, product_name, icon_url, display_order || 0]
    );
    return result.rows[0];
  }

  async addIssueType(productId, data) {
    const { issue_label, display_order } = data;
    const result = await db.query(
      'INSERT INTO issue_types (product_id, issue_label, display_order) VALUES ($1,$2,$3) RETURNING *',
      [productId, issue_label, display_order || 0]
    );
    return result.rows[0];
  }
}

module.exports = new ProductsService();
