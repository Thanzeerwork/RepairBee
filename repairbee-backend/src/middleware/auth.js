const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/database');
const { verifySupabaseToken, syncSupabaseUserToDb } = require('../config/supabase');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

/**
 * Resolve user from either native RepairBee JWT or Supabase Auth JWT.
 * @param {string} token
 * @returns {Promise<object>} Active user record
 */
async function resolveUserFromToken(token) {
  // 1. Try local RepairBee JWT verification
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const result = await db.query(
      'SELECT id, name, email, phone, role, is_active, profile_pic_url, wallet_balance FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }
  } catch (err) {
    // If not a valid local JWT, fall through to check Supabase JWT
  }

  // 2. Try Supabase JWT verification
  const supabaseUser = await verifySupabaseToken(token);
  if (supabaseUser) {
    const dbUser = await syncSupabaseUserToDb(supabaseUser);
    if (dbUser) {
      return dbUser;
    }
  }

  return null;
}

/**
 * Middleware: Verify JWT access token (local or Supabase) and attach user to req.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const user = await resolveUserFromToken(token);

    if (!user) {
      throw ApiError.unauthorized('Invalid or expired authentication token');
    }

    if (!user.is_active) {
      throw ApiError.forbidden('Account has been deactivated');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware factory: Restrict access to specific roles.
 * @param  {...string} roles - Allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Access denied. Required roles: ${roles.join(', ')}`));
    }
    next();
  };
}

/**
 * Optional authentication — attaches user if token present, but doesn't require it.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const user = await resolveUserFromToken(token);

    if (user && user.is_active) {
      req.user = user;
    }
  } catch (error) {
    logger.debug('Optional auth failed', { error: error.message });
  }
  next();
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  resolveUserFromToken,
};
