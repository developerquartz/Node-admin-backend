const express = require('express');
const router = express.Router();
const vendorController = require('../controller/vendorController');
const orderController = require('../controller/orderController');
const docTemplateController = require('../controller/documentTemplateController');
const Validation = require('../middleware/validation/vendor');
const Auth = require('../middleware/auth');

router.post('/signup', Auth.isAppDefault, vendorController.createUser);

router.post('/login', Auth.isAppDefault, Validation.userLogin, vendorController.userLogin);

//router.post('/verifyotp', Auth.isAppDefault, Validation.userLogin, vendorController.vendorVerifyOTP);

router.post('/forgotpassword', Auth.isAppDefault, Validation.userForgotPassword, vendorController.userForgotPassword);

router.post('/resetpassword', Auth.isAppDefault, Validation.userResetPassword, vendorController.userResetPassword);

router.post('/changepassword', Auth.isAppDefault, Auth.authVendor, Validation.userChangePassword, vendorController.changeUserPassword);

router.post('/updateprofile', Auth.isAppDefault, Auth.authVendor, Validation.updateUserProfile, vendorController.updateUserProfile);

router.get('/me', Auth.isAppDefault, Auth.authVendor, vendorController.getUserProfileById);

router.post('/acceptrequest', Auth.authVendor, orderController.acceptRequestByRestaurant);

router.post('/rejectrequest', Auth.authVendor, orderController.rejectRequest);

//for scheduled type order, vendor will click to start process then delivery persons get reuest
router.post('/inprocess', Auth.authVendor, orderController.inProcessOrderByRestaurant);

router.post('/markready', Auth.authVendor, orderController.markOrderReadyByRestaurant);
router.post('/completeorder', Auth.authVendor, orderController.completeOrderByVendor);

//documents
router.get('/doctemplates', Auth.isApp, docTemplateController.getVendorDocTemplate);
router.post('/document/update', Auth.isApp, Auth.authVendor, docTemplateController.updateVendorDoc);

module.exports = router;