const crypto = require('crypto');

/**
 * Generate a random OTP of given length.
 * @param {number} length - OTP length (default 6)
 * @returns {string}
 */
function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Generate a unique referral code.
 * @param {string} name - User's name (used as prefix)
 * @returns {string}
 */
function generateReferralCode(name = '') {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix || 'RB'}${suffix}`;
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Parse pagination parameters from query string.
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Remove undefined/null fields from an object.
 * @param {object} obj
 * @returns {object}
 */
function cleanObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
  );
}

/**
 * Convert amount to paise (Razorpay uses paise).
 * @param {number} amount - Amount in INR
 * @returns {number} Amount in paise
 */
function toPaise(amount) {
  return Math.round(amount * 100);
}

/**
 * Convert paise to INR.
 * @param {number} paise
 * @returns {number} Amount in INR
 */
function toINR(paise) {
  return paise / 100;
}

module.exports = {
  generateOTP,
  generateReferralCode,
  calculateDistance,
  parsePagination,
  cleanObject,
  toPaise,
  toINR,
};
