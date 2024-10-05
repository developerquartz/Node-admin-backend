const express = require('express');
const router = express.Router();
const Auth = require('../middleware/auth');
const attController = require('../controller/attributeController.js');

router.post('/', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, attController.getAttributeList);
//Add Category
router.post('/add', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, attController.addAttributeData);
//get attribute by id
router.get('/view/:storeTypeId/:_id', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, attController.getAttributeDetailsById);
//update attribute
router.post('/update', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, attController.updateAttributetData);
//remove attribute
router.post('/remove', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, attController.removeAttributetData);
router.post('/archive', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, attController.archiveAttribute);
router.post('/updatestatus/all', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, attController.updateStatus);

module.exports = router;