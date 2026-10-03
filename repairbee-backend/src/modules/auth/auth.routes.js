const { Router } = require('express');
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { authLimiter, otpLimiter } = require('../../middleware/rateLimiter');
const {
  registerValidator,
  loginValidator,
  googleAuthValidator,
  sendOtpValidator,
  verifyOtpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('./auth.validators');

const router = Router();

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/google', authLimiter, googleAuthValidator, validate, authController.googleAuth);
router.post('/send-otp', otpLimiter, sendOtpValidator, validate, authController.sendOTP);
router.post('/verify-otp', authLimiter, verifyOtpValidator, validate, authController.verifyOTP);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidator, validate, authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
