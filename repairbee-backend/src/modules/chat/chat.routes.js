const { Router } = require('express');
const chatController = require('./chat.controller');
const { authenticate } = require('../../middleware/auth');
const { uploadChatMedia } = require('../../middleware/upload');

const router = Router();
router.use(authenticate);

router.get('/:orderId/:chatType', chatController.getHistory);
router.post('/:orderId/:chatType', uploadChatMedia, chatController.sendMessage);

module.exports = router;
