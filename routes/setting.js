const express = require('express');
const router = express.Router();
const settingController = require('../controller/settingController');
const Validation = require('../middleware/validation/store');
const Auth = require('../middleware/auth');

router.get('/getStarted', Auth.authAdmin, settingController.getStarted);

router.get('/getstoresetting', Auth.authAdminAndStaffAndVendor, settingController.getStoreSetting);
router.post('/storesetting', Auth.authAdminAndStaff, Auth.checkAccessLevel, settingController.storeSetting);
router.post('/deletestoresetting', Auth.authAdmin, settingController.deleteStoreSetting);

router.post('/vendorsetting', Auth.authAdminAndStaffAndVendor, settingController.updateVendorSetting);

router.get('/accesslist', Auth.authAdmin, settingController.getAccessList);

router.get('/storetypes', settingController.getStoreTypes);

router.get('/:storeTypeName/storetype/:_id', Auth.authAdminAndStaffAndVendor, settingController.getStoreTypeSetting);
router.post('/:storeTypeName/addsetting', Auth.authAdminAndStaff, Validation.storeSetting, settingController.addSetting);
router.get('/storetype/:_id', Auth.isApp, settingController.getStoreTypeSettingForWeb);


module.exports = router;