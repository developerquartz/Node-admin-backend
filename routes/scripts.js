const express = require('express');
const router = express.Router();
const storeController = require('../controller/storeController');
const terminologyController = require("../controller/terminologyController");
const scriptController = require("../controller/scriptController");
const Auth = require("../middleware/auth");

router.get('/updateVendorTakeawayAllStoreTypeScript', storeController.updateVendorTakeawayAllStoreTypeScript);
router.get('/updateKeysInAllStoreScript', storeController.updateKeysInAllStoreScript);
router.get('/addContentScript', storeController.addContentScript);
router.post("/updateStoreTypeById", scriptController.updateStoreTypeById);
router.post("/updateStoreTypeByIdForNewKey", scriptController.updateStoreTypeByIdForNewKey);
///update file link in db
router.post("/updateLinkInFile", scriptController.updateLinkInFile)

//V1.7 script
router.get('/addstoretypes', scriptController.addStoreTypes);
router.get('/addAndUpdateDefaultDocument', scriptController.addAndUpdateDefaultDocument);
//V1.7 script
router.get('/removeStoreTypes', scriptController.removeStoreTypes);
//v1.7 script
router.get('/addDefaultVehicleType', scriptController.addDefaultVehicleType);
router.post('/addStoreEmailTemplate', scriptController.addStoreEmailTemplate);
router.post('/deleteUpdateTemplate', scriptController.deleteupdateStoreEmailTemplate)

//v1.8 script
router.get('/addDefaultMenuAndItemForAllStore', scriptController.addDefaultMenuAndItemForAllStore);

router.get('/rebuild', scriptController.rebuildScript);
router.get('/rebuildSettingScript', scriptController.rebuildSettingScript);

router.post('/updatestore', scriptController.updateStore);
router.post('/updateallstore', scriptController.updateAllStore);
router.post('/updateallstoretype', scriptController.updateAllStoreType);
router.post('/unsetstorecard', scriptController.unsetStoreCard);
router.post('/updateAllUserByRole', scriptController.updateAllUserByRole);
router.post('/updateAllUserByRoleAndStoreId', scriptController.updateAllUserByRoleAndStoreId);

router.post('/addVehicleTypeDriver', scriptController.addVechileTypeDriver);

router.post('/cleararchive', scriptController.clearArchiveData);
router.post('/updatePaymentMethod', scriptController.updatePaymentMethods);
router.post('/updatePaymentMethodbyfield', scriptController.updatePaymentMethodsbyField);
router.post('/addupdatePaymentMethodBystoreId', scriptController.addupdatePaymentBystoreId)
router.post('/removePaymentMethod', scriptController.removePaymentMethods);
router.post('/removePaymentMethodBystore', scriptController.removePaymentMethodsByStore);
router.get('/getLog', scriptController.getLogForSuperAdminCheck);
router.get('/clearlogs', scriptController.clearLogsType);
router.post('/clearDataByDynamicKey', scriptController.clearDataByDynamicKey);
router.post('/removeTransactionById', scriptController.removeTransactionById);

router.post('/addVehicleTypeDriver', scriptController.addVechileTypeDriver);

router.post('/updateStoreTerminologyScriptById', terminologyController.addStoreTerminologyScriptById);
router.post('/updateAllStoreTerminologyScriptById', terminologyController.addAllStoreTerminologyScriptById);
router.post('/maketerminologyformat', terminologyController.makeTerminologyFormat);
router.post('/maketerminologyformatotherlan', terminologyController.makeTerminologyFormatOtherLang);
router.post('/makejsonformat', terminologyController.makeJsonFormat);
router.get('/terminologytocsv', terminologyController.terminologyToCSV);
router.post('/addTerminologyToParticularLangAndType', terminologyController.addTerminologyToParticularLangAndType);

// new Script for nov 11 2021 must be run once on prod server
router.post('/updateStoreVersion', scriptController.updateStoreVersion); // add default version
router.get('/deleteWrongCategory', scriptController.deleteWrongCategory); // remove ghost category
router.get('/addPromoCodeTypeInOldStore', scriptController.addPromoCodeTypeInOldStore); // add promocode type as vendor in old store
router.get('/addPricingTypeInOldProduct', scriptController.addPricingTypeInOldProduct); // add pricing type as unit in old product


//paystack add card through html file
router.get('/addcard', scriptController.paystackcardAdd)
router.get('/pay', scriptController.paystackApplePay)


// update store status...
router.post('/updateStoreStatus', scriptController.storeStatusUpdatation)
router.post('/createStoreType', scriptController.createStoreTypes);

// update store status...
router.post('/updateStoreStatus', scriptController.storeStatusUpdatation)

// add contant pages
router.post('/addcontant/page', scriptController.addcontantpage)

//translate JSON files
router.post('/translate', scriptController.translateData);
router.post('/capitalizeLetter', scriptController.capitalizeFirstLetter);
router.post('/checksession', scriptController.checksessiondata)


//add or update doucment template
router.post('/adddocument/temp', scriptController.addDocumentTemplateData)


router.get('/return/script', scriptController.getresponse);
router.post('/generate/referralCode', scriptController.createReferralCodeForAllUsers);
router.post('/firebase/notification', scriptController.sendOrderPlacedNotificationToStore);

// update formfield 
router.post('/updateFormField', scriptController.updateFormField);

//create store
router.post("/signupemail", Auth.isUserExists, storeController.isUserExists);
router.post('/signup', Auth.isUserExists, storeController.createUser);

//create plans
router.post("/create/plan", scriptController.addplan)


module.exports = router;