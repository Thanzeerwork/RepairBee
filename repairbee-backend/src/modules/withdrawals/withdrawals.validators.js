const { body } = require('express-validator');
const requestValidator = [
  body('amount').notEmpty().isFloat({ min: 100 }).withMessage('Minimum withdrawal is ₹100'),
  body('bank_account_name').optional().trim(),
  body('bank_account_number').optional().trim(),
  body('bank_ifsc').optional().trim(),
  body('bank_name').optional().trim(),
];
const processValidator = [
  body('status').notEmpty().isIn(['processed', 'failed']),
  body('admin_note').optional().trim(),
];
module.exports = { requestValidator, processValidator };
