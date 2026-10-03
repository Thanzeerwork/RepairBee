const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/apiError');
const env = require('../config/env');

// In development, disable rate limiting so tests aren't blocked
const skip = () => env.NODE_ENV === 'development';

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw ApiError.tooMany('Too many requests, please try again later');
  },
});

// Stricter limiter for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw ApiError.tooMany('Too many authentication attempts, please try again later');
  },
});

// OTP rate limiter
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw ApiError.tooMany('Too many OTP requests, please wait before trying again');
  },
});

module.exports = { apiLimiter, authLimiter, otpLimiter };
