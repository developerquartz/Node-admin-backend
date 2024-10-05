const express = require('express');
const router = express.Router();
const orderController = require('./controller/orderController.js');
const Auth = require('./middleware/auth');
const { validationCreateOrder } = require('./validation/order')
const { chekStoreSetting } = require('./config/settingService');

//Add Order
router.post('/add', Auth.isApp, Auth.isStoreType, Auth.authUser, validationCreateOrder, chekStoreSetting, orderController.userOrderMiddleware);

module.exports = router;