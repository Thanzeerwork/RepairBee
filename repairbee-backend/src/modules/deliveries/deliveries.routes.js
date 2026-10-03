const { Router } = require('express');
const deliveriesController = require('./deliveries.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { 
  assignValidator, 
  updateStatusValidator,
  verifyPickupValidator,
  verifyDeliveryValidator,
  locationValidator
} = require('./deliveries.validators');
const { ROLES } = require('../../utils/constants');

const router = Router();
router.use(authenticate);

// Courier & Runner routes
router.get('/my-jobs', authorize(ROLES.DELIVERY_PARTNER), deliveriesController.getMyJobs);
router.get('/available', authorize(ROLES.DELIVERY_PARTNER), deliveriesController.getAvailablePickups);
router.post('/claim/:orderId', authorize(ROLES.DELIVERY_PARTNER), deliveriesController.claimPickup);
router.post('/:id/verify-pickup', authorize(ROLES.DELIVERY_PARTNER), verifyPickupValidator, validate, deliveriesController.verifyPickupWithPouch);
router.post('/:id/handover-shop', authorize(ROLES.DELIVERY_PARTNER), deliveriesController.handoverToShop);
router.patch('/:id/location', authorize(ROLES.DELIVERY_PARTNER), locationValidator, validate, deliveriesController.updateLocation);
router.post('/:id/verify-delivery', authorize(ROLES.DELIVERY_PARTNER), verifyDeliveryValidator, validate, deliveriesController.verifyDeliveryOtp);
router.patch('/:id/status', authorize(ROLES.DELIVERY_PARTNER), updateStatusValidator, validate, deliveriesController.updateStatus);

// Admin routes
router.post('/assign', authorize(ROLES.ADMIN), assignValidator, validate, deliveriesController.assignPartner);
router.get('/partners/available', authorize(ROLES.ADMIN), deliveriesController.getAvailablePartners);

module.exports = router;
