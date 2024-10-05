const express = require('express');
const router = express.Router();
const storeController = require('../controller/storeController');
const driverController = require('../controller/driverController');
const templateController = require('../controller/templateController');
const addressController = require('../controller/addressController');
const storeValidation = require('../middleware/validation/store');
const driverValidation = require('../middleware/validation/driver');
const RoleController = require('../controller/rolesController');
const docTemplateController = require('../controller/documentTemplateController');
const settingController = require('../controller/settingController');
const planController = require('../controller/billingPlanController');
const cardController = require('../controller/cardController');
const orderController = require('../controller/orderController');
const languageController = require('../controller/langaugeController');
const Auth = require('../middleware/auth');
const importFileOnLocal = require('../helper/import');
const fileController = require('../controller/fileController.js');


router.post('/importDriverViaCSV', Auth.authAdminAndStaff, importFileOnLocal.single('importDriver'), driverController.importDriverViaCSV);
router.post('/importUserViaCSV', Auth.authAdminAndStaff, importFileOnLocal.single('importUser'), storeController.importUserViaCSV);
router.post('/importVendorViaCSV', Auth.authAdminAndStaff, importFileOnLocal.single('importVendor'), storeController.importRestaurantsViaCSV);

router.get('/', storeController.getStoresList);
//upload image
router.post('/gallery/uploadImage', Auth.authAdminAndStaff, Auth.checkAccessLevel, fileController.addFileData);
//get gallery image
router.post('/gallery/getGallery', Auth.authAdminAndStaff, Auth.checkAccessLevel, fileController.getImageList);

//update image
router.post('/gallery/update', Auth.authAdminAndStaff, Auth.checkAccessLevel, fileController.updateFileData);

//Get Image By Id
router.get('/gallery/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, fileController.getFileDetailsById);

//remove image
router.post('/gallery/remove', Auth.authAdminAndStaff, Auth.checkAccessLevel, fileController.removeFileData);
//update image status
router.post('/gallery/updateStatus', Auth.authAdminAndStaff, Auth.checkAccessLevel, fileController.updateStatus);

router.post("/signupemail", storeValidation.isValidEmail, Auth.isUserExists, storeController.isUserExists);

router.post('/signup', storeValidation.storeSignup, Auth.isUserExists, storeController.createUser);

router.post('/login', storeValidation.userLogin, storeController.userLogin);

router.post('/forgotpassword', storeValidation.userForgotPassword, storeController.userForgotPassword);

router.post('/resetpassword', storeValidation.userResetPassword, storeController.userResetPassword);

router.post('/changepassword', Auth.authAdminAndStaffAndVendor, storeValidation.userChangePassword, storeController.changeUserPassword);

router.post('/approve', storeController.approveUser);

router.post('/updateprofile', Auth.authAdminAndStaffAndVendor, storeValidation.updateUserProfile, storeController.updateUserProfile);

router.get('/me', Auth.authAdminAndStaffAndVendor, storeController.getUserProfileById);

router.post('/check', storeController.checkStoreName);

router.get('/currentplan', Auth.authAdminAndStaffAndVendor, storeController.currentplan)

router.post('/enablenotifications', Auth.authVendor, storeValidation.enableVendorNotifications, storeController.enableVendorNotifications)

router.post('/logout', Auth.authVendor, storeValidation.enableVendorNotifications, storeController.userLogout)

//customer crud
router.post('/adduser', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.addUserByAdmin);
router.post('/updateuser', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.updateUserByAdmin);
router.post('/updatestatus', Auth.authAdmin, Auth.checkAccessLevel, storeValidation.updateUserStatus, storeController.updateUserStatus);
router.get('/user/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, Auth.getAccessForHideInfo, storeController.getUserDetailsById);
router.post('/users', Auth.authAdminAndStaff, Auth.checkAccessLevel, Auth.getAccessForHideInfo, storeController.getUsersByStoreAdmin);
router.post('/removeuser', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.removeUserByAdmin);
router.post('/user/updatestatus/all', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.updateAllUserByAdmin);
router.post('/user/addaddress', Auth.authAdminAndStaff, Auth.checkAccessLevel, addressController.userAddAddressByAdmin);
router.post('/user/updateaddress', Auth.authAdminAndStaff, Auth.checkAccessLevel, addressController.userUpdateAddress);
router.post('/user/removeaddress', Auth.authAdminAndStaff, Auth.checkAccessLevel, addressController.userRemoveAddress);
router.get('/user/address/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, addressController.userGetAddressDetails);
router.post('/user/address', Auth.authAdminAndStaff, Auth.checkAccessLevel, addressController.getAddressList);

//driver
router.post('/adddriver', Auth.authAdminAndStaff, Auth.checkAccessLevel, driverValidation.driverSignup, driverController.createUser);
router.post('/updatedriver', Auth.authAdminAndStaff, Auth.checkAccessLevel, driverValidation.updateDriver, driverController.updateDriverByAdmin);
router.get('/driver/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, Auth.getAccessForHideInfo, driverController.getDriverDetailsById);
router.post('/archivedriver', Auth.authAdminAndStaff, Auth.checkAccessLevel, driverController.archiveUserByAdmin);
router.post('/drivers', Auth.authAdminAndStaff, Auth.checkAccessLevel, Auth.getAccessForHideInfo, driverController.getDrivers);
router.post('/drivers/updatestatus/all', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.updateAllUserByAdmin);
router.post('/update/driverbank', Auth.authAdminAndStaff, driverController.driverUpdateDetailsByAdmin);
router.post('/edit/driverbank', Auth.authAdminAndStaff, driverController.drivereditDetailsByAdmin);

//vendor
router.post('/addvendor', Auth.authAdminAndStaff, Auth.isStoreType, storeController.addRestaurantByAdmin);
router.post('/updatevendor', Auth.authAdminAndStaff, Auth.isStoreType, storeController.updateRestaurantByAdmin);
router.get('/vendor/view/:storeTypeId/:_id', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, Auth.getAccessForHideInfo, storeController.getRestaurantDetailsById);
router.post('/archivevendor', Auth.authAdminAndStaff, Auth.isStoreType, storeController.removeUserByAdmin);
router.post('/vendors', Auth.authAdminAndStaff, Auth.isStoreType, Auth.getAccessForHideInfo, storeController.getRestaurantsByStoreAdmin);
router.post('/vendors/updatestatus/all', Auth.authAdminAndStaff, Auth.isStoreType, storeController.updateAllUserByAdmin);

//-------Email Template------------//
router.post('/templates', Auth.authAdminAndStaff, Auth.checkAccessLevel, templateController.getTemplatesList);
router.post('/updatetemplate', Auth.authAdminAndStaff, Auth.checkAccessLevel, templateController.updateTemplatetData);
router.post('/reverttemplate', Auth.authAdminAndStaff, templateController.revertTemplatetData);
router.get('/template/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, templateController.getTemplateDetailsById);
//-------Email Template------------//

router.post('/orders', Auth.authAdminAndStaffAndVendor, storeController.getOrdersByStoreAdmin);
router.get('/order/pdf/:_id', storeController.getOrderspdf)
router.get('/order/:_id', Auth.authAdminAndStaffAndVendor, Auth.getAccessForHideInfo, storeController.getOrderDetailsById);
router.post('/order/status', Auth.authAdminAndStaffAndVendor, orderController.updateOrder);

router.post('/transaction', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, storeController.getTransaction);
router.post('/pay', Auth.authAdminAndStaff, storeController.payToUser);
router.post('/refund', Auth.authAdminAndStaff, storeController.refundToUser);

router.post('/reports/orders', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, storeController.getStoreOrderAnalytics);
router.post('/reports/users', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.getStoreUsersAnalytics);
router.get('/reports/dashboard', Auth.authAdminAndStaffAndVendor, storeController.getStoreDashboardAnalytics);
router.post('/reports/drivers', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.getStoreDriversAnalytics);

router.post('/subadmins', Auth.authAdmin, storeController.getUsersByStoreAdmin);
router.post('/roles', Auth.authAdmin, RoleController.getRoleList);
router.post('/addrole', Auth.authAdmin, RoleController.addRoleData);
router.post('/updaterole', Auth.authAdmin, RoleController.updateRoletData);
router.get('/role/view/:_id', Auth.authAdmin, RoleController.getRoleDetailsById);
router.post('/archiverole', Auth.authAdmin, RoleController.archiveRole);
router.post('/removerole', Auth.authAdmin, RoleController.removeRoletData);
router.post('/roles/updatestatus/all', Auth.authAdmin, RoleController.updateStatus);

router.post('/sendnotification', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.sendPushNotification);
router.post('/notifications', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.getNotifications);

//document template
router.post('/doctemplates', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, docTemplateController.DocumentTemplateList);
router.post('/adddoctemplate', Auth.authAdminAndStaff, Auth.checkAccessLevel, docTemplateController.addDocumentTemplateData);
router.post('/removedoctemplate', Auth.authAdminAndStaff, Auth.checkAccessLevel, docTemplateController.archiveDocumentTemplateData);
router.post('/updatedoctemplate', Auth.authAdmin, Auth.checkAccessLevel, docTemplateController.updateDocumentTemplatetData);
router.post('/doctemplate/addfield', Auth.authAdminAndStaff, Auth.checkAccessLevel, docTemplateController.addDocumentTemplatetField);
router.get('/doctemplate/editfield/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, docTemplateController.editDocumentTemplatetField);
router.post('/doctemplate/updatefield', Auth.authAdminAndStaff, Auth.checkAccessLevel, docTemplateController.updateDocumentTemplatetField);
router.post('/doctemplate/archivefield', Auth.authAdmin, Auth.checkAccessLevel, docTemplateController.removeDocumentFieldData);
router.get('/doctemplate/view/:_id', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, docTemplateController.getDocumentTemplateDetailsById);
router.post('/doctemplate/updatestatus/all', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, docTemplateController.deleteDocTemplateFieldsData);
router.post('/doctemplate/fields/sortorder', Auth.authAdmin, docTemplateController.sortOrder);

//user documents
router.post('/user/documents', Auth.authAdminAndStaffAndVendor, docTemplateController.getUserDocuments);
router.post('/user/document/view', Auth.authAdminAndStaffAndVendor, docTemplateController.getUserDocumentView);
router.post('/user/document/add', Auth.authAdminAndStaffAndVendor, docTemplateController.addOrUpdateUserDocument);

//store setting for apps
router.get('/setting', Auth.isUniversalApp, settingController.getStoreSettingForApps);

//billing plans--only for super admin..later will change route and move in separate file
router.post('/billingplan/add', planController.addPlansData);
router.post('/billingplan/list', planController.getPlansList);
router.post('/billingplan/update', planController.updatePlanstData);
router.post('/billingplan/remove', planController.removePlanstData);
router.get('/billingplan/view/:_id', planController.getPlansDetailsById);
router.post('/billingplan/updatestatus/all', planController.updateStatus);

//languages
router.get('/languagescodes', languageController.gatLanguagesCode);
router.post('/addlanguage', languageController.addLanguageData);
router.get('/languages', languageController.getLanguageList);
router.get('/enabledlanguages', languageController.getEnabledLanguageList);
router.get('/languagedetails/:_id', languageController.getLanguageDetailsById);
router.post('/updatelanguage', languageController.updateLanguageData);
router.post('/removelanguage', languageController.removeLanguageData);

router.post('/billingplans', Auth.authAdmin, planController.getStorePlansList);
//store card
router.post('/card', Auth.authAdmin, cardController.addStoreCardByStripe);
router.post('/upgradeplan', Auth.authAdmin, cardController.upgradeStorePlanNew);

//godaddy domain search api
router.post('/domain/search', Auth.authAdmin, storeController.searchDomain);
router.post('/domain/buy', Auth.authAdmin, storeController.byDomain);

router.post('/birdeyeview', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.getBirdEyeViewResults);
router.post('/birdeyeview/assign', Auth.authAdminAndStaff, Auth.checkAccessLevel, orderController.assignDriverFromBirdEyeView);

//exports
router.get('/export/users', Auth.authAdminAndStaff, storeController.getUserExports);
router.get('/export/drivers', Auth.authAdminAndStaff, storeController.getDriverExports);
router.get('/export/vendors/:storeTypeId', Auth.authAdminAndStaff, storeController.getVendorExports);
router.get('/export/vendor/products/:storeTypeId/:_id', Auth.authAdminAndStaffAndVendor, Auth.isStoreType, storeController.getVendorProductsExports);
router.get('/export/vendor/categories/:storeTypeId/:_id', Auth.authAdminAndStaffAndVendor, storeController.getVendorCategoriesExports);
router.get('/export/vendor/brands/:storeTypeId', Auth.authAdminAndStaffAndVendor, storeController.getVendorBrandsExports);
router.get('/export/transactions', Auth.authAdminAndStaffAndVendor, storeController.getTransactionsExports)

router.get('/configs', storeController.getStoreConfigs);

router.post('/public', storeController.getStoreByDomain);

//---received payments

router.post('/payment/adjustment', Auth.authAdminAndStaff, Auth.checkAccessLevel, storeController.paymentadjustment)


//update or edit vehicle by admin

router.post('/editDriverVehicle', Auth.authAdminAndStaff, storeController.EditDriverVehicle)
router.post('/updateDriverVehicle', Auth.authAdminAndStaff, storeController.UpdateDriverVehicle)
router.post('/makeDefaultVehicle', Auth.authAdminAndStaff, storeController.defaultDriverVehiclebyadmin)
router.post('/listDriverVehicle', Auth.authAdminAndStaff, storeController.driverVehiclesListbyadmin)
router.post('/driverVehicle/delete', Auth.authAdminAndStaff, storeController.deleteDriverVehiclebyadmin)
router.post('/driverVehicle/add', Auth.authAdminAndStaff, storeController.addDriverVehiclebyadmin)
router.post('/vehicleTypes', Auth.authAdminAndStaff, storeController.driverVehiclTypes);

//---users reviews
router.post('/users/reviews', Auth.authAdminAndStaffAndVendor, storeController.usersReviewsList);

//driver & customer order list.
router.post('/users/orders', Auth.authAdminAndStaffAndVendor, storeController.getOrdersForCustomerAndDriver);


//payment sattelment vendor and driver list.

router.post('/settelment/list', Auth.authAdminAndStaff, storeController.getsettelmentuser);
router.post('/dispatcher/driver/list', Auth.authAdminAndStaff, Auth.getAccessForHideInfo, storeController.driverlistdispature);
router.post('/dispatcher/customer/list', Auth.authAdminAndStaff, Auth.getAccessForHideInfo, storeController.customerlistdispature);
router.post('/dispatcher/vendor/list', Auth.authAdminAndStaff, Auth.getAccessForHideInfo, storeController.vendorlistdispature);


// ------------vendor clone API --------------

router.post('/vendor/clone', Auth.authAdminAndStaff, storeController.vendorClone);


module.exports = router;