const { body } = require('express-validator');

const createRepairValidator = [
  body('product_id').notEmpty().withMessage('Product is required').isUUID(),
  body('issue_ids').optional().isArray(),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('order_type').optional().isIn(['sos', 'scheduled']),
  body('scheduled_at').optional().isISO8601(),
  body('pickup_address_id').optional().isUUID(),
  body('delivery_address_id').optional().isUUID(),
  body('promo_code').optional().trim(),
  body('warranty_tier').optional().isIn(['standard', 'gold', 'diamond']),
  body('warranty_amount').optional().isNumeric(),
  body('warranty_days').optional().isInt({ min: 0, max: 365 }),
];

const updateStatusValidator = [
  body('status').notEmpty().withMessage('Status is required'),
  body('note').optional().trim().isLength({ max: 500 }),
];

module.exports = { createRepairValidator, updateStatusValidator };
