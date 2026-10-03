const db = require('../../config/database');
const logger = require('../../utils/logger');

// Template catalogue for simulated WhatsApp & SMS dispatches
const TEMPLATES = {
  RUNNER_ASSIGNED: {
    key: 'RUNNER_ASSIGNED',
    category: 'Logistics',
    whatsapp: {
      title: '🛵 Courier Assigned & En Route',
      body: 'Hi *{customerName}*, your RepairBee courier *{runnerName}* ({runnerPhone}) has been assigned to pick up your *{device}* (Order *#{orderNumber}*).\n\n🛵 *Courier Status*: En route to pickup doorstep\n⏱️ *Estimated ETA*: ~{eta} mins\n🛡️ *Safety Rule*: Inspect the courier ID and ensure your device is sealed inside a numbered anti-static tamper pouch before handoff.',
      buttons: [
        { label: '📍 Track Runner Live', url: '/track/{orderId}', action: 'navigate' },
        { label: '📞 Call Courier', url: 'tel:{runnerPhone}', action: 'call' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: Courier Assigned',
      body: 'RepairBee: Courier {runnerName} ({runnerPhone}) is assigned for your {device} (Order #{orderNumber}). Track live: https://repairbee.in/track/{orderId}'
    }
  },

  RUNNER_ARRIVING_PICKUP: {
    key: 'RUNNER_ARRIVING_PICKUP',
    category: 'Logistics',
    whatsapp: {
      title: '📍 Courier Arriving at Your Doorstep (<300m)',
      body: '🚨 *Doorstep Alert*: Courier *{runnerName}* is less than 300m away!\n\n🔑 *Pickup Verification OTP*: *{pickupOtp}*\n\n🔒 *Important*: Share this 6-digit OTP with the courier *only after* your {device} is placed inside the tamper-evident pouch and sealed in your presence.',
      buttons: [
        { label: '🔐 Copy Pickup OTP', otp: '{pickupOtp}', action: 'copy_otp' },
        { label: '📍 Live GPS Radar', url: '/track/{orderId}', action: 'navigate' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: Courier Arriving',
      body: 'RepairBee: Courier {runnerName} is arriving! Your 6-digit Pickup OTP is {pickupOtp}. Share ONLY after device is placed in tamper pouch. Order #{orderNumber}.'
    }
  },

  TAMPER_POUCH_SEALED: {
    key: 'TAMPER_POUCH_SEALED',
    category: 'Security',
    whatsapp: {
      title: '🔒 Tamper-Proof Pouch Sealed & Vaulted',
      body: '✅ *Chain of Custody Active*: Your *{device}* (Order *#{orderNumber}*) has been sealed inside anti-static tamper pouch *#{pouchId}* by courier *{runnerName}*.\n\n🛡️ *Tamper Guarantee*: Any seal puncture or peel immediately invalidates courier custody.\n📍 Real-time GPS transit corridor is now active.',
      buttons: [
        { label: '🛡️ Verify Pouch Barcode', url: '/track/{orderId}', action: 'navigate' },
        { label: '📍 GPS Transit Feed', url: '/track/{orderId}', action: 'navigate' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: Pouch Sealed',
      body: 'RepairBee: Device sealed in tamper pouch #{pouchId} by courier {runnerName}. GPS transit active. Order #{orderNumber}. Track: https://repairbee.in/track/{orderId}'
    }
  },

  WORKSHOP_RECEIVED: {
    key: 'WORKSHOP_RECEIVED',
    category: 'Workshop',
    whatsapp: {
      title: '🔬 Device Checked Into ESD Cleanroom Workshop',
      body: '🔬 *Workshop Intake*: Your *{device}* has safely arrived at certified partner *{shopName}*!\n\n📋 *Intake Check*: Tamper pouch #{pouchId} verified unbroken.\n🧪 *Next Step*: 42-point hardware diagnostics starting on ESD bench.',
      buttons: [
        { label: '🔍 Diagnostic Dashboard', url: '/track/{orderId}', action: 'navigate' },
        { label: '📹 Live Cleanroom Feed', url: '/track/{orderId}', action: 'navigate' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: Workshop Received',
      body: 'RepairBee: Your {device} safely reached {shopName} cleanroom bench. Diagnostics started. Order #{orderNumber}. View: https://repairbee.in/track/{orderId}'
    }
  },

  DIAGNOSTIC_QUOTE_READY: {
    key: 'DIAGNOSTIC_QUOTE_READY',
    category: 'Financial',
    whatsapp: {
      title: '📋 Diagnostic Report & Escrow Quote Ready',
      body: '🛠️ *Diagnostic Complete*: Certified technician at *{shopName}* inspected your *{device}*.\n\n💰 *Total Repair Quote*: *₹{quoteAmount}*\n🛡️ *Escrow Guarantee*: Funds are held in escrow and released ONLY after you verify the repaired device.\n⚡ *Action Required*: Approve the quote to authorize repair bench execution.',
      buttons: [
        { label: '✅ Approve & Escrow Protect', url: '/track/{orderId}', action: 'navigate' },
        { label: '💬 Chat with Technician', url: '/track/{orderId}', action: 'navigate' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: Quote Ready',
      body: 'RepairBee: Diagnostic quote ready for your {device}: Rs {quoteAmount}. Escrow protected. Review & approve: https://repairbee.in/track/{orderId}'
    }
  },

  CLEANROOM_LIVE_FEED: {
    key: 'CLEANROOM_LIVE_FEED',
    category: 'Transparency',
    whatsapp: {
      title: '🔴 Cleanroom Workbench Live Video Feed Online',
      body: '🎥 *Live Cleanroom Stream*: Certified technician has placed your *{device}* (Order *#{orderNumber}*) on ESD bench #2.\n\nWatch precision component replacement and thermal testing in real-time 1080p stream.',
      buttons: [
        { label: '🔴 Watch Live Stream', url: '/track/{orderId}', action: 'navigate' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: Live Stream',
      body: 'RepairBee: Live cleanroom video feed online for your {device} repair! Watch live: https://repairbee.in/track/{orderId}'
    }
  },

  REPAIR_COMPLETED_QC: {
    key: 'REPAIR_COMPLETED_QC',
    category: 'Quality',
    whatsapp: {
      title: '✨ Repair Complete & 24-Point QA Certified',
      body: '🎉 *Repair Successful*: Your *{device}* has finished repair and passed all 24-point display, touch, battery, and radio diagnostic tests at *{shopName}*.\n\n🏆 90-Day Free Escrow Warranty Certificate issued!\n📦 Packing into return courier pouch now.',
      buttons: [
        { label: '📜 View QA Certificate', url: '/track/{orderId}', action: 'navigate' },
        { label: '📍 Return Courier Details', url: '/track/{orderId}', action: 'navigate' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: QC Certified',
      body: 'RepairBee: Repair complete & 24-point QC passed for your {device}! 90-day warranty ready. Order #{orderNumber}. Track return: https://repairbee.in/track/{orderId}'
    }
  },

  RUNNER_OUT_FOR_DELIVERY: {
    key: 'RUNNER_OUT_FOR_DELIVERY',
    category: 'Logistics',
    whatsapp: {
      title: '🚴 Out for Return Delivery to Doorstep',
      body: '🚀 *En Route Home*: Courier *{runnerName}* ({runnerPhone}) has picked up your repaired *{device}* from the workshop and is on the way to your delivery address.\n\n⏱️ *ETA*: ~{eta} mins\n📍 Track courier live on Leaflet GPS.',
      buttons: [
        { label: '📍 Track Courier Live', url: '/track/{orderId}', action: 'navigate' },
        { label: '📞 Call Courier', url: 'tel:{runnerPhone}', action: 'call' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: Out for Delivery',
      body: 'RepairBee: Your repaired {device} is out for delivery with courier {runnerName} ({runnerPhone}). Track live: https://repairbee.in/track/{orderId}'
    }
  },

  DELIVERY_OTP_ALERT: {
    key: 'DELIVERY_OTP_ALERT',
    category: 'Security',
    whatsapp: {
      title: '🔑 Delivery Acceptance OTP Alert',
      body: '📍 *Courier at Your Door*: Courier *{runnerName}* is outside with your *{device}*!\n\n🔑 *Delivery Confirmation OTP*: *{deliveryOtp}*\n\n⚠️ *Quality Rule*: Test screen, audio, and camera functions BEFORE giving the courier this OTP. Sharing this OTP confirms acceptance and releases funds from escrow.',
      buttons: [
        { label: '🔑 Copy Delivery OTP', otp: '{deliveryOtp}', action: 'copy_otp' },
        { label: '✅ Inspect & Accept', url: '/track/{orderId}', action: 'navigate' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: Delivery OTP',
      body: 'RepairBee: Courier at doorstep! Test device thoroughly before accepting. Your Delivery OTP is {deliveryOtp}. Order #{orderNumber}.'
    }
  },

  ORDER_COMPLETED_WARRANTY: {
    key: 'ORDER_COMPLETED_WARRANTY',
    category: 'Warranty',
    whatsapp: {
      title: '🎉 Handover Confirmed & 90-Day Warranty Active',
      body: '🌟 *Repair Complete*: Handover for *{device}* (Order *#{orderNumber}*) confirmed!\n\n🛡️ *RepairBee Escrow Guarantee*: Your 90-Day No-Questions-Asked Warranty is active until *{warrantyDate}*.\n⭐ Download invoice, view warranty certificate, and review your workshop experience.',
      buttons: [
        { label: '📜 View Warranty Card', url: '/dashboard', action: 'navigate' },
        { label: '🧾 Download Invoice', url: '/invoice/{orderId}', action: 'navigate' }
      ]
    },
    sms: {
      title: 'RB-REPAIR: Warranty Active',
      body: 'RepairBee: Delivery confirmed! Your 90-day warranty is now active until {warrantyDate}. Order #{orderNumber}. Invoice & Warranty: https://repairbee.in/dashboard'
    }
  }
};

class OutboundMessagesService {
  /** Replace template placeholders with real order values */
  _interpolate(templateStr, vars) {
    if (!templateStr) return '';
    return templateStr.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key] !== undefined && vars[key] !== null ? vars[key] : match;
    });
  }

  /** Fetch complete order details needed for message tokens */
  async _getOrderContext(orderId) {
    const query = `
      SELECT 
        ro.id,
        ro.current_status, ro.pickup_otp, ro.delivery_otp, ro.pouch_barcode,
        ro.quote_amount, ro.total_amount, ro.customer_id, ro.runner_id, ro.shop_id,
        p.product_name, p.category,
        c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
        rn.name AS runner_name, rn.phone AS runner_phone,
        s.shop_name,
        del.current_lat AS runner_lat, del.current_lng AS runner_lng
      FROM repair_orders ro
      LEFT JOIN products p ON ro.product_id = p.id
      LEFT JOIN users c ON ro.customer_id = c.id
      LEFT JOIN users rn ON ro.runner_id = rn.id
      LEFT JOIN shops s ON ro.shop_id = s.id
      LEFT JOIN deliveries del ON ro.id = del.order_id
      WHERE ro.id = $1
      ORDER BY del.created_at DESC
      LIMIT 1
    `;
    const res = await db.query(query, [orderId]);
    return res.rows[0] || null;
  }

  /**
   * Dispatch simulated WhatsApp & SMS notification.
   * Creates records in outbound_messages table and logs telemetry.
   */
  async dispatch({ orderId, templateKey, channel = 'both', customRecipientPhone = null }) {
    const templateDef = TEMPLATES[templateKey];
    if (!templateDef) {
      throw new Error(`Unknown notification template key: ${templateKey}`);
    }

    const order = await this._getOrderContext(orderId);
    if (!order) {
      throw new Error(`Repair order not found for ID: ${orderId}`);
    }

    // Default variable dictionary
    const shortOrderNumber = `RB-${order.id.slice(0, 8).toUpperCase()}`;
    const deviceName = order.product_name || 'Electronics Device';
    const runnerName = order.runner_name || 'Vikram Rao';
    const runnerPhone = order.runner_phone || '+91 98765 43210';
    const customerName = order.customer_name || 'Valued Customer';
    const customerPhone = customRecipientPhone || order.customer_phone || '+91 98450 12345';
    const shopName = order.shop_name || 'TechCare Premium Cleanroom Bay';
    const pickupOtp = order.pickup_otp || '482910';
    const deliveryOtp = order.delivery_otp || '918342';
    const pouchId = order.pouch_barcode || 'RB-SEC-89421';
    const quoteAmount = order.quote_amount || order.total_amount || '1,850';
    const eta = '12';
    const warrantyDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const vars = {
      orderId: order.id,
      orderNumber: shortOrderNumber,
      device: deviceName,
      customerName,
      customerPhone,
      runnerName,
      runnerPhone,
      shopName,
      pickupOtp,
      deliveryOtp,
      pouchId,
      quoteAmount,
      eta,
      warrantyDate
    };

    const createdMessages = [];
    const channelsToSend = channel === 'both' ? ['whatsapp', 'sms'] : [channel];

    for (const ch of channelsToSend) {
      const chTemplate = templateDef[ch];
      if (!chTemplate) continue;

      const title = this._interpolate(chTemplate.title, vars);
      const body = this._interpolate(chTemplate.body, vars);
      
      const buttons = (chTemplate.buttons || []).map(b => ({
        ...b,
        label: this._interpolate(b.label, vars),
        url: b.url ? this._interpolate(b.url, vars) : null,
        otp: b.otp ? this._interpolate(b.otp, vars) : null
      }));

      const deepLinkUrl = `/track/${order.id}`;

      const insertRes = await db.query(
        `INSERT INTO outbound_messages 
         (order_id, order_number, recipient_name, recipient_phone, recipient_role, channel, template_key, title, body, action_buttons, deep_link_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'sent')
         RETURNING *`,
        [
          order.id,
          shortOrderNumber,
          customerName,
          customerPhone,
          'customer',
          ch,
          templateKey,
          title,
          body,
          JSON.stringify(buttons),
          deepLinkUrl
        ]
      );

      createdMessages.push(insertRes.rows[0]);
    }

    logger.info(`[OutboundNotification] Dispatched ${createdMessages.length} message(s) for Order ${shortOrderNumber} (${templateKey})`);
    return createdMessages;
  }

  /** Get messages list with optional filtering */
  async getMessages({ orderId = null, channel = null, recipientPhone = null, limit = 50, page = 1 } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];

    if (orderId) {
      params.push(orderId);
      conditions.push(`order_id = $${params.length}`);
    }
    if (channel && channel !== 'all') {
      params.push(channel);
      conditions.push(`channel = $${params.length}`);
    }
    if (recipientPhone) {
      params.push(`%${recipientPhone}%`);
      conditions.push(`recipient_phone ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) FROM outbound_messages ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.count || 0, 10);

    const query = `
      SELECT * FROM outbound_messages
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const res = await db.query(query, [...params, limit, offset]);

    return {
      messages: res.rows,
      total,
      page,
      limit,
      templates: Object.values(TEMPLATES).map(t => ({ key: t.key, category: t.category, title: t.whatsapp.title }))
    };
  }

  /** Get available template list */
  getAvailableTemplates() {
    return Object.values(TEMPLATES).map(t => ({
      key: t.key,
      category: t.category,
      whatsappTitle: t.whatsapp.title,
      smsTitle: t.sms.title
    }));
  }

  /** Mark message as delivered or read */
  async updateStatus(messageId, status) {
    const res = await db.query(
      `UPDATE outbound_messages SET status = $1 WHERE id = $2 RETURNING *`,
      [status, messageId]
    );
    return res.rows[0];
  }
}

module.exports = new OutboundMessagesService();
