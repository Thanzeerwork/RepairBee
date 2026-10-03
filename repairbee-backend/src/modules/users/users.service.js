const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const { parsePagination } = require('../../utils/helpers');

class UsersService {
  async getProfile(userId) {
    const result = await db.query(
      `SELECT id, name, email, phone, role, profile_pic_url, wallet_balance, referral_code, 
              is_active, is_phone_verified, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) throw ApiError.notFound('User not found');
    return result.rows[0];
  }

  async updateProfile(userId, { name, phone, profile_pic_url, profilePicUrl }) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const pic = profile_pic_url !== undefined ? profile_pic_url : profilePicUrl;

    if (name) { fields.push(`name = $${paramIndex++}`); values.push(name); }
    if (phone) { fields.push(`phone = $${paramIndex++}`); values.push(phone); }
    if (pic !== undefined) { fields.push(`profile_pic_url = $${paramIndex++}`); values.push(pic); }
    
    if (fields.length === 0) throw ApiError.badRequest('No fields to update');

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, email, phone, role, profile_pic_url, wallet_balance, referral_code`,
      values
    );
    return result.rows[0];
  }

  async updateProfilePic(userId, fileUrl) {
    const result = await db.query(
      `UPDATE users SET profile_pic_url = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, name, email, profile_pic_url`,
      [fileUrl, userId]
    );
    return result.rows[0];
  }

  async updateFcmToken(userId, fcmToken) {
    await db.query('UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE id = $2', [fcmToken, userId]);
    return { message: 'FCM token updated' };
  }

  // ─── Addresses ───────────────────────────────────────────
  async getAddresses(userId) {
    const result = await db.query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async addAddress(userId, data) {
    const rawLabel = data.label || 'home';
    const label = typeof rawLabel === 'string' ? rawLabel.toLowerCase().trim() : 'home';
    const address_line = (data.address_line || data.street || '').trim();
    const city = (data.city || '').trim();
    const state = (data.state || '').trim();
    const pincode = (data.pincode || '').trim();
    const lat = data.lat !== undefined ? data.lat : null;
    const lng = data.lng !== undefined ? data.lng : null;
    const is_default = data.is_default !== undefined ? !!data.is_default : !!data.isDefault;

    // If setting as default, unset all others first
    if (is_default) {
      await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
    }

    const result = await db.query(
      `INSERT INTO addresses (user_id, label, address_line, city, state, pincode, lat, lng, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, label, address_line, city, state, pincode, lat, lng, is_default]
    );
    return result.rows[0];
  }

  async updateAddress(userId, addressId, data) {
    const { label, address_line, city, state, pincode, lat, lng } = data;

    // Verify ownership
    const existing = await db.query('SELECT id FROM addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
    if (existing.rows.length === 0) throw ApiError.notFound('Address not found');

    const result = await db.query(
      `UPDATE addresses SET label = COALESCE($1, label), address_line = COALESCE($2, address_line),
       city = COALESCE($3, city), state = COALESCE($4, state), pincode = COALESCE($5, pincode),
       lat = COALESCE($6, lat), lng = COALESCE($7, lng), updated_at = NOW()
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [label, address_line, city, state, pincode, lat, lng, addressId, userId]
    );
    return result.rows[0];
  }

  async deleteAddress(userId, addressId) {
    const result = await db.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id', [addressId, userId]);
    if (result.rows.length === 0) throw ApiError.notFound('Address not found');
    return { message: 'Address deleted' };
  }

  async setDefaultAddress(userId, addressId) {
    await db.transaction(async (client) => {
      await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
      const result = await client.query(
        'UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *',
        [addressId, userId]
      );
      if (result.rows.length === 0) throw ApiError.notFound('Address not found');
      return result.rows[0];
    });
    return { message: 'Default address updated' };
  }

  // ─── Admin: User Management ─────────────────────────────
  async listUsers(query) {
    const { page, limit, offset } = parsePagination(query);
    const { role, search, is_active } = query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (role) { whereClause += ` AND role = $${paramIndex++}`; params.push(role); }
    if (is_active !== undefined) { whereClause += ` AND is_active = $${paramIndex++}`; params.push(is_active === 'true'); }
    if (search) { 
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`; 
      params.push(`%${search}%`); 
      paramIndex++; 
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM users ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT id, name, email, phone, role, is_active, wallet_balance, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return { users: result.rows, total, page, limit };
  }

  async toggleBlockUser(userId, adminId) {
    const result = await db.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1
       RETURNING id, name, email, role, is_active`,
      [userId]
    );
    if (result.rows.length === 0) throw ApiError.notFound('User not found');
    return result.rows[0];
  }
}

module.exports = new UsersService();
