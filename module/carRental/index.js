const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const carRentalController = require('./controller/carRentalController');
const { validateDateFormat } = require('./middleware/validatation');

//---------------------------------------- Customer Side --------------------------------------------------//
router.post('/user/category', Auth.isApp, Auth.isStoreType, carRentalController.userlistcategory);
router.post('/user/products', Auth.isApp, Auth.isStoreType, validateDateFormat, carRentalController.userlstproduct);
router.get('/user/productDetails/:_id', Auth.isApp, carRentalController.productDetails);
router.post('/user/booking/create', Auth.isApp, Auth.authUser, Auth.isStoreType, Auth.isValidVendor, validateDateFormat, carRentalController.userOrderMiddleware);
router.post('/user/carts', Auth.isApp, Auth.isStoreType, validateDateFormat, Auth.isValidVendor, carRentalController.userCartMiddleware);
router.post('/user/nearby', Auth.isApp, Auth.isStoreType, carRentalController.nearByVendors);


module.exports = router;