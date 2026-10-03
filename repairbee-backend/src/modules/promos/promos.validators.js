const { body } = require('express-validator');
const validatePromoValidator = [
  body('code').notEmpty().trim(),
  body('order_amount').optional().isFloat({ min: 0 }),
];
const createPromoValidator = [
  body('code').notEmpty().trim().isLength({ min: 3, max: 50 }),
  body('discount_type').notEmpty().isIn(['percent', 'flat']),
  body('discount_value').notEmpty().isFloat({ min: 1 }),
];
module.exports = { validatePromoValidator, createPromoValidator };
