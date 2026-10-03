const { Router } = require('express');
const usersController = require('./users.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { uploadProfilePic } = require('../../middleware/upload');
const { updateProfileValidator, addAddressValidator } = require('./users.validators');
const { ROLES } = require('../../utils/constants');

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile
router.get('/profile', usersController.getProfile);
router.put('/profile', updateProfileValidator, validate, usersController.updateProfile);
router.patch('/profile-pic', uploadProfilePic, usersController.updateProfilePic);
router.patch('/fcm-token', usersController.updateFcmToken);

// Addresses
router.get('/addresses', usersController.getAddresses);
router.post('/addresses', addAddressValidator, validate, usersController.addAddress);
router.put('/addresses/:id', usersController.updateAddress);
router.delete('/addresses/:id', usersController.deleteAddress);
router.patch('/addresses/:id/default', usersController.setDefaultAddress);

// Admin routes
router.get('/', authorize(ROLES.ADMIN), usersController.listUsers);
router.patch('/:id/block', authorize(ROLES.ADMIN), usersController.toggleBlockUser);

module.exports = router;
