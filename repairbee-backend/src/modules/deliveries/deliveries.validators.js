const { body } = require('express-validator');

const assignValidator = [
  body('order_id').notEmpty().isUUID(),
  body('partner_id').notEmpty().isUUID(),
];

const updateStatusValidator = [
  body('status').notEmpty().isIn(['out_for_pickup', 'picked_up', 'out_for_delivery', 'delivered']),
  body('distance_km').optional().isFloat({ min: 0 }),
];

const verifyPickupValidator = [
  body('pouch_barcode').notEmpty().withMessage('Tamper-evident pouch barcode is required'),
  body('otp').notEmpty().withMessage('6-digit customer pickup OTP is required').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('notes').optional().isString(),
  body('pouch_image_url').optional().isString(),
];

const verifyDeliveryValidator = [
  body('otp').notEmpty().withMessage('6-digit customer delivery OTP is required').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('notes').optional().isString(),
];

const locationValidator = [
  body('lat').notEmpty().isFloat().withMessage('Valid latitude is required'),
  body('lng').notEmpty().isFloat().withMessage('Valid longitude is required'),
];

module.exports = { 
  assignValidator, 
  updateStatusValidator,
  verifyPickupValidator,
  verifyDeliveryValidator,
  locationValidator
};
