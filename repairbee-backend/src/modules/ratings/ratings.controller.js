const ratingsService = require('./ratings.service');
const ApiResponse = require('../../utils/apiResponse');
class RatingsController {
  async rateShop(req, res, next) {
    try {
      const r = await ratingsService.rateShop(req.params.orderId, req.user.id, req.body);
      return ApiResponse.created(res, r, 'Shop rated');
    } catch (e) { next(e); }
  }
  async ratePartner(req, res, next) {
    try {
      const r = await ratingsService.ratePartner(req.params.orderId, req.user.id, req.body);
      return ApiResponse.created(res, r, 'Delivery partner rated');
    } catch (e) { next(e); }
  }
  async getShopReviews(req, res, next) {
    try {
      const data = await ratingsService.getShopReviews(req.params.shopId, req.query);
      return ApiResponse.paginated(res, data.reviews, data.total, data.page, data.limit, 'Shop reviews retrieved', { starDistribution: data.starDistribution });
    } catch (e) { next(e); }
  }

  async getOrderRatings(req, res, next) {
    try {
      const r = await ratingsService.getOrderRatings(req.params.orderId, req.user.id);
      return ApiResponse.success(res, r, 'Order ratings retrieved');
    } catch (e) { next(e); }
  }

  async getMyShopReviews(req, res, next) {
    try {
      const data = await ratingsService.getMyShopReviews(req.user.id, req.query);
      return ApiResponse.success(res, data, 'Workshop reputation and reviews retrieved');
    } catch (e) { next(e); }
  }
}
module.exports = new RatingsController();
