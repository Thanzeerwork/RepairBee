const rewardsService = require('./rewards.service');
const ApiResponse = require('../../utils/apiResponse');

class RewardsController {
  async getLoyaltyProfile(req, res, next) {
    try {
      const profile = await rewardsService.getLoyaltyProfile(req.user.id);
      return ApiResponse.success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async getScratchCards(req, res, next) {
    try {
      const data = await rewardsService.getScratchCards(req.user.id);
      return ApiResponse.success(res, data);
    } catch (error) {
      next(error);
    }
  }

  async claimScratchCard(req, res, next) {
    try {
      const { id } = req.params;
      const result = await rewardsService.claimScratchCard(req.user.id, id);
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  async generateDemoCard(req, res, next) {
    try {
      const card = await rewardsService.generateDemoCard(req.user.id);
      return ApiResponse.created(res, card, 'Demo scratch card issued');
    } catch (error) {
      next(error);
    }
  }

  async getReferralTree(req, res, next) {
    try {
      const tree = await rewardsService.getReferralTree(req.user.id);
      return ApiResponse.success(res, tree);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RewardsController();
