const withdrawalsService = require('./withdrawals.service');
const ApiResponse = require('../../utils/apiResponse');
class WithdrawalsController {
  async request(req, res, next) {
    try {
      const w = await withdrawalsService.requestWithdrawal(req.user.id, req.user.role, req.body);
      return ApiResponse.created(res, w, 'Withdrawal requested');
    } catch (e) { next(e); }
  }
  async list(req, res, next) {
    try {
      const { withdrawals, total, page, limit } = await withdrawalsService.getWithdrawals(req.user.id, req.user.role, req.query);
      return ApiResponse.paginated(res, withdrawals, total, page, limit);
    } catch (e) { next(e); }
  }
  async process(req, res, next) {
    try {
      const w = await withdrawalsService.processWithdrawal(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, w, 'Withdrawal processed');
    } catch (e) { next(e); }
  }
}
module.exports = new WithdrawalsController();
