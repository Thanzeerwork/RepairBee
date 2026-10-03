const { body } = require('express-validator');

const createOrderValidator = [
  body().custom((value, { req }) => {
    const id = req.body.order_id || req.body.orderId;
    if (!id) throw new Error('Valid order ID required');
    req.body.order_id = id;
    return true;
  }),
];

const verifyPaymentValidator = [
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty(),
];

const topUpValidator = [
  body('amount').notEmpty().isFloat({ min: 1 }).withMessage('Minimum ₹1'),
];

const walletPayValidator = [
  body().custom((value, { req }) => {
    const id = req.body.order_id || req.body.orderId;
    if (!id) throw new Error('Valid order ID required');
    req.body.order_id = id;
    return true;
  }),
];

module.exports = { createOrderValidator, verifyPaymentValidator, topUpValidator, walletPayValidator };
