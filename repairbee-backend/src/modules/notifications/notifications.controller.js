const notificationsService = require('./notifications.service');
const outboundMessagesService = require('./outboundMessages.service');
const ApiResponse = require('../../utils/apiResponse');

class NotificationsController {
  async getNotifications(req, res, next) {
    try {
      const data = await notificationsService.getUserNotifications(req.user.id, req.query);
      return res.status(200).json({
        success: true,
        message: 'Success',
        data: data.notifications,
        unread_count: data.unread_count,
        pagination: {
          total: data.total,
          page: data.page,
          limit: data.limit,
          totalPages: Math.ceil(data.total / data.limit),
          hasMore: data.page * data.limit < data.total,
        },
      });
    } catch (error) { next(error); }
  }

  async markAsRead(req, res, next) {
    try {
      const result = await notificationsService.markAsRead(req.params.id, req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationsService.markAllAsRead(req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  // --- WhatsApp & SMS Simulator Endpoints ---

  async getOutboundMessages(req, res, next) {
    try {
      const { orderId, channel, recipientPhone, limit, page } = req.query;
      const data = await outboundMessagesService.getMessages({
        orderId,
        channel,
        recipientPhone,
        limit: limit ? parseInt(limit, 10) : 50,
        page: page ? parseInt(page, 10) : 1
      });
      return ApiResponse.success(res, data);
    } catch (error) { next(error); }
  }

  async getAvailableTemplates(req, res, next) {
    try {
      const templates = outboundMessagesService.getAvailableTemplates();
      return ApiResponse.success(res, { templates });
    } catch (error) { next(error); }
  }

  async simulateDispatch(req, res, next) {
    try {
      const { orderId, templateKey, channel, customRecipientPhone } = req.body;
      if (!orderId || !templateKey) {
        return res.status(400).json({ success: false, message: 'orderId and templateKey are required' });
      }
      const messages = await outboundMessagesService.dispatch({
        orderId,
        templateKey,
        channel: channel || 'both',
        customRecipientPhone
      });
      return ApiResponse.success(res, {
        message: `Successfully dispatched ${messages.length} notification(s)`,
        dispatched: messages
      });
    } catch (error) { next(error); }
  }

  async updateMessageStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await outboundMessagesService.updateStatus(id, status || 'delivered');
      return ApiResponse.success(res, updated);
    } catch (error) { next(error); }
  }
}

module.exports = new NotificationsController();
