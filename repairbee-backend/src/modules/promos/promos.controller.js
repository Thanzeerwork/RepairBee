const promosService = require('./promos.service');
const ApiResponse = require('../../utils/apiResponse');
class PromosController {
  async validate(req, res, next) {
    try {
      const result = await promosService.validateAndApply(req.body.code, req.body.order_amount);
      return ApiResponse.success(res, result, 'Promo code valid');
    } catch (e) { next(e); }
  }
  async listActive(req, res, next) {
    try {
      const promos = await promosService.listActivePromos();
      return ApiResponse.success(res, promos);
    } catch (e) { next(e); }
  }
  async create(req, res, next) {
    try {
      const p = await promosService.createPromo(req.body);
      return ApiResponse.created(res, p);
    } catch (e) { next(e); }
  }
  async list(req, res, next) {
    try {
      const { promos, total, page, limit } = await promosService.listPromos(req.query);
      return ApiResponse.paginated(res, promos, total, page, limit);
    } catch (e) { next(e); }
  }
  async update(req, res, next) {
    try {
      const p = await promosService.updatePromo(req.params.id, req.body);
      return ApiResponse.success(res, p, 'Promo updated');
    } catch (e) { next(e); }
  }
  async delete(req, res, next) {
    try {
      const result = await promosService.deletePromo(req.params.id);
      return ApiResponse.success(res, result);
    } catch (e) { next(e); }
  }
}
module.exports = new PromosController();
