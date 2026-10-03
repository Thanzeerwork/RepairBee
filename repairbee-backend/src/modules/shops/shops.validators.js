const { body } = require('express-validator');

const registerShopValidator = [
  body('shop_name').trim().notEmpty().withMessage('Shop name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('pincode').notEmpty().withMessage('Pincode is required'),
  body('category').optional().isIn(['electronics', 'appliances', 'both']),
  body('lat').optional().isDecimal(),
  body('lng').optional().isDecimal(),
];

module.exports = { registerShopValidator };
