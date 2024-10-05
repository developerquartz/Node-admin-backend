const express = require('express');
const router = express.Router();
const Auth = require('../middleware/auth');
const addonController = require('../controller/addonController.js');

//Add Addon
router.post('/', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, addonController.getAddonsList);
//Add Addon
router.post('/add', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, addonController.addAddonData);
//update Addon
router.post('/update', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, addonController.updateAddontData);
//Get Addon By Id
router.get('/view/:storeTypeId/:_id', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, addonController.getAddonDetailsById);
//remove Addon
router.post('/archive', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, addonController.archiveAddontData);
router.post('/remove', addonController.removeAddontData);
router.post('/updatestatus/all', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, addonController.updateStatus);

module.exports = router;