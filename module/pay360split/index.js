const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const Controller = require('./controller/controller');
const userController = require('../../controller/userController');

//---------------------------------------- Customer Side --------------------------------------------------//
router.post('/create/supplier', Auth.authAdminAndStaff, Controller.createMerchant);
router.post('/add/bankaccount/supplier', Auth.authAdminAndStaff, Controller.addbankaccount);
router.get('/supplier', Auth.authAdminAndStaff, Controller.getSupplier);
router.get('/supplier/account', Auth.authAdminAndStaff, Controller.getAccount);
router.post('/create/merchant', Auth.authAdminAndStaffAndVendor, Controller.createMerchantUser);
router.get('/merchant/account', Auth.authAdminAndStaffAndVendor, Controller.getmerchnatAccount);


module.exports = router;