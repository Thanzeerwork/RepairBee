const { body } = require('express-validator');

const updateProfileValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 255 }),
  body('phone').optional().trim().matches(/^\+?[1-9]\d{9,14}$/),
  body('profile_pic_url').optional().trim(),
  body('profilePicUrl').optional().trim(),
];

const addAddressValidator = [
  body('address_line')
    .custom((value, { req }) => {
      const line = value || req.body.street;
      if (!line || !String(line).trim()) {
        throw new Error('Address line is required');
      }
      req.body.address_line = String(line).trim();
      return true;
    }),
  body('city').notEmpty().withMessage('City is required').trim(),
  body('pincode').notEmpty().withMessage('Pincode is required').trim(),
  body('label')
    .optional()
    .customSanitizer((v) => (typeof v === 'string' ? v.toLowerCase().trim() : 'home'))
    .isIn(['home', 'office', 'other'])
    .withMessage('Label must be home, office, or other'),
  body('lat').optional().isDecimal(),
  body('lng').optional().isDecimal(),
];

module.exports = { updateProfileValidator, addAddressValidator };
