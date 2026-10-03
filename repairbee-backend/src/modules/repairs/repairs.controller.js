const repairsService = require('./repairs.service');
const ApiResponse = require('../../utils/apiResponse');

class RepairsController {
  async createRepairRequest(req, res, next) {
    try {
      // Attach uploaded media URLs
      if (req.files && req.files.length > 0) {
        req.body.media_urls = req.files.map(f => `/uploads/${f.filename}`);
      }
      const order = await repairsService.createRepairRequest(req.user.id, req.body);
      return ApiResponse.created(res, order, 'Repair request created');
    } catch (error) { next(error); }
  }

  async getMyOrders(req, res, next) {
    try {
      const { orders, total, page, limit } = await repairsService.getCustomerOrders(req.user.id, req.query);
      return ApiResponse.paginated(res, orders, total, page, limit);
    } catch (error) { next(error); }
  }

  async getOrderDetails(req, res, next) {
    try {
      const order = await repairsService.getOrderDetails(req.params.id, req.user.id, req.user.role);
      return ApiResponse.success(res, order);
    } catch (error) { next(error); }
  }

  async getOrderInvoice(req, res, next) {
    try {
      const invoice = await repairsService.getOrderInvoice(req.params.id, req.user.id, req.user.role);
      return ApiResponse.success(res, invoice);
    } catch (error) { next(error); }
  }

  async selectShop(req, res, next) {
    try {
      const order = await repairsService.selectShop(req.params.id, req.user.id, req.body.shop_id);
      return ApiResponse.success(res, order, 'Shop selected');
    } catch (error) { next(error); }
  }

  async updateStatus(req, res, next) {
    try {
      const order = await repairsService.updateStatus(
        req.params.id, req.user.id, req.user.role, req.body.status, req.body.note
      );
      return ApiResponse.success(res, order, 'Status updated');
    } catch (error) { next(error); }
  }

  async cancelOrder(req, res, next) {
    try {
      const result = await repairsService.cancelOrder(req.params.id, req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async confirmDelivery(req, res, next) {
    try {
      const result = await repairsService.confirmDelivery(req.params.id, req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async releaseEscrow(req, res, next) {
    try {
      const result = await repairsService.releaseEscrow(req.params.id, req.user.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  // Shop
  async getShopIncomingOrders(req, res, next) {
    try {
      const { orders, total, page, limit } = await repairsService.getShopIncomingOrders(req.user.id, req.query);
      return ApiResponse.paginated(res, orders, total, page, limit);
    } catch (error) { next(error); }
  }

  // Admin
  async getAllOrders(req, res, next) {
    try {
      const { orders, total, page, limit } = await repairsService.getAllOrders(req.query);
      return ApiResponse.paginated(res, orders, total, page, limit);
    } catch (error) { next(error); }
  }
  // Cleanroom 12-Point QC Report
  async saveQcReport(req, res, next) {
    try {
      const result = await repairsService.saveQcReport(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, result, 'Cleanroom QC Report certified successfully');
    } catch (error) { next(error); }
  }

  async getQcReport(req, res, next) {
    try {
      const report = await repairsService.getQcReport(req.params.id);
      return ApiResponse.success(res, report);
    } catch (error) { next(error); }
  }

  async saveVideoProof(req, res, next) {
    try {
      const result = await repairsService.saveVideoProof(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, result, 'Cleanroom Video Proof published and cryptographically certified');
    } catch (error) { next(error); }
  }

  async getVideoProof(req, res, next) {
    try {
      const proof = await repairsService.getVideoProof(req.params.id);
      return ApiResponse.success(res, proof);
    } catch (error) { next(error); }
  }
}

module.exports = new RepairsController();
