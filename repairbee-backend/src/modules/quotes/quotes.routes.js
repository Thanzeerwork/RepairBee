const { Router } = require('express');
const quotesController = require('./quotes.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { sendQuoteValidator } = require('./quotes.validators');
const { ROLES } = require('../../utils/constants');

const router = Router();
router.use(authenticate);

// Shop sends quote
router.post('/:orderId', authorize(ROLES.SHOP_OWNER), sendQuoteValidator, validate, quotesController.sendQuote);

// Customer approves/rejects
router.patch('/:orderId/approve', authorize(ROLES.CUSTOMER), quotesController.approveQuote);
router.patch('/:orderId/reject', authorize(ROLES.CUSTOMER), quotesController.rejectQuote);

module.exports = router;
