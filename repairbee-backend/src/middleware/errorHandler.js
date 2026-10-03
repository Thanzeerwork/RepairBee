const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Global error handling middleware.
 * Must be registered LAST in the middleware chain.
 */
function errorHandler(err, req, res, next) {
  // Log the error
  if (err instanceof ApiError) {
    logger.warn(`API Error: ${err.message}`, {
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Handle known ApiError
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.statusCode, err.message, err.errors);
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ApiResponse.error(res, 400, 'File too large');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return ApiResponse.error(res, 400, 'Too many files');
    }
    return ApiResponse.error(res, 400, err.message);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 401, 'Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 401, 'Token expired');
  }

  // Handle PostgreSQL errors
  if (err.code === '23505') {
    // Unique violation
    return ApiResponse.error(res, 409, 'Duplicate entry. This resource already exists.');
  }
  if (err.code === '23503') {
    // Foreign key violation
    return ApiResponse.error(res, 400, 'Referenced resource does not exist.');
  }

  // Default: Internal server error
  const message = env.isDev ? err.message : 'Internal server error';
  return ApiResponse.error(res, 500, message);
}

/**
 * 404 handler for undefined routes.
 */
function notFoundHandler(req, res) {
  return ApiResponse.error(res, 404, `Route ${req.method} ${req.path} not found`);
}

module.exports = { errorHandler, notFoundHandler };
