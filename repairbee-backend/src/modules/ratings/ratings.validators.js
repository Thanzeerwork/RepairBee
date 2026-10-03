const { body } = require('express-validator');
const rateShopValidator = [
  body('stars').notEmpty().isInt({ min: 1, max: 5 }),
  body('review_text').optional().trim().isLength({ max: 1000 }),
];
const ratePartnerValidator = [
  body('stars').notEmpty().isInt({ min: 1, max: 5 }),
  body('review_text').optional().trim().isLength({ max: 1000 }),
];
module.exports = { rateShopValidator, ratePartnerValidator };
