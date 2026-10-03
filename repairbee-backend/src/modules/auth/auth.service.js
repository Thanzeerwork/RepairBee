const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const env = require('../../config/env');
const ApiError = require('../../utils/apiError');
const { generateReferralCode, generateOTP } = require('../../utils/helpers');
const { ROLES } = require('../../utils/constants');
const logger = require('../../utils/logger');

class AuthService {
  /**
   * Register a new user with email + password.
   */
  async register({ name, email, password, phone, role, referralCode: enteredReferralCode }) {
    // Check if email already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw ApiError.conflict('Email already registered');
    }

    // Check phone uniqueness if provided
    if (phone) {
      const phoneExists = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (phoneExists.rows.length > 0) {
        throw ApiError.conflict('Phone number already registered');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique referral code
    const referralCode = generateReferralCode(name);

    // Set role — admin cannot be self-registered
    const userRole = role || ROLES.CUSTOMER;
    if (userRole === ROLES.ADMIN) {
      throw ApiError.forbidden('Cannot self-register as admin');
    }

    // Verify referral code if provided
    let referrerUser = null;
    const cleanRefCode = enteredReferralCode ? enteredReferralCode.trim().toUpperCase() : null;
    if (cleanRefCode) {
      const refCheck = await db.query(
        'SELECT id, name FROM users WHERE UPPER(referral_code) = $1',
        [cleanRefCode]
      );
      if (refCheck.rows.length === 0) {
        throw ApiError.badRequest('Invalid referral code. Please check the code or leave it blank.');
      }
      referrerUser = refCheck.rows[0];
    }

    // Insert user
    const result = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, auth_provider, role, referral_code, is_active)
       VALUES ($1, $2, $3, $4, 'email', $5, $6, true)
       RETURNING id, name, email, phone, role, wallet_balance, referral_code, is_active, created_at`,
      [name, email, phone, passwordHash, userRole, referralCode]
    );

    const user = result.rows[0];

    // Link referral if provided
    if (referrerUser) {
      try {
        await db.query(
          `INSERT INTO referrals (referrer_id, referee_id, referral_code, referrer_reward_amount, referee_discount_amount, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')
           ON CONFLICT (referee_id) DO NOTHING`,
          [
            referrerUser.id,
            user.id,
            cleanRefCode,
            env.REFERRAL_REWARD_AMOUNT || 50,
            env.REFEREE_DISCOUNT_AMOUNT || 100,
          ]
        );

        const notificationsService = require('../notifications/notifications.service');
        await notificationsService.send(referrerUser.id, {
          title: '🎉 Friend Joined via Your Referral!',
          body: `${name} just registered using your referral code ${cleanRefCode}. You will receive ₹${env.REFERRAL_REWARD_AMOUNT || 50} when their first repair completes!`,
          type: 'referral',
        });
      } catch (refErr) {
        logger.warn('Referral recording failed', { error: refErr.message });
      }
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.role);

    return { user, ...tokens };
  }

  /**
   * Login with email + password.
   */
  async login({ email, password }) {
    const result = await db.query(
      `SELECT id, name, email, phone, password_hash, role, wallet_balance, referral_code, is_active, profile_pic_url
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw ApiError.forbidden('Account has been deactivated');
    }

    if (!user.password_hash) {
      throw ApiError.unauthorized('This account uses Google login. Please use Google Sign-In.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Remove password_hash from response
    delete user.password_hash;

    const tokens = this.generateTokens(user.id, user.role);

    return { user, ...tokens };
  }

  /**
   * Google OAuth login/register.
   * Verifies the Google ID token via Firebase Admin SDK.
   */
  async googleAuth({ idToken, role }) {
    try {
      // For MVP without Firebase configured, we'll decode the token structure
      // In production, use: const decodedToken = await admin.auth().verifyIdToken(idToken);
      let decodedToken;
      
      try {
        const admin = require('firebase-admin');
        if (admin.apps.length === 0 && env.FIREBASE_PROJECT_ID) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: env.FIREBASE_PROJECT_ID,
              clientEmail: env.FIREBASE_CLIENT_EMAIL,
              privateKey: env.FIREBASE_PRIVATE_KEY,
            }),
          });
        }
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (firebaseError) {
        logger.warn('Firebase not configured, Google Auth unavailable', { error: firebaseError.message });
        throw ApiError.badRequest('Google authentication is not configured. Please use email/password login.');
      }

      const { email, name, picture } = decodedToken;

      // Check if user exists
      const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);

      let user;
      if (existing.rows.length > 0) {
        user = existing.rows[0];
        if (!user.is_active) {
          throw ApiError.forbidden('Account has been deactivated');
        }
      } else {
        // Register new user
        const referralCode = generateReferralCode(name || 'USER');
        const userRole = role || ROLES.CUSTOMER;

        const result = await db.query(
          `INSERT INTO users (name, email, auth_provider, role, profile_pic_url, referral_code, is_active)
           VALUES ($1, $2, 'google', $3, $4, $5, true)
           RETURNING id, name, email, phone, role, wallet_balance, referral_code, is_active, profile_pic_url, created_at`,
          [name || 'User', email, userRole, picture, referralCode]
        );
        user = result.rows[0];
      }

      delete user.password_hash;
      const tokens = this.generateTokens(user.id, user.role);
      return { user, ...tokens };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Google auth error', { error: error.message });
      throw ApiError.unauthorized('Google authentication failed');
    }
  }

  /**
   * Send OTP to phone number (store in Redis or memory for MVP).
   */
  async sendOTP({ phone }) {
    const otp = generateOTP(6);
    
    // For MVP: store OTP in memory (in production, use Redis)
    if (!global._otpStore) global._otpStore = {};
    global._otpStore[phone] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    // In production: send via Twilio/MSG91
    logger.info(`OTP for ${phone}: ${otp}`); // Only in dev
    
    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify phone OTP.
   */
  async verifyOTP({ phone, otp }) {
    const stored = global._otpStore?.[phone];
    
    if (!stored) {
      throw ApiError.badRequest('OTP not found. Please request a new one.');
    }

    if (Date.now() > stored.expiresAt) {
      delete global._otpStore[phone];
      throw ApiError.badRequest('OTP expired. Please request a new one.');
    }

    if (stored.otp !== otp) {
      throw ApiError.badRequest('Invalid OTP');
    }

    // Mark phone as verified
    delete global._otpStore[phone];
    
    // Find user by phone and mark verified
    const result = await db.query(
      `UPDATE users SET is_phone_verified = true, updated_at = NOW() WHERE phone = $1
       RETURNING id, name, email, phone, role, is_phone_verified`,
      [phone]
    );

    if (result.rows.length === 0) {
      return { verified: true, message: 'Phone verified but no user found with this number' };
    }

    return { verified: true, user: result.rows[0] };
  }

  /**
   * Forgot password — generate reset token & 6-digit verification code.
   */
  async forgotPassword({ email }) {
    const result = await db.query('SELECT id, name FROM users WHERE email = $1', [email]);
    
    // Don't reveal whether email exists to external clients in production
    if (result.rows.length === 0) {
      return { message: 'If an account with that email exists, a password reset code has been sent.' };
    }

    const resetToken = jwt.sign(
      { userId: result.rows[0].id, type: 'password_reset' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    // Generate 6-digit numeric reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    if (!global._pwdResetStore) global._pwdResetStore = {};
    global._pwdResetStore[email] = {
      code: resetCode,
      token: resetToken,
      userId: result.rows[0].id,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };

    // In production: send email via SendGrid / AWS SES
    logger.info(`Password reset for ${email} — token: ${resetToken}, code: ${resetCode}`);

    return {
      message: 'Password reset code sent successfully.',
      ...(env.isDev ? { token: resetToken, code: resetCode } : {}),
    };
  }

  /**
   * Reset password with token or verification code.
   */
  async resetPassword({ token, email, code, password }) {
    try {
      let targetUserId;

      if (email && code && global._pwdResetStore?.[email]) {
        const entry = global._pwdResetStore[email];
        if (Date.now() > entry.expiresAt) {
          delete global._pwdResetStore[email];
          throw ApiError.badRequest('Reset code expired. Please request a new one.');
        }
        if (entry.code !== code) {
          throw ApiError.badRequest('Invalid 6-digit reset code.');
        }
        targetUserId = entry.userId;
        delete global._pwdResetStore[email];
      } else if (code) {
        // Look up by code across active resets
        const foundKey = Object.keys(global._pwdResetStore || {}).find(
          k => global._pwdResetStore[k].code === code && Date.now() <= global._pwdResetStore[k].expiresAt
        );
        if (foundKey) {
          targetUserId = global._pwdResetStore[foundKey].userId;
          delete global._pwdResetStore[foundKey];
        } else {
          throw ApiError.badRequest('Invalid or expired reset code.');
        }
      } else if (token) {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        if (decoded.type !== 'password_reset') {
          throw ApiError.badRequest('Invalid reset token');
        }
        targetUserId = decoded.userId;
      } else {
        throw ApiError.badRequest('Reset token or 6-digit code is required');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, targetUserId]
      );

      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.badRequest(error.message || 'Invalid or expired reset token');
    }
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshToken({ refreshToken }) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
      
      // Verify user still exists and is active
      const result = await db.query(
        'SELECT id, role, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        throw ApiError.unauthorized('Invalid refresh token');
      }

      const tokens = this.generateTokens(result.rows[0].id, result.rows[0].role);
      return tokens;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  /**
   * Generate JWT access + refresh token pair.
   */
  generateTokens(userId, role) {
    const accessToken = jwt.sign(
      { userId, role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId, role },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
  }
}

module.exports = new AuthService();
