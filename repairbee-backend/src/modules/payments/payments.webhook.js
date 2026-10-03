const logger = require('../../utils/logger');
const db = require('../../config/database');

/**
 * Razorpay webhook handler.
 * Handles payment.captured and refund.processed events.
 */
async function handleWebhook(req, res) {
  try {
    const event = req.body.event;
    const payload = req.body.payload;

    logger.info('Razorpay webhook received', { event });

    switch (event) {
      case 'payment.captured':
        // Payment was successfully captured
        const paymentId = payload.payment.entity.id;
        const orderId = payload.payment.entity.notes?.order_id;
        logger.info('Payment captured', { paymentId, orderId });
        break;

      case 'refund.processed':
        const refundPaymentId = payload.refund.entity.payment_id;
        logger.info('Refund processed', { paymentId: refundPaymentId });
        break;

      default:
        logger.debug('Unhandled webhook event', { event });
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook processing error', { error: error.message });
    res.status(500).json({ status: 'error' });
  }
}

module.exports = { handleWebhook };
