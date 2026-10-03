const analyticsService = require('./analytics.service');
const ApiResponse = require('../../utils/apiResponse');
class AnalyticsController {
  async getOverview(req, res, next) {
    try {
      const data = await analyticsService.getOverview();
      return ApiResponse.success(res, data);
    } catch (e) { next(e); }
  }
  async getOrderTrends(req, res, next) {
    try {
      const data = await analyticsService.getOrderTrends(req.query);
      return ApiResponse.success(res, data);
    } catch (e) { next(e); }
  }
  async getRevenue(req, res, next) {
    try {
      const data = await analyticsService.getRevenueBreakdown();
      return ApiResponse.success(res, data);
    } catch (e) { next(e); }
  }
  async getTopShops(req, res, next) {
    try {
      const data = await analyticsService.getTopShops(req.query.limit);
      return ApiResponse.success(res, data);
    } catch (e) { next(e); }
  }
  async getPartnerPerformance(req, res, next) {
    try {
      const data = await analyticsService.getPartnerPerformance();
      return ApiResponse.success(res, data);
    } catch (e) { next(e); }
  }
  async getSlaAndFraudRadar(req, res, next) {
    try {
      const data = await analyticsService.getSlaAndFraudRadar();
      return ApiResponse.success(res, data);
    } catch (e) { next(e); }
  }
}
module.exports = new AnalyticsController();
