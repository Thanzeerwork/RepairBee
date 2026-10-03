const { body } = require('express-validator');

const sendQuoteValidator = [
  body('price').notEmpty().isFloat({ min: 1 }).withMessage('Price must be a positive number'),
  body('estimated_time').notEmpty().withMessage('Estimated repair time is required'),
  body('warranty_days').optional().isInt({ min: 0, max: 365 }),
];

module.exports = { sendQuoteValidator };
