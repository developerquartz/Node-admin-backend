const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const orderController = require('../controller/orderController');
const reviewController = require('../controller/reviewController');
const productController = require('../controller/productController');
const Validation = require('../middleware/validation/user');
const settingController = require('../controller/settingController');
const driverController = require("../controller/driverController");
const docTemplateController = require('../controller/documentTemplateController');
const Auth = require('../middleware/auth');

router.post('/signup', Auth.isApp, Auth.checkReferralCode, userController.createUser);

router.post('/otp', Auth.isApp, userController.userOTP);

router.post('/resendotp', Auth.isApp, userController.resendOTP);

router.post('/login', Auth.isApp, userController.userLogin);

router.post('/enablenotifications', Auth.authUser, Validation.enableUserNotifications, userController.enableUserNotifications);

router.put('/logout', Auth.isApp, Auth.authUser, userController.userLogout);

router.post('/verifyotp', Auth.isApp, userController.userVerifyOTP);

router.post('/forgotpassword', Auth.isApp, userController.userForgotPassword);

router.post('/resetpassword', Auth.isApp, userController.userResetPassword);

router.post('/changepassword', Auth.isApp, Auth.authUser, Validation.userChangePassword, userController.changeUserPassword);

router.post('/updateprofile', Auth.isApp, Auth.authUser, userController.updateUserProfile);

router.post('/remove', userController.removeUserByMobileNumber);

router.post('/removeuser', userController.removeUserById);

router.get('/me', Auth.isApp, Auth.authUser, userController.getUserProfileById);

router.post('/kyc-file', Auth.isApp, Auth.authUser, userController.addKycDocuments);

//for mobile app
router.post('/home/search', Auth.isApp, userController.getNearByVendorsWithProducts);
router.post('/home', Auth.isApp, userController.storeHomePageDataNew);
router.get('/home', Auth.isApp, userController.storeHomePageData);
router.post('/nearby', Auth.isApp, Auth.isValidStoreTypes, userController.getNearByVendors);
router.post('/ecommerce/nearby', Auth.isApp, Auth.isValidStoreTypes, userController.getNearByVendorsForEcommerce);
router.post('/nearby/details', Auth.isApp, Auth.isValidStoreTypes, userController.getNearByVendorsDetails);
router.post('/ecommerce/nearby/details', Auth.isApp, Auth.isValidStoreTypes, userController.getNearByVendorsDetailsEcommerce);
router.post('/deliveryaddress', Auth.isApp, Auth.authUser, userController.getDeliveryAddress)
router.post('/products', Auth.isApp, Auth.isValidStoreTypes, productController.viewUserProductListByFilter);
router.get('/product/:_id', Auth.isApp, productController.viewProductByGroceryVendorFrontend);
router.post('/product/addreview', Auth.isApp, productController.addProductReview);
router.get('/product/reviews/:_id', Auth.isApp, productController.getProductReviews);
router.get('/product/related/:_id', Auth.isApp, productController.getProductRelated);
router.get('/providers/related/:_id', Auth.isApp, userController.getProviderRelated);

router.post('/carts', Auth.isApp, Auth.isValidStoreTypes, userController.userCartMiddleware);
router.post('/upcoming/orders', Auth.isApp, Auth.authUser, orderController.getUserUpcomingOrderList);
router.post('/past/orders', Auth.isApp, Auth.authUser, orderController.getUserPastOrderList);
router.get('/orderdetails/:_id', Auth.isApp, Auth.authUser, orderController.getOrderDetailsById);

router.post('/feedbacktodriver', Auth.isApp, Auth.authUser, reviewController.feedbackByCustomerToDriver);
router.post('/feedbacktovendor', Auth.isApp, Auth.authUser, reviewController.feedbackByCustomerToVendor);

router.post('/cancelorder', Auth.isApp, Auth.isAuthUser, orderController.cancelOrderByCustomerMiddleware);

//store setting for apps
router.get('/store/setting', Auth.isApp, settingController.getStoreSettingForCustomerApp);

router.get('/track/:userId', orderController.customerTrack);

router.post('/store', userController.getStoreByStoreId);

router.post('/socialmedia', Auth.isApp, userController.socialNediaLoginSignUp);
router.post('/taxi/promocode/all', Auth.isApp, Auth.authUser, userController.getStorePromoCode);

router.post("/archived", Auth.isApp, Auth.authDriverAndUser, driverController.archiveUserByItSelf);
//get promotions
router.get("/promotions/:storeTypeId", Auth.isApp, Auth.isValidStoreTypes, userController.getStoreTypePromotions);


//document template
router.post('/documents/template', Auth.isApp, docTemplateController.userRegisterDocumentTemplates)
router.post('/other/document/template', Auth.isApp, docTemplateController.userOtherDocumentTemplates)
router.post('/document/add', Auth.isApp, Auth.authUser, Validation.userDocuments, docTemplateController.addUserDocuments)
router.post('/other/document/update', Auth.isApp, Auth.authUser, docTemplateController.updateOtherCumstomerDoc);

//wallet Transactions
router.post('/transaction', Auth.isApp, Auth.authUser, userController.getTransaction);
router.post('/wallet/transaction', Auth.isApp, Auth.authUser, userController.walletToWalletTransaction);
router.post('/getUserList', Auth.isApp, Auth.authUser, userController.getUsersListForWalletTransaction);
// ----------------pool trips------------------
// router.get('/getPoolTrips/:orderId', Auth.isApp, Auth.authUser, orderController.getCustomerPoolTripsBySorting);

//
router.get('/lang/:code', Auth.isApp, userController.getActiveStoreLanguage);
router.post('/update/language', Auth.isApp, Auth.authUser, userController.updateSelectedLanguage);



// host flow for carrental

router.post('/brand', Auth.isApp, userController.getCuisineList);
router.post('/become/host', Auth.isApp, Auth.authUser, Validation.becomeHost, userController.becomeHost);

module.exports = router;