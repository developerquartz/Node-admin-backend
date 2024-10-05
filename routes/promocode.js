const express = require('express');
const router = express.Router();
const promocodeController = require('../controller/promocodeController');
const Auth = require('../middleware/auth');

router.post('/', Auth.authAdminAndStaffAndVendor, promocodeController.getPromocodeList);

//Add Promocode
router.post('/add', Auth.authAdminAndStaffAndVendor, promocodeController.addPromocodeData);

//update promocode
router.post('/update', Auth.authAdminAndStaffAndVendor, promocodeController.updatePromocodetData);

//Get Promocode By Id
router.get('/view/:_id', Auth.authAdminAndStaffAndVendor, promocodeController.getPromocodeDetailsById);

//remove Promocode
router.post('/remove', Auth.authAdminAndStaffAndVendor, promocodeController.removePromocodetData);

router.post('/updatestatus/all', Auth.authAdminAndStaffAndVendor, promocodeController.updateStatus);

module.exports = router;