const express = require('express');
const router = express.Router();
const Auth = require('../middleware/auth');
const businessTypeController = require('../controller/businessTypeController');

router.post('/', Auth.authAdminAndStaff, Auth.isStoreType, businessTypeController.getBusinessTypeList);
router.post('/add', Auth.authAdminAndStaff, Auth.isStoreType, businessTypeController.addBusinessTypeData);
router.get('/view/:storeTypeId/:_id', Auth.authAdminAndStaff, Auth.isStoreType, businessTypeController.getBusinessTypeDetailsById);
router.post('/update', Auth.authAdminAndStaff, Auth.isStoreType, businessTypeController.updateBusinessTypeData);
router.post('/remove', Auth.authAdminAndStaff, Auth.isStoreType, businessTypeController.removeBusinessTypeData);
router.post('/archive', Auth.authAdminAndStaff, Auth.isStoreType, businessTypeController.archiveBusinessType);
router.post('/updatestatus/all', Auth.authAdminAndStaff, Auth.isStoreType, businessTypeController.updateStatus);

module.exports = router;