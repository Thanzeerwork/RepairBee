const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const { parsePagination } = require('../../utils/helpers');
const logger = require('../../utils/logger');
const notificationsService = require('../notifications/notifications.service');
const outboundMessagesService = require('../notifications/outboundMessages.service');

class DisputesService {
  /**
   * Customer raises a formal escrow dispute or damaged-in-transit claim.
   */
  async raiseDispute(orderId, userId, data) {
    const order = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (order.rows.length === 0) throw ApiError.notFound('Order not found');
    const repairOrder = order.rows[0];

    if (repairOrder.customer_id !== userId) throw ApiError.forbidden('Access denied');

    if (repairOrder.current_status === 'cancelled') {
      throw ApiError.badRequest('Cannot raise a dispute on a cancelled order');
    }

    // Check if an open dispute already exists on this order
    const existing = await db.query(
      "SELECT id FROM disputes WHERE order_id = $1 AND status = 'open'",
      [orderId]
    );
    if (existing.rows.length > 0) {
      throw ApiError.badRequest('An active dispute case is already open and under review for this order');
    }

    // If order was already marked delivery_confirmed, enforce the 48-hour window
    if (repairOrder.current_status === 'delivery_confirmed') {
      const hoursSinceDelivery = await db.query(
        `SELECT EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS hours 
         FROM order_status_logs WHERE order_id = $1 AND status = 'delivery_confirmed' ORDER BY created_at DESC LIMIT 1`,
        [orderId]
      );
      if (hoursSinceDelivery.rows.length > 0 && hoursSinceDelivery.rows[0].hours > 48) {
        throw ApiError.badRequest('Dispute window has expired (48 hours after delivery confirmation)');
      }
    }

    const claimType = data.claim_type || 'general';
    const pouchCondition = data.pouch_condition || 'unverified';
    const evidenceUrls = data.evidence_urls || [];
    const transitDamageClaim = data.transit_damage_claim || {};

    const disputeRecord = await db.transaction(async (client) => {
      // 1. Insert dispute with claim metadata
      const result = await client.query(
        `INSERT INTO disputes 
         (order_id, raised_by_id, reason, description, evidence_urls, status, claim_type, pouch_condition, transit_damage_claim)
         VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8) RETURNING *`,
        [
          orderId,
          userId,
          data.reason,
          data.description || data.reason,
          evidenceUrls,
          claimType,
          pouchCondition,
          JSON.stringify(transitDamageClaim)
        ]
      );

      // 2. Lock escrow payments in held / disputed status
      await client.query(
        "UPDATE payments SET escrow_status = 'held' WHERE order_id = $1",
        [orderId]
      );

      // 3. Log dispute notice in order_status_logs
      await client.query(
        `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
         VALUES ($1, $2, 'customer', $3, $4)`,
        [
          orderId,
          repairOrder.current_status,
          userId,
          `Escrow dispute raised by customer: "${data.reason}" (Claim: ${claimType}, Pouch: ${pouchCondition}). Payout locked in vault.`
        ]
      );

      return result.rows[0];
    });

    // Fire-and-forget: In-app notification to workshop
    if (repairOrder.shop_id) {
      db.query('SELECT user_id FROM shops WHERE id = $1', [repairOrder.shop_id]).then(shopRes => {
        if (shopRes.rows[0]?.user_id) {
          notificationsService.send(shopRes.rows[0].user_id, {
            title: '⚠️ Escrow Dispute Filed — Funds Frozen',
            body: `Customer has filed an escrow dispute on Order #${orderId.slice(0, 8).toUpperCase()} (Claim: ${claimType}, Reason: ${data.reason}). Payout is locked pending arbitration.`,
            type: 'dispute',
            referenceId: orderId
          }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
        }
      }).catch(() => {});
    }

    return disputeRecord;
  }

  /**
   * Fetch disputes queue for customer or admin.
   */
  async getDisputes(query, userId, userRole) {
    const { page, limit, offset } = parsePagination(query);
    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (userRole !== 'admin') {
      whereClause += ` AND d.raised_by_id = $${idx++}`;
      params.push(userId);
    }
    if (query.status) { whereClause += ` AND d.status = $${idx++}`; params.push(query.status); }
    if (query.orderId) { whereClause += ` AND d.order_id = $${idx++}`; params.push(query.orderId); }
    if (query.claimType) { whereClause += ` AND d.claim_type = $${idx++}`; params.push(query.claimType); }

    const countResult = await db.query(`SELECT COUNT(*) FROM disputes d ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT d.*, ro.current_status AS order_status, ro.quote_amount, ro.total_amount,
              ro.pouch_barcode, ro.video_proof_vault,
              u.name AS raised_by_name, u.email AS raised_by_email, u.phone AS raised_by_phone,
              p.product_name, s.shop_name, s.address AS shop_address
       FROM disputes d
       JOIN repair_orders ro ON d.order_id = ro.id
       JOIN users u ON d.raised_by_id = u.id
       LEFT JOIN products p ON ro.product_id = p.id
       LEFT JOIN shops s ON ro.shop_id = s.id
       ${whereClause} ORDER BY d.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    return { disputes: result.rows, total, page, limit };
  }

  /**
   * Fetch single dispute dossier with full context.
   */
  async getDisputeById(disputeId) {
    const query = `
      SELECT d.*, 
             ro.current_status AS order_status, ro.quote_amount, ro.total_amount,
             ro.pouch_barcode, ro.video_proof_vault, ro.description AS order_description,
             u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
             s.shop_name, s.address AS shop_address, s.avg_rating AS shop_rating,
             rn.name AS runner_name, rn.phone AS runner_phone,
             del.current_lat AS runner_lat, del.current_lng AS runner_lng, del.pouch_barcode AS courier_pouch_barcode
      FROM disputes d
      JOIN repair_orders ro ON d.order_id = ro.id
      JOIN users u ON d.raised_by_id = u.id
      LEFT JOIN shops s ON ro.shop_id = s.id
      LEFT JOIN users rn ON ro.runner_id = rn.id
      LEFT JOIN deliveries del ON ro.id = del.order_id
      WHERE d.id = $1
      ORDER BY del.created_at DESC
      LIMIT 1
    `;
    const res = await db.query(query, [disputeId]);
    if (res.rows.length === 0) throw ApiError.notFound('Dispute case not found');
    return res.rows[0];
  }

  /**
   * Admin executes binding arbitration ruling: Full Refund, Split Settlement, Free Re-Repair, or Dismissal.
   */
  async resolveDispute(disputeId, adminId, { resolution_type, admin_notes, refund_amount, shop_payout_amount, split_percentage = 50 }) {
    const validResolutions = ['refund', 'split_refund', 're_repair', 'rejected', 'full_refund', 'partial_refund'];
    let normResolution = resolution_type;
    if (normResolution === 'full_refund') normResolution = 'refund';
    if (normResolution === 'partial_refund') normResolution = 'split_refund';

    if (!validResolutions.includes(normResolution)) {
      throw ApiError.badRequest(`Invalid resolution type: ${resolution_type}`);
    }

    return await db.transaction(async (client) => {
      // 1. Fetch current dispute & order details
      const dispRes = await client.query('SELECT * FROM disputes WHERE id = $1 AND status = \'open\'', [disputeId]);
      if (dispRes.rows.length === 0) throw ApiError.notFound('Dispute not found or already resolved');
      const dispute = dispRes.rows[0];

      const orderRes = await client.query('SELECT * FROM repair_orders WHERE id = $1', [dispute.order_id]);
      const repairOrder = orderRes.rows[0];
      const totalEscrow = parseFloat(repairOrder.quote_amount || repairOrder.total_amount || 0);

      let finalRefundAmount = 0.00;
      let finalShopPayout = 0.00;

      // 2. Execute ruling financial settlement
      if (normResolution === 'refund') {
        // 100% Full Refund to Customer Wallet
        finalRefundAmount = totalEscrow;
        finalShopPayout = 0.00;

        if (finalRefundAmount > 0) {
          await client.query(
            'UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = NOW() WHERE id = $2',
            [finalRefundAmount, repairOrder.customer_id]
          );
        }
        await client.query(
          "UPDATE payments SET escrow_status = 'refunded', refunded_at = NOW() WHERE order_id = $1",
          [dispute.order_id]
        );
        await client.query(
          "UPDATE repair_orders SET current_status = 'cancelled', updated_at = NOW() WHERE id = $1",
          [dispute.order_id]
        );
        await client.query(
          `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
           VALUES ($1, 'cancelled', 'admin', $2, $3)`,
          [
            dispute.order_id,
            adminId,
            `Arbitration ruling: 100% Escrow refunded to customer wallet (₹${finalRefundAmount.toLocaleString()}). Note: ${admin_notes || 'Approved full refund'}`
          ]
        );
      } else if (normResolution === 'split_refund') {
        // Split Settlement (e.g. 50/50 or custom split)
        const splitPct = parseInt(split_percentage, 10) || 50;
        finalRefundAmount = refund_amount !== undefined ? parseFloat(refund_amount) : (totalEscrow * (splitPct / 100));
        finalShopPayout = shop_payout_amount !== undefined ? parseFloat(shop_payout_amount) : (totalEscrow - finalRefundAmount);

        // Credit customer wallet with refund portion
        if (finalRefundAmount > 0) {
          await client.query(
            'UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = NOW() WHERE id = $2',
            [finalRefundAmount, repairOrder.customer_id]
          );
        }

        // Credit shop owner user with payout portion
        if (finalShopPayout > 0 && repairOrder.shop_id) {
          const shopUserRes = await client.query('SELECT user_id FROM shops WHERE id = $1', [repairOrder.shop_id]);
          if (shopUserRes.rows[0]?.user_id) {
            await client.query(
              'UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = NOW() WHERE id = $2',
              [finalShopPayout, shopUserRes.rows[0].user_id]
            );
          }
        }

        await client.query(
          "UPDATE payments SET escrow_status = 'released', released_at = NOW() WHERE order_id = $1",
          [dispute.order_id]
        );
        await client.query(
          "UPDATE repair_orders SET current_status = 'delivery_confirmed', updated_at = NOW() WHERE id = $1",
          [dispute.order_id]
        );
        await client.query(
          `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
           VALUES ($1, 'delivery_confirmed', 'admin', $2, $3)`,
          [
            dispute.order_id,
            adminId,
            `Arbitration ruling: Split settlement (${splitPct}%). Customer refunded ₹${finalRefundAmount.toLocaleString()}, Workshop credited ₹${finalShopPayout.toLocaleString()}. Note: ${admin_notes || 'Split settlement executed'}`
          ]
        );
      } else if (normResolution === 're_repair') {
        // Authorized free cleanroom re-repair
        await client.query(
          "UPDATE payments SET escrow_status = 'held' WHERE order_id = $1",
          [dispute.order_id]
        );
        await client.query(
          "UPDATE repair_orders SET current_status = 'in_repair', updated_at = NOW() WHERE id = $1",
          [dispute.order_id]
        );
        await client.query(
          `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
           VALUES ($1, 'in_repair', 'admin', $2, $3)`,
          [
            dispute.order_id,
            adminId,
            `Arbitration ruling: Authorized free cleanroom re-repair by workshop. Note: ${admin_notes || 'Free re-repair'}`
          ]
        );
      } else if (normResolution === 'rejected') {
        // Customer claim dismissed -> release escrow to workshop
        finalRefundAmount = 0.00;
        finalShopPayout = totalEscrow;

        await client.query(
          "UPDATE payments SET escrow_status = 'released', released_at = NOW() WHERE order_id = $1",
          [dispute.order_id]
        );
        await client.query(
          "UPDATE repair_orders SET current_status = 'delivery_confirmed', updated_at = NOW() WHERE id = $1",
          [dispute.order_id]
        );
        await client.query(
          `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
           VALUES ($1, 'delivery_confirmed', 'admin', $2, $3)`,
          [
            dispute.order_id,
            adminId,
            `Arbitration ruling: Customer dispute claim dismissed. Escrow payout released to workshop. Note: ${admin_notes || 'Claim dismissed'}`
          ]
        );
      }

      // 3. Update dispute record with binding resolution details
      const updateRes = await client.query(
        `UPDATE disputes 
         SET status = 'resolved', resolution_type = $1, admin_notes = $2, 
             refund_amount = $3, shop_payout_amount = $4, split_percentage = $5,
             resolved_by_id = $6, resolved_at = NOW() 
         WHERE id = $7 RETURNING *`,
        [
          normResolution,
          admin_notes,
          finalRefundAmount,
          finalShopPayout,
          split_percentage,
          adminId,
          disputeId
        ]
      );

      const resolvedDispute = updateRes.rows[0];

      // 4. Notify customer and workshop
      const resLabels = {
        'refund': `100% Escrow Refund (₹${finalRefundAmount.toLocaleString()}) issued to wallet`,
        'split_refund': `Split Settlement: ₹${finalRefundAmount.toLocaleString()} refunded to customer, ₹${finalShopPayout.toLocaleString()} paid to workshop`,
        're_repair': 'Complimentary Cleanroom Re-Repair Authorized',
        'rejected': 'Dispute Claim Dismissed — Escrow Released to Workshop'
      };
      const rulingDesc = resLabels[normResolution] || normResolution;

      if (repairOrder.customer_id) {
        notificationsService.send(repairOrder.customer_id, {
          title: '⚖️ Arbitration Ruling Issued',
          body: `Order #${repairOrder.id.slice(0, 8).toUpperCase()}: ${rulingDesc}. ${admin_notes || ''}`,
          type: 'dispute',
          referenceId: repairOrder.id
        }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
      }

      return resolvedDispute;
    });
  }
}

module.exports = new DisputesService();
