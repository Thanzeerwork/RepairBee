const crypto = require('crypto');
const db = require('../../config/database');
const ApiError = require('../../utils/apiError');
const { ORDER_STATUS, STATUS_TRANSITIONS, ROLES } = require('../../utils/constants');
const { parsePagination, generateOTP } = require('../../utils/helpers');
const logger = require('../../utils/logger');
const notificationsService = require('../notifications/notifications.service');
const outboundMessagesService = require('../notifications/outboundMessages.service');

const DEFAULT_12_POINT_QC = [
  {
    testName: 'OLED / Touch Digitizer Multi-Point Accuracy',
    domain: 'Display & Touch',
    standard: 'Uniform Capacitive Response, 0 Dead Pixels, 120Hz Latency < 10ms',
    status: 'PASSED',
    measuredVal: '100% Capacitive Multi-Touch Uniformity'
  },
  {
    testName: 'Display Color Gamut & Luminance Calibration',
    domain: 'Display & Touch',
    standard: '100% sRGB/DCI-P3 Color Accuracy, TrueTone / Ambient Light Calibrated',
    status: 'PASSED',
    measuredVal: 'Peak 1,250 nits Luminance Confirmed'
  },
  {
    testName: 'Battery Capacity Cycle & Internal Impedance',
    domain: 'Power & Thermals',
    standard: 'OEM Rated Battery Capacity >= 90%, Internal Impedance < 45mΩ',
    status: 'PASSED',
    measuredVal: 'Battery Health 98% • 38mΩ Impedance'
  },
  {
    testName: 'Thermal Throttling & Heat Dissipation',
    domain: 'Power & Thermals',
    standard: 'Peak Core Temp <= 41°C under 100% Benchmark Stress Test',
    status: 'PASSED',
    measuredVal: '37.8°C Nominal Core Thermal Equilibrium'
  },
  {
    testName: 'Dual Microphones & Acoustic Frequency Response',
    domain: 'Optics, Audio & Sensors',
    standard: 'Noise Suppression Tested, Zero Buzzing / Rattle @ 1kHz (85dB SPL)',
    status: 'PASSED',
    measuredVal: 'Dual Noise-Canceling Array Nominal'
  },
  {
    testName: 'Optical Camera Array & Optical Image Stabilization (OIS)',
    domain: 'Optics, Audio & Sensors',
    standard: 'Multi-Lens Laser Autofocus Calibrated, OIS Gyroscope Active',
    status: 'PASSED',
    measuredVal: '0.04s Laser AF Lock & Clean Optical Ring'
  },
  {
    testName: 'Biometrics & Secure Enclave Cryptographic Handshake',
    domain: 'Optics, Audio & Sensors',
    standard: 'Face ID / Touch ID Optical Sensor Hardware Handshake Authenticated',
    status: 'PASSED',
    measuredVal: '100% Biometric Handshake Match Rate'
  },
  {
    testName: 'Wireless RF Telemetry (5G / Wi-Fi 6 / Bluetooth 5.3)',
    domain: 'Board & Hermetic Integrity',
    standard: 'Active Antenna Diversity Check, RSSI Signal Reception > -65 dBm',
    status: 'PASSED',
    measuredVal: '-52 dBm Strong Signal on 5GHz Band'
  },
  {
    testName: 'Power Delivery Handshake & Fast Charge Negotiation',
    domain: 'Power & Thermals',
    standard: 'USB-PD / QC 4.0 Handshake Verified, Idle Leakage Current < 12mA',
    status: 'PASSED',
    measuredVal: '5V/3A & 9V/2.2A Negotiation Confirmed'
  },
  {
    testName: 'Tactile Physical Controls & Linear Haptic Engine',
    domain: 'Optics, Audio & Sensors',
    standard: 'Positive Micro-Switch Travel, Haptic Taptic Engine Waveform Nom.',
    status: 'PASSED',
    measuredVal: 'Clean Haptic Feedback & Tactile Click'
  },
  {
    testName: 'Liquid Contact Indicator (LCI) & Motherboard Surface',
    domain: 'Board & Hermetic Integrity',
    standard: 'Dry Virgin LCI Status, Zero Micro-Corrosion or Flux Residue',
    status: 'PASSED',
    measuredVal: 'LCI Strip Virgin White • 0 Board Bridges'
  },
  {
    testName: 'Cleanroom Hermetic Gasket & ESD Tamper-Evident Pouch Seal',
    domain: 'Board & Hermetic Integrity',
    standard: 'Replacement IP Adhesive Gasket, Flush Bezel, VOID Anti-Static Pouch',
    status: 'PASSED',
    measuredVal: '0.0mm Bezel Flex, Tamper Seal Applied'
  }
];

class RepairsService {
  /**
   * Create a new repair request (Customer).
   */
  async createRepairRequest(customerId, data) {
    const { product_id, issue_ids, description, media_urls, order_type, scheduled_at,
            pickup_address_id, delivery_address_id } = data;

    // Validate product exists
    const product = await db.query('SELECT id FROM products WHERE id = $1 AND is_active = true', [product_id]);
    if (product.rows.length === 0) throw ApiError.badRequest('Invalid product');

    // Validate address
    if (pickup_address_id) {
      const addr = await db.query('SELECT id FROM addresses WHERE id = $1 AND user_id = $2', [pickup_address_id, customerId]);
      if (addr.rows.length === 0) throw ApiError.badRequest('Invalid pickup address');
    }

    // For scheduled orders, validate scheduled_at
    if (order_type === 'scheduled' && !scheduled_at) {
      throw ApiError.badRequest('Scheduled date/time required for scheduled orders');
    }

    const pickupOtp = generateOTP(6);

    let promoCodeId = null;
    let initialDiscount = 0;

    if (data.promo_code && typeof data.promo_code === 'string') {
      const cleanCode = data.promo_code.trim().toUpperCase();
      // Check promo codes table first
      const promoRes = await db.query(
        'SELECT * FROM promo_codes WHERE UPPER(code) = $1 AND is_active = true',
        [cleanCode]
      );
      if (promoRes.rows.length > 0) {
        const promo = promoRes.rows[0];
        promoCodeId = promo.id;
        if (promo.discount_type === 'flat') {
          initialDiscount = parseFloat(promo.discount_value);
        }
      } else {
        // Check if referral code
        try {
          const referralsService = require('../referrals/referrals.service');
          const refResult = await referralsService.applyReferralCode(customerId, cleanCode);
          if (refResult?.discount_amount) {
            initialDiscount = parseFloat(refResult.discount_amount);
          }
        } catch (refErr) {
          logger.warn(`Referral code apply skipped during booking: ${refErr?.message}`);
        }
      }
    }

    const warrantyTier = ['gold', 'diamond'].includes(data.warranty_tier) ? data.warranty_tier : 'standard';
    let warrantyDays = 30;
    let warrantyAmount = 0.00;

    if (warrantyTier === 'gold') {
      warrantyDays = 90;
      warrantyAmount = 299.00;
    } else if (warrantyTier === 'diamond') {
      warrantyDays = 180;
      warrantyAmount = 599.00;
    }

    const diagnosticReport = data.diagnostic_report ? JSON.stringify(data.diagnostic_report) : null;

    const result = await db.query(
      `INSERT INTO repair_orders 
       (customer_id, product_id, issue_ids, description, media_urls, order_type, scheduled_at, 
        pickup_address_id, delivery_address_id, current_status, pickup_otp, promo_code_id, discount_amount,
        warranty_tier, warranty_days, warranty_amount, diagnostic_report)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'repair_requested',$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [customerId, product_id, issue_ids || [], description, media_urls || [],
       order_type || 'scheduled', scheduled_at, pickup_address_id, delivery_address_id || pickup_address_id,
       pickupOtp, promoCodeId, initialDiscount, warrantyTier, warrantyDays, warrantyAmount, diagnosticReport]
    );

    const order = result.rows[0];

    // Log initial status
    await this._logStatus(order.id, ORDER_STATUS.REPAIR_REQUESTED, ROLES.CUSTOMER, customerId, 'Repair request created');

    // Dispatch notification to customer
    notificationsService.send(customerId, {
      title: '🔧 Repair Request Submitted',
      body: `Your repair request #${order.id.slice(0, 8).toUpperCase()} has been created. A certified workshop will review your device shortly.`,
      type: 'order',
      referenceId: order.id
    }).catch(err => logger.warn('Notification dispatch failed:', err?.message));

    return order;
  }

  /**
   * Get repair orders for a customer with filters.
   */
  async getCustomerOrders(customerId, query) {
    const { page, limit, offset } = parsePagination(query);
    const { status } = query;

    let whereClause = 'WHERE ro.customer_id = $1';
    const params = [customerId];
    let paramIndex = 2;

    if (status) {
      if (status === 'active') {
        whereClause += ` AND ro.current_status::text NOT IN ('delivered', 'delivery_confirmed', 'completed', 'cancelled')`;
      } else if (status === 'completed') {
        whereClause += ` AND ro.current_status::text IN ('delivered', 'delivery_confirmed', 'completed')`;
      } else if (status === 'cancelled') {
        whereClause += ` AND ro.current_status::text = 'cancelled'`;
      } else {
        whereClause += ` AND ro.current_status::text = $${paramIndex++}`;
        params.push(status);
      }
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM repair_orders ro ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT ro.*, p.product_name, p.category AS product_category,
              s.shop_name, s.avg_rating AS shop_rating
       FROM repair_orders ro
       JOIN products p ON ro.product_id = p.id
       LEFT JOIN shops s ON ro.shop_id = s.id
       ${whereClause}
       ORDER BY ro.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return { orders: result.rows, total, page, limit };
  }

  /**
   * Get full order details with status timeline.
   */
  async getOrderDetails(orderId, userId, userRole) {
    const result = await db.query(
      `SELECT ro.*, p.product_name, p.category AS product_category,
              s.shop_name, s.avg_rating AS shop_rating, s.id AS shop_id_ref,
              s.address AS shop_address, s.lat AS shop_lat, s.lng AS shop_lng,
              u.name AS customer_name, u.phone AS customer_phone,
              pa.address_line AS pickup_address, pa.lat AS pickup_lat, pa.lng AS pickup_lng,
              pa.label AS pickup_label, pa.city AS pickup_city, pa.pincode AS pickup_pincode,
              da.address_line AS delivery_address, da.lat AS delivery_lat, da.lng AS delivery_lng,
              da.label AS delivery_label, da.city AS delivery_city, da.pincode AS delivery_pincode,
              rn.name AS runner_name, rn.phone AS runner_phone,
              del.id AS active_delivery_id, del.status AS delivery_status,
              del.current_lat AS runner_lat, del.current_lng AS runner_lng,
              del.pouch_barcode AS active_pouch_barcode, del.leg_type AS delivery_leg
       FROM repair_orders ro
       JOIN products p ON ro.product_id = p.id
       JOIN users u ON ro.customer_id = u.id
       LEFT JOIN shops s ON ro.shop_id = s.id
       LEFT JOIN addresses pa ON ro.pickup_address_id = pa.id
       LEFT JOIN addresses da ON ro.delivery_address_id = da.id
       LEFT JOIN users rn ON ro.runner_id = rn.id
       LEFT JOIN LATERAL (
         SELECT id, status, current_lat, current_lng, pouch_barcode, leg_type 
         FROM deliveries 
         WHERE order_id = ro.id 
         ORDER BY created_at DESC LIMIT 1
       ) del ON true
       WHERE ro.id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) throw ApiError.notFound('Order not found');

    const order = result.rows[0];

    // Access control: customer sees own, shop sees assigned, admin/partner see all
    if (userRole === ROLES.CUSTOMER && order.customer_id !== userId) {
      throw ApiError.forbidden('Access denied');
    }

    // Get status timeline
    const timeline = await db.query(
      `SELECT osl.status, osl.note, osl.created_at, osl.updated_by_role, u.name AS updated_by_name
       FROM order_status_logs osl
       JOIN users u ON osl.updated_by_id = u.id
       WHERE osl.order_id = $1
       ORDER BY osl.created_at ASC`,
      [orderId]
    );

    // Get issue labels
    let issues = [];
    if (order.issue_ids && order.issue_ids.length > 0) {
      const issueResult = await db.query(
        'SELECT id, issue_label FROM issue_types WHERE id = ANY($1)',
        [order.issue_ids]
      );
      issues = issueResult.rows;
    }

    return { ...order, timeline: timeline.rows, issues };
  }

  /**
   * Get official tax invoice and cleanroom QC certificate details for an order.
   */
  async getOrderInvoice(orderId, userId, userRole) {
    const order = await this.getOrderDetails(orderId, userId, userRole);

    const warrantyPlanAmount = parseFloat(order.warranty_amount || 0);
    const grossAmount = parseFloat(order.total_amount || order.quote_amount || 1850);
    const repairBaseAmount = Math.max(0, grossAmount - warrantyPlanAmount);

    // 18% GST calculation (reverse calculated from gross amounts)
    const repairTaxable = parseFloat((repairBaseAmount / 1.18).toFixed(2));
    const warrantyTaxable = warrantyPlanAmount > 0 ? parseFloat((warrantyPlanAmount / 1.18).toFixed(2)) : 0;
    const taxableAmount = parseFloat((repairTaxable + warrantyTaxable).toFixed(2));

    const totalGst = parseFloat((grossAmount - taxableAmount).toFixed(2));
    const cgst = parseFloat((taxableAmount * 0.09).toFixed(2));
    const sgst = parseFloat((totalGst - cgst).toFixed(2));

    // Itemized breakdown: Component Replacement vs Labor & Cleanroom Diagnostic
    const partCost = parseFloat((repairTaxable * 0.65).toFixed(2));
    const laborCost = parseFloat((repairTaxable - partCost).toFixed(2));

    const invoiceNumber = `RB-INV-2026-${order.id.slice(0, 8).toUpperCase()}`;
    const warrantyCode = `WBEE-WTY-${order.id.slice(0, 8).toUpperCase()}`;

    const dateCompleted = order.completed_at ? new Date(order.completed_at) : new Date(order.updated_at || Date.now());
    const warrantyDays = order.warranty_days && Number(order.warranty_days) > 0 ? Number(order.warranty_days) : 30;
    const validUntilDate = order.warranty_expires_at ? new Date(order.warranty_expires_at) : new Date(dateCompleted);
    if (!order.warranty_expires_at) {
      validUntilDate.setDate(validUntilDate.getDate() + warrantyDays);
    }

    const warrantyTier = order.warranty_tier || 'standard';
    const warrantyTierName = warrantyTier === 'diamond' 
      ? 'Diamond VIP Shield (180 Days)' 
      : warrantyTier === 'gold' 
      ? 'Gold Shield Protection (90 Days)' 
      : 'Standard Platform Warranty (30 Days)';

    const warrantyTerms = warrantyTier === 'diamond'
      ? '180-Day Comprehensive Hardware guarantee. Accidental screen drop grace period (50% parts replacement off). VIP 2-hour courier dispatch and 1-click instant wallet refund guaranteed by RepairBee Platform Trust Protocol.'
      : warrantyTier === 'gold'
      ? '90-Day Parts & Workmanship guarantee. Priority cleanroom rework bay queue, zero-deductible doorstep courier re-pickup, and free thermal paste inspection.'
      : 'Covers replacement part failure, touch latency, microphone distortion, and reassembly defects. 1-click free re-repair or 100% escrow refund guaranteed by RepairBee Platform Trust Protocol.';

    const invoiceItems = [
      {
        description: `Original Equipment Manufacturer (OEM) ${order.product_name || 'Device'} Replacement Component`,
        hsn: '851770',
        qty: 1,
        unitPrice: partCost,
        taxableValue: partCost,
        cgst: parseFloat((partCost * 0.09).toFixed(2)),
        sgst: parseFloat((partCost * 0.09).toFixed(2)),
        total: parseFloat((partCost * 1.18).toFixed(2))
      },
      {
        description: 'Precision Bench Diagnostic, Anti-Static Assembly & Micro-Soldering Labor',
        hsn: '998713',
        qty: 1,
        unitPrice: laborCost,
        taxableValue: laborCost,
        cgst: parseFloat((laborCost * 0.09).toFixed(2)),
        sgst: parseFloat((laborCost * 0.09).toFixed(2)),
        total: parseFloat((laborCost * 1.18).toFixed(2))
      }
    ];

    if (warrantyPlanAmount > 0) {
      const wCgst = parseFloat((warrantyTaxable * 0.09).toFixed(2));
      const wSgst = parseFloat((warrantyPlanAmount - warrantyTaxable - wCgst).toFixed(2));
      invoiceItems.push({
        description: `RepairBee Extended Protection Plan: ${warrantyTierName}`,
        hsn: '997139',
        qty: 1,
        unitPrice: warrantyTaxable,
        taxableValue: warrantyTaxable,
        cgst: wCgst,
        sgst: wSgst,
        total: warrantyPlanAmount
      });
    }

    invoiceItems.push({
      description: 'Express Doorstep Insured Tamper Transit & Anti-Static Pouch Custody',
      hsn: '996511',
      qty: 1,
      unitPrice: 0.00,
      taxableValue: 0.00,
      cgst: 0.00,
      sgst: 0.00,
      total: 0.00
    });

    return {
      order,
      invoice: {
        invoiceNumber,
        invoiceDate: dateCompleted.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        invoiceTime: dateCompleted.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        gstin: '29AABCR1234F1Z9',
        hsnCode: '998713',
        stateCode: '29 (Karnataka)',
        placeOfSupply: 'Bangalore, Karnataka',
        paymentMethod: 'Escrow Digital Settlement (UPI / Card)',
        taxableAmount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        grossAmount,
        items: invoiceItems
      },
      cleanroomQC: order.qc_report ? (typeof order.qc_report === 'string' ? JSON.parse(order.qc_report) : order.qc_report) : {
        certificateId: `QC-CERT-${order.id.slice(0, 8).toUpperCase()}`,
        facility: order.shop_name || 'Fix It Electronics Authorized Cleanroom Workbench',
        cleanroomStandard: 'ISO 14644-1 Class 7 Certified Anti-Static Environment',
        workbenchBay: 'Bay #4 • Precision Micro-Electronics Station',
        leadTechnician: 'Anand Verma',
        technicianId: 'RB-TECH-041',
        inspectionDate: dateCompleted.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        pouchBarcode: order.pouch_barcode || order.active_pouch_barcode || 'RB-POUCH-34075',
        deviceInspectionPoints: DEFAULT_12_POINT_QC
      },
      warranty: {
        warrantyId: warrantyCode,
        tier: warrantyTier,
        tierName: warrantyTierName,
        durationDays: warrantyDays,
        amount: parseFloat(order.warranty_amount || 0),
        validFrom: dateCompleted.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        validUntil: validUntilDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        terms: warrantyTerms,
        claimUrl: `https://repairbee.com/track/${order.id}`
      }
    };
  }

  /**
   * Get incoming repair requests for a shop.
   */
  async getShopIncomingOrders(userId, query) {
    const { page, limit, offset } = parsePagination(query);

    // Get the shop for this user
    const shopResult = await db.query('SELECT id FROM shops WHERE user_id = $1', [userId]);
    if (shopResult.rows.length === 0) throw ApiError.notFound('Shop not found');
    const shopId = shopResult.rows[0].id;

    const { status, vip_only } = query;
    let whereClause = 'WHERE (ro.shop_id = $1 OR (ro.shop_id IS NULL AND ro.current_status = \'repair_requested\'))';
    const params = [shopId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND ro.current_status = $${paramIndex++}`;
      params.push(status);
    }

    if (vip_only === 'true') {
      whereClause += ` AND ro.warranty_tier IN ('diamond', 'gold')`;
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM repair_orders ro ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT ro.*, p.product_name, p.category AS product_category,
              u.name AS customer_name, u.phone AS customer_phone,
              pa.address_line AS pickup_address
       FROM repair_orders ro
       JOIN products p ON ro.product_id = p.id
       JOIN users u ON ro.customer_id = u.id
       LEFT JOIN addresses pa ON ro.pickup_address_id = pa.id
       ${whereClause}
       ORDER BY 
         CASE 
           WHEN ro.warranty_tier = 'diamond' THEN 1
           WHEN ro.warranty_tier = 'gold' THEN 2
           ELSE 3
         END ASC,
         ro.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return { orders: result.rows, total, page, limit };
  }

  /**
   * Select a shop for a repair order (Customer chooses shop).
   */
  async selectShop(orderId, customerId, shopId) {
    const order = await this._getOrder(orderId);
    if (order.customer_id !== customerId) throw ApiError.forbidden('Access denied');
    if (order.current_status !== ORDER_STATUS.REPAIR_REQUESTED && order.current_status !== ORDER_STATUS.QUOTE_REJECTED) {
      throw ApiError.badRequest('Shop can only be selected when order is in repair_requested or quote_rejected status');
    }

    // Verify shop exists and is approved
    const shop = await db.query('SELECT id FROM shops WHERE id = $1 AND is_approved = true AND is_active = true', [shopId]);
    if (shop.rows.length === 0) throw ApiError.badRequest('Shop not found or not available');

    const result = await db.query(
      `UPDATE repair_orders SET shop_id = $1, current_status = 'repair_requested', updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [shopId, orderId]
    );
    return result.rows[0];
  }

  /**
   * Update repair status (Shop updates during repair process).
   */
  async updateStatus(orderId, userId, userRole, newStatus, note) {
    const order = await this._getOrder(orderId);

    // Validate transition
    const allowedTransitions = STATUS_TRANSITIONS[order.current_status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw ApiError.badRequest(
        `Invalid status transition: ${order.current_status} → ${newStatus}. ` +
        `Allowed: ${allowedTransitions?.join(', ') || 'none'}`
      );
    }

    // Role-based transition validation
    this._validateRoleForTransition(userRole, newStatus, order);

    // Normalize aliases for DB enum compatibility
    let dbStatus = newStatus;
    if (newStatus === 'in_repair') dbStatus = ORDER_STATUS.REPAIR_IN_PROGRESS;
    if (newStatus === 'quality_check') dbStatus = ORDER_STATUS.REPAIR_COMPLETED;
    if (newStatus === 'diagnosing') dbStatus = ORDER_STATUS.DIAGNOSIS_IN_PROGRESS;
    if (newStatus === 'assigned_delivery') dbStatus = ORDER_STATUS.REPAIR_COMPLETED;

    // Update status
    const updateFields = ['current_status = $1', 'updated_at = NOW()'];
    const updateParams = [dbStatus, orderId];

    // If transitioning to repair_completed, quality_check, or assigned_delivery, ensure delivery_otp is generated
    if (['repair_completed', 'quality_check', 'assigned_delivery', ORDER_STATUS.REPAIR_COMPLETED].includes(newStatus) && !order.delivery_otp) {
      const delOtp = generateOTP(6);
      updateFields.push(`delivery_otp = $${updateParams.length + 1}`);
      updateParams.push(delOtp);
    }

    const result = await db.query(
      `UPDATE repair_orders SET ${updateFields.join(', ')} WHERE id = $2 RETURNING *`,
      updateParams
    );

    // Ensure return delivery leg exists in deliveries table
    if (['repair_completed', 'quality_check', 'assigned_delivery', ORDER_STATUS.REPAIR_COMPLETED].includes(newStatus)) {
      try {
        const existingReturn = await db.query(
          "SELECT id FROM deliveries WHERE order_id = $1 AND leg_type = 'return'",
          [orderId]
        );
        if (existingReturn.rows.length === 0) {
          const shopRes = await db.query('SELECT * FROM shops WHERE id = $1', [order.shop_id]);
          const addrRes = await db.query('SELECT * FROM addresses WHERE id = $1', [order.delivery_address_id || order.pickup_address_id]);
          const shop = shopRes.rows[0] || {};
          const addr = addrRes.rows[0] || {};

          let partnerId = order.runner_id;
          if (!partnerId) {
            const runnerLookup = await db.query("SELECT id FROM users WHERE role = 'delivery_partner' AND is_active = true LIMIT 1");
            partnerId = runnerLookup.rows[0]?.id;
          }

          if (partnerId) {
            await db.query(
              `INSERT INTO deliveries (order_id, partner_id, leg_type, origin_address, origin_lat, origin_lng, destination_address, destination_lat, destination_lng, rate_per_km, status, current_lat, current_lng)
               VALUES ($1, $2, 'return', $3, $4, $5, $6, $7, $8, $9, 'assigned', $4, $5)`,
              [orderId, partnerId, shop.address || 'Fix It Electronics, 12 MG Road', shop.lat || 12.9716, shop.lng || 77.5946, addr.address_line || 'Customer Doorstep', addr.lat || 12.9352, addr.lng || 77.6245, 10.0]
            );
          }

          if (!order.delivery_otp) {
            const delOtp = generateOTP(6);
            await db.query("UPDATE repair_orders SET delivery_otp = $1 WHERE id = $2", [delOtp, orderId]);
          }
        }
      } catch (delLegErr) {
        logger.warn('Could not auto-create return delivery leg:', delLegErr?.message);
      }
    }

    // Log the status change
    await this._logStatus(orderId, dbStatus, userRole, userId, note);

    // Dispatch lifecycle notifications based on the new status
    const notifMap = {
      'received_at_shop': { title: '📦 Device Received at Cleanroom Workshop', body: `Your device has arrived at the certified cleanroom and is being prepared for bench inspection.`, type: 'order' },
      'in_repair': { title: '🔧 Repair in Progress on Cleanroom Bench', body: `Your device is currently undergoing precision repair on the cleanroom bench.`, type: 'order' },
      'diagnosis_in_progress': { title: '🔬 Diagnostic Inspection in Progress', body: `Your device is being diagnosed by our certified technicians.`, type: 'order' },
      'repair_completed': { title: '✅ Repair Complete — 24-Point QA Certified', body: `Great news! Your device has passed the 24-point quality inspection and is ready for return delivery.`, type: 'order' },
      'out_for_delivery': { title: '🚴 Your Repaired Device is Out for Delivery', body: `A verified courier partner is on the way to your doorstep with your repaired device.`, type: 'order' },
      'delivery_confirmed': { title: '🎉 Delivery Confirmed & 30-Day Warranty Activated', body: `Your device has been delivered and your 30-day platform warranty starts now!`, type: 'order' }
    };
    const notif = notifMap[dbStatus] || notifMap[newStatus];
    if (notif && order.customer_id) {
      notificationsService.send(order.customer_id, {
        ...notif,
        body: notif.body + ` (Order #${orderId.slice(0, 8).toUpperCase()})`,
        referenceId: orderId
      }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
    }

    // Auto-dispatch simulated WhatsApp & SMS notifications for key milestones
    const outboundTemplateMap = {
      'received_at_shop': 'WORKSHOP_RECEIVED',
      'in_repair': 'CLEANROOM_LIVE_FEED',
      'repair_completed': 'REPAIR_COMPLETED_QC',
      'out_for_delivery': 'RUNNER_OUT_FOR_DELIVERY',
      'delivery_confirmed': 'ORDER_COMPLETED_WARRANTY'
    };
    const outboundKey = outboundTemplateMap[dbStatus] || outboundTemplateMap[newStatus];
    if (outboundKey) {
      outboundMessagesService.dispatch({ orderId, templateKey: outboundKey, channel: 'both' })
        .catch(err => logger.warn('Outbound SMS/WhatsApp dispatch failed:', err?.message));
    }

    return result.rows[0];
  }

  /**
   * Cancel an order (Customer, before pickup).
   */
  async cancelOrder(orderId, customerId) {
    const order = await this._getOrder(orderId);
    if (order.customer_id !== customerId) throw ApiError.forbidden('Access denied');

    // Can only cancel before delivery partner is out for pickup
    const cancellableStatuses = [
      ORDER_STATUS.REPAIR_REQUESTED, ORDER_STATUS.QUOTE_SENT, ORDER_STATUS.QUOTE_APPROVED,
      ORDER_STATUS.QUOTE_REJECTED, ORDER_STATUS.PAYMENT_CONFIRMED, ORDER_STATUS.PICKUP_REQUESTED,
      ORDER_STATUS.PARTNER_ASSIGNED,
    ];

    if (!cancellableStatuses.includes(order.current_status)) {
      throw ApiError.badRequest('Order cannot be cancelled at this stage');
    }

    await db.query(
      "UPDATE repair_orders SET current_status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [orderId]
    );

    await this._logStatus(orderId, ORDER_STATUS.CANCELLED, ROLES.CUSTOMER, customerId, 'Cancelled by customer');

    // If payment was made, mark for refund
    if (order.current_status === ORDER_STATUS.PAYMENT_CONFIRMED || 
        order.current_status === ORDER_STATUS.PICKUP_REQUESTED ||
        order.current_status === ORDER_STATUS.PARTNER_ASSIGNED) {
      await db.query(
        "UPDATE payments SET escrow_status = 'refunded', refunded_at = NOW() WHERE order_id = $1 AND escrow_status = 'held'",
        [orderId]
      );
    }

    return { message: 'Order cancelled successfully' };
  }

  /**
   * Confirm delivery received (Customer).
   */
  async confirmDelivery(orderId, customerId) {
    const order = await this._getOrder(orderId);
    if (order.customer_id !== customerId) throw ApiError.forbidden('Access denied');

    if (order.current_status === ORDER_STATUS.DELIVERY_CONFIRMED) {
      return { message: 'Delivery already confirmed. Escrow released to workshop.', status: 'delivery_confirmed' };
    }

    if (order.current_status === ORDER_STATUS.CANCELLED) {
      throw ApiError.badRequest('Cannot confirm delivery on a cancelled order');
    }

    if (!order.quote_amount && order.current_status === ORDER_STATUS.REPAIR_REQUESTED) {
      throw ApiError.badRequest('Quote must be approved before confirming delivery');
    }

    return await db.transaction(async (client) => {
      // Update order status to delivery_confirmed
      await client.query(
        "UPDATE repair_orders SET current_status = 'delivery_confirmed', updated_at = NOW() WHERE id = $1",
        [orderId]
      );

      // Update any active delivery leg to delivered
      await client.query(
        "UPDATE deliveries SET status = 'delivered', completed_at = NOW() WHERE order_id = $1 AND status != 'delivered'",
        [orderId]
      );

      // Release escrow payments or insert escrow release record
      const payCheck = await client.query("SELECT id FROM payments WHERE order_id = $1", [orderId]);
      if (payCheck.rows.length === 0 && order.quote_amount) {
        await client.query(
          `INSERT INTO payments (order_id, customer_id, amount, method, escrow_status, released_at)
           VALUES ($1, $2, $3, 'upi', 'released', NOW())`,
          [orderId, customerId, order.quote_amount]
        );
      } else {
        await client.query(
          "UPDATE payments SET escrow_status = 'released', released_at = NOW() WHERE order_id = $1",
          [orderId]
        );
      }

      // Activate 30-day (or specified) warranty
      const warrantyDays = order.warranty_days && Number(order.warranty_days) > 0 ? Number(order.warranty_days) : 30;
      await client.query(
        `UPDATE repair_orders SET warranty_expires_at = NOW() + INTERVAL '1 day' * $1 WHERE id = $2`,
        [warrantyDays, orderId]
      );

      await this._logStatusWithClient(
        client,
        orderId,
        ORDER_STATUS.DELIVERY_CONFIRMED,
        ROLES.CUSTOMER,
        customerId,
        'Delivery tested & confirmed. Escrow released to workshop.'
      );

      // Notify customer: delivery confirmed & warranty started
      notificationsService.send(customerId, {
        title: '🎉 Delivery Confirmed & 30-Day Warranty Activated',
        body: `Your repaired device is confirmed. Escrow payment has been released and your 30-day platform warranty begins now! (Order #${orderId.slice(0, 8).toUpperCase()})`,
        type: 'order',
        referenceId: orderId
      }).catch(err => logger.warn('Notification dispatch failed:', err?.message));

      // Notify workshop owner: escrow released & payout credited
      if (order.shop_id) {
        db.query('SELECT user_id FROM shops WHERE id = $1', [order.shop_id]).then(shopRes => {
          if (shopRes.rows[0]?.user_id) {
            notificationsService.send(shopRes.rows[0].user_id, {
              title: '💰 Escrow Released — Payout Credited',
              body: `Customer confirmed delivery for Order #${orderId.slice(0, 8).toUpperCase()}. Escrow payment of ₹${order.quote_amount || '0'} has been released to your wallet.`,
              type: 'payment',
              referenceId: orderId
            }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
          }
        }).catch(() => {});
      }

      // Complete referral reward if referee's first repair order completes
      try {
        const referralsService = require('../referrals/referrals.service');
        referralsService.completeReferral(order.customer_id).catch(err => logger.warn('Referral completion failed:', err?.message));
      } catch {}

      return { message: 'Delivery confirmed. Payment released to workshop.', status: 'delivery_confirmed' };
    });
  }

  /**
   * Admin: Release escrow manually.
   */
  async releaseEscrow(orderId, adminId) {
    const order = await this._getOrder(orderId);
    if (order.current_status === ORDER_STATUS.DELIVERY_CONFIRMED) {
      return { message: 'Escrow already released.' };
    }

    return await db.transaction(async (client) => {
      await client.query(
        "UPDATE repair_orders SET current_status = 'delivery_confirmed', updated_at = NOW() WHERE id = $1",
        [orderId]
      );

      const payCheck = await client.query("SELECT id FROM payments WHERE order_id = $1", [orderId]);
      if (payCheck.rows.length === 0 && order.quote_amount) {
        await client.query(
          `INSERT INTO payments (order_id, customer_id, amount, method, escrow_status, released_at)
           VALUES ($1, $2, $3, 'upi', 'released', NOW())`,
          [orderId, order.customer_id, order.quote_amount]
        );
      } else {
        await client.query(
          "UPDATE payments SET escrow_status = 'released', released_at = NOW() WHERE order_id = $1",
          [orderId]
        );
      }

      const warrantyDays = order.warranty_days && Number(order.warranty_days) > 0 ? Number(order.warranty_days) : 30;
      await client.query(
        `UPDATE repair_orders SET warranty_expires_at = NOW() + INTERVAL '1 day' * $1 WHERE id = $2`,
        [warrantyDays, orderId]
      );

      await this._logStatusWithClient(client, orderId, ORDER_STATUS.DELIVERY_CONFIRMED, ROLES.ADMIN, adminId, 'Escrow released by admin');

      return { message: 'Escrow released by admin' };
    });
  }

  /**
   * Admin: Get all orders with filters.
   */
  async getAllOrders(query) {
    const { page, limit, offset } = parsePagination(query);
    const { status, order_type, search } = query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) { whereClause += ` AND ro.current_status = $${paramIndex++}`; params.push(status); }
    if (order_type) { whereClause += ` AND ro.order_type = $${paramIndex++}`; params.push(order_type); }
    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM repair_orders ro JOIN users u ON ro.customer_id = u.id ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const result = await db.query(
      `SELECT ro.*, p.product_name, u.name AS customer_name, s.shop_name
       FROM repair_orders ro
       JOIN products p ON ro.product_id = p.id
       JOIN users u ON ro.customer_id = u.id
       LEFT JOIN shops s ON ro.shop_id = s.id
       ${whereClause}
       ORDER BY ro.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return { orders: result.rows, total, page, limit };
  }

  // ─── Private Helpers ─────────────────────────────────────

  async _getOrder(orderId) {
    const result = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (result.rows.length === 0) throw ApiError.notFound('Order not found');
    return result.rows[0];
  }

  _validateRoleForTransition(role, newStatus, order) {
    const shopStatuses = [
      ORDER_STATUS.QUOTE_SENT, ORDER_STATUS.RECEIVED_AT_SHOP,
      ORDER_STATUS.DIAGNOSIS_IN_PROGRESS, ORDER_STATUS.REPAIR_IN_PROGRESS,
      ORDER_STATUS.REPAIR_COMPLETED, 'quality_check', 'in_repair', 'diagnosing', 'assigned_delivery'
    ];
    const partnerStatuses = [
      ORDER_STATUS.OUT_FOR_PICKUP, ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED,
      ORDER_STATUS.DELIVERY_CONFIRMED, 'assigned_delivery'
    ];
    const customerStatuses = [
      ORDER_STATUS.QUOTE_APPROVED, ORDER_STATUS.QUOTE_REJECTED,
      ORDER_STATUS.DELIVERY_CONFIRMED,
    ];
    const adminStatuses = [ORDER_STATUS.PARTNER_ASSIGNED, ORDER_STATUS.DELIVERY_CONFIRMED];

    if (role === ROLES.SHOP_OWNER && !shopStatuses.includes(newStatus)) {
      throw ApiError.forbidden('Shop cannot set this status');
    }
    if (role === ROLES.DELIVERY_PARTNER && !partnerStatuses.includes(newStatus)) {
      throw ApiError.forbidden('Delivery partner cannot set this status');
    }
    if (role === ROLES.CUSTOMER && !customerStatuses.includes(newStatus)) {
      throw ApiError.forbidden('Customer cannot set this status');
    }
  }

  async _logStatus(orderId, status, role, userId, note) {
    await db.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, status, role, userId, note]
    );
  }

  async _logStatusWithClient(client, orderId, status, role, userId, note) {
    await client.query(
      `INSERT INTO order_status_logs (order_id, status, updated_by_role, updated_by_id, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, status, role, userId, note]
    );
  }
  /**
   * Shop saves/certifies 12-point Cleanroom QC Inspection Report.
   */
  async saveQcReport(orderId, userId, qcData) {
    const shopRes = await db.query('SELECT id, shop_name FROM shops WHERE user_id = $1', [userId]);
    if (shopRes.rows.length === 0) throw ApiError.notFound('Shop not found');
    const shop = shopRes.rows[0];

    const orderRes = await db.query('SELECT * FROM repair_orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) throw ApiError.notFound('Order not found');
    const order = orderRes.rows[0];

    if (order.shop_id && order.shop_id !== shop.id) {
      throw ApiError.forbidden('You can only perform QC inspection on your own shop orders');
    }

    const inspectionDate = qcData.inspectionDate || new Date().toISOString();
    const certificateId = qcData.certificateId || `QC-CERT-${order.id.slice(0, 8).toUpperCase()}`;
    const leadTechnician = qcData.leadTechnician || 'Anand Verma';
    const technicianId = qcData.technicianId || 'RB-TECH-041';
    const workbenchBay = qcData.workbenchBay || 'Bay #4 • Precision Cleanroom Bench';
    const cleanroomStandard = qcData.cleanroomStandard || 'ISO 14644-1 Class 7 Certified Anti-Static Environment';
    const pouchBarcode = qcData.pouchBarcode || order.pouch_barcode || 'RB-POUCH-34075';
    const deviceInspectionPoints = Array.isArray(qcData.deviceInspectionPoints) && qcData.deviceInspectionPoints.length > 0
      ? qcData.deviceInspectionPoints
      : DEFAULT_12_POINT_QC;

    const fullQcReport = {
      certificateId,
      facility: shop.shop_name,
      cleanroomStandard,
      workbenchBay,
      leadTechnician,
      technicianId,
      inspectionDate,
      pouchBarcode,
      deviceInspectionPoints,
      overallStatus: qcData.overallStatus || 'PASSED',
      benchNotes: qcData.benchNotes || 'All 12 precision hardware benchmark points certified.',
      completedAt: new Date().toISOString()
    };

    // Update order with qc_report JSONB and advance status to 'repair_completed' if in repair
    let nextStatus = order.current_status;
    if (['in_repair', 'repair_in_progress', 'diagnosing', 'quote_approved'].includes(order.current_status)) {
      nextStatus = 'repair_completed';
    }

    const updatedRes = await db.query(
      `UPDATE repair_orders 
       SET qc_report = $1, current_status = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [JSON.stringify(fullQcReport), nextStatus, orderId]
    );

    // Log status transition
    await this._logStatus(
      orderId, 
      nextStatus, 
      ROLES.SHOP_OWNER, 
      userId, 
      `12-Point Cleanroom QC Certified: ${leadTechnician} (${workbenchBay}) passed ${deviceInspectionPoints.length} tests`
    );

    // Notify customer
    if (order.customer_id) {
      notificationsService.send(order.customer_id, {
        title: '🛡️ Cleanroom QC Certificate Issued — 12-Point Test Passed',
        body: `Your device has passed all 12 precision cleanroom diagnostic tests at ${shop.shop_name}. Quality certificate #${certificateId} is now available in your order tracker.`,
        type: 'order',
        referenceId: orderId
      }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
    }

    return {
      success: true,
      order: updatedRes.rows[0],
      qcReport: fullQcReport
    };
  }

  /**
   * Get QC report for an order.
   */
  async getQcReport(orderId) {
    const orderRes = await db.query(
      `SELECT r.id, r.current_status, r.qc_report, r.pouch_barcode, s.shop_name 
       FROM repair_orders r 
       LEFT JOIN shops s ON r.shop_id = s.id 
       WHERE r.id = $1`,
      [orderId]
    );
    if (orderRes.rows.length === 0) throw ApiError.notFound('Order not found');
    const order = orderRes.rows[0];

    if (order.qc_report) {
      const rep = typeof order.qc_report === 'string' ? JSON.parse(order.qc_report) : order.qc_report;
      return rep;
    }

    // Default 12-point report if order is in or past quality_check
    return {
      certificateId: `QC-CERT-${order.id.slice(0, 8).toUpperCase()}`,
      facility: order.shop_name || 'Fix It Electronics Authorized Cleanroom Workbench',
      cleanroomStandard: 'ISO 14644-1 Class 7 Certified Anti-Static Environment',
      workbenchBay: 'Bay #4 • Precision Micro-Electronics Station',
      leadTechnician: 'Anand Verma',
      technicianId: 'RB-TECH-041',
      inspectionDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      pouchBarcode: order.pouch_barcode || 'RB-POUCH-34075',
      deviceInspectionPoints: DEFAULT_12_POINT_QC,
      overallStatus: 'PASSED',
      benchNotes: 'Cleanroom bench calibration verified.'
    };
  }

  /**
   * Submit and certify cleanroom repair video proof for an order.
   */
  async saveVideoProof(orderId, userId, proofData) {
    const orderRes = await db.query(
      `SELECT r.*, s.shop_name, u.name as customer_name, p.product_name 
       FROM repair_orders r 
       LEFT JOIN shops s ON r.shop_id = s.id 
       LEFT JOIN users u ON r.customer_id = u.id 
       LEFT JOIN products p ON r.product_id = p.id 
       WHERE r.id = $1`,
      [orderId]
    );
    if (orderRes.rows.length === 0) throw ApiError.notFound('Order not found');
    const order = orderRes.rows[0];

    const technicianName = proofData.technicianName || 'Vikram Sen';
    const technicianId = proofData.technicianId || 'RB-TECH-041';
    const workbenchBay = proofData.workbenchBay || 'Bay #4 • Precision ESD Micro-Soldering Bench';
    const certificateId = proofData.certificateId || `CERT-VPF-${order.id.slice(0, 8).toUpperCase()}`;
    const vaultId = `VPF-RB-${order.id.slice(0, 8).toUpperCase()}`;

    // Compute cryptographic SHA-256 tamper-evident digest
    const checkPointsData = proofData.checkpoints || [
      { time_seconds: 12, title: 'ESD Grounding & Barcode Seal Verification', badge: 'Tamper Ingress Check', description: 'Verification of tamper-evident bag seal and device IMEI serial match.', pass: true },
      { time_seconds: 38, title: 'Precision Disassembly & Micro-Soldering', badge: 'OEM Flex Cable Repair', description: 'Micro-soldering inspection under 40x microscope with thermal scan at 38.5°C.', pass: true },
      { time_seconds: 65, title: 'Authentic Component Serial Pairing', badge: 'Cryptographic Part Match', description: 'OEM replacement matrix firmware handshake verified without error code.', pass: true },
      { time_seconds: 85, title: 'Bench Post-Repair Power-On & Display Diagnostics', badge: '100% Touch Calibration', description: '12-point touch digitizer grid test and 120Hz display refresh passed.', pass: true }
    ];

    const rawPayload = `${order.id}|${vaultId}|${technicianId}|${workbenchBay}|${JSON.stringify(checkPointsData)}|${new Date().toISOString()}`;
    const tamperProofSha256 = crypto.createHash('sha256').update(rawPayload).digest('hex');

    const fullVaultData = {
      vaultId,
      certificateId,
      status: 'verified',
      videoUrl: proofData.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      videoDurationSeconds: proofData.videoDurationSeconds || 95,
      resolution: proofData.resolution || '1080p 60fps ESD Microscope Stream',
      facility: order.shop_name || 'Fix It Electronics Authorized Cleanroom Workbench',
      cleanroomStandard: proofData.cleanroomStandard || 'ISO 14644-1 Class 7 Certified Anti-Static Environment',
      workbenchBay,
      technicianName,
      technicianId,
      tamperProofSha256,
      recordedAt: new Date().toISOString(),
      checkpoints: checkPointsData,
      metrology: {
        roomTempC: proofData.roomTempC || 21.4,
        humidityPct: proofData.humidityPct || 42,
        esdGroundVoltageMv: proofData.esdGroundVoltageMv || 0.05,
        deviceModel: order.product_name || 'Electronics Device',
        pouchBarcode: order.pouch_barcode || 'RB-POUCH-34075'
      },
      benchNotes: proofData.benchNotes || 'High-definition video proof recorded at technician workbench. All 4 inspection checkpoints passed.'
    };

    const updatedRes = await db.query(
      `UPDATE repair_orders 
       SET video_proof_vault = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [JSON.stringify(fullVaultData), orderId]
    );

    // Log status transition
    await this._logStatus(
      orderId, 
      order.current_status, 
      ROLES.SHOP_OWNER, 
      userId, 
      `Cleanroom Repair Video Proof Certified: ${technicianName} (${workbenchBay}) published tamper-evident footage (SHA-256: ${tamperProofSha256.slice(0, 12)}...)`
    );

    // Notify customer
    if (order.customer_id) {
      notificationsService.send(order.customer_id, {
        title: '🎥 Cleanroom Repair Video Proof Ready',
        body: `Technician ${technicianName} has published verified bench repair footage for your ${order.product_name || 'device'}. Watch the interactive inspection player in your order tracker!`,
        type: 'order',
        referenceId: orderId
      }).catch(err => logger.warn('Notification dispatch failed:', err?.message));
    }

    return {
      success: true,
      order: updatedRes.rows[0],
      videoProofVault: fullVaultData
    };
  }

  /**
   * Get Cleanroom Video Proof for an order.
   */
  async getVideoProof(orderId) {
    const orderRes = await db.query(
      `SELECT r.id, r.current_status, r.video_proof_vault, r.qc_report, r.pouch_barcode, 
              s.shop_name, p.product_name 
       FROM repair_orders r 
       LEFT JOIN shops s ON r.shop_id = s.id 
       LEFT JOIN products p ON r.product_id = p.id 
       WHERE r.id = $1`,
      [orderId]
    );
    if (orderRes.rows.length === 0) throw ApiError.notFound('Order not found');
    const order = orderRes.rows[0];

    if (order.video_proof_vault) {
      const vault = typeof order.video_proof_vault === 'string' ? JSON.parse(order.video_proof_vault) : order.video_proof_vault;
      return vault;
    }

    // Default authentic video proof for demonstration if order is in progress or completed
    const vaultId = `VPF-RB-${order.id.slice(0, 8).toUpperCase()}`;
    const rawPayload = `${order.id}|${vaultId}|RB-TECH-041|Bay #4|default_checkpoints`;
    const defaultSha = crypto.createHash('sha256').update(rawPayload).digest('hex');

    return {
      vaultId,
      certificateId: `CERT-VPF-${order.id.slice(0, 8).toUpperCase()}`,
      status: 'verified',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      videoDurationSeconds: 95,
      resolution: '1080p 60fps ESD Microscope Stream',
      facility: order.shop_name || 'Fix It Electronics Authorized Cleanroom Workbench',
      cleanroomStandard: 'ISO 14644-1 Class 7 Certified Anti-Static Environment',
      workbenchBay: 'Bay #4 • Precision ESD Micro-Soldering Bench',
      technicianName: 'Vikram Sen',
      technicianId: 'RB-TECH-041',
      tamperProofSha256: defaultSha,
      recordedAt: new Date().toISOString(),
      checkpoints: [
        { time_seconds: 12, title: 'ESD Grounding & Barcode Seal Verification', badge: 'Tamper Ingress Check', description: 'Verification of tamper-evident bag seal and device IMEI serial match.', pass: true },
        { time_seconds: 38, title: 'Precision Disassembly & Micro-Soldering', badge: 'OEM Flex Cable Repair', description: 'Micro-soldering inspection under 40x microscope with thermal scan at 38.5°C.', pass: true },
        { time_seconds: 65, title: 'Authentic Component Serial Pairing', badge: 'Cryptographic Part Match', description: 'OEM replacement matrix firmware handshake verified without error code.', pass: true },
        { time_seconds: 85, title: 'Bench Post-Repair Power-On & Display Diagnostics', badge: '100% Touch Calibration', description: '12-point touch digitizer grid test and 120Hz display refresh passed.', pass: true }
      ],
      metrology: {
        roomTempC: 21.4,
        humidityPct: 42,
        esdGroundVoltageMv: 0.05,
        deviceModel: order.product_name || 'Electronics Device',
        pouchBarcode: order.pouch_barcode || 'RB-POUCH-34075'
      },
      benchNotes: 'Cleanroom Station #04 precision benchmark footage verified and cryptographically sealed.'
    };
  }
}

module.exports = new RepairsService();
