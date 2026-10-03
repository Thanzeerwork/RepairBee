const { Router } = require('express');
const productsController = require('./products.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = Router();

// Public
router.get('/', productsController.listProducts);
router.get('/:id/issues', productsController.getIssues);

// Admin
router.post('/', authenticate, authorize(ROLES.ADMIN), productsController.addProduct);
router.post('/:id/issues', authenticate, authorize(ROLES.ADMIN), productsController.addIssueType);

module.exports = router;
