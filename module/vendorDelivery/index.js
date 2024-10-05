const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const orderController = require('./controller/orderControllerV2');

router.post('/acceptrequest', Auth.authVendor, orderController.acceptRequestByRestaurant);

router.post('/rejectrequest', Auth.authVendor, orderController.rejectRequest);
router.post('/cancelRequest', Auth.authVendor, orderController.cancelRequest);


router.post('/inprocess', Auth.authVendor, orderController.inProcessOrderByRestaurant);

router.post('/markready', Auth.authVendor, orderController.markOrderReadyByRestaurant);

router.post('/completeorder', Auth.authVendor, orderController.completeOrderByVendor);

module.exports = router;