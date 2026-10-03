const { Router } = require('express');
const repairsController = require('./repairs.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { uploadRepairMedia } = require('../../middleware/upload');
const { createRepairValidator, updateStatusValidator } = require('./repairs.validators');
const { ROLES } = require('../../utils/constants');

const router = Router();
router.use(authenticate);

const parseRepairFormData = (req, res, next) => {
  if (req.body.issue_ids && typeof req.body.issue_ids === 'string') {
    try {
      req.body.issue_ids = JSON.parse(req.body.issue_ids);
    } catch {
      req.body.issue_ids = [req.body.issue_ids];
    }
  }
  next();
};

// Customer
router.post('/', authorize(ROLES.CUSTOMER), uploadRepairMedia, parseRepairFormData, createRepairValidator, validate, repairsController.createRepairRequest);
router.get('/', authorize(ROLES.CUSTOMER), repairsController.getMyOrders);
router.post('/:id/select-shop', authorize(ROLES.CUSTOMER), repairsController.selectShop);
router.patch('/:id/cancel', authorize(ROLES.CUSTOMER), repairsController.cancelOrder);
router.post('/:id/confirm-delivery', authorize(ROLES.CUSTOMER), repairsController.confirmDelivery);

// Shop
router.get('/shop/incoming', authorize(ROLES.SHOP_OWNER), repairsController.getShopIncomingOrders);
router.post('/:id/qc-report', authorize(ROLES.SHOP_OWNER), repairsController.saveQcReport);
router.post('/:id/video-proof', authorize(ROLES.SHOP_OWNER, ROLES.ADMIN), repairsController.saveVideoProof);

// Any authenticated user (role check in service)
router.get('/:id/invoice', repairsController.getOrderInvoice);
router.get('/:id/qc-report', repairsController.getQcReport);
router.get('/:id/video-proof', repairsController.getVideoProof);
router.get('/:id', repairsController.getOrderDetails);
router.patch('/:id/status', updateStatusValidator, validate, repairsController.updateStatus);

// Admin
router.get('/admin/all', authorize(ROLES.ADMIN), repairsController.getAllOrders);
router.post('/:id/release-escrow', authorize(ROLES.ADMIN), repairsController.releaseEscrow);

module.exports = router;
