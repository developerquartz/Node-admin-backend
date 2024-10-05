const ObjectId = require('objectid');
const deliveryMiddleWare = require('../middleware/delivery');
const User = require('../../../models/userTable')
const utilityFunc = require('../utility/functions');
const vehicelType = require('../../delivery/models/vehicelTypesTable')
const utilityCalculation = require('../utility/calculation');
const tripServices = require('../services/trips');
const taxiHelper = require('../config/helper');
const contactService = require('../../emergencyContact/services/emergencyContact');
const tripMiddleware = require('../middleware/trip');
const Order = require('../../../models/ordersTable');
const deliveryRequest = require('../../delivery/utility/deliveryRequests');
const bidModel = require("../../../models/bidTable");
const sendRequestHelper = require('../../../helper/sendRequest');
const socketHelper = require('../../../helper/socketHelper');
const geofencingFun = require('../../../helper/geofencing')
const { validateBookingRequiredField } = require('../validation/validator')
const paymentHandler = require("../../../middleware/paymenthandlerCharge");
const Package = require("../../packageService/model/packageTable");
const Transaction = require("../../../helper/transaction");
const utilityBidRequests = require("../utility/bidRequests");

let nearByDrivers = async (req, res) => {
    try {
        let data = req.body;
        let storeTypeDetails = req.storeTypeDetails;
        let store = req.store;

        let radius = storeTypeDetails.deliveryAreaDriver ? storeTypeDetails.deliveryAreaDriver : 20;
        let unit = store.distanceUnit ? store.distanceUnit : 'km';

        let query = {
            store: ObjectId(store.storeId),
            onlineStatus: 'online',
            status: "approved",
            role: 'DRIVER'
        };

        let limit = storeTypeDetails.noOfDriversPerRequest ? storeTypeDetails.noOfDriversPerRequest : 10;

        let driverQuery = {
            apiType: 'nearByDrivers',
            source: data.source,
            radius: radius,
            unit: unit,
            query: query,
            limit: limit,
            token: req.token,
            apiKey: req.apiKey
        };

        let results = await deliveryMiddleWare.deliveryApiCall(driverQuery);
        utilityFunc.sendSuccessResponse(results.data, res);

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}

let vehicleTypes = async (req, res) => {
    try {
        let data = req.body;
        let store = req.store;
        let user = req.user;
        let storeTypeDetails = req.storeTypeDetails;
        let isLoyaltyPointsEnabled = false;
        if (req.get('Authorization')) {
            if (user != null) {
                isLoggedIn = true;
                if (store.loyaltyPoints.status) {
                    data.loyaltyPoints = user.loyaltyPoints;
                    isLoyaltyPointsEnabled = true;
                }
            }
        }
        let unit = store.distanceUnit ? store.distanceUnit : 'km';
        const customerLocation = { type: "Point", coordinates: [Number(data.pickUp.location.lng), Number(data.pickUp.location.lat)] }
        UserObj = {
            customerLocation: customerLocation.coordinates,
            unit: unit
        }
        if (storeTypeDetails.geoFence && storeTypeDetails.geoFence.length) {
            let geofence = await geofencingFun.globalTaxiCheck(UserObj, storeTypeDetails.geoFence)
            if (geofence && !geofence.isServiceProvide) {
                return res.json(helper.showValidationErrorResponse("Sorry! We are not provide service for this area."));
            }
        }

        data.vehicleTypesList = req.body.vehicleTypesList;
        let results = await utilityCalculation.estimatedCostCalculation(store, data);
        let totalcount = data.vehicleTypesList.length;
        let resdata = helper.showSuccessResponse("DATA_SUCCESS", results);
        resdata['loyaltyPoints'] = data.loyaltyPoints;
        resdata['isLoyaltyPointsEnabled'] = isLoyaltyPointsEnabled;
        resdata['isLoyaltyPointsUsed'] = data.isLoyaltyPointsUsed;
        resdata['totalcount'] = totalcount;
        resdata['storeTypeDetails'] = storeTypeDetails;
        return res.json(resdata);
    } catch (error) {
        console.log("vehicleTypes err", error);
        // utilityFunc.sendErrorResponse(error, res);
        return res.json(helper.showValidationErrorResponse(error.message));
    }
}

let createTrip = async (req, res) => {
    try {
        let data = req.body;
        console.log("data--------->", data)
        let user = req.user;
        let store = req.store;
        let storeTypeDetails = req.storeTypeDetails;
        data.otp = utilityFunc.generateOTP(4);
        data.user = user._id;
        data.customOrderId = utilityFunc.generatorRandomNumber(6).toLowerCase();
        data.storeType = storeTypeDetails._id;
        data.store = store.storeId;
        data.googleMapKey = store.googleMapKey.server;
        data.timezone = store.timezone;
        data.paymentMode = store.paymentMode;
        data.currency = store.currency.code;
        data.orderTotal = data.estimatedCost ? Number(data.estimatedCost) : 0;
        data.distance = data.distance ? Number(data.distance) : 0;
        data.duration = data.estimatedTime ? Number(data.estimatedTime) : 0;

        //updated validation storeType basis....updating input data here...
        let [error, validateData] = await validateBookingRequiredField(storeTypeDetails, data);
        if (error) {
            return res.json(helper.showValidationResponseWithData(error, data));
        }

        //here validating trip fare...
        let order_cost = await check_cost(store, storeTypeDetails, data);
        //console.log("trip data===>", data)
        //console.log("order_costb estimatedCost", order_cost)
        // console.log("estimatedCost", data.orderTotal)
        if ((data.isLoyaltyPointsUsed == true || data.isLoyaltyPointsUsed == "true")) {
            data.redemptionValue = order_cost.redemptionValue
        }
        if (data.coupon) {
            data.discountTotal = order_cost.discountTotal;
            data.couponType = order_cost.couponType;
            data.couponAmount = order_cost.couponAmount;
            data.couponDiscount = order_cost.couponDiscount;
        }
        if (!order_cost || order_cost.estimatedCost != data.orderTotal) {
            return res.json(helper.showValidationErrorResponse('ORDER AMOUNT IS INVALID'));
        };
        if (data.dropOff) {
            data.dropOff.location = { type: "Point", coordinates: [data.dropOff.location.lng, data.dropOff.location.lat] };
        };


        data.subTotal = order_cost.actualCostWithoutDiscount
        if (data.journeyType) {
            data.journeyType = data.journeyType;
        } else {
            data.journeyType = "oneway";
        }

        if (data.isPreferredDriver === "yes") {
            if (!data.preferredDriverId) {
                throw new Error("PREFERRED_DRIVER_ID_IS_REQUIRED");
            }
        }

        let isDriectPayment = data.isDriectPayment == "true" ? true : false;
        if (["paystack", "flutterwave"].includes(data.paymentMethod) &&
            (isDriectPayment || !ObjectId.isValid(data.paymentSourceRef))) {
            return res.json(helper.showValidationErrorResponse('PAYMENT_IS_NOT_SUPPORT'));
        }

        if (data.paymentMethod === "wallet" && user.wallet < data.orderTotal) {
            return res.json(helper.showValidationErrorResponse('WALLET_AMOUNT_IS_INSUFFICIENT'));

        }
        if (["braintree", "googlepay", "applepay", "razorpay", "orangeMoney", "square", "moncash", "cardOnDelivery"].includes(data.paymentMethod)) {
            //data.paymentMethod = "paypal";
            return res.json(helper.showValidationErrorResponse('PAYMENT_IS_NOT_SUPPORT'));
        }
        // if (["dpo"].includes(data.paymentMethod)) {
        //     return res.json(helper.showValidationErrorResponse('Please add the trip fare to your wallet for using this payment method.'));
        // }

        let vehicleTypeData = await tripServices.getVehicleById(ObjectId(data.vehicleType))
        if (!vehicleTypeData) throw new Error("VEHICLE_TYPE_NOT_FOUND");
        if (data.rideType === "pool") {
            if (!data.noOfSeats) {
                return res.json(helper.showValidationErrorResponse('NO_OF_SEATS_IS_REQUIRED'));
            }
            if (vehicleTypeData.type != "pool") {
                return res.json(helper.showValidationErrorResponse('INVALID_VEHICLE_TYPE'));
            }
            data.orderTotal = (data.orderTotal * Number(data.noOfSeats));
        }

        data.vehicleType = vehicleTypeData;
        data.orderStatus = "pending";
        data.paymentStatus = "pending";
        data.pickUp.location = { type: "Point", coordinates: [data.pickUp.location.lng, data.pickUp.location.lat] };

        if (data.scheduledType && data.scheduledType === "scheduled") {

            if (!data.scheduledDate) {
                throw new Error("SCHEDULE_DATE_IS_REQUIRED");
            }

            if (!data.scheduledTime) {
                throw new Error("SCHEDULE_TIME_IS_REQUIRED");
            }

            if (!helper.isValidDate(data.scheduledDate, "YYYY-MM-DD")) {
                throw new Error("CORRECT_DATE_FORMAT");
            }

            const getScheduleData = helper.getScheduleData("YYYY-MM-DD", data.scheduledDate, data.scheduledTime, data.timezone);

            if (getScheduleData.scheduled_utc.getTime() < getScheduleData.currentUTC.getTime()) {
                return res.json(helper.showValidationErrorResponse('BOOKING_NOT_ALLOWED'));
            }

            data.scheduledDate = getScheduleData.scheduledDate;
            data.scheduledTime = getScheduleData.scheduledTime;
            data.scheduled_utc = getScheduleData.scheduled_utc;
            data.date_created = data.scheduledDate;
            data.time_created = data.scheduledTime
            data.date_created_utc = data.scheduled_utc;

        } else {
            data.date_created_utc = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');
        }

        //console.log("create trip Data", data);

        //---deliveryBoyEarning----

        let driverPercentCharge = vehicleTypeData.driverPercentCharge;
        let deliveryBoyEarning = 0;
        deliveryBoyEarning = utilityFunc.roundNumber((data.orderTotal * Number(driverPercentCharge)) / 100);

        if (storeTypeDetails.multiDropsSettings) {
            data.commission = storeTypeDetails.commission;
            if (data.itemTotal) {
                if (storeTypeDetails.commission.deliveryBoy) {
                    deliveryBoyEarning += utilityFunc.roundNumber((data.itemTotal * Number(storeTypeDetails.commission.deliveryBoy)) / 100);
                }
            }
            data.itemTotal = order_cost.itemTotal;
            data.itemSubTotal = order_cost.totalOrderWithoutDiscount;
            data.itemOrderTotal = order_cost.totalOrder;
        }
        data.deliveryBoyEarning = deliveryBoyEarning

        //---deliveryBoyEarning----
        tripServices.addOrder(data, async (err, resdata) => {
            if (err) {
                utilityFunc.sendErrorResponse(err, res);
            } else {
                utilityFunc.sendSuccessResponse({ data: { orderId: resdata._id } }, res);
                tripMiddleware.afterTripCreate(resdata);
                tripMiddleware.addMultiLocation(data, resdata._id, store);
                tripMiddleware.addstopsArray(data, resdata._id);
            }
        });
    } catch (error) {
        console.log("create trip", error);
        utilityFunc.sendErrorResponse(error, res);
    }
}
let check_cost = async (store, storeTypeDetails, data) => {
    switch (storeTypeDetails.storeType) {
        case "TAXI":
            return taxiCheckCost(store, data);
        default:
            return pickUpDropCheckCost(store, data);
    }
}
let taxiCheckCost = async (store, data) => {
    data.storeTypeId = data.storeType;
    let vechileData = await vehicelType.findOne({ _id: data.vehicleType })
    if (vechileData) {
        if (data.rideType == "hourly")
            return await utilityCalculation.calculateCostByHourlyVehicle(store, data, vechileData);
        else {
            let results = await utilityCalculation.CostCalculation(store, data);
            data = { ...data, ...results }
            return await utilityCalculation.caculateCostByVehicle(store, data, vechileData)
        }
    }
    else {
        return false
    }
}
let pickUpDropCheckCost = async (store, data) => {
    data.storeTypeId = data.storeType
    let vechileData = await vehicelType.findOne({ _id: data.vehicleType })
    if (vechileData) {
        if (data.multiDropsSettings) {
            let results = await utilityCalculation.CostCalculation(store, data);
            data = { ...data, ...results }
            return await utilityCalculation.caculateCostByVehicle(store, data, vechileData)
        }
        else {
            let results = await utilityCalculation.CostCalculation(store, data);
            data = { ...data, ...results }
            return await utilityCalculation.caculateCostByVehicle(store, data, vechileData)
        }

    }
    else {
        return false
    }
}
let createTripWithPackage = async (req, res) => {
    try {
        let data = req.body;
        let user = req.user;
        let store = req.store;
        let storeTypeDetails = req.storeTypeDetails;
        data.otp = utilityFunc.generateOTP(4);
        data.user = user._id;
        data.customOrderId = utilityFunc.generatorRandomNumber(6).toLowerCase();
        data.storeType = storeTypeDetails._id;
        data.store = store.storeId;
        data.googleMapKey = store.googleMapKey.server;
        data.timezone = store.timezone;
        data.paymentMode = store.paymentMode;
        data.currency = store.currency.code;
        data.distance = data.distance ? Number(data.distance) : 0;
        data.duration = data.estimatedTime ? Number(data.estimatedTime) : 0;
        // console.log("data:===>", data);
        if (!data.packageId) {
            return res.json(helper.showValidationErrorResponse('PACKAGE_ID_IS_REQUIRED'));
        }
        let getPackage = await Package.findOne({ _id: ObjectId(data.packageId) }).populate("image", "link").populate("vendor").lean();
        if (!getPackage) {
            return res.json(helper.showValidationErrorResponse('PACKAGE_IS_INVALID'));
        }
        data.orderTotal = getPackage.price;
        data.vehicleType = getPackage.vehicleType;
        data.package = getPackage;

        data.dropOff = { location: getPackage.vendor.userLocation, address: getPackage.vendor.address };
        // data.dropOff.location = { type: "Point", coordinates: [data.dropOff.location.lng, data.dropOff.location.lat] };

        data.subTotal = data.orderTotal;
        if (data.journeyType) {
            data.journeyType = data.journeyType;
        } else {
            data.journeyType = "twoway";
        }


        let isDriectPayment = data.isDriectPayment == "true" ? true : false;
        if (["paystack", "flutterwave"].includes(data.paymentMethod) &&
            (isDriectPayment || !ObjectId.isValid(data.paymentSourceRef))) {
            return res.json(helper.showValidationErrorResponse('PAYMENT_IS_NOT_SUPPORT'));
        }

        if (data.paymentMethod === "wallet" && user.wallet < data.orderTotal) {
            return res.json(helper.showValidationErrorResponse('WALLET_AMOUNT_IS_INSUFFICIENT'));

        }
        if (["braintree", "googlepay", "applepay", "razorpay", "orangeMoney", "square", "moncash"].includes(data.paymentMethod)) {
            //data.paymentMethod = "paypal";
            return res.json(helper.showValidationErrorResponse('PAYMENT_IS_NOT_SUPPORT'));
        }

        let vehicleTypeData = await tripServices.getVehicleById(ObjectId(data.vehicleType))
        if (!vehicleTypeData) throw new Error("VEHICLE_TYPE_NOT_FOUND");

        data.vehicleType = vehicleTypeData;
        data.orderStatus = "pending";
        data.paymentStatus = "pending";
        data.pickUp.location = { type: "Point", coordinates: [data.pickUp.location.lng, data.pickUp.location.lat] };

        if (data.scheduledType && data.scheduledType === "scheduled") {

            if (!data.scheduledDate) {
                throw new Error("SCHEDULE_DATE_IS_REQUIRED");
            }

            if (!data.scheduledTime) {
                throw new Error("SCHEDULE_TIME_IS_REQUIRED");
            }

            if (!helper.isValidDate(data.scheduledDate, "YYYY-MM-DD")) {
                throw new Error("CORRECT_DATE_FORMAT");
            }

            const getScheduleData = helper.getScheduleData("YYYY-MM-DD", data.scheduledDate, data.scheduledTime, data.timezone);

            if (getScheduleData.scheduled_utc.getTime() < getScheduleData.currentUTC.getTime()) {
                return res.json(helper.showValidationErrorResponse('BOOKING_NOT_ALLOWED'));
            }

            data.scheduledDate = getScheduleData.scheduledDate;
            data.scheduledTime = getScheduleData.scheduledTime;
            data.scheduled_utc = getScheduleData.scheduled_utc;
            data.date_created = data.scheduledDate;
            data.time_created = data.scheduledTime
            data.date_created_utc = data.scheduled_utc;

        } else {
            data.date_created_utc = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');
        }

        let driverPercentCharge = vehicleTypeData.driverPercentCharge;
        let deliveryBoyEarning = 0;
        deliveryBoyEarning = utilityFunc.roundNumber((data.orderTotal * Number(driverPercentCharge)) / 100);
        data.deliveryBoyEarning = deliveryBoyEarning;
        data.isPackageServiceTrip = true;
        paymentHandler.charge(data, user, store, (err, response) => {
            if (err) {
                return res.json(helper.showValidationErrorResponse(err));
            };
            tripServices.addOrder(data, async (err, resdata) => {
                if (err) {
                    utilityFunc.sendErrorResponse(err, res);
                } else {
                    utilityFunc.sendSuccessResponse({ data: { orderId: resdata._id } }, res);
                    tripMiddleware.afterTripCreate(resdata);
                    if (data.paymentMethod === "wallet") {
                        let wallet = helper.roundNumber(user.wallet - data.orderTotal);
                        Transaction.userTransaction(resdata, user, store, data.orderTotal, wallet);
                    }

                }
            });
        });
    } catch (error) {
        console.log("create trip", error);
        utilityFunc.sendErrorResponse(error, res);
    }
}
let cancelTripByCustomer = async (req, res) => {
    try {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        const getOrder = await tripServices.getOrderByIdAsync(data._id);

        if (getOrder === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
        }

        data.orderStatus = "cancelled";
        data.date_user_rejected_utc = new Date();

        tripServices.updateOrderStatus(data, (err, resdata) => {
            if (err) {
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                let orderResponseData = {
                    orderId: resdata._id
                }
                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', orderResponseData));
                // deliveryRequest.afterCustomerRejectTrip(resdata);
            }
        });
    } catch (error) {
        console.log(">>>>>>>>>>>>>", error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}

let addPreferredDriver = async (req, res) => {
    try {
        let data = req.body;
        let user = req.user;
        data.user = user._id

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (!data.orderId) {
            return res.json(helper.showValidationErrorResponse('ORDER_ID_IS_REQUIRED'));
        }

        const getOrder = await tripServices.getOrderByIdAsync(ObjectId(data.orderId));

        if (getOrder === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
        }

        const getUser = await tripServices.getUserDetail(ObjectId(data._id));

        if (getUser === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_DRIVER_ID'));
        }

        let condition = { _id: data.user, "preferredDriver.driver": { $ne: ObjectId(data._id) } }
        let update = {
            $addToSet: { preferredDriver: { driver: data._id, storeType: getOrder.storeType._id } }
        }

        tripServices.updateUserByCondition(condition, update, async (err, resdata) => {
            if (err) {
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                let condition = {
                    user: data.user,
                    driver: ObjectId(data._id),
                    orderStatus: "inroute"
                }
                let update = {
                    isDriverPreferred: true
                }
                let tripData = await tripServices.updateTripOrder(condition, update);

                res.json(helper.showSuccessResponse('SUCCESS', resdata));
            }
        });
    } catch (error) {
        console.log(">>>>>>>>>>>>>", error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}

let removePreferredDriver = async (req, res) => {
    try {
        let data = req.body;
        let user = req.user;
        data.user = user._id;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        const getUser = await tripServices.getUserDetail(ObjectId(data._id));

        if (getUser === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_DRIVER_ID'));
        }

        let condition = { _id: data.user };
        let update = { $pull: { preferredDriver: { driver: ObjectId(data._id) } } };

        tripServices.updateUser(condition, update, async (err, resdata) => {
            if (err) {
                console.log("INTERNAL_DB_ERROR", err);
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                res.json(helper.showSuccessResponse('SUCCESS', resdata));
                let condition = {
                    user: data.user,
                    driver: ObjectId(data._id),
                    orderStatus: "inroute"
                }
                let update = {
                    '$set': {
                        isDriverPreferred: false
                    }
                }
                await tripServices.updateTripOrders(condition, update);
            }
        });
    } catch (error) {
        console.log(">>>>>>>>>>>>>", error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}

let getPreferredDriver = async (req, res) => {
    try {
        let data = req.body;
        let user = req.user;
        data.user = user._id
        const getUser = await tripServices.getUserPreferredDriverDetail(ObjectId(user._id));
        if (getUser && getUser.preferredDriver) {
            return res.json(helper.showSuccessResponse('SUCCESS', getUser.preferredDriver));
        } else {
            res.json(helper.showSuccessResponse('SUCCESS', []));

        }

    } catch (error) {
        console.log(">>>>>>>>>>>>>", error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}

let sendTripSOS = async (req, res) => {
    let tripId = req.body._id
    let user = req.user;

    //console.log("user.store.twilio", user.store.twilio);

    if (!user.store.twilio)
        return utilityFunc.sendErrorResponse("STORE_DOES_NOT_HAVE_SMS_SERVICE", res);

    if (!tripId) {
        return res.json(helper.showValidationErrorResponse('TRIP_ID_IS_REQUIRED'));
    }

    let tripData = await tripServices.getOrderByIdAsync(tripId)

    let query = {
        userId: user._id,
        status: "active"
    }

    contactService.getContactByUserIdCallback(query, async (err, doc) => {
        if (err) {
            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else if (!doc || doc.length == 0) {
            return res.json(helper.showValidationErrorResponse('NO_EMERGENCY_CONTACT_ADDED'));
        } else {
            // console.log("tripData.driverVehicle.values----")
            // console.log(tripData.driverVehicle)
            let drverVechil = tripData.driverVehicle.values
            let vechile_data = ''
            drverVechil.map(element => {
                vechile_data += element.label
                vechile_data += ":"
                vechile_data += element.value + ","
                vechile_data += "\n"
            })
            let msg = `Hello,\nI am ${user.name} and i am feeling unsecure/unsafe with driver ${tripData.driver ? tripData.driver.name : ""}.\nThere is Vehicle details:-\n${vechile_data ? vechile_data : "not found"}Location http://www.google.com/maps/place/${tripData.driver ? tripData.driver.userLocation.coordinates[1] : "not find"},${tripData.driver ? tripData.driver.userLocation.coordinates[0] : "not found"}.\nPlease help me.`
            await taxiHelper.sendSMS(user.store.twilio, doc, user.store.storeName, msg)
            let result = { data: doc }
            return utilityFunc.sendSuccessResponse(result, res);

        }
    });
}
let acceptRequestByCustomer = async (req, res) => {
    try {
        let data = req.body;
        let user = req.user;
        let store = req.store;
        console.log("acceptRequestByCustomer data:==>", data);
        if (!data.bidId) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        const getbid = await bidModel.getbid(data.bidId);
        //console.log("getbid---", getbid)

        if (getbid === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_BID_ID'));
        }
        if (getbid.driver.onlineStatus != "online") {
            return res.json(helper.showValidationErrorResponse('UNABLE_TO_ACCEPT'));
        }
        if (getbid.order.isDriverAssign) {
            return res.json(helper.showValidationErrorResponse('ALREADY_ASSIGNED'));
        }

        if (getbid.order.orderStatus === "cancelled" || getbid.order.orderStatus === "archived") {
            return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
        }
        data.driver = getbid.driver._id;
        data.isScheduleProcess = getbid.order.scheduledType === "now" ? true : false;
        data.orderStatus = "confirmed";
        data.orderTotal = getbid.amount.toFixed(2);
        data.subTotal = getbid.amount.toFixed(2);
        data.date_customer_confirmed_utc = new Date();
        data.isDriverAssign = true;
        let onlineStatus = "pickupInroute";
        if (data.isScheduleProcess) {
            await User.updateOne({ _id: ObjectId(data.driver) }, { onlineStatus: onlineStatus, currentOrderId: getbid.order._id });
        }
        await Promise.all([
            User.findByIdAndUpdate(user._id, { currentOrderId: getbid.order._id }),
            bidModel.updateStatus({ status: "accept", id: data.bidId, user: user._id })
        ]);
        data._id = getbid.order._id;
        data.driverVehicle = getbid.driver.vehicle;
        Order.updateOrderDriver(data, (err, resdata) => {
            if (err) {
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));
                deliveryRequest.afterDriverAcceptRequest(store, resdata);
            }
        });
    } catch (error) {
        console.log(">>>>>>>>>>>>>", error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}
let acceptRequestByUser = async (req, res) => {
    try {
        let data = req.body;
        let user = req.user;
        let store = req.store;
        console.log("data:==>", data);
        if (!data.driverId) {
            return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
        }
        const getDriver = await User.findById(data.driverId)
        if (getDriver === null) {
            return res.json(helper.showValidationErrorResponse('NO_DRIVERS_FOUND'));
        }
        if (getDriver.onlineStatus != "online") {
            return res.json(helper.showValidationErrorResponse('UNABLE_TO_ACCEPT'));
        }
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
        data.driver = getDriver._id;
        data.isScheduleProcess = getOrder.scheduledType === "now" ? true : false;
        data.orderStatus = "confirmed";
        data.orderTotal = data.amount.toFixed(2);
        data.subTotal = data.amount.toFixed(2);
        data.date_customer_confirmed_utc = new Date();
        data.isDriverAssign = true;
        let onlineStatus = "pickupInroute";
        if (data.isScheduleProcess) {
            await User.updateOne({ _id: ObjectId(data.driverId) }, { onlineStatus: onlineStatus, currentOrderId: getOrder._id });
        }
        await Promise.all([
            User.findByIdAndUpdate(user._id, { currentOrderId: getOrder._id }),
        ]);
        data._id = getOrder._id;
        data.driverVehicle = getDriver.vehicle;
        Order.updateOrderDriver(data, (err, resdata) => {
            if (err) {
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { orderId: resdata._id }));
                deliveryRequest.afterDriverAcceptRequest(store, resdata);
            }
        });
    } catch (error) {
        console.log(">>>>>>>>>>>>>", error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}
let rejectBidByCustomer = async (req, res) => {
    let data = req.body;
    console.log("rejectBidByCustomer data:==>", data);
    if (!data.bidId) {
        return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
    }
    const getbid = await bidModel.getbid(data.bidId);
    if (getbid === null) {
        return res.json(helper.showValidationErrorResponse('INVALID_BID_ID'));
    }
    data.id = data.bidId;
    data.status = "reject";
    bidModel.updateStatus(data, async (err, resdata) => {
        if (err) {
            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err))
        }
        res.json(helper.showSuccessResponse("UPDATE_SUCCESS", resdata));
        socketHelper.singleSocket(resdata.user, "Customer", { orderId: resdata.order._id, type: "bidRequestRejected" });
        await Order.updateOne({ _id: resdata.order._id }, { $pull: { nearByTempDrivers: resdata.driver } });
        socketHelper.nearByDriverSocket(resdata.order.nearByTempDrivers, { type: "bidRequestRejected", orderId: resdata.order._id });

    })


}
let raiseBidAmountByCustomer = async (req, res) => {
    try {
        let data = req.body;
        console.log("raiseBidAmountByCustomer data:==>", data);
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

        let getAvgBidAmount = helper.roundNumber((getOrder.orderTotal * bidSettings.percentage) / 100);
        getAvgBidAmount = helper.roundNumber(getOrder.orderTotal - getAvgBidAmount);
        if (data.amount < getAvgBidAmount) {
            let resdata = __("BID_AMOUNT_IS_INVALID", Math.ceil(getAvgBidAmount));
            return res.json(helper.showValidationErrorResponse(resdata));
        }
        data.bidAmount = Number(data.amount).toFixed(2);
        let incrementAmount;
        if (data.isBidRequest && storeTypeDetails.bidSettings && storeTypeDetails.bidSettings.status) {
            incrementAmount = utilityBidRequests.incrementAmountFun(data.bidAmount);
        }
        if (incrementAmount) {
            data.bidOfferAmount = utilityBidRequests.bidOfferAmountArray(data.bidAmount, incrementAmount);
        }
        Order.updateOrder(data, (err, resdata) => {
            if (err) {
                console.log("err", err);
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                sendRequestHelper.sendRequest(resdata._id);
            }
        });
    } catch (error) {
        console.log("getDriverRequest", error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}
let checkAvailability = async (req, res) => {
    try {
        let data = req.body;
        let store = req.store;
        let storeTypeDetails = req.storeTypeDetails;
        let unit = store.distanceUnit ? store.distanceUnit : 'km';
        if (!['TAXI', 'PICKUPDROP'].includes(storeTypeDetails.storeType)) {
            console.log("err--in-", storeTypeDetails.storeType)
            return res.json(helper.showSuccessResponse('SUCCESS', { isServiceAvailable: true }));
        }
        if (!data.source) {
            console.log("source not found")
            return res.json(helper.showSuccessResponse('SUCCESS', { isServiceAvailable: true }));
        }
        const customerLocation = { type: "Point", coordinates: [Number(data.source.lng), Number(data.source.lat)] }
        let UserObj = {
            customerLocation: customerLocation.coordinates,
            unit: unit
        }
        if (storeTypeDetails.geoFence && storeTypeDetails.geoFence.length) {
            let geofence = await geofencingFun.globalTaxiCheck(UserObj, storeTypeDetails.geoFence)
            //if (geofence && !geofence.isServiceProvide) {
            return res.json(helper.showSuccessResponse('SUCCESS', { isServiceAvailable: geofence.isServiceProvide }));
            //return res.json(helper.showValidationErrorResponse("Sorry! We are not provide service for this area."));
            //}
        }
        else {
            console.log("in else")
            return res.json(helper.showSuccessResponse('SUCCESS', { isServiceAvailable: true }));
        }
    } catch (error) {
        console.log("getDriverRequest", error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}

module.exports = {
    nearByDrivers,
    vehicleTypes,
    createTrip,
    cancelTripByCustomer,
    addPreferredDriver,
    removePreferredDriver,
    getPreferredDriver,
    sendTripSOS,
    acceptRequestByCustomer,
    raiseBidAmountByCustomer,
    rejectBidByCustomer,
    checkAvailability,
    createTripWithPackage,
    acceptRequestByUser
}