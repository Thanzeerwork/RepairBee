const { Router } = require('express');
const ctrl = require('./warranty.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const router = Router();
router.use(authenticate);
router.post('/:orderId/claim', authorize(ROLES.CUSTOMER), ctrl.raiseClaim);
router.get('/:orderId', ctrl.getWarrantyInfo);
module.exports = router;
