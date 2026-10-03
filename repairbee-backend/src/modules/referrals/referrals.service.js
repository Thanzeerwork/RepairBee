const db = require('../../config/database');
const env = require('../../config/env');
const ApiError = require('../../utils/apiError');

class ReferralsService {
  async getMyCode(userId) {
    const userRes = await db.query('SELECT name, referral_code FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) throw ApiError.notFound('User not found');
    let code = userRes.rows[0].referral_code;

    if (!code) {
      const { generateReferralCode } = require('../../utils/helpers');
      code = generateReferralCode(userRes.rows[0].name || 'USER');
      await db.query('UPDATE users SET referral_code = $1 WHERE id = $2', [code, userId]);
    }

    return { referral_code: code };
  }

  async applyReferralCode(refereeId, code) {
    if (!code) throw ApiError.badRequest('Referral code is required');
    const cleanCode = code.trim().toUpperCase();

    // Find referrer
    const referrer = await db.query(
      'SELECT id, name FROM users WHERE UPPER(referral_code) = $1 AND id != $2',
      [cleanCode, refereeId]
    );
    if (referrer.rows.length === 0) throw ApiError.badRequest('Invalid referral code');

    // Check if referee already applied any referral code
    const existing = await db.query('SELECT id FROM referrals WHERE referee_id = $1', [refereeId]);
    if (existing.rows.length > 0) throw ApiError.badRequest('A referral code has already been applied to your account');

    const result = await db.query(
      `INSERT INTO referrals (referrer_id, referee_id, referral_code, referrer_reward_amount, referee_discount_amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [referrer.rows[0].id, refereeId, cleanCode, env.REFERRAL_REWARD_AMOUNT, env.REFEREE_DISCOUNT_AMOUNT]
    );
    return {
      ...result.rows[0],
      referrer_name: referrer.rows[0].name,
      discount_amount: env.REFEREE_DISCOUNT_AMOUNT
    };
  }

  async completeReferral(refereeId) {
    // Called after referee's first completed order
    const referral = await db.query(
      "SELECT * FROM referrals WHERE referee_id = $1 AND status = 'pending'",
      [refereeId]
    );
    if (referral.rows.length === 0) return;

    const ref = referral.rows[0];
    await db.query("UPDATE referrals SET status = 'completed', completed_at = NOW() WHERE id = $1", [ref.id]);
    await db.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [ref.referrer_reward_amount, ref.referrer_id]);

    // Dispatch notification to referrer
    try {
      const notificationsService = require('../notifications/notifications.service');
      const refereeUser = await db.query('SELECT name FROM users WHERE id = $1', [refereeId]);
      const refereeName = refereeUser.rows[0]?.name || 'Your friend';
      await notificationsService.send(ref.referrer_id, {
        title: '🎉 ₹50 Referral Reward Credited!',
        body: `${refereeName} has completed their first device repair! ₹50 has been credited to your RepairBee wallet.`,
        type: 'wallet',
      });
    } catch {
      // Silently proceed
    }
  }

  async getReferralStats(userId) {
    const statsResult = await db.query(
      `SELECT COUNT(*)::int AS total_referrals,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              COALESCE(SUM(referrer_reward_amount) FILTER (WHERE status = 'completed'), 0)::numeric AS total_rewards
       FROM referrals WHERE referrer_id = $1`,
      [userId]
    );

    const historyResult = await db.query(
      `SELECT r.id, r.referral_code, r.status, r.referrer_reward_amount, r.referee_discount_amount,
              r.created_at, r.completed_at, u.name AS referee_name, u.created_at AS referee_joined_at,
              (SELECT COUNT(*)::int FROM repair_orders ro WHERE ro.customer_id = r.referee_id) AS total_orders,
              (SELECT COUNT(*)::int FROM repair_orders ro WHERE ro.customer_id = r.referee_id AND ro.current_status::text IN ('delivered', 'delivery_confirmed', 'completed')) AS completed_orders,
              (SELECT ro.current_status::text FROM repair_orders ro WHERE ro.customer_id = r.referee_id ORDER BY ro.created_at DESC LIMIT 1) AS latest_order_status
       FROM referrals r
       JOIN users u ON u.id = r.referee_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC LIMIT 30`,
      [userId]
    );

    const referralsWithLifecycle = historyResult.rows.map((row) => {
      let stageKey = 'signed_up';
      let stageTitle = 'Signed Up';
      let stageDescription = 'Account registered • Awaiting first repair order';
      let badgeColor = '#3b82f6';
      let badgeBg = '#dbeafe';

      if (row.status === 'completed' || row.completed_orders > 0) {
        stageKey = 'repair_completed';
        stageTitle = 'Repair Completed';
        stageDescription = 'First repair delivered • ₹50 reward credited to wallet';
        badgeColor = '#059669';
        badgeBg = '#d1fae5';
      } else if (row.total_orders > 0) {
        stageKey = 'repair_in_progress';
        stageTitle = 'Repair In Progress';
        stageDescription = `Device repair active (${row.latest_order_status?.replace(/_/g, ' ') || 'in workshop'})`;
        badgeColor = '#d97706';
        badgeBg = '#fef3c7';
      }

      return {
        ...row,
        stageKey,
        stageTitle,
        stageDescription,
        badgeColor,
        badgeBg,
      };
    });

    return {
      ...statsResult.rows[0],
      referrals: referralsWithLifecycle,
    };
  }
}

module.exports = new ReferralsService();
