const express = require('express');
const router = express.Router();
const proController = require('../controller/productController');
const Auth = require('../middleware/auth');
const importFileOnLocal = require('../helper/import');
const ProductMiddleware = require('../middleware/validation/product')

router.post('/uploadImageUrl', proController.test);

router.post('/', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, proController.ProductMiddleware);
//Add products via CSV
router.post('/addProductCSV', Auth.authAdminAndStaffAndVendor, importFileOnLocal.single('productCSV'), ProductMiddleware.importFoodProductCombinedCSV, proController.importProductCSV);

//add product variation
router.post('/addProductVariationCSV',Auth.authAdminAndStaffAndVendor,  importFileOnLocal.single('variationCSV'), proController.importProductVariationCSV);
//add combined product with variation
router.post('/importProductCombinedCSV',Auth.authAdminAndStaffAndVendor,  importFileOnLocal.single('productCombinedCSV'), ProductMiddleware.importProductCombinedCSV, proController.importProductCSVCombined);

//Add product
router.post('/add', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, proController.ProductMiddleware);
//Get Product By Id
router.get('/view/:storeTypeId/:_id', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, proController.ProductMiddleware);
//update product
router.post('/update', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, proController.ProductMiddleware);
//remove product
router.post('/archive', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, proController.ProductMiddleware);

router.post('/remove', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, proController.ProductMiddleware);

router.post('/updatestatus/all', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.checkAccessLevel, proController.ProductMiddleware);

module.exports = router;