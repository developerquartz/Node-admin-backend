const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const packageController = require('./controller/packageController');
const vendorController = require("./controller/vendorController");
const { addPackage, IdValidation, updatePackage, updateStatus, updateVendor, addVendor } = require('./validation/validation');

/*                                -------Package API---------                            */
router.post('/', Auth.authAdminAndStaffVendorAndUser, packageController.viewPackageWithFilter);
router.post('/add', Auth.authAdminAndStaffAndVendor, addPackage, packageController.addPackage);
router.get('/view/:_id', Auth.authAdminAndStaffVendorAndUser, IdValidation, packageController.viewPackage);
router.post('/update', Auth.authAdminAndStaffAndVendor, updatePackage, packageController.updatePackage);
router.get('/remove/:_id', Auth.authAdminAndStaffAndVendor, IdValidation, packageController.removePackage);
router.post('/updateStatus/all', Auth.authAdminAndStaffAndVendor, updateStatus, packageController.updateStatusAll);

/*                                -------Vendor API---------                            */
router.post('/vendor', Auth.authAdminAndStaffAndVendor, vendorController.viewVendorWithFilter);
router.post('/vendor/add', Auth.authAdminAndStaffAndVendor, addVendor, vendorController.addVendor);
router.get('/vendor/view/:_id', Auth.authAdminAndStaffAndVendor, IdValidation, vendorController.viewVendor);
router.post('/vendor/update', Auth.authAdminAndStaffAndVendor, updateVendor, vendorController.updateVendor);
router.get('/vendor/remove/:_id', Auth.authAdminAndStaffAndVendor, IdValidation, vendorController.removeVendor);
router.post('/vendor/updateStatus/all', Auth.authAdminAndStaffAndVendor, updateStatus, vendorController.updateStatusAll);

module.exports = router;