const Order = require('../../../models/ordersTable');
const User = require('../../../models/userTable')
const deliveryRequest = require('../utility/deliveryRequests');
const vehicelType = require('../../delivery/models/vehicelTypesTable')
const utilityFunc = require('../utility/functions');
const utilityCalculation = require('../utility/calculation');
const tripServices = require('../../taxiApplication/services/trips');
const orderService = require('../../../helper/orderService');
const Pricing = require('../../../helper/pricing');
const agenda = require('../../../cron/agenda');
const emailService = require("../utility/emailService");
const vehicleType = require('../../delivery/models/vehicelTypesTable');
const storeTyp = ["TAXI", "PICKUPDROP"];
const ObjectId = require('objectid');
const deliveryMiddleWare = require('../middleware/delivery');
const Transaction = require('../../../helper/transaction');

module.exports = {

    getEastimatedPrice: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let storeTypeDetails = req.storeTypeDetails;
            data.vehicleTypesList = [];

            if (data.journeyType === "hourly") {
                if (!data.pickUp) {
                    return res.json(helper.showValidationErrorResponse('PICKUP_LOCATION_IS_REQUIRED'));
                }
            } else {
                if (!data.pickUp || !data.dropOff) {
                    return res.json(helper.showValidationErrorResponse('PICKUP DROPOFF LOCATION IS REQUIRED'));
                }
            }

            if (!data.vehicleType) {
                return res.json(helper.showValidationErrorResponse('VEHICLE TYPE ID IS REQUIRED'));
            }

            let getVehicle = await vehicleType.findById(data.vehicleType);

            if (getVehicle == null) {
                return res.json(helper.showValidationErrorResponse('VEHICLE TYPE ID IS REQUIRED'));
            }

            data.vehicleTypesList.push(getVehicle);

            let results = await utilityCalculation.estimatedCostCalculation(store, data);

            res.json(helper.showSuccessResponse('DATA SUCCESS', results.length ? results[0] : {}));

        } catch (error) {
            console.log(error)
            return res.json(helper.showDatabaseErrorResponse("INTERNAL DB ERROR", error));
        }
    },

    requestNearByDrivers: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let userdata = req.user

            if (!data.order) {
                return res.json(helper.showValidationErrorResponse('ORDER ID IS REQUIRED'));
            }

            const getOrder = await Order.findById(ObjectId(data.order))
                .populate({ path: "store", select: "distanceUnit api_key codWalletLimit" })
                .populate({ path: "storeType", select: "storeType vehicleType deliveryAreaDriver noOfDriversPerRequest" })
                .populate({ path: "vendor", select: "userLocation" })
                .exec();

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse("INVALID_ORDER"));
            }

            if (getOrder.isDriverAssign && getOrder.scheduledType === "now") {
                return res.json(helper.showValidationErrorResponse("Order is " + getOrder.orderStatus + "!! cannot assign to driver"));
            }

            let storeTypeDetails = getOrder.storeType;

            let radius = storeTypeDetails.deliveryAreaDriver ? storeTypeDetails.deliveryAreaDriver : 20;
            let unit = store.distanceUnit ? store.distanceUnit : 'km';
            let maxDistance = utilityCalculation.getDeliveryArea(radius, unit);

            if (storeTyp.includes(getOrder.storeType.storeType)) {
                data.vehicleType = [ObjectId(getOrder.vehicleType._id)];
                data.source = { lat: getOrder.pickUp.location.coordinates[1], lng: getOrder.pickUp.location.coordinates[0] };
            }
            else {
                data.source = { lat: getOrder.vendor.userLocation.coordinates[1], lng: getOrder.vendor.userLocation.coordinates[0] };
                data.vehicleType = storeTypeDetails.vehicleType;
            }

            let query = {
                store: ObjectId(store.storeId),
                onlineStatus: 'online',
                status: "approved",
                role: 'DRIVER'
            };


            if (getOrder.isDriverAssign && getOrder.scheduledType === "scheduled") {
                query._id = { $ne: getOrder.driver };
            }
            let limit = storeTypeDetails.noOfDriversPerRequest ? storeTypeDetails.noOfDriversPerRequest : 10;
            if (getOrder.storeType.codWalletLimit) {

                if (getOrder.paymentMethod === "cod") {
                    query['wallet'] = { "$exists": true, "$gt": getOrder.store.codWalletLimit };
                }
            }
            let driverQuery = {
                apiType: 'requestNearByDrivers',
                source: data.source,
                vehicleType: data.vehicleType,
                maxDistance: maxDistance,
                query: query,
                limit: limit,
                apiKey: req.apiKey
            };
            /*if (userdata.role == "STAFF") {
                driverQuery["driverid"] = userdata.driverassign
            }
            */
            if (userdata.role == 'STAFF' && helper.isValidHidethings(store, "driverlistdispatcher")
                && userdata.driverassign && userdata.driverassign.length) {
                driverQuery["driverid"] = userdata.driverassign;
            }
            let results = await deliveryMiddleWare.deliveryApiCall(driverQuery);
            utilityFunc.sendSuccessResponse(results.data, res);

        } catch (error) {
            utilityFunc.sendErrorResponse(error, res);
        }
    },

    viewbyId: async (req, res) => {
        try {
            let data = req.params;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID IS REQUIRED'));
            }
            let listtrip = await Order.aggregate([{ $match: { _id: ObjectId(data._id) } }, { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customerDetails' } }, { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } }, { $project: { customOrderId: 1, billingDetails: 1, shippingDetails: 1, line_items: 1, vendor: 1, user: 1, isDriverAssign: 1, isDriverArrivedAtPickup: 1, isOrderMarkReady: 1, subTotal: 1, tax: 1, taxAmount: 1, tip: 1, tipAmount: 1, discountTotal: 1, deliveryFee: 1, orderTotal: 1, vendorEarning: 1, orderStatus: 1, date_created_utc: 1, vendorDetails: { name: 1, address: 1, profileImage: 1 }, customerDetails: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1 } } }, { $sort: { date_created_utc: -1 } }])
            return res.json(helper.showSuccessResponse('DATA SUCCESS', listtrip));
        } catch (error) {
            console.log(error)
            return res.json(helper.showDatabaseErrorResponse("INTERNAL DB ERROR", error));
        }
    },

    dispatcherDashboard: async (req, res) => {
        try {
            let obj = {};

            let store = req.store;
            let user = req.user;
            obj.store = store.storeId;
            let currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);

            let driverQuery = { role: "DRIVER", onlineStatus: "online", store: ObjectId(store.storeId), status: { $ne: "archived" } };
            let query = { store: ObjectId(store.storeId) };
            if (user.role == 'STAFF' && helper.isValidHidethings(store, "driverlistdispatcher")
                && user.driverassign && user.driverassign.length) {
                driverQuery["_id"] = { $in: user.driverassign };
                query["driver"] = { $in: user.driverassign };
            };
            let [newrequest, currentrequest, completrequest, cancelrequest, caravailable, vendorcancel, drivercancel] = await Promise.all([
                Order.aggregate([{ $match: { store: ObjectId(store.storeId), $or: [{ orderStatus: "confirmed" }, { orderStatus: "pending" }], date_created_utc: { $gte: new Date(currentDate) } } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                Order.aggregate([{ $match: { ...query, orderStatus: "inroute", date_created_utc: { $gte: new Date(currentDate) } } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                Order.aggregate([{ $match: { ...query, orderStatus: "completed", date_created_utc: { $gte: new Date(currentDate) } } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                Order.aggregate([{ $match: { ...query, orderStatus: "cancelled", date_created_utc: { $gte: new Date(currentDate) } } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                User.aggregate([{ $match: driverQuery }, { $group: { _id: null, count: { $sum: 1 } } }]),
                Order.aggregate([{ $match: { store: ObjectId(store.storeId), date_vendor_rejected_utc: { $gte: new Date(currentDate) }, date_created_utc: { $gte: new Date(currentDate) } } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                Order.aggregate([{ $match: { ...query, date_driver_cancelled_utc: { $gte: new Date(currentDate) }, date_created_utc: { $gte: new Date(currentDate) } } }, { $group: { _id: null, count: { $sum: 1 } } }])
            ]);

            let resdata = {
                newtrip: newrequest.length ? newrequest[0]['count'] : 0,
                inroute: currentrequest.length ? currentrequest[0]['count'] : 0,
                completerequest: completrequest.length ? completrequest[0]['count'] : 0,
                cancelrequest: cancelrequest.length ? cancelrequest[0]['count'] : 0,
                driveravailable: caravailable.length ? caravailable[0]['count'] : 0,
                vendorcancel: vendorcancel.length ? vendorcancel[0]['count'] : 0,
                drivercancel: drivercancel.length ? drivercancel[0]['count'] : 0

            }
            return res.json(helper.showSuccessResponse('DATA SUCCESS', resdata));
        } catch (error) {
            console.log(error)
            return res.json(helper.showDatabaseErrorResponse("INTERNAL DB ERROR", error));
        }

    },

    dispatcherRequestList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, storeTypeId, fields } = req.body;

            let pageSize = limit || 20;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let obj = {};
            let store = req.store;
            obj.store = store.storeId;
            let user = req.user;

            if (storeTypeId) {
                obj.stortype = ObjectId(storeTypeId);
            }

            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }
            if (obj.status == "newtrip") {
                obj["$or"] = [{ orderStatus: "pending" }, { orderStatus: "confirmed" }]
            }
            if (obj.status == "currenttrip") {
                obj.orderStatus = "inroute"
            }
            // if (user.role == 'STAFF' && helper.isValidHidethings(store, "driverlistdispatcher")
            //     && user.driverassign && user.driverassign.length) {
            //     obj["driver"] = user.driverassign;
            // }
            delete obj['status']

            let currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            obj.date_created_utc = { $gte: new Date(currentDate) };

            let count = await Order.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Order.getRequestWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL DB ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA SUCCESS', resdata, countdata));
                }
            });
        } catch (error) {
            console.log(error)
            res.json(helper.showDatabaseErrorResponse("INTERNAL DB ERROR", error));
        }
    },

    createrequest: async (req, res) => {
        try {
            let storeTypeDetails = req.storeTypeDetails;

            if (["wallet", "cod"].includes(req.body.paymentMethod)) {
                if (storeTyp.includes(storeTypeDetails.storeType)) {
                    module.exports.ridebooking(req, res)
                }
                else {
                    module.exports.otherbooking(req, res)
                }
            }
            else {
                return res.json(helper.showValidationErrorResponse('INVALID PAYMENT METHOD'));
            }
        } catch (error) {
            console.log(error)
            return res.json(helper.showDatabaseErrorResponse("INTERNAL DB ERROR", error));
        }
    },

    ridebooking: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let storeTypeDetails = req.storeTypeDetails;

            if (!data.vehicleType) {
                return res.json(helper.showValidationErrorResponse('VECHICLE TYPE REQUIRED'));
            }

            if (!data.user) {
                return res.json(helper.showValidationErrorResponse('USER ID REQUIRED'));
            }
            let user = await User.findOne({ _id: ObjectId(data.user) });
            if (!user) {
                return res.json(helper.showValidationErrorResponse('INVALID_USER'));
            }
            data.otp = utilityFunc.generateOTP(4);
            data.customOrderId = utilityFunc.generatorRandomNumber(6).toLowerCase();
            data.storeType = storeTypeDetails._id;
            data.store = store.storeId;
            data.googleMapKey = store.googleMapKey.server;
            data.timezone = store.timezone;
            data.paymentMode = store.paymentMode;
            data.currency = store.currency.code;
            data.orderTotal = data.estimatedCost ? Number(data.estimatedCost) : 0;
            data.subTotal = data.estimatedCost ? Number(data.estimatedCost) : 0;
            data.distance = data.distance ? Number(data.distance) : 0;
            data.duration = data.estimatedTime ? Number(data.estimatedTime) : 0;

            let vehicleTypeData = await tripServices.getVehicleById(ObjectId(data.vehicleType))
            if (!vehicleTypeData) throw new Error("VEHICLE TYPE NOT FOUND");
            let order_cost = await module.exports.check_cost(store, data)
            if (!order_cost || order_cost.estimatedCost != data.orderTotal) {
                return res.json(helper.showValidationErrorResponse('ORDER AMOUNT IS INVALID'));
            }
            if (data.paymentMethod === "wallet") {

                if (user.wallet < data.orderTotal) {
                    return res.json(helper.showValidationErrorResponse('WALLET_BALANCE_IS_LOW'));
                }
            }
            data.vehicleType = vehicleTypeData;
            data.orderStatus = "pending";
            data.paymentStatus = "pending";
            data.pickUp.location = { type: "Point", coordinates: [data.pickUp.location.lng, data.pickUp.location.lat] };

            if (data.dropOff)
                data.dropOff.location = { type: "Point", coordinates: [data.dropOff.location.lng, data.dropOff.location.lat] };

            data.date_created_utc = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');
            // data.isScheduleProcess = true;
            //console.log("data taxi--", data)
            tripServices.addOrder(data, async (err, resdata) => {
                if (err) {
                    utilityFunc.sendErrorResponse(err, res);
                } else {
                    utilityFunc.sendSuccessResponse({ data: { orderId: resdata._id } }, res);
                }
            });
        } catch (error) {
            console.log(error)
            return res.json(helper.showDatabaseErrorResponse("INTERNAL DB ERROR", error));
        }
    },
    check_cost: async (store, data) => {
        data.storeTypeId = data.storeType
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
    },
    otherbooking: async (req, res) => {
        try {
            let data = req.body;
            let storeTypeDetails = req.storeTypeDetails;
            let store = req.store;
            if (!data.user) {
                return res.json(helper.showValidationErrorResponse('USER IS REQUIRED'));
            }
            let user = await User.findOne({ _id: ObjectId(data.user) })
            data.customOrderId = helper.generatorRandomNumber(6).toLowerCase();

            if (!data.storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE TYPE ID IS REQUIRED'));
            }

            const getStoreType = storeTypeDetails

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID STORE TYPE'));
            }

            data.storeType = getStoreType._id;
            data.store = getStoreType.store._id;

            let getStore = store

            if (!getStore.googleMapKey) {
                return res.json(helper.showValidationErrorResponse('GOOGLEMAP KEY NOT SETUP'));
            }

            if (!getStore.googleMapKey.server) {
                return res.json(helper.showValidationErrorResponse('GOOGLEMAP KEY NOT SETUP'));
            }

            data.googleMapKey = getStore.googleMapKey.server;
            data.timezone = getStore.timezone;
            data.paymentMode = getStore.paymentMode;
            data.currency = getStore.currency.code;

            if (!data.vendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR IS REQUIRED'));
            }

            const getVendor = await User.getUserByIdAsync(data.vendor);
            let unit = store.distanceUnit ? store.distanceUnit : 'km';

            if (getVendor === null) {
                return res.json(helper.showValidationErrorResponse('VENDOR IS INVALID'));
            }
            data.date_created_utc = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');

            let vendorOpenClose = helper.getVendorOpenCloseStatus(getVendor.isVendorAvailable, getVendor.timeSlot, data.date_created_utc, data.timezone);

            if (vendorOpenClose.status == 'Close') {
                return res.json(helper.showValidationErrorResponse('NOT TAKING ORDER'));
            }

            if (!data.items.length === 0) {
                return res.json(helper.showValidationErrorResponse('ITEMS IS REQUIRED'));
            }
            console.log("getStoreType.storeType--", getStoreType.storeType)
            if (getStoreType.storeType == "GROCERY") {
                let attributesdata = await orderService.getvariationId(data.items, getStoreType.storeType);
                data.items = attributesdata
            }

            let lineData = await orderService.generateLineItems(data.items, getStoreType.storeType);

            if (lineData.isValidItem) {
                return res.json(helper.showValidationErrorResponse('INVALID ITEMS'));
            }
            if (lineData.stock_status) {
                let messagdat = helper.showValidationResponseWithData('OUT_OF_STOCK', data)
                messagdat.message = messagdat.message.replace('{productname}', "")
                messagdat.message = messagdat.message.replace('{stock}', "")
                return res.json(messagdat);
            }

            data.line_items = lineData.line_items;
            data.subTotal = helper.roundNumber(lineData.itemTotal);

            if (data.deliveryType === 'DELIVERY') {

                const getDeliveryFee = await Pricing.deliveryFeeCalculation(data, getStoreType, getVendor, unit);

                if (getDeliveryFee.message != null) {
                    return res.json(helper.showValidationResponseWithData(getDeliveryFee.message, data));
                }

                data = { ...data, ...getDeliveryFee };
            } else {
                data.deliveryFee = 0;
            }

            //data.orderTotal = helper.roundNumber(data.subTotal + data.tax ? data.tax : 0 + data.tipAmount ? data.tipAmount : 0 + data.deliveryFee ? data.deliveryFee : 0);
            data.orderTotal = helper.roundNumber(data.subTotal + data.deliveryFee);
            if (data.orderStatus) {
                data.orderStatus = data.orderStatus;
            } else {
                data.orderStatus = "pending";
            }

            //calculate earning
            let vendorCommission = getVendor.commisionType && getVendor.commisionType === "override" ? getVendor.commission : getStoreType.commission;
            let driverCommission = getStoreType.commission.deliveryBoy;
            data.commission = {
                vendor: vendorCommission.vendor,
                deliveryBoy: driverCommission
            }

            const getEarning = await Pricing.caculateEarning(getStoreType.taxSettings, data.subTotal, data.tax ? data.tax : 0, data.tipAmount ? data.tipAmount : 0, data.deliveryFee ? data.deliveryFee : 0, data.commission, store.isSingleVendor, data.discountTotal, data.couponBy);
            data.vendorEarning = getEarning.vendorEarning;
            data.deliveryBoyEarning = getEarning.deliveryBoyEarning;
            data.adminEarning = getEarning.adminEarning;
            data.adminVendorEarning = getEarning.adminVendorEarning;
            data.adminDeliveryBoyEarning = getEarning.adminDeliveryBoyEarning;

            let orderSuccessMsg = await helper.getTerminologyData({ lang: "en", storeId: data.store, constant: "ORDER_ADDED_SUCCESS", type: "order" })
            if (data.paymentMethod === "wallet") {

                // if (!user.wallet) {
                //     return res.json(helper.showValidationErrorResponse('PLEASE_ADD_MONEY_TO_WALLET'));
                // }

                if (user.wallet < data.orderTotal) {
                    return res.json(helper.showValidationErrorResponse('WALLET_BALANCE_IS_LOW'));
                }

                let wallet = helper.roundNumber(user.wallet - data.orderTotal);
                User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {

                        data.transactionDetails = {};
                        data.paymentStatus = "success";
                        Order.addOrder(data, async (err, resdata) => {
                            if (err) {
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("Order Created:", resdata._id);
                                Transaction.userTransaction(resdata, user, store, data.orderTotal, wallet);
                                res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                module.exports.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                                orderService.manageProductStock(resdata.line_items, false);

                            }
                        });
                    }
                });

            } else {
                data.transactionDetails = {};
                data.paymentStatus = "success";
                Order.addOrder(data, async (err, resdata) => {
                    if (err) {
                        console.log(err)
                        res.json(helper.showDatabaseErrorResponse("INTERNAL DB ERROR", err));
                    } else {
                        console.log("Order Created:", resdata._id);
                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                        module.exports.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                        orderService.manageProductStock(resdata.line_items, false);
                    }
                });
            }


        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL SERVER ERROR'));
        }
    },
    beforeRequestSendToVendor: async (store, storeType, order, vendor, user) => {
        try {
            deliveryRequest.autoAcceptRequestByRestaurant(order._id)
            emailService.userOrderConfEmail(user, store, order);
            emailService.vendorNewOrderEmail(user, vendor, store, order);
        } catch (error) {
            console.log("beforeRequestSendToVendor err", error);
        }
    },
    assignDriver: async (req, res) => {
        try {
            let store = req.store
            let data = req.body
            if (!req.params._id) {
                return res.json(helper.showValidationErrorResponse('ORDER ID IS REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsyncForRes(ObjectId(req.params._id));

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID ORDER ID'));
            }
            if (!storeTyp.includes(getOrder.storeType.storeType)) {
                if (getOrder.orderStatus != "confirmed") {
                    return res.json(helper.showValidationErrorResponse('YOU CAN ONLY ASSIGN CONFIRM ORDER'));
                }
            }
            if (getOrder.isDriverAssign && getOrder.scheduledType === "now") {
                return res.json(helper.showValidationErrorResponse('ALREADY_ASSIGNED'));
            }

            if (!data.driver) {
                return res.json(helper.showValidationErrorResponse('DRIVER ID IS REQUIRED'));
            }

            let getUser = await User.findById(data.driver);

            if (getUser === null) {
                return res.json(helper.showValidationErrorResponse('INVALID DRIVER ID'));
            }

            if (getUser.onlineStatus === 'pickupInroute' || getUser.onlineStatus === 'pickupArrived' || getUser.onlineStatus === 'destinationInroute') {
                return res.json(helper.showValidationErrorResponse('DRIVER IS BUSY'));
            }

            if (getUser.onlineStatus === 'offline') {
                return res.json(helper.showValidationErrorResponse('DRIVER IS OFFLINE'));
            }
            let nearByTempDrivers = [];
            if (storeTyp.includes(getOrder.storeType.storeType)) {
                nearByTempDrivers.push(getUser)
                data.resdata = nearByTempDrivers
                data._id = req.params._id
                res.json(helper.showSuccessResponse("REQUEST SEND", { orderId: data._id }));
                if (getOrder.storeType.driverWaitTime) {
                    let driverWaitTime = 'in ' + Number(getOrder.storeType.driverWaitTime) + ' minutes';
                    agenda.schedule(driverWaitTime, 'order not accepted by driver', { orderId: data._id });
                }
                deliveryRequest.afterNearByDriversFound(store, data.resdata, getOrder._id);
            }
            else {
                nearByTempDrivers.push(getUser._id);
                data._id = ObjectId(req.params._id)
                data.nearByTempDrivers = nearByTempDrivers;
                data.isDriverFound = "yes";
                Order.updateOrderVendor(data, (err, resdata) => {
                    if (err) {
                    } else {
                        if (resdata.storeType.driverWaitTime) {
                            let driverWaitTime = 'in ' + Number(resdata.storeType.driverWaitTime) + ' minutes';
                            agenda.schedule(driverWaitTime, 'check order status driver', { orderId: resdata._id });
                        }
                        res.json(helper.showSuccessResponse("REQUEST SEND", { orderId: resdata._id }));
                        deliveryRequest.afterAcceptRequest(resdata);
                    }
                });
            }
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL SERVER ERROR'));
        }
    }
}