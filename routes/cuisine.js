const express = require('express');
const router = express.Router();
const Auth = require('../middleware/auth');
const cuisineController = require('../controller/cuisineController.js');

router.post('/', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, cuisineController.getCuisineList);
router.post('/add', Auth.authAdminAndStaff, Auth.isStoreType, Auth.checkAccessLevel, cuisineController.addCuisineData);
router.get('/view/:storeTypeId/:_id', Auth.authAdminAndStaff, Auth.isStoreType, Auth.checkAccessLevel, cuisineController.getCuisineDetailsById);
router.post('/update', Auth.authAdminAndStaff, Auth.isStoreType, Auth.checkAccessLevel, cuisineController.updateCuisinetData);
router.post('/remove', Auth.authAdminAndStaff, Auth.isStoreType, Auth.checkAccessLevel, cuisineController.removeCuisinetData);
router.post('/archive', Auth.authAdminAndStaff, Auth.isStoreType, Auth.checkAccessLevel, cuisineController.archiveCuisine);
router.post('/updatestatus/all', Auth.authAdminAndStaff, Auth.isStoreType, Auth.checkAccessLevel, cuisineController.updateStatus);

module.exports = router;