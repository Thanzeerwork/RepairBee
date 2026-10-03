const earningsService = require('./earnings.service');
const ApiResponse = require('../../utils/apiResponse');
const { ROLES } = require('../../utils/constants');
class EarningsController {
  async getEarnings(req, res, next) {
    try {
      let data;
      if (req.user.role === ROLES.SHOP_OWNER) data = await earningsService.getShopEarnings(req.user.id);
      else if (req.user.role === ROLES.DELIVERY_PARTNER) data = await earningsService.getPartnerEarnings(req.user.id);
      else return next(require('../../utils/apiError').forbidden('Not a shop or partner'));
      return ApiResponse.success(res, data);
    } catch (e) { next(e); }
  }
}
module.exports = new EarningsController();
