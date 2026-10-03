const { Router } = require('express');
const paymentsController = require('./payments.controller');
const { handleWebhook } = require('./payments.webhook');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { createOrderValidator, verifyPaymentValidator, topUpValidator, walletPayValidator } = require('./payments.validators');
const { ROLES } = require('../../utils/constants');

const router = Router();

// Razorpay webhook (no auth — verified by signature)
router.post('/webhook', handleWebhook);

// Authenticated routes
router.use(authenticate);

router.post('/create-order', authorize(ROLES.CUSTOMER), createOrderValidator, validate, paymentsController.createOrder);
router.post('/verify', authorize(ROLES.CUSTOMER), verifyPaymentValidator, validate, paymentsController.verifyPayment);
router.get('/wallet', paymentsController.getWallet);
router.post('/wallet/topup', authorize(ROLES.CUSTOMER), topUpValidator, validate, paymentsController.topUpWallet);
router.post('/wallet/pay', authorize(ROLES.CUSTOMER), walletPayValidator, validate, paymentsController.payFromWallet);

module.exports = router;
