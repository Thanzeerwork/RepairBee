const disputesService = require('./disputes.service');
const ApiResponse = require('../../utils/apiResponse');

class DisputesController {
  async raiseDispute(req, res, next) {
    try {
      if (req.files) req.body.evidence_urls = req.files.map(f => `/uploads/${f.filename}`);
      const d = await disputesService.raiseDispute(req.params.orderId, req.user.id, req.body);
      return ApiResponse.created(res, d, 'Dispute raised');
    } catch (e) { next(e); }
  }

  async getDisputes(req, res, next) {
    try {
      const { disputes, total, page, limit } = await disputesService.getDisputes(req.query, req.user.id, req.user.role);
      return ApiResponse.paginated(res, disputes, total, page, limit);
    } catch (e) { next(e); }
  }

  async getDisputeById(req, res, next) {
    try {
      const d = await disputesService.getDisputeById(req.params.id);
      return ApiResponse.success(res, d);
    } catch (e) { next(e); }
  }

  async resolveDispute(req, res, next) {
    try {
      const d = await disputesService.resolveDispute(req.params.id, req.user.id, req.body);
      return ApiResponse.success(res, d, 'Dispute resolved');
    } catch (e) { next(e); }
  }
}

module.exports = new DisputesController();
