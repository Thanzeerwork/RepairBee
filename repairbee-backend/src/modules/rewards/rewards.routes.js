const { Router } = require('express');
const ctrl = require('./rewards.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();
router.use(authenticate);

router.get('/loyalty-profile', ctrl.getLoyaltyProfile);
router.get('/scratch-cards', ctrl.getScratchCards);
router.post('/scratch-cards/:id/claim', ctrl.claimScratchCard);
router.post('/scratch-cards/generate-demo', ctrl.generateDemoCard);
router.get('/referral-tree', ctrl.getReferralTree);

module.exports = router;
