const { Router } = require('express');
const ctrl = require('./ratings.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { rateShopValidator, ratePartnerValidator } = require('./ratings.validators');
const { ROLES } = require('../../utils/constants');
const router = Router();

// Public: view shop reviews
router.get('/shop/:shopId', ctrl.getShopReviews);

router.use(authenticate);
router.get('/order/:orderId', ctrl.getOrderRatings);
router.get('/my-shop', authorize(ROLES.SHOP_OWNER), ctrl.getMyShopReviews);
router.post('/:orderId/shop', authorize(ROLES.CUSTOMER), rateShopValidator, validate, ctrl.rateShop);
router.post('/:orderId/partner', authorize(ROLES.CUSTOMER), ratePartnerValidator, validate, ctrl.ratePartner);
module.exports = router;
