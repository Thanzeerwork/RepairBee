const warrantyService = require('./warranty.service');
const ApiResponse = require('../../utils/apiResponse');

class WarrantyController {
  async raiseClaim(req, res, next) {
    try {
      const order = await warrantyService.raiseClaim(req.params.orderId, req.user.id, req.body);
      return ApiResponse.created(res, order, '30-Day Warranty claim registered! Free doorstep courier pickup initiated.');
    } catch (e) { next(e); }
  }

  async getWarrantyInfo(req, res, next) {
    try {
      const info = await warrantyService.getWarrantyInfo(req.params.orderId);
      return ApiResponse.success(res, info);
    } catch (e) { next(e); }
  }
}

module.exports = new WarrantyController();
