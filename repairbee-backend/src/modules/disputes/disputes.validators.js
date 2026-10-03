const { body } = require('express-validator');

const raiseDisputeValidator = [
  body('reason').notEmpty().trim().isLength({ max: 255 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('claim_type').optional().trim().isLength({ max: 50 }),
  body('pouch_condition').optional().trim().isLength({ max: 50 }),
  body('evidence_urls').optional().isArray(),
  body('transit_damage_claim').optional().isObject(),
];

const resolveDisputeValidator = [
  body('resolution_type').notEmpty().isIn(['refund', 'split_refund', 're_repair', 'rejected', 'full_refund', 'partial_refund']),
  body('admin_notes').optional().trim(),
  body('refund_amount').optional().isNumeric(),
  body('shop_payout_amount').optional().isNumeric(),
  body('split_percentage').optional().isInt({ min: 0, max: 100 }),
];

module.exports = { raiseDisputeValidator, resolveDisputeValidator };
