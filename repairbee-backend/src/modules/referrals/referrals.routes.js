const { Router } = require('express');
const ctrl = require('./referrals.controller');
const { authenticate } = require('../../middleware/auth');
const router = Router();
router.use(authenticate);
router.get('/my-code', ctrl.getMyCode);
router.post('/apply', ctrl.apply);
router.get('/stats', ctrl.getStats);
module.exports = router;
