const db = require('../../config/database');
const logger = require('../../utils/logger');
const { parsePagination } = require('../../utils/helpers');

class NotificationsService {
  /** Create and dispatch notification. */
  async send(userId, { title, body, type, referenceId }) {
    // Save to database (in-app)
    await db.query(
      'INSERT INTO notifications (user_id, title, body, type, reference_id) VALUES ($1,$2,$3,$4,$5)',
      [userId, title, body, type || 'general', referenceId || null]
    );

    // Push notification via FCM (if token exists)
    try {
      const user = await db.query('SELECT fcm_token FROM users WHERE id = $1', [userId]);
      if (user.rows[0]?.fcm_token) {
        // In production: use firebase-admin to send push
        logger.debug(`[FCM] Would send to ${userId}: ${title}`);
      }
    } catch (err) {
      logger.warn('FCM send failed', { error: err.message });
    }

    // SMS (placeholder for production)
    logger.debug(`[SMS] Would send to ${userId}: ${title}`);
    // Email (placeholder for production)
    logger.debug(`[Email] Would send to ${userId}: ${title}`);
  }

  /** Send notification to multiple users. */
  async sendBulk(userIds, notification) {
    for (const userId of userIds) {
      await this.send(userId, notification);
    }
  }

  /** Get user's notifications. */
  async getUserNotifications(userId, query = {}) {
    const { page, limit, offset } = parsePagination(query);
    const countResult = await db.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [userId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    const unreadCount = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return { notifications: result.rows, unread_count: parseInt(unreadCount.rows[0].count, 10), total, page, limit };
  }

  async markAsRead(notificationId, userId) {
    await db.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [notificationId, userId]);
    return { message: 'Marked as read' };
  }

  async markAllAsRead(userId) {
    await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
    return { message: 'All notifications marked as read' };
  }
}

module.exports = new NotificationsService();
