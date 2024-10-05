const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController.js');
const Auth = require('../middleware/auth');
const paymentCharge = require("../middleware/paymenthandlerCharge.js")

//Add Order
router.post('/add', Auth.isApp, Auth.isValidStoreTypes, Auth.authUser, orderController.userOrderMiddleware);

router.post('/notify', orderController.orderNotifyPingFromPaymentGateway);

router.get('/return', orderController.orderReturnPingFromPaymentGateway);

router.get('/webview', orderController.webViewPaymentForWebsiteAndApp);

router.post('/webview/callback', orderController.webViewCallbackForWebsiteAndApp);

router.post('/postmates/quote', orderController.deliveryFeeQuote);

router.post('/addNew', Auth.isApp, Auth.isValidStoreTypes, Auth.authUser, orderController.newOrderMiddleware, paymentCharge.paymentChargeForOrder);

module.exports = router;