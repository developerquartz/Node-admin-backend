const express = require('express');
const router = express.Router();
const driverController = require('../controller/driverController');
const orderController = require('../controller/orderController');
const Validation = require('../middleware/validation/driver');
const reviewController = require('../controller/reviewController');
const docTemplateController = require('../controller/documentTemplateController');
const Auth = require('../middleware/auth');

router.post("/signupemail", Auth.isUniversalApp, Validation.driverSignupCheck, driverController.createUserCheck);

router.post('/signup', Auth.isUniversalApp, Validation.driverSignup, driverController.createUser);

router.post('/login', Auth.isUniversalApp, Validation.userLogin, driverController.userLogin);

router.post('/logout', Auth.isUniversalApp, Auth.authDriver, driverController.userLogout);

router.post('/resendotp', Auth.isUniversalApp, Validation.userForgotPassword, driverController.driverResendOTP);

router.post('/forgotpassword', Auth.isUniversalApp, Validation.userForgotPassword, driverController.userForgotPassword);

router.post('/resetpassword', Auth.isUniversalApp, Validation.userResetPassword, driverController.userResetPassword);

router.post('/changepassword', Auth.isUniversalApp, Auth.authDriver, Validation.userChangePassword, driverController.changeUserPassword);

router.post('/updateprofile', Auth.isUniversalApp, Auth.authDriver, driverController.updateUserProfile);

router.post('/updateprofileimage', Auth.isUniversalApp, Auth.authDriver, driverController.updateUserProfileImage);

router.post('/addaccount', Auth.isUniversalApp, Auth.authDriver, driverController.driverAddBankAccount);

router.get('/me', Auth.isUniversalApp, Auth.authDriver, driverController.getUserProfileById);

router.post('/status', Auth.isUniversalApp, Auth.authDriver, driverController.updateStatus);

router.post('/dummy', driverController.updateStatusDummy);

router.post('/acceptrequest', Auth.isUniversalApp, Auth.authDriver, orderController.acceptRequestByDriver);

router.post('/rejectrequest', Auth.isUniversalApp, Auth.authDriver, orderController.rejectRequestByDriver);

router.post('/arrived', Auth.isUniversalApp, Auth.authDriver, orderController.driverArrivedAtVendor);

router.post('/picked', Auth.isUniversalApp, Auth.authDriver, orderController.pickupOrderByDriver);

router.post('/delivered', Auth.isUniversalApp, Auth.authDriver, orderController.deliveredOrderByDriver);
router.post('/deliveredOrderByDriverEmailcheck', orderController.deliveredOrderByDriverEmailcheck);

router.get('/orderdetails/:_id', Auth.isUniversalApp, Auth.authDriver, orderController.getDriverOrderDetails);

router.post('/upcoming/orders', Auth.isApp, Auth.authDriver, orderController.getDriverUpcomingOrderList);
router.post('/past/orders', Auth.isApp, Auth.authDriver, orderController.getDriverPastOrderList);

router.get('/request/:driverId', orderController.getRequest);

router.get('/track/:driverId', orderController.driverTrack);

router.post('/feedbacktocustomer', Auth.isUniversalApp, Auth.authDriver, reviewController.feedbackByDriverToCustomer);

router.get('/earning', Auth.isUniversalApp, Auth.authDriver, driverController.getEarning);

router.get('/earning/:_id', driverController.getEarningWeb);

router.get('/wallet', Auth.authDriver, driverController.getWalletBalance);

//documents
router.post('/doctemplates', Auth.isUniversalApp, docTemplateController.getDriverDocTemplate);
router.post('/document/update', Auth.isUniversalApp, Auth.authDriver, docTemplateController.updateDriverDoc);

module.exports = router;