const deliveriesService = require('./deliveries.service');
const ApiResponse = require('../../utils/apiResponse');

class DeliveriesController {
  async assignPartner(req, res, next) {
    try {
      const result = await deliveriesService.assignPartner(req.body.order_id, req.body.partner_id, req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async getAvailablePickups(req, res, next) {
    try {
      const pickups = await deliveriesService.getAvailablePickups();
      return ApiResponse.success(res, pickups);
    } catch (error) { next(error); }
  }

  async claimPickup(req, res, next) {
    try {
      const result = await deliveriesService.claimPickup(req.params.orderId, req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async getMyJobs(req, res, next) {
    try {
      const { jobs, total, page, limit } = await deliveriesService.getMyJobs(req.user.id, req.query);
      return ApiResponse.paginated(res, jobs, total, page, limit);
    } catch (error) { next(error); }
  }

  async verifyPickupWithPouch(req, res, next) {
    try {
      const result = await deliveriesService.verifyPickupWithPouch(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async handoverToShop(req, res, next) {
    try {
      const result = await deliveriesService.handoverToShop(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async updateLocation(req, res, next) {
    try {
      const result = await deliveriesService.updateLocation(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async verifyDeliveryOtp(req, res, next) {
    try {
      const result = await deliveriesService.verifyDeliveryOtp(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async updateStatus(req, res, next) {
    try {
      const result = await deliveriesService.updateDeliveryStatus(req.params.id, req.user.id, req.body.status, req.body.distance_km);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async getAvailablePartners(req, res, next) {
    try {
      const partners = await deliveriesService.getAvailablePartners();
      return ApiResponse.success(res, partners);
    } catch (error) { next(error); }
  }
}

module.exports = new DeliveriesController();
