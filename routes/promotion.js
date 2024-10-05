const express = require('express');
const router = express.Router();
const promotionController = require('../controller/promotionController');
const Auth = require('../middleware/auth');
const promotionValidation = require('../middleware/validation/promotion');


router.post('/', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, promotionController.getPromotionList);
//Add Promocode
router.post('/add', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, Auth.isStoreType, promotionValidation.createPromotionDefault, promotionController.addPromotionData);

//update promocode
router.post('/update', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, promotionController.updatePromotionData);

//Get Promocode By Id
router.get('/view/:_id', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, promotionController.getPromotionDetailsById);

//remove Promocode
router.post('/remove', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, promotionController.removePromotionData);

router.post('/updatestatus/all', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, promotionController.updateStatus);

module.exports = router;