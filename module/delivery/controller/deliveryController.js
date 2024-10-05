const ObjectId = require('objectid');
const Order = require('../../../models/ordersTable');
const User = require('../../../models/userTable');
const Review = require('../../../models/reviewTable');
const helperFunc = require('../utility/helperFunction');
const deliveryRequest = require('../utility/deliveryRequests');
const Transaction = require('../../../helper/transaction');
const Calculattion = require('../utility/calculation');
const utilityFun = require('../utility/functions');
const storeType = require('../../../models/storeTypeTable');
const File = require('../../../models/fileTable');
const paymentMiddleware = require('../../../middleware/payments');
const storeTyp = ["TAXI", "PICKUPDROP"];
const utilityFunc = require('../utility/functions');
const tripServices = require('../../taxiApplication/services/trips');
const socketHelper = require('../../../helper/socketHelper');
const bidModel = require("../../../models/bidTable");
const agenda = require('../../../cron/agenda');
const moment = require("moment")
const dropmultiLocation = require("../../../models/dropmultiLocation");
const { sendCustomOtp } = require("../../../lib/otpverification")
const { sortDriverPoolTrips } = require('../utility/sortDriverPoolTrips');
const momentz = require('moment-timezone');
const paymentLedger = require('../../../models/paymentLedgerTable');
const terminologyModel = require('../../../models/terminologyTable');
const Config = require('../../../config/constants.json');
const scheduleRideReminderAgenda = require("../../../helper/cronSetupForScheduleRide");
const { freeRideCompletedNotification } = require('../utility/freeRideNotification');
const refoundPayment = require("../../../middleware/refoundPayment");
const googleMap = require('../utility/googleMap');
const Card = require('../../../models/cardTable');
const Cuisines = require('../../../models/cuisinesTable')
const queryGenerate = require('../../../helper/queryGenerate')
module.exports = {

    nearByDrivers: async (req, res) => {
        try {
            let store = req.store;
            let data = req.body;
            let source = { type: "Point", coordinates: [Number(data.source.lng), Number(data.source.lat)] };
            let radius = data.radius;
            let query = data.query;
            query.store = ObjectId(query.store);
            let unit = data.unit;
            let limit = data.limit || 10;
            let maxDistance = helperFunc.getDeliveryArea(radius, unit);

            User.aggregate(
                [
                    {
                        "$geoNear": {
                            "near": source,
                            "distanceField": "distance",
                            key: "userLocation",
                            "spherical": true,
                            "maxDistance": maxDistance,
                            query: query,
                        }
                    },
                    {
                        $lookup:
                        {
                            from: 'vehicles',
                            localField: "vehicle",
                            foreignField: "_id",
                            as: "vehilce"
                        }
                    },
                    {
                        $unwind: { path: "$vehilce", preserveNullAndEmptyArrays: true },
                    },
                    // {
                    //     $lookup:
                    //     {
                    //         from: 'vehicletypes',
                    //         localField: "vehilce.vehicleType",
                    //         foreignField: "_id",
                    //         as: "vehicleType"
                    //     }
                    // },
                    {
                        $lookup:
                        {
                            from: "vehicletypes",
                            let: { vehicleType: "$vehilce.vehicleType" },
                            pipeline: [
                                {
                                    $match:
                                    {
                                        $expr:
                                        {
                                            $and:
                                                [
                                                    { $eq: ["$_id", "$$vehicleType"] }
                                                ]
                                        }
                                    }
                                },
                                {
                                    $lookup:
                                    {
                                        from: "files",
                                        let: { icon: "$icon" },
                                        pipeline: [
                                            {
                                                $match:
                                                {
                                                    $expr:
                                                    {
                                                        $and:
                                                            [
                                                                { $eq: ["$_id", "$$icon"] }
                                                            ]
                                                    }
                                                }
                                            },
                                            { $project: { link: 1 } }
                                        ],
                                        as: "icon"

                                    },
                                },
                                { $unwind: { path: "$icon" } },

                            ],
                            as: "vehicleType"
                        }
                    },
                    {
                        $unwind: { path: "$vehicleType", preserveNullAndEmptyArrays: true },
                    },
                    { $limit: limit },
                    { $project: { _id: 1, name: 1, onlineStatus: 1, userLocation: 1, firebaseTokens: 1, angle: 1, vehicle: "$vehicleType", vehicleType: { $cond: { if: "$vehicleType", then: "$vehicleType.vehicle", else: null } } } }
                ], (err, resdata) => {
                    if (err) {
                        console.log("check--errr-", err)
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        //console.log("check---", resdata)
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                });
        } catch (error) {
            console.log("nearByDrivers", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    requestNearByDrivers: async (req, res) => {
        try {
            let data = req.body;
            let newquery = {}
            data.vehicleType = data.vehicleType.map(vehicle => ObjectId(vehicle));
            if (data.driverid && data.driverid.length) {
                data.driverid = data.driverid.map(userid => ObjectId(userid));
                data.query._id = { $in: data.driverid }
            }
            data.query.store = ObjectId(data.query.store);

            let source = { type: "Point", coordinates: [Number(data.source.lng), Number(data.source.lat)] };
            if (data.vehicleType && data.vehicleType.length) {
                newquery = {
                    'vehicles.vehicleType': { $in: data.vehicleType }
                }
            }
            User.aggregate(
                [
                    {
                        "$geoNear": {
                            "near": source,
                            "distanceField": "distance",
                            key: "userLocation",
                            "spherical": true,
                            "maxDistance": data.maxDistance,
                            query: data.query
                        }
                    },
                    {
                        $lookup: {
                            from: "vehicles",
                            localField: "vehicle",
                            foreignField: "_id",
                            as: "vehicles"
                        }
                    },
                    { $unwind: { path: '$vehicles', "preserveNullAndEmptyArrays": true } },
                    {
                        $match: newquery
                    },
                    { $sort: { distance: 1 } },
                    { $limit: data.limit },
                    { $project: { _id: 1, name: 1, onlineStatus: 1, userLocation: 1, distance: 1, "vehicles.vehicleType": 1, firebaseTokens: 1 } }
                ], async (err, resdata) => {
                    if (err) {
                        console.log("err", err);
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                });
        } catch (error) {
            console.log("nearByDrivers", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    sendRequestToNearByDrivers: async (req, res) => {
        try {
            let store = req.store;
            let data = req.body;
            data.vehicleType = data.vehicleType.map(vehicle => ObjectId(vehicle));
            let query = {};
            if (data.vehicleType && data.vehicleType.length) {
                query = helper.generateSendRequestQuery(data);
            }
            if (data.vehicleTypeQuery) {
                query = { ...query, ...data.vehicleTypeQuery };
            }
            if (data.query.store) {
                data.query.store = ObjectId(data.query.store);
            }
            if (data.query._id) {
                data.query._id = ObjectId(data.query._id);
            }
            let source = { type: "Point", coordinates: [Number(data.source.lng), Number(data.source.lat)] };
            console.log("source----", JSON.stringify(source))
            console.log("data.query----", JSON.stringify(data.query))
            console.log("query----", JSON.stringify(query))
            User.aggregate(
                [
                    {
                        "$geoNear": {
                            "near": source,
                            "distanceField": "distance",
                            key: "userLocation",
                            "spherical": true,
                            "maxDistance": data.maxDistance,
                            query: data.query,
                        }
                    },
                    {
                        $lookup: {
                            from: "vehicles",
                            localField: "vehicle",
                            foreignField: "_id",
                            as: "vehicles"
                        }
                    },
                    {
                        $lookup: {
                            from: "vehicletypes",
                            localField: "vehicles.vehicleType",
                            foreignField: "_id",
                            as: "vehicleType"
                        }
                    },
                    { $unwind: '$vehicles' },
                    {
                        $match: query
                    },
                    { $sort: { distance: 1 } },
                    { $limit: data.limit ? data.limit : 10 },
                    { $project: { _id: 1, name: 1, onlineStatus: 1, userLocation: 1, distance: 1, "vehicles.vehicleType": 1, firebaseTokens: 1 } }
                ], async (err, resdata) => {
                    if (err) {
                        console.log("err", err);
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                        //console.log("resdata:==>", resdata);
                        if (data.rideType == "pool") {
                            resdata = await module.exports.poolTrips(store, resdata, data.orderId, data.maxDistance);
                            // console.log("resdata:==>", resdata);
                            deliveryRequest.afterSendRequest(store, resdata, data.orderId);

                        } else {
                            deliveryRequest.afterSendRequest(store, resdata, data.orderId);

                        }
                        //deliveryRequest.afterSendRequest(store, resdata, data.orderId);
                    }
                });
        } catch (error) {
            console.log("nearByDrivers", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    sendRequestToNearByDriversWithPriceSet: async (req, res) => {
        try {
            let store = req.store;
            let data = req.body;
            data.vehicleType = data.vehicleType.map(vehicle => ObjectId(vehicle));
            let query = {};
            if (data.vehicleType && data.vehicleType.length) {
                query = helper.generateSendRequestQuery(data);
            }
            if (data.vehicleTypeQuery) {
                query = { ...query, ...data.vehicleTypeQuery };
            }
            if (data.query.store) {
                data.query.store = ObjectId(data.query.store);
            }

            if (data.query._id) {
                data.query._id = ObjectId(data.query._id);
            }
            let source = { type: "Point", coordinates: [Number(data.source.lng), Number(data.source.lat)] };
            User.aggregate(
                [
                    {
                        "$geoNear": {
                            "near": source,
                            "distanceField": "distance",
                            key: "userLocation",
                            "spherical": true,
                            "maxDistance": data.maxDistance,
                            query: data.query,
                        }
                    },
                    {
                        $lookup: {
                            from: "vehicles",
                            localField: "vehicle",
                            foreignField: "_id",
                            as: "vehicles"
                        }
                    },
                    {
                        $lookup: {
                            from: "vehicletypes",
                            localField: "vehicles.vehicleType",
                            foreignField: "_id",
                            as: "vehicleType"
                        }
                    },
                    { $unwind: '$vehicles' },
                    {
                        $match: query
                    },
                    { $sort: { distance: 1 } },
                    { $limit: data.limit ? data.limit : 10 },
                    { $project: { _id: 1, name: 1, onlineStatus: 1, userLocation: 1, distance: 1, "vehicles": 1, firebaseTokens: 1 } }
                ], async (err, resdata) => {
                    if (err) {
                        console.log("err", err);
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                        deliveryRequest.setPriceafterSendRequest(store, resdata, data.orderId);
                    }
                });
        } catch (error) {
            console.log("nearByDrivers", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    poolTrips: async (store, resdata, orderId, maxDistance) => {
        try {

            const getOrder = await Order.findById(orderId);
            let radius = maxDistance || 10;
            await Promise.all(resdata.map(async element => {
                let getPoolTrips = await Order.getDriverPoolTrips(ObjectId(element._id));

                console.log("getPoolTrips:===>", getPoolTrips);
                getPoolTrips = getPoolTrips[0];
                let checkLocation;
                let availableSeats;
                let point = getOrder.pickUp.location.coordinates;
                if (getPoolTrips) {
                    let lineStart = element.userLocation.coordinates;
                    let lineEnd = getPoolTrips.dropOff.location.coordinates;
                    checkLocation = helper.isPointInLine(point, lineStart, lineEnd);
                    var checkPoint = helper.isPointWithinRadius(point, element.userLocation.coordinates, radius);
                    console.log("checkPoint", checkPoint);
                    console.log("checkLocation===>", checkLocation);

                    availableSeats = getOrder.vehicleType.maxPersons - getPoolTrips.bookedSeat;
                    if ((checkLocation || checkPoint) && getOrder.noOfSeats <= availableSeats) {
                        element["isAvailableCarPoolDriver"] = true;
                    } else {
                        element["isAvailableCarPoolDriver"] = false;
                    }

                } else {
                    availableSeats = getOrder.vehicleType.maxPersons;
                    if (getOrder.noOfSeats <= availableSeats) {
                        element["isAvailableCarPoolDriver"] = true;
                    } else {
                        element["isAvailableCarPoolDriver"] = false;
                    }
                }

                console.log("availableSeats===>", availableSeats);
                console.log("noOfSeats==>", getOrder.noOfSeats);

            }));
            return resdata.filter(i => i.isAvailableCarPoolDriver == true);

        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
        }
    },
    getDriverRequest: async (req, res) => {
        try {
            let store = req.store;
            let user = req.user;
            Order.getDriverRequest(user._id, async (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("getDriverRequest", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getDriverRequestNew: async (req, res) => {
        try {
            let store = req.store;
            let user = req.user;
            Order.getDriverRequestNew(user._id, async (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("getDriverRequest", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getDriverOrderDetails: async (req, res) => {
        try {
            let id = req.params._id;
            let store = req.store;
            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            Order.getOrderByIdForDriver(id, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    //rating
                    let reviews = {
                        customerToVendor: null,
                        customerToDriver: null,
                        driverToCustomer: null
                    };

                    let Rating = await Review.aggregate([
                        { $match: { order: ObjectId(resdata._id) } },
                        { $group: { _id: '$order', reviews: { $push: "$$ROOT" } } }
                    ]);

                    if (Rating.length > 0) {

                        if (Rating[0].reviews.length > 0) {

                            let getReviews = Rating[0].reviews;
                            // let customerToVendor = getReviews.filter(element => {
                            //     return (element.reviewed_by.toString() === resdata.user._id.toString()) && (element.reviewed_to.toString() === (resdata.vendor && resdata.vendor._id.toString()))
                            // });

                            // if (customerToVendor.length > 0) {
                            //     reviews.customerToVendor = customerToVendor[0];
                            // }

                            if (resdata.driver) {
                                let customerToDriver = getReviews.filter(element => {
                                    return element.reviewed_by.toString() === resdata.user._id.toString() && element.reviewed_to.toString() === resdata.driver._id.toString()
                                });

                                if (customerToDriver.length > 0) {
                                    reviews.customerToDriver = customerToDriver[0];
                                }

                                let driverToCustomer = getReviews.filter(element => {
                                    return element.reviewed_by.toString() === resdata.driver._id.toString() && element.reviewed_to.toString() === resdata.user._id.toString()
                                });

                                if (driverToCustomer.length > 0) {
                                    reviews.driverToCustomer = driverToCustomer[0];
                                }
                            }
                        }
                    }

                    if (resdata.rideType == "pool" && ["confirmed", "inroute"].includes(resdata.orderStatus)) {
                        let getPoolTrips = await sortDriverPoolTrips(req.user._id, req.user.userLocation, store);
                        if (getPoolTrips.length) {
                            getPoolTrips = helper.getFields(getPoolTrips, "wayPoints");
                            // console.log(getPoolTrips)
                            if (getPoolTrips.length > 1) {
                                resdata.set("endWayPoint", getPoolTrips[getPoolTrips.length - 1], { strict: false });
                                getPoolTrips.pop();
                                resdata.set("wayPoints", getPoolTrips, { strict: false });
                            } else {
                                resdata.set("endWayPoint", getPoolTrips[0], { strict: false });
                                resdata.set("wayPoints", [], { strict: false });
                            }
                        }
                    }
                    let selectedPaymentMethod = resdata.paymentMethod;
                    if (!["cod", "wallet", "cardOnDelivery"].includes(resdata.paymentMethod)) {
                        const getCard = await Card.getCardByIdAsync(resdata.paymentSourceRef);
                        selectedPaymentMethod = 'Card XXXXXX' + getCard.last4digit;
                    }
                    resdata.set("selectedPaymentMethod", selectedPaymentMethod, { strict: false });
                    resdata.set("reviews", reviews, { strict: false });

                    res.json(helper.showSuccessResponse('ORDER_DETAIL', resdata));
                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    acceptRequestMiddleware: async (req, res) => {
        try {

        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    acceptRequestByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            data.driver = user._id;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.findById(data._id, 'customOrderId user rideType driver isDriverAssign scheduledType vehicleType orderTotal subTotal orderStatus storeType paymentMethod paymentSourceRef isScheduleOrderAssign')
                .populate({ path: "storeType", select: "storeType paymentSettings" })
                .populate("user", "wallet")
                .exec();

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            if (getOrder.isDriverAssign && !getOrder.isScheduleOrderAssign) {
                return res.json(helper.showValidationErrorResponse('ALREADY_ASSIGNED'));
            }

            if (getOrder.orderStatus === "cancelled" || getOrder.orderStatus === "archived") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            }
            if (getOrder.rideType != "pool" && user.onlineStatus != "online" && getOrder.isScheduleOrderAssign == false) {
                return res.json(helper.showValidationErrorResponse('UNABLE_TO_ACCEPT'));
            }

            data.date_driver_confirmed_utc = new Date();
            data.isDriverAssign = true;

            if (["TAXI", "PICKUPDROP", "SERVICEPROVIDER"].includes(getOrder.storeType.storeType)) {
                data.isScheduleProcess = getOrder.scheduledType === "now" ? true : false;
                data.orderStatus = "confirmed";
            }

            data.driverVehicle = user.vehicle;
            if (getOrder.isScheduleOrderAssign == true) {
                data.oldDriver = getOrder.driver;
                data.isNewDriverAssign = true;
            }
            if (getOrder.scheduledType === "now" || !["TAXI", "PICKUPDROP", "SERVICEPROVIDER"].includes(getOrder.storeType.storeType)) {
                let onlineStatus = "pickupInroute";
                // if (getOrder.rideType && getOrder.rideType === "pool") {
                //     //onlineStatus = "onPoolTrip";
                // }
                let updateStatus = await User.findOneAndUpdate({ _id: ObjectId(data.driver) }, { onlineStatus: onlineStatus, currentOrderId: getOrder._id }, { "new": true });
                await User.findByIdAndUpdate(getOrder.user, { currentOrderId: getOrder._id });
            }
            data.driverStatus = "pickupInroute";
            data.requestStatus = "accepted";
            if (helperFunc.isEnablePrePayment(getOrder)) {
                getOrder.set("driver", user, { strict: false });
                module.exports.completeCustomerPayment(store, data, getOrder, async (response) => {
                    if (!response.status) {
                        return res.json(helper.showValidationErrorResponse(response.error));
                    } else {
                        data = { ...data, ...response };
                        Order.updateOrderDriverNew(data, async (err, resdata) => {
                            if (err) {
                                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));
                                if (resdata.isScheduleOrderAssign) {
                                    deliveryRequest.afterOrderAssign(store, resdata._id)
                                } else {
                                    deliveryRequest.afterDriverAcceptRequest(store, resdata);
                                    scheduleRideReminderAgenda(resdata);
                                }
                            }
                        });
                    }
                });
            } else {
                Order.updateOrderDriverNew(data, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));
                        if (resdata.isScheduleOrderAssign) {
                            deliveryRequest.afterOrderAssign(store, resdata._id)
                        } else {
                            deliveryRequest.afterDriverAcceptRequest(store, resdata);
                            scheduleRideReminderAgenda(resdata);
                        }
                    }
                });
            }
        } catch (error) {
            console.log("acceptRequestByDriver err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    rejectRequestByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsync(data._id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            let nearByTempDrivers = getOrder.nearByTempDrivers.filter(ele => {
                return ele.toString() != user._id.toString();
            });
            let update = { $addToSet: { driverDeclineRequest: user._id }, nearByTempDrivers }
            let resdata = await Order.findOneAndUpdate({ _id: data._id }, update, { new: true });

            deliveryRequest.afterDriverRejectRequest(store, getOrder, user);

            res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));

        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    driverArrivedAtCustomerLocation: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            data.driver = user._id;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsync(data._id);

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }

            if (getOrder.orderStatus === "cancelled" || getOrder.orderStatus === "archived") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            }
            if (getOrder.rideType == "pool")
                data.driverStatus = "pickupArrived";

            data.date_driver_arrived_utc = new Date();
            data.isDriverArrivedAtPickup = true;
            let updateStatus = await User.findOneAndUpdate({ _id: ObjectId(getOrder.driver._id) }, { onlineStatus: "pickupArrived" }, { "new": true });

            Order.updateOrderDriverNew(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));
                    deliveryRequest.afterDriverArrivedRequest(store, resdata);
                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    tripScheduledStartedByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            data.driver = user._id;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (user.onlineStatus != "online") {
                return res.json(helper.showValidationErrorResponse('UNABLE TO START'));
            }
            const getOrder = await Order.findById(data._id, 'user storeType otp')
                .populate({ path: 'storeType', select: "storeType otpSettings" })
                .exec();

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }

            data.isScheduleProcess = true;
            data.driverVehicle = user.vehicle;

            let updateStatus = await User.findOneAndUpdate({ _id: ObjectId(data.driver) }, { onlineStatus: "pickupInroute", currentOrderId: getOrder._id }, { "new": true });
            await User.findByIdAndUpdate(getOrder.user, { currentOrderId: getOrder._id });

            Order.updateOrderDriverNew(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));
                    deliveryRequest.afterDriverScheduleStartedRequest(store, resdata);

                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    tripStartedByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            data.driver = user._id;
            console.log("data:==>", data)
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.findById(data._id, "rideType driver otp orderStatus storeType vehicleType orderTotal subTotal paymentMethod paymentSourceRef user")
                .populate({ path: 'storeType', select: "storeType otpSettings paymentSettings" })
                .populate("user", "wallet")
                .exec();

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }

            if (getOrder.storeType.storeType === "TAXI" || getOrder.storeType.storeType === "SERVICEPROVIDER" || getOrder.storeType.storeType == "PICKUPDROP") {
                if (getOrder.storeType.otpSettings.status == true) {

                    if (!data.otp) {
                        return res.json(helper.showValidationErrorResponse('OTP_IS_REQUIRED'));
                    }

                    if (data.otp != getOrder.otp) {
                        return res.json(helper.showValidationErrorResponse('OTP_IS_INVALID'));
                    }
                }
                if (getOrder.rideType == "pool")
                    data.driverStatus = "destinationInroute";

            }
            data.orderStatus = "inroute";
            data.date_driver_picked_utc = new Date();

            Order.updateOrderDriverNew(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));
                    deliveryRequest.afterDriverPickedOrTripStartedRequest(store, resdata);
                    await User.findOneAndUpdate({ _id: ObjectId(getOrder.driver) }, { onlineStatus: "destinationInroute" }, { "new": true });

                }
            });

        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    completeCustomerPayment: async (store, data, getOrder, responseCallback) => {
        try {
            // console.log("getOrder:==>", getOrder)
            let responseObj = {};
            let getCalculation = Calculattion.tripFareAndEarningCalculation(getOrder);
            console.log("getCalculation:==>", getCalculation)
            console.log("orderStatus---", getOrder.orderStatus)
            if (["cancelled", "completed", "rejected"].includes(getOrder.orderStatus)) {

                let response = helper.showValidationErrorResponse('NOT_A_VALID_ORDER_STATUS');
                response.message = response.message.replace("{status}", getOrder.orderStatus);
                console.log(response);
                return responseCallback({ status: false, error: response.message });

            }

            data.deliveryBoyEarning = getCalculation.deliveryBoyEarning;
            let paymentSettings
            data.adminEarning = getCalculation.adminEarning;

            responseObj.adminEarning = getCalculation.adminEarning;
            responseObj.deliveryBoyEarning = getCalculation.deliveryBoyEarning;
            // let isPaymentHold = getOrder.storeType.paymentSettings.isPaymentHold || false
            // if (getOrder.storeType.paymentSettings.isPrePayment && getOrder.paymentMethod != "stripe") {
            //     return responseCallback({ status: false, error: "Hold payment support only stripe gateway" });
            // }

            if (getOrder.paymentMethod === "stripe") {

                paymentSettings = utilityFun.filterArray(store.paymentSettings, getOrder.paymentMethod)

                if (store.paymentMode === 'sandbox') {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].sandboxSecretKey : null//store.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].liveSecretKey : null//store.paymentSettings.liveSecretKey;
                }

                let chargeData = {
                    cost: getOrder.orderTotal,
                    paymentSourceRef: getOrder.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: store.currency.code
                }
                paymentMiddleware.paymentByStripe(chargeData, (response) => {
                    if (!response.status) {
                        return responseCallback({ status: false, error: response.message });
                    } else {
                        responseObj.paymentStatus = "success";
                        responseObj.transactionDetails = response.response;
                        return responseCallback({ status: true, ...responseObj });
                    }
                });


            } else if (getOrder.paymentMethod === "paystack") {

                paymentSettings = utilityFun.filterArray(store.paymentSettings, getOrder.paymentMethod)

                if (store.paymentMode === 'sandbox') {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].sandboxSecretKey : null//store.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].liveSecretKey : null//store.paymentSettings.liveSecretKey;
                }

                let chargeData = {
                    cost: getOrder.orderTotal,
                    paymentSourceRef: getOrder.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: store.currency.code
                }
                paymentMiddleware.paymentChargebyPaystack(chargeData, (response) => {
                    if (!response.status) {
                        return responseCallback({ status: false, error: response.message });
                    } else {
                        console.log("response.status paystack", response.response.status)
                        if (response.response.status != "success") {
                            console.log("Payment failed")
                            return responseCallback({ status: false, error: response.response.message });
                            //response.response.gateway_response
                        }
                        else {

                            responseObj.paymentStatus = "success";
                            responseObj.transactionDetails = response.response;
                            return responseCallback({ status: true, ...responseObj });
                        }
                    }
                });

            } else if (getOrder.paymentMethod === "flutterwave") {

                paymentSettings = utilityFun.filterArray(store.paymentSettings, getOrder.paymentMethod)

                if (store.paymentMode === 'sandbox') {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].sandboxSecretKey : null//store.paymentSettings.sandboxSecretKey;
                    data.pubKey = paymentSettings.length ? paymentSettings[0].sandboxPublishabelKey : null;
                    data.enckey = paymentSettings.length ? paymentSettings[0].sandboxEncKey : null;
                } else {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].liveSecretKey : null//store.paymentSettings.liveSecretKey;
                    data.pubKey = paymentSettings.length ? paymentSettings[0].livePublishabelKey : null;
                    data.enckey = paymentSettings.length ? paymentSettings[0].liveEncKey : null
                }

                let chargeData = {
                    cost: getOrder.orderTotal,
                    paymentSourceRef: getOrder.paymentSourceRef,
                    secretKey: data.secretKey,
                    pubKey: data.pubKey,
                    enckey: data.enckey,
                    currency: store.currency.code
                }
                paymentMiddleware.paymentChargebyFlutterwave(chargeData, (response) => {
                    if (!response.status) {
                        responseCallback({ status: false, error: response.message });
                    } else {
                        console.log("response.status delivery", response.response.status)
                        if (response.response.status != "successful") {
                            console.log("Payment failed")
                            return responseCallback({ status: false, error: response.message });
                        }
                        else {
                            responseObj.paymentStatus = "success";
                            responseObj.transactionDetails = response.response;
                            return responseCallback({ status: true, ...responseObj });
                        }
                    }
                });
            } else if (getOrder.paymentMethod === "paypal") {
                paymentSettings = utilityFun.filterArray(store.paymentSettings, 'braintree')
                if (!getOrder.paymentSourceRef) {
                    return responseCallback({ status: false, error: 'PAYMENT_ID_IS_NOT_VALID_OBJECTID' });
                }
                if (!paymentSettings.length) {
                    return responseCallback({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                }
                if (paymentSettings[0].merchantId == null || paymentSettings[0].publicKey == null || paymentSettings[0].privateKey == null) {
                    return responseCallback({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                }

                let chargeData = {
                    cost: getOrder.orderTotal,
                    paymentSourceRef: getOrder.paymentSourceRef,
                    merchantId: paymentSettings[0].merchantId,
                    publicKey: paymentSettings[0].publicKey,
                    privateKey: paymentSettings[0].privateKey,
                    paymentMode: store.paymentMode,
                    currency: store.currency.code
                }

                paymentMiddleware.paymentByBraintreeByCustomer(chargeData, (response) => {
                    if (!response.status) {
                        console.log("erre3", response)
                        return responseCallback({ status: false, error: response.message });
                    } else {
                        responseObj.paymentStatus = "success";
                        responseObj.transactionDetails = response.response;
                        return responseCallback({ status: true, ...responseObj });
                    }
                });

            }
            else if (getOrder.paymentMethod === "wallet") {

                if (!getOrder.user.wallet) {
                    return responseCallback({ status: false, error: 'PLEASE_ADD_MONEY_TO_WALLET' });
                }

                if (getOrder.user.wallet < getOrder.orderTotal) {
                    return responseCallback({ status: false, error: 'WALLET_BALANCE_IS_LOW' });
                }

                let wallet = helper.roundNumber(getOrder.user.wallet - getOrder.orderTotal);

                User.updateUserProfile({ _id: getOrder.user._id, wallet: wallet }, (err, resdata) => {
                    if (err) {
                        console.log("errr-------------wallet2")
                        console.log(err)
                        return responseCallback({ status: false, error: err });

                    } else {
                        responseObj.transactionDetails = {};
                        responseObj.paymentStatus = "success";
                        Transaction.userTransaction(getOrder, getOrder.user, store, getOrder.orderTotal, wallet)
                        return responseCallback({ status: true, ...responseObj });
                    }
                });

            }
            else if (getOrder.paymentMethod === "cod") {
                responseObj.transactionDetails = {};
                responseObj.paymentStatus = "success";
                return responseCallback({ status: true, ...responseObj });
            }
            else {
                responseCallback({ status: false, error: 'INVALID_PAYMENT_METHOD' });
            }
        }
        catch (error) {
            console.log("error-------------")
            console.log(error)
            responseCallback({ status: false, error: "somethingWentWrong" });
        }
    },
    dropOffMultiLocationStartedByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data.countryCode = user.countryCode;
            let store = req.store;

            if (!data.orderId) {
                return res.json(helper.showValidationErrorResponse('OrderId_IS_REQUIRED'));
            }
            if (!data.dropOffId) {
                return res.json(helper.showValidationErrorResponse('DROPOFF_ID_IS_REQUIRED'));

            }
            const getOrder = await dropmultiLocation.findOne({ _id: data.dropOffId, order: data.orderId, status: "pending" })
                .populate({ path: 'order', match: { store: store.storeId, driver: user._id }, select: "user" })
                .exec();

            if (getOrder == null || !getOrder.order) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }
            let query = { _id: data.dropOffId };
            let update = { status: "inroute", date_driver_start_utc: new Date() }
            update.otp = utilityFunc.generateOTP(4);
            dropmultiLocation.updateDropOffLocation(query, update, async (err, resdata) => {
                if (err) {
                    console.log("err----", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata.order, dropOffId: resdata._id }));
                    let customerOrderResponseData = {
                        orderId: resdata.order,
                        type: "dropOffMulti"
                    }
                    //sendCustomOtp(resdata, data, store);
                    socketHelper.singleSocket(getOrder.order.user, "Customer", customerOrderResponseData);

                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    dropOffMultiLocationCompleteByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            console.log("data:==>", data)
            if (!data.orderId) {
                return res.json(helper.showValidationErrorResponse('OrderId_IS_REQUIRED'));
            }
            if (!data.dropOffId) {
                return res.json(helper.showValidationErrorResponse('DROPOFF_ID_IS_REQUIRED'));
            }

            const getOrder = await dropmultiLocation.findOne({ _id: data.dropOffId, order: data.orderId, status: "inroute" })
                .populate({ path: 'order', match: { store: store.storeId, driver: user._id }, select: "user" })
                .exec();

            if (getOrder == null || !getOrder.order) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }
            /* if (!data.otp) {
                 return res.json(helper.showValidationErrorResponse('OTP_IS_REQUIRED'));
             }
 
             if (data.otp != getOrder.otp) {
                 return res.json(helper.showValidationErrorResponse('OTP_IS_INVALID'));
             }*/
            let query = { _id: data.dropOffId };
            let update = { status: "completed" }
            update.date_driver_delivered_utc = new Date();

            dropmultiLocation.updateDropOffLocation(query, update, async (err, resdata) => {
                if (err) {
                    console.log("errr---", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    module.exports.updateMultiMainOrderStatus(resdata);
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: getOrder.order._id, dropOffId: resdata._id }));
                    let customerOrderResponseData = {
                        orderId: getOrder.order._id,
                        type: "dropOffMulti"
                    }
                    socketHelper.singleSocket(getOrder.order.user, "Customer", customerOrderResponseData);

                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    dropOffMultiLocationCancelledByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            //  console.log("body----data", data)

            if (!data.orderId) {
                return res.json(helper.showValidationErrorResponse('OrderId_IS_REQUIRED'));
            }

            if (!data.dropOffId) {
                return res.json(helper.showValidationErrorResponse('DROPOFF_ID_IS_REQUIRED'));
            }
            if (!data.reason) {
                return res.json(helper.showValidationErrorResponse('RESAON_REQUIRED'));
            }

            const getOrder = await dropmultiLocation.findOne({ _id: data.dropOffId, order: data.orderId, status: "inroute" })
                .populate({ path: 'order', match: { store: store.storeId, driver: user._id }, select: "user" })
                .exec();



            //console.log("Order----data", getOrder)

            if (getOrder == null || !getOrder.order) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }

            let query = { _id: data.dropOffId };
            let update = { status: "cancelled", date_driver_cancelled_utc: new Date() };
            dropmultiLocation.updateDropOffLocation(query, update, async (err, resdata) => {
                if (err) {
                    console.log("errr---", err)
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    module.exports.updateMultiMainOrderStatus(resdata);

                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata.order }));
                    let customerOrderResponseData = {
                        orderId: resdata.order,
                        type: "dropOffMulti"
                    }
                    socketHelper.singleSocket(getOrder.order.user, "Customer", customerOrderResponseData);

                    // deliveryRequest.afterDriverCancelledRequest(store, resdata);
                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    completedDriverMiddleware: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getOrder = await Order.findById(data._id, 'isPackageServiceTrip rideType driver orderStatus storeType vehicleType orderTotal subTotal paymentMethod paymentSourceRef user')
                .populate({ path: 'storeType', select: "storeType commission paymentSettings" })
                .populate({ path: 'user', select: "wallet" })
                .populate({ path: 'driver', select: "name commisionType commission freeRideSetting" })
                .exec();

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }
            if (getOrder.rideType == "pool")
                data.driverStatus = "completed";

            data.date_driver_delivered_utc = new Date();
            data.orderStatus = "completed";

            if (["TAXI", "PICKUPDROP"].includes(getOrder.storeType.storeType)) {
                if (helperFunc.isEnablePrePayment(getOrder) || getOrder.isPackageServiceTrip) {
                    data.paymentStatus = 'success';// validatePayment middleware paymentStatus set process and here updating;
                    Order.updateOrderDriverNew(data, async (err, resdata) => {
                        if (err) {
                            console.log(err)
                            return res.json(helper.showValidationErrorResponse(responseCallback.error || "INTERNAL_DB_ERROR"));
                        } else {
                            module.exports.afterTripPayment(store, resdata);
                            await User.findByIdAndUpdate(getOrder.user._id, { currentOrderId: null });
                            return res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));
                        }
                    });
                }
                else {
                    console.log("else  isEnablePrePayment ---")
                    module.exports.tripCompletedByDriver(store, data, getOrder, async (responseCallback) => {
                        if (!responseCallback.status) {
                            console.log("errr--------**", responseCallback)
                            if (getOrder.paymentMethod == "dpo" && ["Too Many Requests"].includes(responseCallback.error)) {
                                getOrder.paymentStatus = 'pending';
                                await getOrder.save();
                            } else {
                                getOrder.paymentStatus = 'pending';
                                await getOrder.save();
                            }
                            return res.json(helper.showValidationErrorResponse(responseCallback.error || "INTERNAL_DB_ERROR"));
                            //res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", responseCallback.error));

                        } else {
                            await User.findByIdAndUpdate(getOrder.user._id, { currentOrderId: null });
                            return res.json(helper.showSuccessResponse('UPDATE_SUCCESS', responseCallback.data));

                        }
                    });

                }

            } else {
                if (["SERVICEPROVIDER"].includes(getOrder.storeType.storeType)) {
                    let getCalculation = Calculattion.tripFareAndEarningCalculation(getOrder);
                    data.deliveryBoyEarning = getCalculation.deliveryBoyEarning;
                    data.adminEarning = getCalculation.adminEarning;
                }
                module.exports.orderCompletedByDriver(store, data, getOrder, async (responseCallback) => {
                    if (!responseCallback.status) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", responseCallback.error));
                    } else {
                        await User.findByIdAndUpdate(getOrder.user._id, { currentOrderId: null });
                        res.json(helper.showSuccessResponse('UPDATE_SUCCESS', responseCallback.data));
                    }
                });
            }
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    tripCompletedByDriver: async (store, data, getOrder, responseCallback) => {
        try {
            let getCalculation = Calculattion.tripFareAndEarningCalculation(getOrder);
            console.log("getCalculation:==>", getCalculation)
            console.log("orderStatus---", getOrder.orderStatus)
            if (["cancelled", "completed", "rejected"].includes(getOrder.orderStatus)) {

                let response = helper.showValidationErrorResponse('NOT_A_VALID_ORDER_STATUS');
                response.message = response.message.replace("{status}", getOrder.orderStatus);
                console.log(response);
                return responseCallback({ status: false, error: response.message });
            }

            data.deliveryBoyEarning = getCalculation.deliveryBoyEarning;
            let paymentSettings;
            data.adminEarning = getCalculation.adminEarning;
            data.orderStatus = "completed";
            data.date_driver_delivered_utc = new Date();

            if (getOrder.paymentMethod === "stripe") {

                paymentSettings = utilityFun.filterArray(store.paymentSettings, getOrder.paymentMethod)

                if (store.paymentMode === 'sandbox') {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].sandboxSecretKey : null;
                } else {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].liveSecretKey : null;
                }

                let chargeData = {
                    cost: getOrder.orderTotal,
                    paymentSourceRef: getOrder.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: store.currency.code
                }

                paymentMiddleware.paymentByStripe(chargeData, (response) => {
                    if (!response.status) {
                        responseCallback({ status: false, error: response.message });
                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        Order.updateOrderDriverNew(data, async (err, resdata) => {
                            if (err) {
                                console.log("errr-------------stripe")
                                console.log(err)
                                responseCallback({ status: false, error: err });
                            } else {
                                responseCallback({ status: true, data: { orderId: resdata._id } });
                                module.exports.afterTripPayment(store, resdata);
                            }
                        });
                    }
                });

            } else if (getOrder.paymentMethod === "paystack") {

                paymentSettings = utilityFun.filterArray(store.paymentSettings, getOrder.paymentMethod)

                if (store.paymentMode === 'sandbox') {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].sandboxSecretKey : null//store.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].liveSecretKey : null//store.paymentSettings.liveSecretKey;
                }

                let chargeData = {
                    cost: getOrder.orderTotal,
                    paymentSourceRef: getOrder.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: store.currency.code
                }
                paymentMiddleware.paymentChargebyPaystack(chargeData, (response) => {
                    if (!response.status) {
                        responseCallback({ status: false, error: response.message });
                    } else {
                        console.log("response.status delivery", response.response.status)
                        if (response.response.status != "success") {
                            console.log("Payment failed")
                            res.json(helper.showStripeErrorResponse(response.response.gateway_response, response.response.status));

                        }
                        else {
                            data.transactionDetails = response.response;
                            data.paymentStatus = "success";
                            Order.updateOrderDriverNew(data, async (err, resdata) => {
                                if (err) {
                                    console.log("errr-------------paystack")
                                    console.log(err)
                                    responseCallback({ status: false, error: err });
                                } else {
                                    responseCallback({ status: true, data: { orderId: resdata._id } });
                                    module.exports.afterTripPayment(store, resdata);
                                }
                            });
                        }
                    }
                });

            } else if (getOrder.paymentMethod === "flutterwave") {

                paymentSettings = utilityFun.filterArray(store.paymentSettings, getOrder.paymentMethod)

                if (store.paymentMode === 'sandbox') {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].sandboxSecretKey : null//store.paymentSettings.sandboxSecretKey;
                    data.pubKey = paymentSettings.length ? paymentSettings[0].sandboxPublishabelKey : null;
                    data.enckey = paymentSettings.length ? paymentSettings[0].sandboxEncKey : null;
                } else {
                    data.secretKey = paymentSettings.length ? paymentSettings[0].liveSecretKey : null//store.paymentSettings.liveSecretKey;
                    data.pubKey = paymentSettings.length ? paymentSettings[0].livePublishabelKey : null;
                    data.enckey = paymentSettings.length ? paymentSettings[0].liveEncKey : null
                }

                let chargeData = {
                    cost: getOrder.orderTotal,
                    paymentSourceRef: getOrder.paymentSourceRef,
                    secretKey: data.secretKey,
                    pubKey: data.pubKey,
                    enckey: data.enckey,
                    currency: store.currency.code
                }
                paymentMiddleware.paymentChargebyFlutterwave(chargeData, (response) => {
                    if (!response.status) {
                        responseCallback({ status: false, error: response.message });
                    } else {
                        console.log("response.status delivery", response.response.status)
                        if (response.response.status != "successful") {
                            console.log("Payment failed")
                            responseCallback(response.response, response.response.status);

                        }
                        else {
                            data.transactionDetails = response.response;
                            data.paymentStatus = "success";
                            Order.updateOrderDriverNew(data, async (err, resdata) => {
                                if (err) {
                                    console.log("errr-------------Flutterwave")
                                    console.log(err)
                                    responseCallback({ status: false, error: err });
                                } else {
                                    responseCallback({ status: true, data: { orderId: resdata._id } });
                                    module.exports.afterTripPayment(store, resdata);
                                }
                            });
                        }
                    }
                });
            } else if (getOrder.paymentMethod === "paypal") {
                paymentSettings = utilityFun.filterArray(store.paymentSettings, 'braintree')
                if (!getOrder.paymentSourceRef) {
                    responseCallback({ status: false, error: 'PAYMENT_ID_IS_NOT_VALID_OBJECTID' });
                }
                if (!paymentSettings.length) {
                    responseCallback({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                }
                if (paymentSettings[0].merchantId == null || paymentSettings[0].publicKey == null || paymentSettings[0].privateKey == null) {
                    responseCallback({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                }

                let chargeData = {
                    cost: getOrder.orderTotal,
                    paymentSourceRef: getOrder.paymentSourceRef,
                    merchantId: paymentSettings[0].merchantId,
                    publicKey: paymentSettings[0].publicKey,
                    privateKey: paymentSettings[0].privateKey,
                    paymentMode: store.paymentMode,
                    currency: store.currency.code
                }

                paymentMiddleware.paymentByBraintreeByCustomer(chargeData, (response) => {
                    if (!response.status) {
                        console.log("erre3", response)
                        responseCallback({ status: false, error: response.message });
                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        Order.updateOrderDriverNew(data, async (err, resdata) => {
                            if (err) {
                                console.log("errr-------------paypal")
                                console.log(err)
                                responseCallback({ status: false, error: err });
                            } else {
                                responseCallback({ status: true, data: { orderId: resdata._id } });
                                module.exports.afterTripPayment(store, resdata);
                            }
                        });
                    }
                });

            } else if (getOrder.paymentMethod === "dpo") {
                paymentSettings = utilityFun.filterArray(store.paymentSettings, getOrder.paymentMethod)
                if (!paymentSettings.length) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (store.paymentMode === 'sandbox') {
                    data.companytoken = paymentSettings[0].companytoken;
                    data.endpoint = paymentSettings[0].endpoint;
                    data.servicetype = paymentSettings[0].servicenumber;
                } else {

                    data.companytoken = paymentSettings[0].livecompanytoken;
                    data.endpoint = paymentSettings[0].liveendpoint;
                    data.servicetype = paymentSettings[0].liveservicenumber;

                }
                if (!data.companytoken) {
                    responseCallback({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                    return;
                }
                if (!data.endpoint) {
                    responseCallback({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                    return;
                }
                if (!data.servicetype) {
                    responseCallback({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                    return;
                }
                let todaydate = Date.now()
                let servicedate = momentz.tz(todaydate, store.timezone).format("YYYY/MM/DD HH:mm")
                chargeData = {
                    companytoken: data.companytoken,
                    currency: store.currency.code,
                    amount: getOrder.orderTotal,
                    endpoint: data.endpoint,
                    servicetype: data.servicetype,
                    servicedescription: "User create service",
                    servicedate: servicedate
                }
                paymentMiddleware.dpoCreatePayment(chargeData, async (response) => {
                    if (!response.status) {
                        responseCallback({ status: false, error: response.message });
                        return;
                    }
                    else {
                        //console.log("response---wallet", response)
                        let carddata = {
                            companytoken: data.companytoken,
                            endpoint: data.endpoint,
                            transactiontoken: response.data.TransToken,
                            paymentSourceRef: getOrder.paymentSourceRef
                        }
                        paymentMiddleware.chargebycard(carddata, async (cdres) => {
                            if (!cdres.status) {
                                let cancelrequest = {
                                    companytoken: data.companytoken,
                                    endpoint: data.endpoint,
                                    transactiontoken: response.data.TransToken
                                }
                                paymentMiddleware.dpoCancelPayment(cancelrequest, async (cancelres) => {
                                    if (!cancelres.status) {
                                        console.log("trip dpo cancel request error  message---", cancelres.message)
                                        //return res.json(helper.showValidationErrorResponse(response.message));
                                    }
                                    else {
                                        console.log("trip dpo request cancelled", cancelres)
                                    }
                                })
                                responseCallback({ status: false, error: cdres.message });
                                return;

                            }
                            else {
                                console.log("trip charge by card data---", cdres)
                                let transactiondta = { transactionId: response.data.TransToken, refundDetails: getOrder.orderTotal + " amount has been creatdited of " + getOrder.customOrderId + " order" }
                                data.transactionDetails = transactiondta
                                data.paymentStatus = "success";
                                Order.updateOrderDriverNew(data, async (err, orderresdata) => {
                                    if (err) {
                                        console.log("errr-------------dpo")
                                        console.log(err)
                                        responseCallback({ status: false, error: err });
                                        return;
                                    } else {
                                        responseCallback({ status: true, data: { orderId: orderresdata._id } });
                                        module.exports.afterTripPayment(store, orderresdata);
                                    }
                                });
                            }
                        })
                    }
                })
            } else if (getOrder.paymentMethod === "wallet") {

                if (!getOrder.user.wallet) {
                    responseCallback({ status: false, error: 'PLEASE_ADD_MONEY_TO_WALLET' });
                }

                if (getOrder.user.wallet < getOrder.orderTotal) {
                    responseCallback({ status: false, error: 'WALLET_BALANCE_IS_LOW' });
                }

                let wallet = helper.roundNumber(getOrder.user.wallet - getOrder.orderTotal);

                User.updateUserProfile({ _id: getOrder.user._id, wallet: wallet }, (err, resdata) => {
                    if (err) {
                        console.log("errr-------------wallet2")
                        console.log(err)
                        responseCallback({ status: false, error: err });
                    } else {
                        data.transactionDetails = {};
                        data.paymentStatus = "success";
                        Order.updateOrderDriverNew(data, async (err, resdata) => {
                            if (err) {
                                console.log("errr-------------wallet")
                                console.log(err)
                                responseCallback({ status: false, error: err });
                            } else {
                                Transaction.userTransaction(resdata, getOrder.user, store, getOrder.orderTotal, wallet)
                                responseCallback({ status: true, data: { orderId: resdata._id } });
                                module.exports.afterTripPayment(store, resdata);
                            }
                        });
                    }
                });

            } else if (getOrder.paymentMethod === "cod") {

                data.transactionDetails = {};
                data.paymentStatus = "success";
                Order.updateOrderDriverNew(data, async (err, resdata) => {
                    if (err) {
                        console.log("errr-------------cod")
                        console.log(err)
                        responseCallback({ status: false, error: err });
                    } else {
                        responseCallback({ status: true, data: { orderId: resdata._id } });
                        module.exports.afterTripPayment(store, resdata);
                    }
                });
            } else {
                responseCallback({ status: false, error: 'INVALID_PAYMENT_METHOD' });
            }
        }
        catch (error) {
            console.log("error-------------")
            console.log(error)
            responseCallback({ status: false, error: error });
        }
    },

    afterTripPayment: async (store, resdata) => {
        deliveryRequest.restProcessAfterCompletion(store, resdata);
        let isthereAnyPoolTrips = await Order.getDriverCurrentPoolTrips(resdata.driver._id);
        if ((resdata.rideType != "pool") || (!isthereAnyPoolTrips.length)) {
            let updtateStatus = await User.findOneAndUpdate({ _id: ObjectId(resdata.driver._id) }, { onlineStatus: 'online' }, { "new": true });
        }
        if (isthereAnyPoolTrips.length === 1) {
            await User.updateOne({ _id: ObjectId(resdata.driver._id) }, { onlineStatus: isthereAnyPoolTrips[0].driverStatus || "online" });
        };
        //validation deliveryBoy free ride setting....
        if (helper.isValidHidethings(store, "showHideFreeRideSetting")) {
            let freeRideSetting = resdata.driver.freeRideSetting;
            if (freeRideSetting && freeRideSetting.status) {
                let remainFreeRide = freeRideSetting.remainFreeRide ? freeRideSetting.remainFreeRide - 1 : freeRideSetting.numOfRide - 1;
                let update = {
                    "freeRideSetting.remainFreeRide": remainFreeRide
                };
                if (!remainFreeRide) {
                    update["freeRideSetting.status"] = false;
                    freeRideCompletedNotification(resdata.driver._id);
                };
                await User.updateOne({ _id: ObjectId(resdata.driver._id) }, update);
            }

        };

        deliveryRequest.afterDriverDeliveredRequest(store, resdata);
    },

    orderCompletedByDriver: (store, data, getOrder, responseCallback) => {
        data.orderStatus = "completed";
        data.date_driver_delivered_utc = new Date();
        Order.updateOrderDriverNew(data, async (err, resdata) => {
            if (err) {
                console.log("err--------")
                console.log(err)
                responseCallback({ status: false, error: err });
            } else {
                responseCallback({ status: true, data: { orderId: resdata._id } });
                deliveryRequest.restProcessAfterCompletion(store, resdata);
                let updateStatus = await User.findOneAndUpdate({ _id: ObjectId(resdata.driver._id) }, { onlineStatus: 'online' }, { "new": true });
                deliveryRequest.afterDriverDeliveredRequest(store, resdata);
            }
        });
    },

    tripCancelledByDriver: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            console.log("data:====>", data)
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsync(data._id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            data.orderStatus = "cancelled";
            data.date_driver_cancelled_utc = new Date();
            let isthereAnyPoolTrips = await Order.getDriverCurrentPoolTrips(getOrder.driver._id);
            if (!isthereAnyPoolTrips.length) {
                let updateStatus = await User.findOneAndUpdate({ _id: ObjectId(getOrder.driver._id) }, { onlineStatus: 'online' }, { "new": true });

            }
            if (getOrder.paymentStatus == "success")
                refoundPayment.refundamountTouser(getOrder);

            Order.updateOrderDriverNew(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));
                    deliveryRequest.afterDriverCancelledRequest(store, resdata);
                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    assignDriverFromBirdEyeView: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsync(data._id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            if (!data.driverId) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }

            let getUser = await User.findById(data.driverId, 'onlineStatus');

            if (getUser === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_DRIVER_ID'));
            }

            if (getUser.onlineStatus === 'pickupInroute' || getUser.onlineStatus === 'pickupArrived' || getUser.onlineStatus === 'destinationInroute') {
                return res.json(helper.showValidationErrorResponse('DRIVER_IS_BUSY'));
            }

            if (getUser.onlineStatus === 'offline') {
                return res.json(helper.showValidationErrorResponse('DRIVER_IS_OFFLINE'));
            }

            data.date_driver_confirmed_utc = new Date();
            data.isDriverAssign = true;
            data.driver = data.driverId
            let updateStatus = await User.findOneAndUpdate({ _id: ObjectId(data.driverId) }, { onlineStatus: "pickupInroute" }, { "new": true });

            Order.updateOrderDriverNew(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let orderResponseData = {
                        success: true,
                        driverStatus: resdata.orderStatus,
                        orderStatus: resdata.orderStatus,
                        orderId: resdata._id,
                        type: resdata.orderStatus,
                        driverLocation: resdata.driver.userLocation
                    }
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', orderResponseData));
                    deliveryRequest.afterDriverAcceptRequest(resdata);
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    feedbackByDriverToCustomer: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data.reviewed_by = user._id;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_IS_REQUIRED'));
            }

            data.order = data._id;

            const getOrder = await Order.getOrderByIdAsync(data.order);

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_IS_NOT_VALID'));
            }

            data.reviewed_to = getOrder.user._id;

            if (!data.rating) {
                return res.json(helper.showValidationErrorResponse('REVIEW_RATING_IS_REQUIRED'));
            }

            delete data._id;

            const getUser = await User.getUserByIdAsync(data.reviewed_to);

            Review.addReview(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    //update product avg rating
                    module.exports.updateUserAvgRating(getUser, resdata._id);
                    res.json(helper.showSuccessResponse('ORDER_RATING_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateUserAvgRating: async (user, reviewId) => {

        Review.aggregate([
            {
                "$match": {
                    $and: [{ rating: { "$exists": true, "$gt": 0 } },
                    { reviewed_to: ObjectId(user._id) }
                    ]
                }
            },
            { $group: { _id: "$reviewed_to", average_rating: { $avg: "$rating" } } }
        ]
            , (err, resdata) => {
                if (err) {
                    console.log("error in finding product avg,rating!");
                } else {

                    let reviewDetails = {
                        _id: user._id,
                        reviewId: reviewId,
                        avgRating: helper.roundNumber(resdata[0].average_rating),
                        reviewCount: user.reviewCount + 1
                    }
                    User.updateReviewDetails(reviewDetails, (err, result) => {
                        if (err) {
                            console.log("Unable to update review!")
                        } else {
                            console.log("Product rating updated!")
                        }
                    });
                }
            });
    },

    getDriverUpcomingOrderList: async (req, res) => {
        try {
            const data = req.body;
            let user = req.user;
            const store = req.store;
            const storeTypes = await storeType.find({ status: 'active', store: store.storeId }, 'label storeType');
            if (storeTypes.length > 0) {
                await Promise.all(storeTypes.map(stt => {
                    stt.set('isSelected', false, { strict: false });
                }));
            }
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            const storeTypeId = data.storeTypeId || null;
            let obj = {};
            if (storeTypeId) {
                obj.storeType = ObjectId(storeTypeId);
            }
            obj.driver = ObjectId(user._id);
            obj.orderStatus = { $in: ["pending", "confirmed", "packed", "inroute", "inprocess"] };

            let count = await Order.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let totalcount = count.length > 0 ? count[0].count : 0;
            Order.getOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    await Promise.all(resdata.map(async element => {
                        if (element.vendorDetails && element.vendorDetails.profileImage) {
                            element.vendorDetails.profileImage = await File.getFileByIdAsync(element.vendorDetails.profileImage);
                        }
                    }));
                    let resData = helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount)
                    resData['totaPage'] = Math.ceil(totalcount / pageSize);
                    resData['storeTypes'] = storeTypes;
                    return res.json(resData);
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getDriverPastOrderList: async (req, res) => {
        try {
            const data = req.body;
            let user = req.user;
            const store = req.store;
            const storeTypes = await storeType.find({ status: 'active', store: store.storeId }, 'label storeType');
            if (storeTypes.length > 0) {
                await Promise.all(storeTypes.map(stt => {
                    stt.set('isSelected', false, { strict: false });
                }));
            }
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            const storeTypeId = data.storeTypeId || null;
            let obj = {};
            obj.driver = ObjectId(user._id);
            if (storeTypeId) {
                obj.storeType = ObjectId(storeTypeId);
            }
            obj.orderStatus = { $in: ["completed", "cancelled", "rejected"] };

            let count = await Order.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let totalcount = count.length > 0 ? count[0].count : 0;
            Order.getOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    await Promise.all(resdata.map(async element => {
                        if (element.vendorDetails) {
                            if (element.vendorDetails.profileImage) {
                                element.vendorDetails.profileImage = await File.getFileByIdAsync(element.vendorDetails.profileImage);
                            }
                        }
                    }));
                    let resData = helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount)
                    resData['totaPage'] = Math.ceil(totalcount / pageSize);
                    resData['storeTypes'] = storeTypes;
                    res.json(resData);
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    createrequest: async (req, res) => {
        try {
            let storeTypeDetails = req.storeTypeDetails;
            let data = req.body;
            if (data.paymentMethod === "cod") {
                if (storeTyp.includes(storeTypeDetails.storeType)) {
                    if (!data.hasOwnProperty("rideType")) {
                        return res.json(helper.showValidationErrorResponse('RIDE TYPE REQUIRED'));
                    }
                    if (data.rideType != "rideHailing") {
                        return res.json(helper.showValidationErrorResponse('INVALID RIDE_TYPE'));
                    }
                    module.exports.ridebooking(req, res)
                }
                else {
                    //module.exports.otherbooking(req, res)
                    return res.json(helper.showValidationErrorResponse('INVALID_TRIP'));
                }
            }
            else {
                return res.json(helper.showValidationErrorResponse('INVALID_PAYMENT_METHOD'));
            }
        } catch (error) {
            console.log(error)
            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", error));
        }
    },
    ridebooking: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let user = req.user
            let storeTypeDetails = req.storeTypeDetails;
            data.driver = user._id
            data.vehicleType = user.vehicle.vehicleType
            data.store = store.storeId;
            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('USER NAME REQUIRED'));
            }
            if (!data.mobileNumber) {
                return res.json(helper.showValidationErrorResponse('USER PHONE NUMBER REQUIRED'));
            }
            if (!data.countryCode) {
                return res.json(helper.showValidationErrorResponse('countryCode_IS_REQUIRED'));
            }
            let customer = await module.exports.adduser(data)
            data.user = customer._id
            if (!data.user) {
                return res.json(helper.showValidationErrorResponse('USER NOT ADDED'));
            }
            console.log("data===>", data)
            data.otp = utilityFunc.generateOTP(4);
            data.customOrderId = utilityFunc.generatorRandomNumber(6).toLowerCase();
            data.storeType = storeTypeDetails._id;
            data.googleMapKey = store.googleMapKey.server;
            data.timezone = store.timezone;
            data.paymentMode = store.paymentMode;
            data.currency = store.currency.code;
            data.orderTotal = data.estimatedCost ? Number(data.estimatedCost) : 0;
            data.distance = data.distance ? Number(data.distance) : 0;
            data.duration = data.estimatedTime ? Number(data.estimatedTime) : 0;

            data.subTotal = data.orderTotal;

            let vehicleTypeData = await tripServices.getVehicleById(data.vehicleType._id)
            if (!vehicleTypeData) throw new Error("VEHICLE_TYPE_NOT_FOUND");

            data.vehicleType = vehicleTypeData;
            data.orderStatus = "inroute";
            data.paymentStatus = "pending";
            data.pickUp.location = { type: "Point", coordinates: [data.pickUp.location.lng, data.pickUp.location.lat] };
            data.dropOff.location = { type: "Point", coordinates: [data.dropOff.location.lng, data.dropOff.location.lat] };

            data.date_created_utc = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');

            //console.log("create trip Data", data);
            let onlineStatus = "destinationInroute";
            data.date_driver_confirmed_utc = new Date();
            data.isDriverAssign = true;
            tripServices.addOrder(data, async (err, resdata) => {
                if (err) {
                    utilityFunc.sendErrorResponse(err, res);
                } else {
                    let orderResponseData = {
                        success: true,
                        driverStatus: resdata.orderStatus,
                        orderStatus: resdata.orderStatus,
                        orderId: resdata._id,
                        type: resdata.orderStatus,
                        driverLocation: resdata.driver.userLocation
                    }
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', orderResponseData));
                    let updateStatus = await User.findOneAndUpdate({ _id: ObjectId(data.driver) }, { onlineStatus: onlineStatus, currentOrderId: resdata._id }, { "new": true });
                    deliveryRequest.afterDriverAcceptRequest(store, resdata);
                    //deliveryRequest.DriverAcceptRequest(resdata);
                    //utilityFunc.sendSuccessResponse({ data: { orderId: resdata._id } }, res);
                }
            });
        } catch (error) {
            console.log(error)
            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", error));
        }
    },
    adduser: (data) => {
        return new Promise(async (resolve, reject) => {
            try {
                const getUser = await User.findOne({ store: ObjectId(data.store), mobileNumber: data.mobileNumber, role: "USER", status: { $ne: "archived" } });
                if (getUser != null) {
                    return resolve(getUser)
                }
                data.status = "active";
                data.role = "USER";
                data.tokens = [];

                if (data.firebaseToken) {
                    data.firebaseTokens = [{ token: data.firebaseToken }];
                }

                User.addUserByMobile(data, (err, user) => {
                    if (err) {
                        console.log("dber", err);
                        reject({})
                    } else {
                        //emailService.userRegisterEmail(user);
                        resolve(user)
                    }
                });
            } catch (error) {
                console.log("error in add user===", error)
                reject({})
            }
        })
    },
    bidRaiseByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data.driver = user._id;
            let store = req.store;
            console.log("data:===>", data)
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            if (!data.amount) {
                return res.json(helper.showValidationErrorResponse('AMOUNT_IS_REQUIRED'));
            }
            const getOrder = await Order.getOrderByIdAsync(data._id);
            let bidSettings = getOrder.storeType.bidSettings;

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }
            if (getOrder.isDriverAssign) {
                return res.json(helper.showValidationErrorResponse('ALREADY_ASSIGNED'));
            }

            if (getOrder.orderStatus === "cancelled" || getOrder.orderStatus === "archived") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            }
            if (!data.location) {
                return res.json(helper.showValidationErrorResponse('LOCATION_IS_REQUIRED'));
            }

            let checkBidAlreadyExists = await bidModel.findOne({ order: data._id, status: "pending", driver: user._id });
            if (checkBidAlreadyExists) {
                return res.json(helper.showValidationErrorResponse('ALREADY_RAISED_BID'));
            }
            let getAvgBidAmount = helper.roundNumber((getOrder.orderTotal * bidSettings.percentage) / 100);
            getAvgBidAmount = helper.roundNumber(getOrder.orderTotal) - getAvgBidAmount;

            if (data.amount < getAvgBidAmount) {
                let resdata = helper.showValidationErrorResponse('BID_AMOUNT_IS_INVALID')
                resdata.message += " " + Math.ceil(getAvgBidAmount)
                return res.json(helper.showValidationErrorResponse(resdata));
            }
            data.amount = Number(data.amount).toFixed(2);

            data.order = data._id;
            data.user = getOrder.user._id;
            data.date_created_utc = new Date();

            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, store.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');

            let pickUp_location = {
                "lat": getOrder.pickUp.location.coordinates[1],
                "lng": getOrder.pickUp.location.coordinates[0]
            };
            let dropOff_location = data.location;
            const getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(pickUp_location, dropOff_location, store.googleMapKey.server);
            console.log("getDistanceAndTime----", getDistanceAndTime)
            data.ETA = parseInt(getDistanceAndTime.duration);
            data.EDA = parseInt(getDistanceAndTime.distance);
            data.date_created_local = moment.utc().local().format();
            data.status = "pending"
            delete data._id;
            bidModel.bidCreate(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                }

                let orderData = await Order.updateBidId(resdata);
                res.json(helper.showSuccessResponse("BID_AMOUNT_RAISE", orderData))
                let runSetupTime = `in 30 seconds`;
                agenda.schedule(runSetupTime, 'bid request status', { bidId: resdata._id });
                socketHelper.singleSocket(getOrder.user._id, "Customer", { bidInfo: resdata, orderId: orderData._id, type: "bidRequestRaised" });
            })

        } catch (error) {
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }


    },
    sendRequestToUser: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data.driver = user._id;
            let store = req.store;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            if (!data.amount) {
                return res.json(helper.showValidationErrorResponse('AMOUNT_IS_REQUIRED'));
            }
            const getOrder = await Order.getOrderByIdAsync(data._id);
            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }
            if (getOrder.isDriverAssign) {
                return res.json(helper.showValidationErrorResponse('ALREADY_ASSIGNED'));
            }
            if (getOrder.orderStatus === "cancelled" || getOrder.orderStatus === "archived") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            }
            let checkBidAlreadyExists = await bidModel.findOne({ order: data._id, status: "pending", driver: user._id });
            if (checkBidAlreadyExists) {
                return res.json(helper.showValidationErrorResponse('ALREADY_RAISED_BID'));
            }
            let tripOrder = await Order.getOrderByIdWithtripFare(data._id, data.driver)
            let tripAmount = tripOrder ? tripOrder.tripFare[0].amount : 0
            if (tripAmount != data.amount) {
                return res.json(helper.showValidationErrorResponse('INVALID_AMOUNT'));
            }
            data.amount = Number(tripAmount).toFixed(2);
            data.order = data._id;
            data.pricePerUnitDistance = tripOrder.tripFare[0].pricePerUnitDistance
            data.pricePerUnitTime = tripOrder.tripFare[0].pricePerUnitTime
            data.basePrice = tripOrder.tripFare[0].basePrice
            data.user = getOrder.user._id;
            data.date_created_utc = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, store.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');
            data.status = "pending"
            delete data._id;
            // let pickUp_location = {
            //     "lat": getOrder.pickUp.location.coordinates[1],
            //     "lng": getOrder.pickUp.location.coordinates[0]
            // };
            // let dropOff_location = data.location;
            // const getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(pickUp_location, dropOff_location, store.googleMapKey.server);
            // console.log("getDistanceAndTime----", getDistanceAndTime)
            // data.ETA = parseInt(getDistanceAndTime.duration);
            // data.EDA = parseInt(getDistanceAndTime.distance);
            bidModel.bidCreate(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                }
                let orderData = await Order.updateBidId(resdata);
                res.json(helper.showSuccessResponse("BID_AMOUNT_RAISE", orderData))
                let runSetupTime = `in 30 seconds`;
                agenda.schedule(runSetupTime, 'bid request status', { bidId: resdata._id });
                socketHelper.singleSocket(getOrder.user._id, "Customer", { bidInfo: resdata, orderId: orderData._id, type: "bidRequestRaised" });
            })
        } catch (error) {
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }


    },
    updateMultiMainOrderStatus: async (data) => {
        try {

            dropmultiLocation.getPendingOrder(data, async (err, resdata) => {
                if (err) {
                    return (helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                }
                console.log("resdata:========>", resdata)
                if (!resdata) {
                    await Order.updateOne({ _id: data.order }, { $set: { multiOrderstatus: true } });
                }

            })
        } catch (error) {
            console.log("errr===>", error);
            return (helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }


    },
    getTransaction: async (req, res) => {
        try {
            let { orderBy, order, page, limit, startDate, endDate, type } = req.body;
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            let obj = {};
            let user = req.user;
            if (startDate) {
                startDate = new Date(new Date(new Date(startDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                startDate = new Date(startDate);
                startDate.setHours(0, 0, 0, 0);
            }

            if (endDate) {
                endDate = new Date(new Date(new Date(endDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                endDate = new Date(endDate);
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            }
            if (startDate && endDate)
                obj.date_created_utc = { $gte: new Date(startDate), $lt: new Date(endDate) };
            if (type)
                obj.type = type;

            obj.payment_to = ObjectId(user._id);

            let count = await paymentLedger.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            paymentLedger.getTransaction(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getDriverPoolTripsBySorting: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store;
            let getTrips = await sortDriverPoolTrips(user._id, user.userLocation, store);
            res.json(helper.showSuccessResponseCount('DATA_SUCCESS', getTrips, getTrips.length));

        } catch (error) {
            console.log("errr===>", error);
            return (helper.showInternalServerErrorResponse('somethingWentWrong'));
        }
    },
    getActiveStoreLanguageForDrivers: async (req, res) => {
        try {
            let store = req.store;
            let langCode = req.params.code;

            let getLangugeCode = Config.LANGUAGES.filter(i => {
                return i.code === langCode;
            });

            if (!getLangugeCode.length) {
                return res.json(helper.showValidationErrorResponse('INVALID_LANGUAGE_CODE'));
            }
            let customerTerminology = require('../../../config/driver-lang-' + langCode + '.json');
            let terminologyData = [];
            let getTerminologyData = await terminologyModel.findOne({ store: store.storeId, lang: langCode, type: "drivers" });
            let staticTerminology = customerTerminology.langJSON_arr;

            if (getTerminologyData != null) {
                let storeTerminology = getTerminologyData.values;
                terminologyData = [...staticTerminology, ...storeTerminology];
            }
            else {
                let storeTerminology = customerTerminology.Insert_JSON_arr;
                terminologyData = [...staticTerminology, ...storeTerminology];
            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', terminologyData));

        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    updateDriverLanguage: async (req, res) => {
        try {
            let user = req.user;
            let { language } = req.body;
            if (!language) {
                return res.json(helper.showValidationErrorResponse('INVALID_LANGUAGE_CODE'));
            }
            let getLangugeCode = Config.LANGUAGES.filter(i => {
                return i.code === language.code;
            });

            if (!getLangugeCode.length) {
                return res.json(helper.showValidationErrorResponse('INVALID_LANGUAGE_CODE'));
            }
            let data = { language, _id: user._id };
            User.updateUserProfile(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });

        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    driverWaitingTimeForStops: async (req, res) => {
        try {
            var data = req.body;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.findById(data._id)
                .populate({ path: 'storeType', select: "storeType multiStopsTripSettings" })

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }
            let freeWaitTime = getOrder.storeType.multiStopsTripSettings ? getOrder.storeType.multiStopsTripSettings.waitingTime : 120;
            freeWaitTime = Math.floor(freeWaitTime / 60);// convert to minute
            let waitingTime = helper.getTimeDifferenceInMinute(new Date(), getOrder.multiStopStartAt);
            let update = {};
            if (freeWaitTime < waitingTime) {
                waitingTime = waitingTime - freeWaitTime;
                update["$inc"] = { totalWaitTime: waitingTime };

            }
            if (getOrder.remainStopsCount > 0)
                update.remainStopsCount = getOrder.remainStopsCount - 1;
            if (update.remainStopsCount == 0) {
                update.isRemainStops = false;
            }
            console.log("after waitingTime:===>", waitingTime);
            update.isMultiStopsStarted = false;
            let query = { _id: data._id }
            Order.updateOrderbyCondition(query, update, (err, resdata) => {
                return err ?
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err))
                    : res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
            })


        } catch (err) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }

    },
    multiStopsStartAt: async (req, res) => {
        try {
            let data = req.body;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            const getOrder = await Order.findById(data._id);
            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }
            let update = {};
            update.multiStopStartAt = new Date();
            update.isMultiStopsStarted = true;
            let query = { _id: data._id }
            Order.updateOrderbyCondition(query, update, (err, resdata) => {
                return err ?
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err))
                    : res.json(helper.showSuccessResponse('DATA_SUCCESS', { _id: resdata._id, multiStopStartAt: resdata.multiStopStartAt, orderStatus: resdata.orderStatus }));
            })


        } catch (error) {
            console.error("error:", err);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    multiStopsStartedByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            if (!data.stopId) {
                return res.json(helper.showValidationErrorResponse('STOP_ID_IS_REQUIRED'));

            }
            const getOrder = await dropmultiLocation.findOne({ _id: data.stopId, order: data._id, status: "pending" })
                .populate({ path: 'order', match: { store: store.storeId, driver: user._id, orderStatus: { $nin: ["completed", "cancelled"] } }, select: "user" })
                .exec();

            if (getOrder == null || !getOrder.order) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }

            let query = { _id: data.stopId };
            let update = { date_driver_start_utc: new Date(), status: "inroute" };
            dropmultiLocation.updateMultilocation(query, update, async (err, resdata) => {
                if (err) {
                    console.log("err----", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata.order, stopId: resdata._id }));
                    let customerOrderResponseData = {
                        orderId: getOrder.order._id,
                        type: "multiStops"
                    }
                    socketHelper.singleSocket(getOrder.order.user, "Customer", customerOrderResponseData);

                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    multiStopsCompleteByDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            if (!data.stopId) {
                return res.json(helper.showValidationErrorResponse('STOP_ID_IS_REQUIRED'));
            }

            const getOrder = await dropmultiLocation.findOne({ _id: data.stopId, order: data._id, status: "inroute" })
                .populate({ path: 'order', match: { store: store.storeId, driver: user._id, orderStatus: { $nin: ["completed", "cancelled"] } }, select: "user" })
                .exec();
            if (getOrder == null || !getOrder.order) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }

            let query = { _id: data.stopId };
            let update = { status: "completed", date_driver_delivered_utc: new Date() };
            dropmultiLocation.updateMultilocation(query, update, async (err, resdata) => {
                if (err) {
                    console.log("errr---", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: getOrder.order._id, stopId: resdata._id }));
                    let customerOrderResponseData = {
                        orderId: getOrder.order._id,
                        type: "multiStops"
                    }
                    socketHelper.singleSocket(getOrder.order.user, "Customer", customerOrderResponseData);

                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    driverlist: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store;
            let data = req.body
            const pageSize = data.limit || 10;
            const paged = data.page || 1;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            const getOrder = await Order.getOrderByIdAsync(data._id);
            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }
            if (getOrder.orderStatus === "cancelled" || getOrder.orderStatus === "archived") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            }
            let vehiclequery = queryGenerate.vehiclequery(getOrder)
            /* let source = { type: "Point", coordinates: [Number(user.userLocation.coordinates[0]), Number(user.userLocation.coordinates[1])] };
             let storeTypeDetails = getOrder.storeType;
             let radius = storeTypeDetails.deliveryAreaDriver ? storeTypeDetails.deliveryAreaDriver : 20;
             let unit = store.distanceUnit ? store.distanceUnit : 'km';
             let maxDistance = helper.getDeliveryArea(radius, unit);*/

            let query = {
                store: store.storeId,
                status: "approved",
                role: 'DRIVER',
                _id: { $ne: user._id }
            }
            if (data.search) {
                query['$or'] = [];
                query['$or'].push({ name: { $regex: data.search || '', $options: 'i' } })
                query['$or'].push({ email: { $regex: data.search || '', $options: 'i' } })
                query['$or'].push({ mobileNumber: { $regex: data.search || '', $options: 'i' } })
            }
            User.aggregate(
                [
                    // {
                    //     "$geoNear": {
                    //         "near": source,
                    //         "distanceField": "distance",
                    //         key: "userLocation",
                    //         "spherical": true,
                    //         "maxDistance": maxDistance,
                    //         query: query,
                    //     }
                    // },
                    {
                        $match: query
                    },
                    {
                        $lookup: {
                            from: "files",
                            localField: "profileImage",
                            foreignField: "_id",
                            as: "profileImage"

                        }
                    },
                    {
                        $lookup: {
                            from: "vehicles",
                            localField: "vehicle",
                            foreignField: "_id",
                            as: "vehicles"
                        }
                    },
                    {
                        $lookup: {
                            from: "vehicletypes",
                            localField: "vehicles.vehicleType",
                            foreignField: "_id",
                            as: "vehicleType"
                        }
                    },
                    { $unwind: '$vehicles' },
                    {
                        $match: vehiclequery
                    },
                    { $sort: { distance: 1 } },
                    { $skip: (paged - 1) * pageSize },
                    { $limit: parseInt(pageSize) },
                    { $unwind: { path: "$profileImage", preserveNullAndEmptyArrays: true } },
                    { $project: { _id: 1, name: 1, onlineStatus: 1, "profileImage.link": 1 } }
                ], async (err, resdata) => {
                    if (err) {
                        console.log("err", err);
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                });
        } catch (error) {
            console.error("error:", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    assignRideToOtherDriver: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store;
            let data = req.body
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            const getOrder = await Order.getOrderByIdAsync(data._id);
            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }
            if (getOrder.orderStatus === "cancelled" || getOrder.orderStatus === "archived") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            }
            if (!data.driver) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }
            data.oldDriver = user._id
            data.isOrderAssignByOther = true
            Order.updateOrder(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse("TRIP_ASSIGNED_SUCCESS", resdata))
                    deliveryRequest.afterOrderAssign(store, resdata, data._id);
                }
            })
        } catch (error) {
            console.error("error:", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    sendRequestToOtherDriver: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store;
            let data = req.body
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            const getOrder = await Order.getOrderByIdAsync(data._id);
            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }
            if (getOrder.orderStatus === "cancelled" || getOrder.orderStatus === "archived") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            }
            if (getOrder.scheduledType === "now") {
                return res.json(helper.showValidationErrorResponse('SEND_ONLY_SCHEDULE_ORDER_REQUEST'));
            }
            if (getOrder.isNewDriverAssign && getOrder.oldDriver) {
                data.isNewDriverAssign = false;
            }
            if (!data.driverId) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }
            const getDriver = await User.findById(data.driverId)
            if (getDriver == null) {
                return res.json(helper.showValidationErrorResponse('DRIVER_NOT_EXIST'));
            }
            if (!getOrder.isScheduleOrderAssign || (getOrder.isNewDriverAssign && getOrder.oldDriver)) {
                data.nearByTempDrivers = [];
            }
            data.isScheduleOrderAssign = true;
            Order.updateOrder(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse("DATA_SUCCESS", resdata))
                    deliveryRequest.sendRequestToDriver(store, getDriver, data._id);
                }
            })
        } catch (error) {
            console.error("error:", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getCuisineList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, storeTypeId, search, fields } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let obj = {};
            if (!storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }
            if (storeTypeId) {
                obj.storeType = ObjectId(storeTypeId);
            }
            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }
            if (!obj.hasOwnProperty("status")) {
                obj.status = { $ne: "archived" };
            }
            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ name: { $regex: search || '', $options: 'i' } })
            }
            let count = await Cuisines.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Cuisines.geCuisinesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            console.log("err", err);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

}