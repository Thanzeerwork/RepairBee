const quotesService = require('./quotes.service');
const ApiResponse = require('../../utils/apiResponse');

class QuotesController {
  async sendQuote(req, res, next) {
    try {
      const order = await quotesService.sendQuote(req.params.orderId, req.user.id, req.body);
      return ApiResponse.success(res, order, 'Quote sent to customer');
    } catch (error) { next(error); }
  }

  async approveQuote(req, res, next) {
    try {
      const order = await quotesService.approveQuote(req.params.orderId, req.user.id, req.body);
      return ApiResponse.success(res, order, 'Quote approved');
    } catch (error) { next(error); }
  }

  async rejectQuote(req, res, next) {
    try {
      const order = await quotesService.rejectQuote(req.params.orderId, req.user.id);
      return ApiResponse.success(res, order, 'Quote rejected');
    } catch (error) { next(error); }
  }
}

module.exports = new QuotesController();
