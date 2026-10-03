const shopsService = require('./shops.service');
const ApiResponse = require('../../utils/apiResponse');

class ShopsController {
  async register(req, res, next) {
    try {
      const shop = await shopsService.register(req.user.id, req.body);
      return ApiResponse.created(res, shop, 'Shop registered. Pending admin approval.');
    } catch (error) { next(error); }
  }

  async browseShops(req, res, next) {
    try {
      const { shops, total, page, limit } = await shopsService.browseShops(req.query);
      return ApiResponse.paginated(res, shops, total, page, limit);
    } catch (error) { next(error); }
  }

  async getShop(req, res, next) {
    try {
      const shop = await shopsService.getShopById(req.params.id);
      return ApiResponse.success(res, shop);
    } catch (error) { next(error); }
  }

  async updateShop(req, res, next) {
    try {
      const shop = await shopsService.updateShop(req.user.id, req.body);
      return ApiResponse.success(res, shop, 'Shop updated');
    } catch (error) { next(error); }
  }

  async getDashboard(req, res, next) {
    try {
      const data = await shopsService.getDashboard(req.user.id);
      return ApiResponse.success(res, data);
    } catch (error) { next(error); }
  }

  // Admin
  async getPendingShops(req, res, next) {
    try {
      const shops = await shopsService.getPendingShops();
      return ApiResponse.success(res, shops);
    } catch (error) { next(error); }
  }

  async approveShop(req, res, next) {
    try {
      const shop = await shopsService.approveShop(req.params.id);
      return ApiResponse.success(res, shop, 'Shop approved');
    } catch (error) { next(error); }
  }

  async rejectShop(req, res, next) {
    try {
      const result = await shopsService.rejectShop(req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async toggleBlockShop(req, res, next) {
    try {
      const shop = await shopsService.toggleBlockShop(req.params.id);
      const msg = shop.is_active ? 'Shop unblocked' : 'Shop blocked';
      return ApiResponse.success(res, shop, msg);
    } catch (error) { next(error); }
  }

  async updateCommissionRate(req, res, next) {
    try {
      const shop = await shopsService.updateCommissionRate(req.params.id, req.body.commission_rate);
      return ApiResponse.success(res, shop, 'Commission rate updated');
    } catch (error) { next(error); }
  }
}

module.exports = new ShopsController();
