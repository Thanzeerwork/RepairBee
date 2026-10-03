const authService = require('./auth.service');
const ApiResponse = require('../../utils/apiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return ApiResponse.created(res, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async googleAuth(req, res, next) {
    try {
      const result = await authService.googleAuth(req.body);
      return ApiResponse.success(res, result, 'Google authentication successful');
    } catch (error) {
      next(error);
    }
  }

  async sendOTP(req, res, next) {
    try {
      const result = await authService.sendOTP(req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async verifyOTP(req, res, next) {
    try {
      const result = await authService.verifyOTP(req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const result = await authService.refreshToken(req.body);
      return ApiResponse.success(res, result, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
