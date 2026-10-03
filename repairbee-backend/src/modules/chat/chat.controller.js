const chatService = require('./chat.service');
const ApiResponse = require('../../utils/apiResponse');

class ChatController {
  async getHistory(req, res, next) {
    try {
      const { messages, total, page, limit } = await chatService.getHistory(
        req.params.orderId, req.params.chatType, req.query
      );
      return ApiResponse.paginated(res, messages, total, page, limit);
    } catch (error) { next(error); }
  }

  async sendMessage(req, res, next) {
    try {
      const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;
      const msg = await chatService.sendMessage(
        req.params.orderId, req.params.chatType,
        req.user.id, req.user.role, req.body.message, mediaUrl
      );
      return ApiResponse.created(res, msg);
    } catch (error) { next(error); }
  }
}

module.exports = new ChatController();
