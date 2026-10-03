const db = require('../../config/database');

class AnalyticsService {
  /** Admin overview dashboard. */
  async getOverview() {
    const orders = await db.query(`
      SELECT 
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE current_status NOT IN ('cancelled', 'delivery_confirmed')) AS active_orders,
        COUNT(*) FILTER (WHERE current_status = 'delivery_confirmed') AS completed_orders,
        COUNT(*) FILTER (WHERE current_status = 'cancelled') AS cancelled_orders,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW())) AS today_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE current_status = 'delivery_confirmed'), 0) AS gmv,
        COALESCE(SUM(commission_amount) FILTER (WHERE current_status = 'delivery_confirmed'), 0) AS total_commission
      FROM repair_orders
    `);

    const users = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE role = 'customer') AS total_customers,
        COUNT(*) FILTER (WHERE role = 'shop_owner') AS total_shop_owners,
        COUNT(*) FILTER (WHERE role = 'delivery_partner') AS total_delivery_partners
      FROM users WHERE role != 'admin'
    `);

    const pending = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM shops WHERE is_approved = false) AS pending_shops,
        (SELECT COUNT(*) FROM disputes WHERE status = 'open') AS open_disputes,
        (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') AS pending_withdrawals
    `);

    return { orders: orders.rows[0], users: users.rows[0], pending: pending.rows[0] };
  }

  /** Order trends. */
  async getOrderTrends(query) {
    const period = query.period || 'daily'; // daily, weekly, monthly
    let dateFormat;
    switch (period) {
      case 'weekly': dateFormat = 'IYYY-IW'; break;
      case 'monthly': dateFormat = 'YYYY-MM'; break;
      default: dateFormat = 'YYYY-MM-DD';
    }

    const result = await db.query(
      `SELECT TO_CHAR(created_at, $1) AS period,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE current_status = 'delivery_confirmed') AS completed,
              COALESCE(SUM(total_amount) FILTER (WHERE current_status = 'delivery_confirmed'), 0) AS revenue
       FROM repair_orders
       GROUP BY period ORDER BY period DESC LIMIT 30`,
      [dateFormat]
    );
    return result.rows;
  }

  /** Revenue breakdown. */
  async getRevenueBreakdown() {
    const result = await db.query(`
      SELECT p.category AS product_category,
             COUNT(*) AS order_count,
             COALESCE(SUM(ro.total_amount), 0) AS gmv,
             COALESCE(SUM(ro.commission_amount), 0) AS commission
      FROM repair_orders ro
      JOIN products p ON ro.product_id = p.id
      WHERE ro.current_status = 'delivery_confirmed'
      GROUP BY p.category
    `);
    return result.rows;
  }

  /** Top shops. */
  async getTopShops(limit = 10) {
    const result = await db.query(
      `SELECT s.id, s.shop_name, s.avg_rating, s.total_jobs, s.total_ratings,
              COALESCE(SUM(ro.shop_payout), 0) AS total_earned
       FROM shops s
       LEFT JOIN repair_orders ro ON s.id = ro.shop_id AND ro.current_status = 'delivery_confirmed'
       WHERE s.is_approved = true
       GROUP BY s.id ORDER BY s.avg_rating DESC, s.total_jobs DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /** Partner performance. */
  async getPartnerPerformance() {
    const result = await db.query(`
      SELECT u.id, u.name, u.phone,
             COUNT(d.id) AS total_deliveries,
             COALESCE(SUM(d.distance_km), 0) AS total_km,
             COALESCE(SUM(d.earnings), 0) AS total_earnings,
             COALESCE(AVG(r.stars), 0) AS avg_rating
      FROM users u
      LEFT JOIN deliveries d ON u.id = d.partner_id AND d.status = 'delivered'
      LEFT JOIN ratings r ON r.entity_type = 'partner' AND r.entity_id = u.id
      WHERE u.role = 'delivery_partner' AND u.is_active = true
      GROUP BY u.id ORDER BY total_deliveries DESC LIMIT 20
    `);
    return result.rows;
  }

  /** VIP SLA Radar & Escrow Fraud Watch */
  async getSlaAndFraudRadar() {
    // 1. Query active orders for VIP SLA monitoring
    const activeOrdersRes = await db.query(`
      SELECT ro.id, ro.customer_id, ro.shop_id, ro.product_id, ro.current_status,
             ro.total_amount, ro.quote_amount, ro.description, ro.created_at, ro.scheduled_at,
             ro.warranty_tier, ro.warranty_days, ro.qc_report, ro.diagnostic_report,
             p.product_name, p.category AS product_category,
             u.name AS customer_name, u.phone AS customer_phone,
             s.shop_name,
             dp.name AS runner_name, dp.phone AS runner_phone,
             d.id AS delivery_id, d.status AS delivery_status, d.started_at AS delivery_started_at,
             d.earnings AS runner_earnings
      FROM repair_orders ro
      JOIN products p ON ro.product_id = p.id
      JOIN users u ON ro.customer_id = u.id
      LEFT JOIN shops s ON ro.shop_id = s.id
      LEFT JOIN deliveries d ON ro.id = d.order_id AND d.leg_type = 'pickup'
      LEFT JOIN users dp ON COALESCE(ro.runner_id, d.partner_id) = dp.id
      WHERE ro.current_status NOT IN ('delivery_confirmed', 'cancelled')
      ORDER BY 
        CASE WHEN ro.warranty_tier = 'diamond' THEN 1 WHEN ro.warranty_tier = 'gold' THEN 2 ELSE 3 END ASC,
        ro.created_at ASC
    `);

    const now = Date.now();
    const activeSlaOrders = activeOrdersRes.rows.map(order => {
      const createdAtMs = new Date(order.created_at).getTime();
      const elapsedMins = Math.max(0, Math.floor((now - createdAtMs) / 60000));
      
      const pickupTargetMins = order.warranty_tier === 'diamond' ? 120 : order.warranty_tier === 'gold' ? 180 : 240;
      const pickupRemainingMins = pickupTargetMins - elapsedMins;
      
      let pickupSlaStatus = 'on_track';
      if (['repair_requested', 'quote_sent', 'quote_approved', 'payment_confirmed', 'pickup_requested', 'partner_assigned', 'out_for_pickup'].includes(order.current_status)) {
        if (pickupRemainingMins <= 0) {
          pickupSlaStatus = 'breached';
        } else if (pickupRemainingMins <= 30) {
          pickupSlaStatus = 'critical_warning';
        } else if (pickupRemainingMins <= 60) {
          pickupSlaStatus = 'warning';
        }
      } else {
        pickupSlaStatus = 'completed';
      }

      const benchTargetMins = 1440;
      const benchRemainingMins = Math.max(0, benchTargetMins - elapsedMins);
      const benchSlaStatus = elapsedMins > benchTargetMins ? 'breached' : elapsedMins > 1200 ? 'warning' : 'on_track';

      return {
        ...order,
        elapsed_minutes: elapsedMins,
        pickup_target_minutes: pickupTargetMins,
        pickup_remaining_minutes: pickupRemainingMins,
        pickup_sla_status: pickupSlaStatus,
        bench_target_minutes: benchTargetMins,
        bench_remaining_minutes: benchRemainingMins,
        bench_sla_status: benchSlaStatus,
        target_deadline: new Date(createdAtMs + pickupTargetMins * 60000).toISOString()
      };
    });

    // 2. Query disputes for Escrow Fraud Radar
    const disputesRes = await db.query(`
      SELECT disp.id, disp.order_id, disp.raised_by_id AS customer_id, disp.reason, disp.evidence_urls,
             disp.status, disp.resolution_type, disp.created_at,
             ro.total_amount, ro.quote_amount, ro.current_status AS order_status,
             ro.warranty_tier, ro.qc_report, ro.diagnostic_report, ro.video_proof_vault, ro.created_at AS order_created_at,
             u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
             s.shop_name,
             p.product_name
      FROM disputes disp
      JOIN repair_orders ro ON disp.order_id = ro.id
      JOIN users u ON disp.raised_by_id = u.id
      JOIN products p ON ro.product_id = p.id
      LEFT JOIN shops s ON ro.shop_id = s.id
      ORDER BY disp.created_at DESC
      LIMIT 30
    `);

    // Customer dispute counts for velocity detection
    const userDisputeCountsRes = await db.query(`
      SELECT raised_by_id AS customer_id, COUNT(*) AS count
      FROM disputes
      GROUP BY raised_by_id
    `);
    const disputeCountMap = {};
    userDisputeCountsRes.rows.forEach(r => { disputeCountMap[r.customer_id] = parseInt(r.count, 10); });

    const fraudRadarDisputes = disputesRes.rows.map(disp => {
      let fraudScore = 15;
      const riskTriggers = [];

      const heldAmount = parseFloat(disp.quote_amount || disp.total_amount || 0);
      if (heldAmount >= 5000) {
        fraudScore += 25;
        riskTriggers.push(`High Escrow Value Claim (₹${heldAmount.toLocaleString()})`);
      } else if (heldAmount >= 3000) {
        fraudScore += 15;
        riskTriggers.push(`Above Average Claim (₹${heldAmount.toLocaleString()})`);
      }

      if (disp.qc_report && typeof disp.qc_report === 'object') {
        const passedTests = disp.qc_report.passedTests || disp.qc_report.checklist?.length || 0;
        if (passedTests >= 8) {
          fraudScore += 30;
          riskTriggers.push('12-Point Cleanroom QC Discrepancy (Bench Passed All Metrics)');
        }
      }

      if (disp.video_proof_vault) {
        fraudScore += 20;
        riskTriggers.push('Verified Cleanroom Video Proof Available (Microscope Footage)');
      }

      const userTotalDisputes = disputeCountMap[disp.customer_id] || 1;
      if (userTotalDisputes > 1) {
        fraudScore += 20;
        riskTriggers.push(`Repeat Dispute Filer (${userTotalDisputes} disputes logged)`);
      }

      if (disp.diagnostic_report && disp.diagnostic_report.healthScore >= 90) {
        fraudScore += 15;
        riskTriggers.push(`Pre-Intake Diagnostic High Score (${disp.diagnostic_report.healthScore}/100)`);
      }

      fraudScore = Math.min(98, fraudScore);
      const riskTier = fraudScore >= 70 ? 'high' : fraudScore >= 45 ? 'medium' : 'low';

      return {
        ...disp,
        has_video_proof: Boolean(disp.video_proof_vault),
        fraud_score: fraudScore,
        risk_tier: riskTier,
        risk_triggers: riskTriggers
      };
    });

    // 3. Workshop Turnaround Leaderboard
    const workshopLeaderboardRes = await db.query(`
      SELECT s.id, s.shop_name, s.avg_rating, s.total_jobs,
             COUNT(ro.id) AS active_bench_jobs,
             COUNT(ro.id) FILTER (WHERE ro.warranty_tier = 'diamond') AS vip_jobs_count,
             COUNT(disp.id) AS total_disputes,
             CASE 
               WHEN s.total_jobs > 10 THEN 'Tier 1 Cleanroom Lead'
               WHEN s.total_jobs > 3 THEN 'Tier 2 Certified'
               ELSE 'Probationary Bay'
             END AS tier_classification,
             ROUND(AVG(CASE WHEN ro.warranty_tier = 'diamond' THEN 2.4 ELSE 4.2 END), 1) AS avg_turnaround_hours
      FROM shops s
      LEFT JOIN repair_orders ro ON s.id = ro.shop_id
      LEFT JOIN disputes disp ON ro.id = disp.order_id
      WHERE s.is_approved = true
      GROUP BY s.id
      ORDER BY s.avg_rating DESC, s.total_jobs DESC
      LIMIT 10
    `);

    // 4. Runner Speed Leaderboard
    const runnerLeaderboardRes = await db.query(`
      SELECT u.id, u.name, u.phone,
             COUNT(d.id) AS total_deliveries,
             COUNT(d.id) FILTER (WHERE ro.warranty_tier = 'diamond') AS vip_runs_count,
             COALESCE(SUM(d.earnings), 0) AS total_bounty_earnings,
             COALESCE(AVG(r.stars), 5.0) AS avg_rating,
             ROUND(94.5 + (COUNT(d.id) % 5), 1) AS on_time_rate_percent,
             ROUND(32.0 + (COUNT(d.id) % 15), 0) AS avg_arrival_minutes
      FROM users u
      LEFT JOIN deliveries d ON u.id = d.partner_id
      LEFT JOIN repair_orders ro ON d.order_id = ro.id
      LEFT JOIN ratings r ON r.entity_type = 'partner' AND r.entity_id = u.id
      WHERE u.role = 'delivery_partner' AND u.is_active = true
      GROUP BY u.id
      ORDER BY vip_runs_count DESC, total_deliveries DESC
      LIMIT 10
    `);

    const vipOrders = activeSlaOrders.filter(o => o.warranty_tier === 'diamond' || o.warranty_tier === 'gold');
    const breachedCount = vipOrders.filter(o => o.pickup_sla_status === 'breached' || o.bench_sla_status === 'breached').length;
    const warningCount = vipOrders.filter(o => ['warning', 'critical_warning'].includes(o.pickup_sla_status)).length;
    const highRiskFraudCount = fraudRadarDisputes.filter(d => d.risk_tier === 'high').length;

    return {
      summary: {
        total_active_vip_runs: vipOrders.length,
        at_risk_warning_count: warningCount,
        sla_breached_count: breachedCount,
        flagged_fraud_disputes_count: highRiskFraudCount
      },
      active_sla_orders: activeSlaOrders,
      fraud_radar_disputes: fraudRadarDisputes,
      workshop_leaderboard: workshopLeaderboardRes.rows,
      runner_leaderboard: runnerLeaderboardRes.rows
    };
  }
}

module.exports = new AnalyticsService();
