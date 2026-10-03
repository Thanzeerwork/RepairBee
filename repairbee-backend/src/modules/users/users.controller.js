const usersService = require('./users.service');
const ApiResponse = require('../../utils/apiResponse');

class UsersController {
  async getProfile(req, res, next) {
    try {
      const user = await usersService.getProfile(req.user.id);
      return ApiResponse.success(res, user);
    } catch (error) { next(error); }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await usersService.updateProfile(req.user.id, req.body);
      return ApiResponse.success(res, user, 'Profile updated');
    } catch (error) { next(error); }
  }

  async updateProfilePic(req, res, next) {
    try {
      if (!req.file) return next(require('../../utils/apiError').badRequest('No file uploaded'));
      const fileUrl = `/uploads/${req.file.filename}`;
      const user = await usersService.updateProfilePic(req.user.id, fileUrl);
      return ApiResponse.success(res, user, 'Profile picture updated');
    } catch (error) { next(error); }
  }

  async updateFcmToken(req, res, next) {
    try {
      const result = await usersService.updateFcmToken(req.user.id, req.body.fcm_token);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  // Addresses
  async getAddresses(req, res, next) {
    try {
      const addresses = await usersService.getAddresses(req.user.id);
      return ApiResponse.success(res, addresses);
    } catch (error) { next(error); }
  }

  async addAddress(req, res, next) {
    try {
      const address = await usersService.addAddress(req.user.id, req.body);
      return ApiResponse.created(res, address, 'Address added');
    } catch (error) { next(error); }
  }

  async updateAddress(req, res, next) {
    try {
      const address = await usersService.updateAddress(req.user.id, req.params.id, req.body);
      return ApiResponse.success(res, address, 'Address updated');
    } catch (error) { next(error); }
  }

  async deleteAddress(req, res, next) {
    try {
      const result = await usersService.deleteAddress(req.user.id, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  async setDefaultAddress(req, res, next) {
    try {
      const result = await usersService.setDefaultAddress(req.user.id, req.params.id);
      return ApiResponse.success(res, result);
    } catch (error) { next(error); }
  }

  // Admin
  async listUsers(req, res, next) {
    try {
      const { users, total, page, limit } = await usersService.listUsers(req.query);
      return ApiResponse.paginated(res, users, total, page, limit);
    } catch (error) { next(error); }
  }

  async toggleBlockUser(req, res, next) {
    try {
      const user = await usersService.toggleBlockUser(req.params.id, req.user.id);
      const msg = user.is_active ? 'User unblocked' : 'User blocked';
      return ApiResponse.success(res, user, msg);
    } catch (error) { next(error); }
  }
}

module.exports = new UsersController();
