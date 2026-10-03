const { body } = require('express-validator');

const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid phone number'),
  body('role')
    .optional()
    .isIn(['customer', 'shop_owner', 'delivery_partner']).withMessage('Invalid role'),
  body('referralCode')
    .optional()
    .trim(),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const googleAuthValidator = [
  body('idToken')
    .notEmpty().withMessage('Google ID token is required'),
  body('role')
    .optional()
    .isIn(['customer', 'shop_owner', 'delivery_partner']).withMessage('Invalid role'),
];

const sendOtpValidator = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid phone number'),
];

const verifyOtpValidator = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required'),
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
];

const resetPasswordValidator = [
  body('password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('token')
    .optional(),
  body('code')
    .optional(),
  body('email')
    .optional(),
];

module.exports = {
  registerValidator,
  loginValidator,
  googleAuthValidator,
  sendOtpValidator,
  verifyOtpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
};
