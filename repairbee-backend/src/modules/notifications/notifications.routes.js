const { Router } = require('express');
const ctrl = require('./notifications.controller');
const { authenticate, optionalAuth } = require('../../middleware/auth');

const router = Router();

// --- Public / Simulator Endpoints (Accessible from tracking page & admin simulator) ---
router.get('/outbound', optionalAuth, ctrl.getOutboundMessages);
router.get('/templates', optionalAuth, ctrl.getAvailableTemplates);
router.post('/simulate-dispatch', optionalAuth, ctrl.simulateDispatch);
router.patch('/outbound/:id/status', optionalAuth, ctrl.updateMessageStatus);

// --- Authenticated In-App User Notifications ---
router.use(authenticate);
router.get('/', ctrl.getNotifications);
router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);

module.exports = router;
