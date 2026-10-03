const db = require('../../config/database');
const { parsePagination } = require('../../utils/helpers');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ChatService {
  async getHistory(orderId, chatType, query) {
    const { page, limit, offset } = parsePagination(query);
    const isValidUuid = orderId && UUID_REGEX.test(orderId);

    let countResult;
    let result;

    if (isValidUuid) {
      countResult = await db.query(
        'SELECT COUNT(*) FROM chats WHERE order_id = $1 AND chat_type = $2',
        [orderId, chatType]
      );
      result = await db.query(
        `SELECT c.*, u.name AS sender_name, u.profile_pic_url AS sender_avatar
         FROM chats c JOIN users u ON c.sender_id = u.id
         WHERE c.order_id = $1 AND c.chat_type = $2
         ORDER BY c.sent_at DESC LIMIT $3 OFFSET $4`,
        [orderId, chatType, limit, offset]
      );
    } else {
      countResult = await db.query(
        'SELECT COUNT(*) FROM chats WHERE order_id IS NULL AND chat_type = $1',
        [chatType]
      );
      result = await db.query(
        `SELECT c.*, u.name AS sender_name, u.profile_pic_url AS sender_avatar
         FROM chats c JOIN users u ON c.sender_id = u.id
         WHERE c.order_id IS NULL AND c.chat_type = $1
         ORDER BY c.sent_at DESC LIMIT $2 OFFSET $3`,
        [chatType, limit, offset]
      );
    }

    const total = parseInt(countResult.rows[0].count, 10);
    return { messages: result.rows.reverse(), total, page, limit };
  }

  async sendMessage(orderId, chatType, senderId, senderRole, message, mediaUrl) {
    const validOrderId = orderId && UUID_REGEX.test(orderId) ? orderId : null;
    const result = await db.query(
      `WITH inserted AS (
         INSERT INTO chats (order_id, chat_type, sender_id, sender_role, message, media_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *
       )
       SELECT i.*, u.name AS sender_name, u.profile_pic_url AS sender_avatar
       FROM inserted i
       JOIN users u ON i.sender_id = u.id`,
      [validOrderId, chatType, senderId, senderRole, message, mediaUrl]
    );
    return result.rows[0];
  }

  async markAsRead(orderId, chatType, userId) {
    const isValidUuid = orderId && UUID_REGEX.test(orderId);
    if (isValidUuid) {
      await db.query(
        'UPDATE chats SET is_read = true WHERE order_id = $1 AND chat_type = $2 AND sender_id != $3 AND is_read = false',
        [orderId, chatType, userId]
      );
    } else {
      await db.query(
        'UPDATE chats SET is_read = true WHERE order_id IS NULL AND chat_type = $1 AND sender_id != $2 AND is_read = false',
        [chatType, userId]
      );
    }
    return { message: 'Messages marked as read' };
  }
}

module.exports = new ChatService();
