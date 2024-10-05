const express = require('express');
const router = express.Router();
const cardController = require('../controller/cardController.js');
const Auth = require('../middleware/auth');

//card list
router.get('/', Auth.isApp, Auth.authUser, cardController.getUserCardList);

router.get('/web', Auth.isApp, Auth.authUser, cardController.getUserCardListWeb);

router.get('/apps', Auth.isApp, Auth.authUser, cardController.getUserCardListForApp);

router.get('/user/payments', Auth.isApp, Auth.authUser, cardController.getUserPaymentsListForApp);

//Add Card
router.post('/add', Auth.isApp, Auth.authUser, cardController.userAddCard);
//remove Card
router.post('/remove', Auth.isApp, Auth.authUser, cardController.userRemoveCard);

//braintree integration
router.get('/clientToken', Auth.isApp, Auth.authUser, cardController.generateBraintreeClientToken);

router.post('/addToWallet', Auth.isApp, Auth.authUser, cardController.addMoneyToWallet);

router.post('/addToWallet/paysatck/direct', Auth.isApp, Auth.authUser, cardController.addtowalletpaystck);
router.post('/addToWallet/flutterwave/direct', Auth.isApp, Auth.authUser, cardController.addtowalletByFlutterwave);

router.get('/stripe/connect', cardController.stripeConnect);

router.post('/stripe/connect/remove', cardController.stripeConnectAccountRemove);

router.get('/stripe/connect/refresh', cardController.stripeConnectRefresh);

router.get('/stripe/connect/return', cardController.stripeConnectReturn);
router.get('/paystack/return', cardController.paystackReturnUrl);
router.get('/flutterwave/return', cardController.flutterwaveReturnUrl);
router.get('/return/url/pay360', cardController.payReturnUrl);
router.get('/return/url/dpo', cardController.dpoReturnUrl);
router.get('/pay360/addcard', cardController.addCardUrl);
router.get('/dpo/addcard', cardController.addCardDpo);
router.get('/return/url/moncash/:apikey', Auth.verifyapikey, cardController.moncashReturnUrl);
router.get('/moncash/success', cardController.moncashsuccess)
//--Amount add to driver Wallet--//

router.post('/delivery/addToWallet', Auth.isApp, Auth.authDriver, cardController.driverMoneyToWallet);
router.post('/delivery/addToWallet/direct', Auth.isApp, Auth.authDriver, cardController.driverAddMoneyToWalletDirect);
router.get('/delivery/clientToken', Auth.isApp, Auth.authDriver, cardController.generateBraintreeClientToken);
router.get('/delivery/payments', Auth.isApp, Auth.authDriver, cardController.getDriverPaymentsListForApp);
router.post('/delivery/add', Auth.isApp, Auth.authDriver, cardController.userAddCard);
router.post('/delivery/remove', Auth.isApp, Auth.authDriver, cardController.userRemoveCard);

router.get('/pagecancel', cardController.pagecancel)

router.get('/return', cardController.ReturnPingFromPaymentGateway);
router.post('/notify', cardController.orderNotifyPingFromPaymentGateway);
router.get('/webview', cardController.webViewPayment);
router.get('/add/webview', cardController.addCardWebview);
router.post('/webview/callback', cardController.webViewCallback);

//paystack callback...
router.post('/paystack/callback', cardController.paystackWebhookReturn);

module.exports = router;

