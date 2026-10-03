const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const env = require('../../config/env');
const { DELIVERY_STATUS, ROLES, ORDER_STATUS } = require('../../utils/constants');
const { parsePagination } = require('../../utils/helpers');
const logger = require('../../utils/logger');
const notificationsService = require('../notifications/notifications.service');
const outboundMessagesService = require('../notifications/outboundMessages.service');

class DeliveriesService {
  /** Admin assigns a delivery partner to an order. */
  async assignPartner(orderId, partnerId, adminId) {
    // Verify partner exists and is approved
    const partner = await db.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'delivery_partner' AND is_active = true",
      [partnerId]
    );
    if (partner.rows.length === 0) throw ApiError.badRequest('Delivery partner not found or inactive');

    const order = await db.query(
      'SELECT ro.*, pa.address_line AS pickup_addr, pa.lat AS p_lat, pa.lng AS p_lng, s.address AS shop_addr, s.lat AS s_lat, s.lng AS s_lng FROM repair_orders ro LEFT JOIN addresses pa ON ro.pickup_address_id = pa.id LEFT JOIN shops s ON ro.shop_id = s.id WHERE ro.id = $1',
      [orderId]
    );
    if (order.rows.length === 0) throw ApiError.notFound('Order not found');
    const repair = order.rows[0];

    const ratePerKm = env.DELIVERY_RATE_PER_KM || 10.0;

    // Check if delivery already exists
    const existingDel = await db.query(
      "SELECT id FROM deliveries WHERE order_id = $1 AND leg_type = 'pickup'",
      [orderId]
    );

    if (existingDel.rows.length > 0) {
      await db.query(
        "UPDATE deliveries SET partner_id = $1, status = 'assigned', current_lat = COALESCE(current_lat, origin_lat, $3), current_lng = COALESCE(current_lng, origin_lng, $4) WHERE id = $2",
        [partnerId, existingDel.rows[0].id, repair.s_lat || 12.9716, repair.s_lng || 77.5946]
      );
    } else {
      // Create pickup delivery leg
      await db.query(
        `INSERT INTO deliveries (order_id, partner_id, leg_type, origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng, rate_per_km, status, current_lat, current_lng)
         VALUES ($1, $2, 'pickup', $3, $4, $5, $6, $7, $8, $9, 'assigned', COALESCE($7, $4, 12.9716), COALESCE($8, $5, 77.5946))`,
        [orderId, partnerId, repair.pickup_addr, repair.p_lat, repair.p_lng, repair.shop_addr, repair.s_lat, repair.s_lng, ratePerKm]
      );
    }

    // Update order status and runner_id
    await db.query(
      "UPDATE repair_orders SET current_status = 'partner_assigned', runner_id = $1, updated_at = NOW() WHERE id = $2",
      [partnerId, orderId]
    );
    await db.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, 'partner_assigned', 'admin', $2, 'Delivery partner assigned')`,
      [orderId, adminId]
    );

    return { message: 'Delivery partner assigned' };
  }

  /** Get available repair orders awaiting courier pickup (for runner dispatch board). */
  async getAvailablePickups() {
    const result = await db.query(
      `SELECT ro.*, p.product_name, p.category AS product_category,
              u.name AS customer_name, u.phone AS customer_phone,
              pa.address_line AS pickup_address, pa.lat AS pickup_lat, pa.lng AS pickup_lng,
              pa.label AS pickup_label, pa.city AS pickup_city, pa.pincode AS pickup_pincode,
              da.address_line AS delivery_address, da.lat AS delivery_lat, da.lng AS delivery_lng,
              da.label AS delivery_label, da.city AS delivery_city, da.pincode AS delivery_pincode,
              s.shop_name, s.address AS shop_address, s.lat AS shop_lat, s.lng AS shop_lng,
              CASE 
                WHEN ro.current_status::text IN ('repair_completed', 'quality_check', 'assigned_delivery') THEN 'return'
                ELSE 'pickup'
              END AS dispatch_type,
              CASE
                WHEN ro.warranty_tier = 'diamond' THEN 200.00
                WHEN ro.warranty_tier = 'gold' THEN 160.00
                ELSE 120.00
              END AS estimated_earnings,
              CASE
                WHEN ro.warranty_tier = 'diamond' THEN 80.00
                WHEN ro.warranty_tier = 'gold' THEN 40.00
                ELSE 0.00
              END AS express_bounty
       FROM repair_orders ro
       JOIN products p ON ro.product_id = p.id
       JOIN users u ON ro.customer_id = u.id
       LEFT JOIN addresses pa ON ro.pickup_address_id = pa.id
       LEFT JOIN addresses da ON ro.delivery_address_id = da.id
       LEFT JOIN shops s ON ro.shop_id = s.id
       WHERE (
         (ro.current_status::text IN ('repair_requested', 'pickup_requested', 'quote_approved', 'payment_confirmed')
          AND (ro.runner_id IS NULL OR ro.current_status = 'pickup_requested'))
         OR
         (ro.current_status::text IN ('repair_completed', 'quality_check', 'assigned_delivery'))
       )
       ORDER BY 
         CASE 
           WHEN ro.warranty_tier = 'diamond' THEN 1
           WHEN ro.warranty_tier = 'gold' THEN 2
           ELSE 3
         END ASC,
         ro.created_at DESC
       LIMIT 20`
    );
    return result.rows;
  }

  /** Courier claims an available pickup run or return delivery run. */
  async claimPickup(orderId, partnerId) {
    const order = await db.query(
      `SELECT ro.*, pa.address_line AS pickup_addr, pa.lat AS p_lat, pa.lng AS p_lng,
              da.address_line AS delivery_addr, da.lat AS d_lat, da.lng AS d_lng,
              s.address AS shop_addr, s.lat AS s_lat, s.lng AS s_lng
       FROM repair_orders ro
       LEFT JOIN addresses pa ON ro.pickup_address_id = pa.id
       LEFT JOIN addresses da ON ro.delivery_address_id = da.id
       LEFT JOIN shops s ON ro.shop_id = s.id
       WHERE ro.id = $1`,
      [orderId]
    );
    if (order.rows.length === 0) throw ApiError.notFound('Order not found');
    const repair = order.rows[0];

    const ratePerKm = env.DELIVERY_RATE_PER_KM || 10.0;

    const isReturn = ['repair_completed', 'quality_check', 'assigned_delivery'].includes(repair.current_status);
    const legType = isReturn ? 'return' : 'pickup';

    // Calculate runner earnings with VIP/Gold Express Bounty
    let runnerEarnings = isReturn ? 150.00 : 120.00;
    if (repair.warranty_tier === 'diamond') {
      runnerEarnings += 80.00; // ₹200 pickup / ₹230 return
    } else if (repair.warranty_tier === 'gold') {
      runnerEarnings += 40.00; // ₹160 pickup / ₹190 return
    }

    // Origin and destination depending on leg
    const originAddr = isReturn ? repair.shop_addr : repair.pickup_addr;
    const originLat = isReturn ? repair.s_lat : repair.p_lat;
    const originLng = isReturn ? repair.s_lng : repair.p_lng;
    const destAddr = isReturn ? (repair.delivery_addr || repair.pickup_addr) : repair.shop_addr;
    const destLat = isReturn ? (repair.d_lat || repair.p_lat) : repair.s_lat;
    const destLng = isReturn ? (repair.d_lng || repair.p_lng) : repair.s_lng;

    // Create or update delivery leg
    const existing = await db.query(
      "SELECT id FROM deliveries WHERE order_id = $1 AND leg_type = $2",
      [orderId, legType]
    );

    let deliveryId;
    if (existing.rows.length > 0) {
      deliveryId = existing.rows[0].id;
      await db.query(
        "UPDATE deliveries SET partner_id = $1, status = 'assigned', started_at = NOW(), current_lat = COALESCE(current_lat, $3, 12.9716), current_lng = COALESCE(current_lng, $4, 77.5946), earnings = $5 WHERE id = $2",
        [partnerId, deliveryId, originLat, originLng, runnerEarnings]
      );
    } else {
      const ins = await db.query(
        `INSERT INTO deliveries (order_id, partner_id, leg_type, origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng, rate_per_km, status, started_at, current_lat, current_lng, earnings)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'assigned', NOW(), COALESCE($5, 12.9716), COALESCE($6, 77.5946), $11)
         RETURNING id`,
        [orderId, partnerId, legType, originAddr, originLat, originLng, destAddr, destLat, destLng, ratePerKm, runnerEarnings]
      );
      deliveryId = ins.rows[0].id;
    }

    const nextStatus = isReturn ? 'out_for_delivery' : 'partner_assigned';

    // Update order status and runner_id
    await db.query(
      "UPDATE repair_orders SET current_status = $1, runner_id = $2, updated_at = NOW() WHERE id = $3",
      [nextStatus, partnerId, orderId]
    );

    await db.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, $2, 'delivery_partner', $3, $4)`,
      [orderId, nextStatus, partnerId, isReturn ? 'Courier claimed return delivery run to customer doorstep' : 'Courier claimed doorstep pickup dispatch']
    );

    // Notify customer that a courier has been assigned (fire-and-forget, non-blocking)
    (async () => {
      try {
        const orderRes = await db.query('SELECT customer_id FROM repair_orders WHERE id = $1', [orderId]);
        if (orderRes.rows[0]?.customer_id) {
          notificationsService.send(orderRes.rows[0].customer_id, {
            title: isReturn ? '🚀 Return Delivery Courier Assigned' : '🏍️ Courier Partner Assigned — Arriving Shortly',
            body: isReturn 
              ? `A verified courier partner has been dispatched to deliver your repaired device to your doorstep. (Order #${orderId.slice(0, 8).toUpperCase()})`
              : `A RepairBee certified courier is heading to your location for doorstep device pickup. Keep your 6-digit OTP ready. (Order #${orderId.slice(0, 8).toUpperCase()})`,
            type: 'order',
            referenceId: orderId
          }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
        }
      } catch (err) { logger.warn('Notification lookup failed:', err?.message); }

      // Dispatch simulated WhatsApp & SMS for courier assignment
      try {
        await outboundMessagesService.dispatch({
          orderId,
          templateKey: isReturn ? 'RUNNER_OUT_FOR_DELIVERY' : 'RUNNER_ASSIGNED',
          channel: 'both'
        });
      } catch (err) { logger.warn('Outbound SMS/WhatsApp dispatch failed:', err?.message); }
    })();

    return { 
      message: isReturn ? 'Return delivery run claimed! Collect device from workshop.' : 'Pickup run claimed successfully',
      deliveryId,
      legType 
    };
  }

  /** Get assigned jobs for a delivery partner. */
  async getMyJobs(partnerId, query = {}) {
    const { page, limit, offset } = parsePagination(query);
    const { status } = query;

    let whereClause = 'WHERE d.partner_id = $1';
    const params = [partnerId];
    let idx = 2;
    if (status) { whereClause += ` AND d.status = $${idx++}`; params.push(status); }

    const countResult = await db.query(`SELECT COUNT(*) FROM deliveries d ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT d.*, 
              ro.current_status AS order_status, 
              ro.pouch_barcode AS order_pouch_barcode,
              ro.pickup_otp,
              ro.delivery_otp,
              ro.warranty_tier,
              ro.warranty_days,
              ro.is_warranty_claim,
              ro.description AS order_description,
              p.product_name, p.category AS product_category,
              u.name AS customer_name, u.phone AS customer_phone,
              s.shop_name, s.address AS shop_address, s.lat AS shop_lat, s.lng AS shop_lng,
              pa.address_line AS pickup_address, pa.lat AS pickup_lat, pa.lng AS pickup_lng,
              pa.label AS pickup_label, pa.city AS pickup_city, pa.pincode AS pickup_pincode,
              da.address_line AS delivery_address, da.lat AS delivery_lat, da.lng AS delivery_lng,
              da.label AS delivery_label, da.city AS delivery_city, da.pincode AS delivery_pincode
       FROM deliveries d
       JOIN repair_orders ro ON d.order_id = ro.id
       JOIN products p ON ro.product_id = p.id
       JOIN users u ON ro.customer_id = u.id
       LEFT JOIN shops s ON ro.shop_id = s.id
       LEFT JOIN addresses pa ON ro.pickup_address_id = pa.id
       LEFT JOIN addresses da ON ro.delivery_address_id = da.id
       ${whereClause} ORDER BY d.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    return { jobs: result.rows, total, page, limit };
  }

  /** Verify doorstep pickup with tamper pouch barcode and customer OTP. */
  async verifyPickupWithPouch(deliveryId, partnerId, { pouch_barcode, otp, notes, pouch_image_url }) {
    const delRes = await db.query(
      'SELECT * FROM deliveries WHERE id = $1 AND partner_id = $2',
      [deliveryId, partnerId]
    );
    if (delRes.rows.length === 0) throw ApiError.notFound('Delivery job not found');
    const delivery = delRes.rows[0];

    const orderRes = await db.query('SELECT * FROM repair_orders WHERE id = $1', [delivery.order_id]);
    if (orderRes.rows.length === 0) throw ApiError.notFound('Order not found');
    const order = orderRes.rows[0];

    // Validate OTP
    if (!order.pickup_otp || order.pickup_otp.trim() !== String(otp).trim()) {
      throw ApiError.badRequest('Invalid Doorstep Pickup OTP. Please request the 6-digit code shown on the customer screen.');
    }

    if (!pouch_barcode || !pouch_barcode.trim()) {
      throw ApiError.badRequest('Tamper-evident pouch barcode is required');
    }

    const cleanBarcode = pouch_barcode.trim().toUpperCase();

    // Update delivery record
    await db.query(
      `UPDATE deliveries 
       SET status = 'picked_up', 
           pouch_barcode = $1, 
           completed_at = NOW(), 
           notes = $2, 
           pouch_image_url = $3 
       WHERE id = $4`,
      [cleanBarcode, notes || 'Tamper-evident pouch verified & sealed', pouch_image_url || null, deliveryId]
    );

    // Update repair order
    await db.query(
      `UPDATE repair_orders 
       SET current_status = 'picked_up', 
           pouch_barcode = $1, 
           runner_id = $2, 
           updated_at = NOW() 
       WHERE id = $3`,
      [cleanBarcode, partnerId, delivery.order_id]
    );

    // Log status change
    await db.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, 'picked_up', 'delivery_partner', $2, $3)`,
      [delivery.order_id, partnerId, `Doorstep tamper pouch sealed (#${cleanBarcode}) & verified with customer OTP`]
    );

    // Create return delivery leg if not already present
    const existingReturn = await db.query(
      "SELECT id FROM deliveries WHERE order_id = $1 AND leg_type = 'return'",
      [delivery.order_id]
    );

    if (existingReturn.rows.length === 0) {
      const shopRes = await db.query('SELECT * FROM shops WHERE id = $1', [order.shop_id]);
      const addrRes = await db.query('SELECT * FROM addresses WHERE id = $1', [order.delivery_address_id || order.pickup_address_id]);
      const shop = shopRes.rows[0] || {};
      const addr = addrRes.rows[0] || {};

      await db.query(
        `INSERT INTO deliveries (order_id, partner_id, leg_type, origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng, rate_per_km, status)
         VALUES ($1, $2, 'return', $3, $4, $5, $6, $7, $8, $9, 'assigned')`,
        [delivery.order_id, partnerId, shop.address, shop.lat, shop.lng, addr.address_line, addr.lat, addr.lng, delivery.rate_per_km || 10.0]
      );
    }

    // Post-pickup notification dispatch (fire-and-forget, non-blocking)
    (async () => {
      try {
        const orderRes = await db.query('SELECT customer_id FROM repair_orders WHERE id = $1', [delivery.order_id]);
        if (orderRes.rows[0]?.customer_id) {
          notificationsService.send(orderRes.rows[0].customer_id, {
            title: '📦 Device Picked Up & Sealed in Tamper Pouch',
            body: `Your device has been sealed in anti-static tamper-evident pouch #${cleanBarcode} and is in secure transit to the cleanroom workshop. (Order #${delivery.order_id.slice(0, 8).toUpperCase()})`,
            type: 'order',
            referenceId: delivery.order_id
          }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
        }
      } catch (err) { logger.warn('Notification lookup failed:', err?.message); }

      // Dispatch simulated WhatsApp & SMS for tamper pouch sealed
      try {
        await outboundMessagesService.dispatch({
          orderId: delivery.order_id,
          templateKey: 'TAMPER_POUCH_SEALED',
          channel: 'both'
        });
      } catch (err) { logger.warn('Outbound SMS/WhatsApp dispatch failed:', err?.message); }
    })();

    return {
      message: 'Tamper-evident pouch verified and sealed! Order transitioned to picked_up.',
      pouch_barcode: cleanBarcode,
      order_id: delivery.order_id
    };
  }

  /** Handover sealed pouch to workshop technician desk. */
  async handoverToShop(deliveryId, partnerId, { notes } = {}) {
    const delRes = await db.query(
      'SELECT * FROM deliveries WHERE id = $1 AND partner_id = $2',
      [deliveryId, partnerId]
    );
    if (delRes.rows.length === 0) throw ApiError.notFound('Delivery job not found');
    const delivery = delRes.rows[0];

    await db.query(
      `UPDATE repair_orders SET current_status = 'received_at_shop', updated_at = NOW() WHERE id = $1`,
      [delivery.order_id]
    );

    await db.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, 'received_at_shop', 'delivery_partner', $2, $3)`,
      [delivery.order_id, partnerId, notes || 'Tamper-evident pouch handed over to partner cleanroom bench']
    );

    // Notify customer and workshop owner (fire-and-forget)
    (async () => {
      try {
        const orderRes = await db.query('SELECT customer_id, shop_id FROM repair_orders WHERE id = $1', [delivery.order_id]);
        const order = orderRes.rows[0];
        if (order) {
          if (order.customer_id) {
            notificationsService.send(order.customer_id, {
              title: '🔬 Device Received at Workshop Bench',
              body: `Your device has safely arrived at the partner workshop cleanroom and is lined up for diagnostic assessment. (Order #${delivery.order_id.slice(0, 8).toUpperCase()})`,
              type: 'order',
              referenceId: delivery.order_id
            }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
          }
          if (order.shop_id) {
            const shopRes = await db.query('SELECT user_id FROM shops WHERE id = $1', [order.shop_id]);
            if (shopRes.rows[0]?.user_id) {
              notificationsService.send(shopRes.rows[0].user_id, {
                title: '📥 New Device Received at Cleanroom Intake',
                body: `A delivery partner has handed over the sealed tamper pouch for Order #${delivery.order_id.slice(0, 8).toUpperCase()}. Ready for bench inspection.`,
                type: 'order',
                referenceId: delivery.order_id
              }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
            }
          }
        }
      } catch (err) { logger.warn('Handover notification lookup failed:', err?.message); }
    })();

    return { message: 'Order successfully received at partner workshop cleanroom!' };
  }

  /** Update runner real-time GPS location. */
  async updateLocation(deliveryId, partnerId, { lat, lng }) {
    if (!lat || !lng) throw ApiError.badRequest('Latitude and longitude required');

    await db.query(
      'UPDATE deliveries SET current_lat = $1, current_lng = $2 WHERE id = $3 AND partner_id = $4',
      [lat, lng, deliveryId, partnerId]
    );

    return { message: 'Runner location updated', lat, lng };
  }

  /** Verify return delivery OTP with customer at doorstep. */
  async verifyDeliveryOtp(deliveryId, partnerId, { otp, notes }) {
    const delRes = await db.query(
      'SELECT * FROM deliveries WHERE id = $1 AND partner_id = $2',
      [deliveryId, partnerId]
    );
    if (delRes.rows.length === 0) throw ApiError.notFound('Delivery job not found');
    const delivery = delRes.rows[0];

    const orderRes = await db.query('SELECT * FROM repair_orders WHERE id = $1', [delivery.order_id]);
    if (orderRes.rows.length === 0) throw ApiError.notFound('Order not found');
    const order = orderRes.rows[0];

    if (!order.delivery_otp || order.delivery_otp.trim() !== String(otp).trim()) {
      throw ApiError.badRequest('Invalid Customer Delivery Confirmation OTP. Please enter the 6-digit code shown on customer screen.');
    }

    let runnerEarnings = delivery.earnings && Number(delivery.earnings) > 0 ? Number(delivery.earnings) : (
      order.warranty_tier === 'diamond' ? 230.00 : order.warranty_tier === 'gold' ? 190.00 : 150.00
    );

    const result = await db.transaction(async (client) => {
      // 1. Complete delivery leg and credit runner earnings
      await client.query(
        "UPDATE deliveries SET status = 'delivered', completed_at = NOW(), earnings = $1 WHERE id = $2",
        [runnerEarnings, deliveryId]
      );

      // 2. Transition repair order to delivery_confirmed
      await client.query(
        "UPDATE repair_orders SET current_status = 'delivery_confirmed', updated_at = NOW() WHERE id = $1",
        [delivery.order_id]
      );

      // 3. Release escrow payments
      const payCheck = await client.query("SELECT id FROM payments WHERE order_id = $1", [delivery.order_id]);
      if (payCheck.rows.length === 0 && order.quote_amount) {
        await client.query(
          `INSERT INTO payments (order_id, customer_id, amount, method, escrow_status, released_at)
           VALUES ($1, $2, $3, 'upi', 'released', NOW())`,
          [delivery.order_id, order.customer_id, order.quote_amount]
        );
      } else {
        await client.query(
          "UPDATE payments SET escrow_status = 'released', released_at = NOW() WHERE order_id = $1",
          [delivery.order_id]
        );
      }

      // 4. Activate platform warranty (Standard 30d, Gold 90d, or Diamond 180d)
      const warrantyDays = order.warranty_days && Number(order.warranty_days) > 0 ? Number(order.warranty_days) : 30;
      await client.query(
        `UPDATE repair_orders SET warranty_expires_at = NOW() + INTERVAL '1 day' * $1, warranty_days = $1 WHERE id = $2`,
        [warrantyDays, delivery.order_id]
      );

      // 5. Audit log
      await client.query(
        `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
         VALUES ($1, 'delivery_confirmed', 'delivery_partner', $2, $3)`,
        [delivery.order_id, partnerId, notes || 'Customer inspected device at doorstep and entered Delivery OTP. Escrow released to workshop.']
      );

      return {
        message: '🎉 Doorstep delivery verified! Escrow released to workshop and 30-day warranty activated.',
        status: 'delivery_confirmed',
        order_id: delivery.order_id
      };
    });

    // Post-delivery notifications to customer & workshop owner (fire-and-forget, non-blocking)
    (async () => {
      try {
        if (order.customer_id) {
          notificationsService.send(order.customer_id, {
            title: '🎉 Device Delivered & Inspected Successfully!',
            body: `Your device has been delivered and verified. Your 30-day platform warranty is now ACTIVE. Thank you for choosing RepairBee! (Order #${delivery.order_id.slice(0, 8).toUpperCase()})`,
            type: 'warranty',
            referenceId: delivery.order_id
          }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
        }
        if (order.shop_id) {
          const shopOwnerRes = await db.query('SELECT user_id FROM shops WHERE id = $1', [order.shop_id]);
          if (shopOwnerRes.rows[0]?.user_id) {
            notificationsService.send(shopOwnerRes.rows[0].user_id, {
              title: '💰 Escrow Released — Delivery Confirmed',
              body: `Customer completed doorstep delivery verification. Escrow payout of ₹${order.quote_amount || '0'} has been credited to your workshop account. (Order #${delivery.order_id.slice(0, 8).toUpperCase()})`,
              type: 'payment',
              referenceId: delivery.order_id
            }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
          }
        }
      } catch (err) { logger.warn('Delivery notification lookup failed:', err?.message); }
    })();

    return result;
  }

  /** Update generic delivery status (en route, out for pickup, out for delivery). */
  async updateDeliveryStatus(deliveryId, partnerId, newStatus, distanceKm) {
    const delivery = await db.query('SELECT * FROM deliveries WHERE id = $1 AND partner_id = $2', [deliveryId, partnerId]);
    if (delivery.rows.length === 0) throw ApiError.notFound('Delivery job not found');
    const del = delivery.rows[0];

    const updates = ['status = $1'];
    const params = [newStatus, deliveryId];
    let idx = 3;

    if (newStatus === 'out_for_pickup' || newStatus === 'out_for_delivery') {
      updates.push(`started_at = NOW()`);
    }
    if (newStatus === 'picked_up' || newStatus === 'delivered') {
      updates.push(`completed_at = NOW()`);
      if (distanceKm) {
        updates.push(`distance_km = $${idx}`);
        params.splice(idx - 1, 0, distanceKm);
        idx++;
        const earnings = parseFloat((distanceKm * (del.rate_per_km || 10.0)).toFixed(2));
        updates.push(`earnings = $${idx}`);
        params.splice(idx - 1, 0, earnings);
        idx++;
      }
    }

    await db.query(`UPDATE deliveries SET ${updates.join(', ')} WHERE id = $2`, params);

    const orderStatusMap = {
      'out_for_pickup': 'out_for_pickup',
      'picked_up': 'picked_up',
      'out_for_delivery': 'out_for_delivery',
      'delivered': 'delivered',
    };

    if (orderStatusMap[newStatus]) {
      await db.query(
        `UPDATE repair_orders SET current_status = $1, updated_at = NOW() WHERE id = $2`,
        [orderStatusMap[newStatus], del.order_id]
      );
      await db.query(
        `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
         VALUES ($1, $2, 'delivery_partner', $3, $4)`,
        [del.order_id, orderStatusMap[newStatus], partnerId, `Delivery status: ${newStatus}`]
      );
    }

    return { message: `Delivery status updated to ${newStatus}` };
  }

  /** List available delivery partners (Admin). */
  async getAvailablePartners() {
    const result = await db.query(
      "SELECT u.id, u.name, u.phone, u.email FROM users u WHERE u.role = 'delivery_partner' AND u.is_active = true ORDER BY u.name"
    );
    return result.rows;
  }
}

module.exports = new DeliveriesService();
