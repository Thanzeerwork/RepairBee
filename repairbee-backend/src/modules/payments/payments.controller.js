const paymentsService = require('./payments.service');
const ApiResponse = require('../../utils/apiResponse');

class PaymentsController {
  async createOrder(req, res, next) {
    try {
      const result = await paymentsService.createPaymentOrder(req.body.order_id, req.user.id);
      return ApiResponse.success(res, result, 'Razorpay order created');
    } catch (error) { next(error); }
  }

  async verifyPayment(req, res, next) {
    try {
      const result = await paymentsService.verifyPayment(req.body);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async getWallet(req, res, next) {
    try {
      const result = await paymentsService.getWalletBalance(req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async topUpWallet(req, res, next) {
    try {
      const result = await paymentsService.topUpWallet(req.user.id, req.body.amount);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async payFromWallet(req, res, next) {
    try {
      const result = await paymentsService.payFromWallet(req.body.order_id, req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }
}

module.exports = new PaymentsController();
