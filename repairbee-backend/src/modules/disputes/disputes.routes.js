const { Router } = require('express');
const ctrl = require('./disputes.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { uploadDisputeEvidence } = require('../../middleware/upload');
const { raiseDisputeValidator, resolveDisputeValidator } = require('./disputes.validators');
const { ROLES } = require('../../utils/constants');

const router = Router();
router.use(authenticate);

router.post('/:orderId', authorize(ROLES.CUSTOMER), uploadDisputeEvidence, raiseDisputeValidator, validate, ctrl.raiseDispute);
router.get('/', ctrl.getDisputes);
router.get('/:id', ctrl.getDisputeById);
router.patch('/:id/resolve', authorize(ROLES.ADMIN), resolveDisputeValidator, validate, ctrl.resolveDispute);

module.exports = router;
