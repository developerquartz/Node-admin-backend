const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const tripController = require('./controller/tripController');
const { validationCreateTrip, validateNearBy, validateTripEstimate, cancelTrip, validationPackageTrip } = require('./validation/trip')
const deliveryVehicle = require("./middleware/vehicleList");
//---------------------------------------- Customer Side --------------------------------------------------//
router.post('/user/nearby', Auth.isApp, Auth.isStoreType, validateNearBy, tripController.nearByDrivers);
router.post('/user/vehicletypes', Auth.isApp, Auth.isStoreType, validateTripEstimate, deliveryVehicle, tripController.vehicleTypes);
router.post('/user/create', Auth.isApp, Auth.isFromPreferredBooking, Auth.isStoreType, Auth.authUser, validationCreateTrip, tripController.createTrip);
router.post('/user/cancelTrip', Auth.isApp, Auth.authUser, cancelTrip, tripController.cancelTripByCustomer);
router.post('/user/preferred/add', Auth.isApp, Auth.authUser, cancelTrip, tripController.addPreferredDriver);
router.post('/user/preferred/remove', Auth.isApp, Auth.authUser, cancelTrip, tripController.removePreferredDriver);
router.get('/user/preferred/list', Auth.isApp, Auth.authUser, tripController.getPreferredDriver);
router.post('/sos', Auth.isApp, Auth.authUser, cancelTrip, tripController.sendTripSOS);

/*------------biding api-------------------------------------------------------------------*/
router.post("/user/acceptRequest", Auth.isApp, Auth.authUser, tripController.acceptRequestByCustomer);
router.post("/user/bidRaise", Auth.isApp, Auth.authUser, tripController.raiseBidAmountByCustomer);
router.post("/user/bidReject", Auth.isApp, Auth.authUser, tripController.rejectBidByCustomer);

//-----------------check avalibility for city according Geofence---------------
router.post('/check/availability', Auth.isApp, Auth.isStoreType, tripController.checkAvailability)
// ---------Package Service--------------------
router.post('/package/user/create', Auth.isApp, Auth.isStoreType, Auth.authUser, validationPackageTrip, tripController.createTripWithPackage);

module.exports = router;