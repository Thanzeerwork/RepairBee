const referralsService = require('./referrals.service');
const ApiResponse = require('../../utils/apiResponse');
class ReferralsController {
  async getMyCode(req, res, next) {
    try {
      const result = await referralsService.getMyCode(req.user.id);
      return ApiResponse.success(res, result);
    } catch (e) { next(e); }
  }
  async apply(req, res, next) {
    try {
      const result = await referralsService.applyReferralCode(req.user.id, req.body.code);
      return ApiResponse.success(res, result, 'Referral code applied');
    } catch (e) { next(e); }
  }
  async getStats(req, res, next) {
    try {
      const stats = await referralsService.getReferralStats(req.user.id);
      return ApiResponse.success(res, stats);
    } catch (e) { next(e); }
  }
}
module.exports = new ReferralsController();
