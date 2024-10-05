const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const bnbController = require('./controller/bnbController');
const userController = require('../../controller/userController');
const { validateDateFormat } = require('./middleware/validatation');


//---------------------------------------- Customer Side --------------------------------------------------//
router.post('/user/switchHost', Auth.isApp, Auth.authUser, Auth.isStoreType, bnbController.hostswitch);
router.post('/user/category', Auth.isApp, Auth.isStoreType, bnbController.userlistcategory);
router.post('/user/products/category', Auth.isApp, Auth.authUser, Auth.isStoreType, bnbController.getProductByCategory);
router.post('/user/products', Auth.isApp, Auth.authUser, Auth.isStoreType, validateDateFormat, bnbController.userlstproduct);
// router.post('/user/products/:_id', Auth.isApp, Auth.authUser, bnbController.userlstproduct);
router.post('/user/booking/create', Auth.isApp, Auth.authUser, Auth.isStoreType, Auth.isValidVendor, validateDateFormat, bnbController.userOrderMiddleware);
router.post('/user/carts', Auth.isApp, Auth.isStoreType, validateDateFormat, Auth.isValidVendor, bnbController.userCartMiddleware);


module.exports = router;