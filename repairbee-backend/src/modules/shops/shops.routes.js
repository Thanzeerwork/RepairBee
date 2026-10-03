const { Router } = require('express');
const shopsController = require('./shops.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { registerShopValidator } = require('./shops.validators');
const { ROLES } = require('../../utils/constants');

const router = Router();

// Public: browse shops
router.get('/', shopsController.browseShops);
router.get('/pending', authenticate, authorize(ROLES.ADMIN), shopsController.getPendingShops);

// Auth required
router.post('/register', authenticate, authorize(ROLES.SHOP_OWNER), registerShopValidator, validate, shopsController.register);
router.get('/dashboard', authenticate, authorize(ROLES.SHOP_OWNER), shopsController.getDashboard);
router.put('/update', authenticate, authorize(ROLES.SHOP_OWNER), shopsController.updateShop);
router.put('/profile', authenticate, authorize(ROLES.SHOP_OWNER), shopsController.updateShop);

// Public: shop profile
router.get('/:id', shopsController.getShop);

// Admin
router.patch('/:id/approve', authenticate, authorize(ROLES.ADMIN), shopsController.approveShop);
router.patch('/:id/reject', authenticate, authorize(ROLES.ADMIN), shopsController.rejectShop);
router.patch('/:id/block', authenticate, authorize(ROLES.ADMIN), shopsController.toggleBlockShop);
router.patch('/:id/commission', authenticate, authorize(ROLES.ADMIN), shopsController.updateCommissionRate);

module.exports = router;
