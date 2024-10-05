const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const providerController = require('./controller/providerController');
const { validateDateFormat } = require('./middleware/validatation');

//---------------------------------------- Customer Side --------------------------------------------------//
router.post('/user/category', Auth.isApp, Auth.isStoreType, Auth.isValidStoreType, providerController.userlistcategory);
router.post('/user/products', Auth.isApp, Auth.isStoreType, Auth.isValidStoreType, providerController.userlstproduct);
router.post('/user/booking/create', Auth.isApp, Auth.authUser, Auth.isStoreType, validateDateFormat, providerController.userOrderMiddleware);
router.post('/user/carts', Auth.isApp, Auth.isStoreType, validateDateFormat, providerController.userCartMiddleware);
router.post('/user/nearby', Auth.isApp, Auth.isStoreType, Auth.isValidStoreType, providerController.nearByDrivers);
router.post('/driver/service/list', Auth.isApp, providerController.driverlstproduct);
router.post('/driver/service/update', Auth.isApp, Auth.authDriver, providerController.driverupdateService);
router.get('/driver/service/list', Auth.isApp, Auth.authDriver, providerController.getdriverServiceById);

module.exports = router;