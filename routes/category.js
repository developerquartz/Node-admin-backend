const express = require('express');
const router = express.Router();
const catController = require('../controller/categoryController.js');
const Auth = require('../middleware/auth');

router.post('/', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, catController.CategoryMiddleware);
//Add Category
router.post('/add', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, catController.CategoryMiddleware);
//update category
router.post('/update', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, catController.CategoryMiddleware);
//Get Category By Id
router.get('/view/:storeTypeId/:_id', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, catController.CategoryMiddleware);
//remove Category
router.post('/archive', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, catController.CategoryMiddleware);
router.post('/remove', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, catController.CategoryMiddleware);
router.post('/updatestatus/all', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, catController.CategoryMiddleware);
router.post('/sortorder', Auth.authAdminAndStaffAndVendor, catController.sortOrder);

module.exports = router;