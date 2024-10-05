const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const { validatePyament } = require('./middleware/validation')
const Validation = require('./validation');
const vehicleController = require('./controller/vehicleController');
const deliveryBoyController = require('./controller/deliveryBoyController');
const deliveryController = require('./controller/deliveryController');
const { checkReferralCode } = require('./middleware/auth');
const { calculateWaitingCharge } = require("./utility/waitingCharges")

//---Driver Side---//
router.post("/signupemail", Auth.isApp, checkReferralCode, Validation.driverSignupCheckBefore, deliveryBoyController.createUserCheck);
router.post('/signup', Auth.isApp, checkReferralCode, Validation.driverSignup, deliveryBoyController.createUser);
router.post('/login', Auth.isApp, Validation.userLogin, deliveryBoyController.userLogin);
router.post('/logout', Auth.isApp, Auth.authDriver, deliveryBoyController.userLogout);
router.post('/resendotp', Auth.isApp, Validation.userForgotPassword, deliveryBoyController.driverResendOTP);
router.post('/forgotpassword', Auth.isApp, Validation.userForgotPassword, deliveryBoyController.userForgotPassword);
router.post('/resetpassword', Auth.isApp, Validation.userResetPassword, deliveryBoyController.userResetPassword);
router.post('/changepassword', Auth.isApp, Auth.authDriver, Validation.userChangePassword, deliveryBoyController.changeUserPassword);
router.post('/updateprofile', Auth.isApp, Auth.authDriver, deliveryBoyController.updateUserProfile);
router.post('/updateprofileimage', Auth.isApp, Auth.authDriver, deliveryBoyController.updateUserProfileImage);
router.post('/addaccount', Auth.isApp, Auth.authDriver, deliveryBoyController.driverAddBankAccount);
router.get('/me', Auth.isApp, Auth.authDriver, deliveryBoyController.getUserProfileById);
router.post('/status', Auth.isApp, Auth.authDriver, vehicleController.updateDriverStatus);

router.post('/documents/template', Auth.isApp, vehicleController.driverRegisterDocumentTemplates);
router.post('/document/update', Auth.isApp, Auth.authDriver, vehicleController.updateDriverDoc);

router.post('/setfare', Auth.isApp, Auth.authDriver, deliveryBoyController.updateTripFareSettings);

//manage vehicles
router.post('/vehicleTypes', Auth.isApp, vehicleController.driverVehiclTypes);
router.post('/vehicle/addOrEdit', Auth.isApp, Auth.authDriver, vehicleController.addOrEditDriverVehicle);
router.get('/vehicles', Auth.isApp, Auth.authDriver, vehicleController.driverVehiclesList);
router.post('/vehicle/addOrUpdate', Auth.isApp, Auth.authDriver, vehicleController.addOrUpdateDriverVehicle);
router.post('/vehicle/delete', Auth.isApp, Auth.authDriver, vehicleController.deleteDriverVehicle);
router.post('/vehicle/default', Auth.isApp, Auth.authDriver, vehicleController.defaultDriverVehicle);
router.post('/earning', Auth.isApp, Auth.authDriver, deliveryBoyController.getEarning);

//delivery related
router.get('/orderdetails/:_id', Auth.isApp, Auth.authDriver, deliveryController.getDriverOrderDetails);
router.post('/accept', Auth.isApp, Auth.authDriver, Validation.requestAcceptance, deliveryController.acceptRequestByDriver);
router.post('/reject', Auth.isApp, Auth.authDriver, deliveryController.rejectRequestByDriver);
router.post('/arrived', Auth.isApp, Auth.authDriver, deliveryController.driverArrivedAtCustomerLocation);
router.post('/schedule/started', Auth.isApp, Auth.authDriver, deliveryController.tripScheduledStartedByDriver);
router.post('/started', Auth.isApp, Auth.authDriver, deliveryController.tripStartedByDriver);
router.post('/completed', Auth.isApp, Auth.authDriver, calculateWaitingCharge, validatePyament, deliveryController.completedDriverMiddleware);
router.post('/cancelled', Auth.isApp, Auth.authDriver, deliveryController.tripCancelledByDriver);
router.post('/feedbacktocustomer', Auth.isApp, Auth.authDriver, deliveryController.feedbackByDriverToCustomer);
router.post('/upcoming/orders', Auth.isApp, Auth.authDriver, deliveryController.getDriverUpcomingOrderList);
router.post('/past/orders', Auth.isApp, Auth.authDriver, deliveryController.getDriverPastOrderList);

//delivery user related
router.post('/user/vehicleTypes', Auth.isApp, Auth.isFromPreferredBooking, Auth.isStoreType, vehicleController.getVehicleTypesForCustomer);
router.post('/nearby', Auth.isApp, deliveryController.nearByDrivers);
router.get('/request', Auth.isApp, Auth.authDriver, deliveryController.getDriverRequest);
//for only kucher project...
router.get('/request/new', Auth.isApp, Auth.authDriver, deliveryController.getDriverRequestNew);
router.post('/request', Auth.isApp, deliveryController.sendRequestToNearByDrivers);
router.post('/request/nearby', Auth.isApp, deliveryController.requestNearByDrivers);
router.post('/setPriceSendRequest', Auth.isApp, deliveryController.sendRequestToNearByDriversWithPriceSet);

//---Store Admin Side---//
router.post('/vehiclestypes', Auth.authAdmin, vehicleController.getVehicleList);
router.post('/vehicletype/add', Auth.authAdmin, vehicleController.addVehicleData);
router.get('/vehicletype/view/:_id', Auth.authAdmin, vehicleController.getVehicleDetailsById);
router.post('/vehicletype/update', Auth.authAdmin, vehicleController.updateVehicletData);
router.post('/vehicletype/archive', Auth.authAdmin, vehicleController.archiveVehicle);
router.post('/vehicletype/updatestatus/all', Auth.authAdmin, vehicleController.updateStatus);
//---Store Admin Side---//


//--ridehailing---//

router.post('/ride/hailing/fare', Auth.isApp, Auth.authDriver, vehicleController.getFareForVehicleTypes)
router.post('/ride/hailing/createTrip', Auth.isApp, Auth.isStoreType, Auth.authDriver, deliveryController.createrequest)

//--ridehailing---//

router.post("/bidRaiseByDriver", Auth.isApp, Auth.authDriver, deliveryController.bidRaiseByDriver);

// request send by driver ///// 
router.post("/sendRequestToUser", Auth.isApp, Auth.authDriver, deliveryController.sendRequestToUser);
// ----------for multi location pickup drop API's--------------
router.post('/dropOff/start', Auth.isApp, Auth.authDriver, deliveryController.dropOffMultiLocationStartedByDriver);
router.post('/dropOff/complete', Auth.isApp, Auth.authDriver, deliveryController.dropOffMultiLocationCompleteByDriver);
router.post('/dropOff/cancelled', Auth.isApp, Auth.authDriver, deliveryController.dropOffMultiLocationCancelledByDriver);

// ----------------pool trips------------------
router.get('/getPoolTrips', Auth.isApp, Auth.authDriver, deliveryController.getDriverPoolTripsBySorting);
router.post('/transaction', Auth.isApp, Auth.authDriver, deliveryController.getTransaction);

router.post('/update/rideShareStatus', Auth.isApp, Auth.authDriver, vehicleController.updateDriverVehicleForPoolAndNormal);
router.get('/lang/:code', Auth.isApp, deliveryController.getActiveStoreLanguageForDrivers);
router.post('/update/language', Auth.isApp, Auth.authDriver, deliveryController.updateDriverLanguage);

// ----------for multi stop API's--------------
router.post('/multiStops/start', Auth.isApp, Auth.authDriver, deliveryController.multiStopsStartedByDriver);
router.post('/multiStops/complete', Auth.isApp, Auth.authDriver, deliveryController.multiStopsCompleteByDriver);
router.post('/multiStops/waitTime', Auth.isApp, Auth.authDriver, deliveryController.driverWaitingTimeForStops);
router.post('/multiStopsStartAt/time', Auth.isApp, Auth.authDriver, deliveryController.multiStopsStartAt);
// ------------- to assign trip to other driver -------------//
router.post('/driverlist', Auth.isApp, Auth.authDriver, deliveryController.driverlist);
router.post('/assignRideToOtherDriver', Auth.isApp, Auth.authDriver, deliveryController.assignRideToOtherDriver);
//send trip request to driver for schedule trip
router.post('/sendRequestToOtherDriver', Auth.isApp, Auth.authDriver, deliveryController.sendRequestToOtherDriver);



module.exports = router;