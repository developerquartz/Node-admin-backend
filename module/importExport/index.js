const express = require('express');
const router = express.Router();
const Auth = require('../../middleware/auth');
const importExportController = require('./importExportController');
const importFileOnLocal = require('../../helper/import');
const validationMiddleware = require('./validationMiddleware')

//Add products via CSV
router.post('/product/import',Auth.authAdminAndStaffAndVendor,  importFileOnLocal.single('productCSV'),  importExportController.importProductCSV);
//import product variation
router.post('/variation/import',Auth.authAdminAndStaffAndVendor,  importFileOnLocal.single('variationCSV'), importExportController.importProductVariationCSV);
//import combined product with variation
router.post('/product/import/combined',Auth.authAdminAndStaffAndVendor,  importFileOnLocal.single('productCombinedCSV'), validationMiddleware.importProductCombinedCSV, importExportController.importProductCSVCombined);

//import driver csv
router.post('/driver/import', Auth.authAdminAndStaff, importFileOnLocal.single('importDriver'), importExportController.importDriverViaCSV);
//import user csv
router.post('/user/import', Auth.authAdminAndStaff, importFileOnLocal.single('importUser'), importExportController.importUserViaCSV);
//import vendor csv
router.post('/vendor/import', Auth.authAdminAndStaff, importFileOnLocal.single('importVendor'), importExportController.importRestaurantsViaCSV);

//exports
router.get('/user/export', Auth.authAdmin, importExportController.getUserExports);
router.get('/driver/export', Auth.authAdmin, importExportController.getDriverExports);
router.get('/vendors/export/:storeTypeId', Auth.authAdmin, importExportController.getVendorExports);
router.get('/vendor/products/export/:storeTypeId/:_id', Auth.authAdminAndStaffAndVendor, importExportController.getVendorProductsExports);
router.get('/vendor/categories/export/:storeTypeId/:_id', Auth.authAdminAndStaffAndVendor, importExportController.getVendorCategoriesExports);
router.get('/vendor/brands/export/:storeTypeId', Auth.authAdminAndStaffAndVendor, importExportController.getVendorBrandsExports);
router.get('/transactions/export', Auth.authAdminAndStaffAndVendor, importExportController.getTransactionsExports)

module.exports = router;