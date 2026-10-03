const db = require('../../config/database');
const env = require('../../config/env');
const ApiError = require('../../utils/apiError');
const { generateReferralCode } = require('../../utils/helpers');

const TIERS = {
  worker_bee: {
    key: 'worker_bee',
    name: 'Worker Bee',
    icon: '🐝',
    color: '#d97706',
    accentColor: '#f59e0b',
    badgeBg: 'rgba(217, 119, 6, 0.15)',
    cashMultiplier: '1.0x',
    referralBonus: 50,
    refereeDiscount: 100,
    warrantyDays: 30,
    courierSpeed: 'Standard Express Courier',
    minXP: 0,
    nextTierXP: 250,
    perkSummary: 'Base 1.0x cashback, ₹50 referral wallet reward, 30-day escrow warranty'
  },
  scout_bee: {
    key: 'scout_bee',
    name: 'Scout Bee',
    icon: '⚡',
    color: '#0ea5e9',
    accentColor: '#38bdf8',
    badgeBg: 'rgba(14, 165, 233, 0.15)',
    cashMultiplier: '1.5x',
    referralBonus: 75,
    refereeDiscount: 125,
    warrantyDays: 45,
    courierSpeed: 'Priority Runner Dispatch',
    minXP: 250,
    nextTierXP: 600,
    perkSummary: '1.5x Honeycomb cashback, ₹75 referral reward, 45-day extended escrow warranty, priority runner dispatch'
  },
  queen_bee: {
    key: 'queen_bee',
    name: 'Queen Bee',
    icon: '👑',
    color: '#f59e0b',
    accentColor: '#fbbf24',
    badgeBg: 'rgba(245, 158, 11, 0.25)',
    cashMultiplier: '2.0x',
    referralBonus: 120,
    refereeDiscount: 150,
    warrantyDays: 90,
    courierSpeed: '1-Hour Ultra VIP Courier',
    minXP: 600,
    nextTierXP: null,
    perkSummary: '2.0x Double cashback, ₹120 referral reward, 90-day VIP gold shield warranty, 1-hour VIP doorstep pickup'
  }
};

class RewardsService {
  /**
   * Get user loyalty profile, XP, tiers, and referral metrics.
   */
  async getLoyaltyProfile(userId) {
    const userRes = await db.query(
      `SELECT id, name, email, wallet_balance, referral_code, honeycomb_xp, loyalty_tier
       FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) throw ApiError.notFound('User not found');
    const user = userRes.rows[0];

    // Ensure user has a referral code
    let refCode = user.referral_code;
    if (!refCode) {
      refCode = generateReferralCode(user.name || 'BEE');
      await db.query('UPDATE users SET referral_code = $1 WHERE id = $2', [refCode, userId]);
      user.referral_code = refCode;
    }

    // Count completed repairs
    const ordersRes = await db.query(
      `SELECT COUNT(*)::int as count FROM repair_orders
       WHERE customer_id = $1 AND current_status = 'delivery_confirmed'`,
      [userId]
    );
    const completedOrders = ordersRes.rows[0].count;

    // Count completed referrals
    const refRes = await db.query(
      `SELECT COUNT(*)::int as count FROM referrals
       WHERE referrer_id = $1 AND status = 'completed'`,
      [userId]
    );
    const completedReferrals = refRes.rows[0].count;

    // Compute XP dynamically if higher than current
    const computedXP = (completedOrders * 100) + (completedReferrals * 150) + Math.max(user.honeycomb_xp || 0, 75);

    // Determine Tier
    let tierKey = 'worker_bee';
    if (computedXP >= 600) {
      tierKey = 'queen_bee';
    } else if (computedXP >= 250) {
      tierKey = 'scout_bee';
    }

    if (user.honeycomb_xp !== computedXP || user.loyalty_tier !== tierKey) {
      await db.query(
        'UPDATE users SET honeycomb_xp = $1, loyalty_tier = $2 WHERE id = $3',
        [computedXP, tierKey, userId]
      );
      user.honeycomb_xp = computedXP;
      user.loyalty_tier = tierKey;
    }

    const currentTier = TIERS[tierKey];

    // Progress math
    let progressPercent = 100;
    let pointsNeeded = 0;
    if (currentTier.nextTierXP) {
      const range = currentTier.nextTierXP - currentTier.minXP;
      const progressInRange = Math.max(0, computedXP - currentTier.minXP);
      progressPercent = Math.min(100, Math.round((progressInRange / range) * 100));
      pointsNeeded = Math.max(0, currentTier.nextTierXP - computedXP);
    }

    // Unclaimed scratch cards count
    const cardsRes = await db.query(
      `SELECT COUNT(*)::int as count FROM reward_scratch_cards
       WHERE user_id = $1 AND is_scratched = false`,
      [userId]
    );
    const unclaimedScratchCards = cardsRes.rows[0].count;

    // Total cashback earnings from scratch cards
    const cardEarningsRes = await db.query(
      `SELECT COALESCE(SUM(reward_amount), 0)::numeric as total
       FROM reward_scratch_cards
       WHERE user_id = $1 AND is_scratched = true AND reward_type = 'cashback_wallet'`,
      [userId]
    );
    const scratchCardEarnings = parseFloat(cardEarningsRes.rows[0].total);

    // Total referral earnings
    const refEarningsRes = await db.query(
      `SELECT COALESCE(SUM(referrer_reward_amount), 0)::numeric as total
       FROM referrals
       WHERE referrer_id = $1 AND status = 'completed'`,
      [userId]
    );
    const referralEarnings = parseFloat(refEarningsRes.rows[0].total);
    const totalLifetimeHoney = scratchCardEarnings + referralEarnings;

    const referralLink = `${env.CLIENT_URL || 'http://localhost:5174'}/book?ref=${refCode}`;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        walletBalance: parseFloat(user.wallet_balance || 0),
        referralCode: refCode,
        referralLink,
        honeycombXP: computedXP,
        loyaltyTier: tierKey,
      },
      currentTier,
      tiers: TIERS,
      progress: {
        percent: progressPercent,
        pointsNeeded,
        nextTier: currentTier.nextTierXP ? (tierKey === 'worker_bee' ? TIERS.scout_bee : TIERS.queen_bee) : null,
      },
      stats: {
        completedOrders,
        completedReferrals,
        unclaimedScratchCards,
        scratchCardEarnings,
        referralEarnings,
        totalLifetimeHoney,
      }
    };
  }

  /**
   * Get user's scratch cards. Auto-generates a welcome card if none exist.
   */
  async getScratchCards(userId) {
    let result = await db.query(
      `SELECT * FROM reward_scratch_cards
       WHERE user_id = $1
       ORDER BY is_scratched ASC, created_at DESC`,
      [userId]
    );

    // Auto-create a welcome scratch card if user has 0 cards
    if (result.rows.length === 0) {
      await db.query(
        `INSERT INTO reward_scratch_cards (user_id, reward_type, reward_amount, title, subtitle, is_scratched)
         VALUES ($1, 'cashback_wallet', 75.00, 'Welcome Honeycomb Scratch Card 🍯', 'Scratch to reveal guaranteed instant wallet cashback for your next repair', false)`,
        [userId]
      );
      result = await db.query(
        `SELECT * FROM reward_scratch_cards
         WHERE user_id = $1
         ORDER BY is_scratched ASC, created_at DESC`,
        [userId]
      );
    }

    const cards = result.rows.map(c => ({
      ...c,
      reward_amount: parseFloat(c.reward_amount)
    }));

    const unclaimedCount = cards.filter(c => !c.is_scratched).length;

    return { cards, unclaimedCount };
  }

  /**
   * Claim/scratch a card. Atomically updates wallet and awards XP.
   */
  async claimScratchCard(userId, cardId) {
    const cardRes = await db.query(
      'SELECT * FROM reward_scratch_cards WHERE id = $1 AND user_id = $2',
      [cardId, userId]
    );

    if (cardRes.rows.length === 0) {
      throw ApiError.notFound('Scratch card not found');
    }

    const card = cardRes.rows[0];
    if (card.is_scratched) {
      return {
        success: true,
        alreadyClaimed: true,
        card: { ...card, reward_amount: parseFloat(card.reward_amount) }
      };
    }

    const rewardAmount = parseFloat(card.reward_amount);

    // Mark card as scratched
    await db.query(
      'UPDATE reward_scratch_cards SET is_scratched = true, scratched_at = NOW() WHERE id = $1',
      [cardId]
    );

    // If cashback, credit user wallet
    let newBalance = 0;
    if (card.reward_type === 'cashback_wallet') {
      const userUpdate = await db.query(
        `UPDATE users
         SET wallet_balance = wallet_balance + $1,
             honeycomb_xp = honeycomb_xp + 25,
             updated_at = NOW()
         WHERE id = $2
         RETURNING wallet_balance, honeycomb_xp`,
        [rewardAmount, userId]
      );
      newBalance = parseFloat(userUpdate.rows[0].wallet_balance);

      // In-app notification
      try {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, '🍯 Honeycomb Cashback Deposited!', $2, 'wallet')`,
          [userId, `Congratulations! ₹${rewardAmount} was revealed on your scratch card and credited to your RepairBee wallet.`]
        );
      } catch (err) {
        // notification table optional failure
      }
    }

    return {
      success: true,
      card: { ...card, is_scratched: true, reward_amount: rewardAmount },
      newWalletBalance: newBalance,
      xpEarned: 25,
      message: `🎉 Success! ₹${rewardAmount} was credited to your RepairBee wallet.`
    };
  }

  /**
   * Generate a demo scratch card for interactive preview.
   */
  async generateDemoCard(userId) {
    const presets = [
      {
        title: 'Lucky Drone Runner Cashback 🚀',
        subtitle: 'Special doorstep runner courier companion cashback',
        reward_type: 'cashback_wallet',
        amount: 50.00
      },
      {
        title: 'Cleanroom ISO Diagnostic Shield 🔬',
        subtitle: '100% cleanroom benchmark diagnostic waiver voucher',
        reward_type: 'cashback_wallet',
        amount: 80.00
      },
      {
        title: 'Queen Bee Royal Honey Reward 👑',
        subtitle: 'Top-tier loyalty cashback into your escrow wallet',
        reward_type: 'cashback_wallet',
        amount: 120.00
      },
      {
        title: 'Screen & Battery Armor Bonus 🛡️',
        subtitle: 'Instant discount credit for premium parts replacements',
        reward_type: 'cashback_wallet',
        amount: 60.00
      }
    ];

    const pick = presets[Math.floor(Math.random() * presets.length)];

    const ins = await db.query(
      `INSERT INTO reward_scratch_cards (user_id, reward_type, reward_amount, title, subtitle, is_scratched)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [userId, pick.reward_type, pick.amount, pick.title, pick.subtitle]
    );

    return {
      ...ins.rows[0],
      reward_amount: parseFloat(ins.rows[0].reward_amount)
    };
  }

  /**
   * Get referral network tree and milestone badges.
   */
  async getReferralTree(userId) {
    const referralsRes = await db.query(
      `SELECT r.id, r.referral_code, r.status, r.referrer_reward_amount, r.referee_discount_amount,
              r.created_at, r.completed_at,
              u.id as referee_id, u.name as referee_name, u.email as referee_email,
              (SELECT ro.description FROM repair_orders ro WHERE ro.customer_id = u.id ORDER BY ro.created_at DESC LIMIT 1) as recent_order_desc,
              (SELECT ro.current_status FROM repair_orders ro WHERE ro.customer_id = u.id ORDER BY ro.created_at DESC LIMIT 1) as recent_order_status
       FROM referrals r
       JOIN users u ON u.id = r.referee_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const referrals = referralsRes.rows.map(r => ({
      ...r,
      referrer_reward_amount: parseFloat(r.referrer_reward_amount),
      referee_discount_amount: parseFloat(r.referee_discount_amount),
      referee_email_masked: r.referee_email ? r.referee_email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length)) : 'customer@***.com'
    }));

    const completedCount = referrals.filter(r => r.status === 'completed').length;
    const pendingCount = referrals.filter(r => r.status === 'pending').length;

    const milestones = [
      {
        id: 'first_friend',
        name: 'First Honeycomb Spark',
        targetCount: 1,
        unlocked: completedCount >= 1,
        rewardText: '₹50 Instant Wallet Credit',
        badge: '🌱'
      },
      {
        id: 'hive_builder',
        name: 'Hive Master (3 Friends)',
        targetCount: 3,
        unlocked: completedCount >= 3,
        rewardText: 'Scout Bee Upgrade + 1.5x Multiplier',
        badge: '⚡'
      },
      {
        id: 'queen_colony',
        name: 'Queen’s Ambassador (5 Friends)',
        targetCount: 5,
        unlocked: completedCount >= 5,
        rewardText: '₹250 Mega Bonus + 90-Day VIP Warranty',
        badge: '👑'
      }
    ];

    return {
      referrals,
      completedCount,
      pendingCount,
      totalReferrals: referrals.length,
      milestones
    };
  }
}

module.exports = new RewardsService();
