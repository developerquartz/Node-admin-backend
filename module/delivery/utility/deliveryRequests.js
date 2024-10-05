const Order = require('../../../models/ordersTable');
const Push = require('../../../helper/pushNotification');
const ReportHelper = require('./reports');
const Transaction = require('./transaction');
const emailService = require('./emailService');
const agenda = require('../../../cron/agenda');
const stripeConnect = require('../../../helper/stripeConnectTransfer');
const storeTyp = ["TAXI", "PICKUPDROP"];
const socketHelper = require('../../../helper/socketHelper');
const dropmultiLocation = require("../../../models/dropmultiLocation");
const utilityFunc = require('../utility/functions');

let afterSendRequest = async (store, resdata, orderId) => {
    try {
        let isDriverFound = "no";
        let nearByTempDrivers = [];
        if (resdata.length > 0) {

            isDriverFound = "yes";
            let firebaseTokens = [];
            resdata.forEach(dresponse => {
                nearByTempDrivers.push(dresponse._id);
                ReportHelper.addRequestReport(dresponse._id)
                let requestSocketDriverData = {
                    firebaseTokens: dresponse.firebaseTokens,
                }
                firebaseTokens.push(requestSocketDriverData);
            });
            nearByDriversRequestNotification(store, firebaseTokens, orderId);

            socketHelper.nearByDriverSocket(nearByTempDrivers, { type: "orderRequest", orderId: orderId });

        }

        let updateOrder = await Order.findByIdAndUpdate(orderId, { nearByTempDrivers: nearByTempDrivers, isDriverFound: isDriverFound }, { new: true })
            .populate({ path: 'storeType', select: 'storeType driverWaitTime' })
            .exec();

        //cron setup
        if (["TAXI", "PICKUPDROP", "SERVICEPROVIDER"].includes(updateOrder.storeType.storeType) && updateOrder.storeType.driverWaitTime) {
            let driverWaitTime = 'in ' + Number(updateOrder.storeType.driverWaitTime) + ' minutes';
            agenda.schedule(driverWaitTime, 'order not accepted by driver', { orderId: updateOrder._id });
        }

        socketHelper.singleSocket(updateOrder.user, "Customer", { isDriverFound: isDriverFound, nearByTempDrivers: nearByTempDrivers, orderId: orderId });

    } catch (error) {
        console.log("afterNearByDriversFound err", error);
    }
}
let setPriceafterSendRequest = async (store, resdata, orderId) => {
    try {
        let isDriverFound = "no";
        let nearByTempDrivers = [];
        let tripFare = []
        let getOrder = await Order.getOrderByIdAsync(orderId);
        if (resdata.length > 0) {
            isDriverFound = "yes";
            resdata.forEach(dresponse => {
                let requestSocketDriverData = {
                    firebaseTokens: dresponse.firebaseTokens,
                }
                let tripAmount = 0
                let distance = 0
                let pricePerUnitDistance = 0
                let pricePerUnitTime = 0
                let basePrice = 0
                let pricePerUnitDistanceData = dresponse.vehicles.values.find((item) => item.valueType == "pricePerUnitDisatance");
                if (pricePerUnitDistanceData) {
                    pricePerUnitDistance = Number(pricePerUnitDistanceData.value) || 0
                }
                let pricePerUnitTimeData = dresponse.vehicles.values.find((item) => item.valueType == "pricePerUnitTime");
                if (pricePerUnitTimeData) {
                    pricePerUnitTime = Number(pricePerUnitTimeData.value) || 0
                }
                let basePriceData = dresponse.vehicles.values.find((item) => item.valueType == "basePrice");
                if (basePriceData) {
                    basePrice = Number(basePriceData.value) || 0
                }
                if ((pricePerUnitDistanceData && pricePerUnitDistanceData.value != "") || (pricePerUnitTimeData && pricePerUnitTimeData.value != "") || (basePriceData && basePriceData.value != "")) {
                    let totalDistancePrice = pricePerUnitDistance * getOrder.distance;
                    let totalTimePrice = pricePerUnitTime * getOrder.duration;
                    let totalPrice = basePrice + totalDistancePrice + totalTimePrice;
                    tripAmount = Math.floor(utilityFunc.roundNumber(totalPrice));
                    distance = getOrder.distance
                } else {
                    tripAmount = getOrder.orderTotal
                    distance = getOrder.distance
                    pricePerUnitDistance = getOrder.vehicleType.pricePerUnitDistance,
                        basePrice = getOrder.vehicleType.basePrice
                    pricePerUnitTime = getOrder.vehicleType.pricePerUnitTimeMinute
                }
                nearByTempDrivers.push(dresponse._id);
                let tripFareData = {
                    driver: dresponse._id,
                    amount: tripAmount,
                    pricePerUnitDistance: pricePerUnitDistance,
                    basePrice: basePrice,
                    pricePerUnitTime: pricePerUnitTime
                }
                tripFare.push(tripFareData)
                ReportHelper.addRequestReport(dresponse._id)
                nearByDriversRequestNotification(store, [requestSocketDriverData], orderId);
                socketHelper.nearByDriverSocket(nearByTempDrivers, { type: "orderRequest", orderId: orderId });
            });
        }
        let updateOrder = await Order.findByIdAndUpdate(orderId, { nearByTempDrivers: nearByTempDrivers, isDriverFound: isDriverFound, tripFare: tripFare }, { new: true })
            .populate({ path: 'storeType', select: 'storeType driverWaitTime' })
            .exec();

        //cron setup
        if (["TAXI", "PICKUPDROP", "SERVICEPROVIDER"].includes(updateOrder.storeType.storeType) && updateOrder.storeType.driverWaitTime) {
            let driverWaitTime = 'in ' + Number(updateOrder.storeType.driverWaitTime) + ' minutes';
            agenda.schedule(driverWaitTime, 'order not accepted by driver', { orderId: updateOrder._id });
        }

        socketHelper.singleSocket(updateOrder.user, "Customer", { isDriverFound: isDriverFound, nearByTempDrivers: nearByTempDrivers, orderId: orderId });

    } catch (error) {
        console.log("afterNearByDriversFound err", error);
    }
}
let nearByDriversRequestNotification = async (store, firebaseTokens, orderId) => {
    try {
        let lang = store.language.code;
        const getOrder = await Order.findById(orderId, 'bidAmount store user isDriverAssign orderStatus storeType')
            .populate({ path: "user", select: "name" })
            .populate({ path: "storeType", select: "storeType" })
            .exec();

        // let title = storeTyp.includes(getOrder.storeType.storeType) ? __('RIDE_REQUEST') : __('TRIP_REQUEST_SUCCESS');
        let title = ''
        let body = ''
        switch (getOrder.storeType.storeType) {
            case 'TAXI':
                title = __('RIDE_REQUEST');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_REQUEST_FROM", name: getOrder.user.name, type: "trip" });
            case 'PICKUPDROP':
                title = __('RIDE_REQUEST');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_REQUEST_FROM", name: getOrder.user.name, type: "trip" });

                break;
            case 'SERVICEPROVIDER':
                title = __('BOOKING_REQUEST_SUCCESS');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_REQUEST_FROM", name: getOrder.user.name, type: "order" });

                break;
            default:
                title = __('TRIP_REQUEST_SUCCESS');
                body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_REQUEST_FROM", name: getOrder.user.name, type: "order" });

                break;
        }
        //let body = storeTyp.includes(getOrder.storeType.storeType) ? await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_REQUEST_FROM", name: getOrder.user.name, type: "trip" }) : await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_REQUEST_FROM", name: getOrder.user.name, type: "order" });

        let keys = store.firebase;

        let fcmData = {
            orderId: orderId,
            type: "orderRequest"
        }

        firebaseTokens.forEach(dresponse => {
            if (dresponse.firebaseTokens) {
                Push.sendPushToAll(dresponse.firebaseTokens, title, body, fcmData, keys);
            }
        });
    } catch (error) {
        console.log("nearByDriversRequestNotification err", error);
    }
}

let afterOrderAssign = async (store, orderId) => {
    try {
        let lang = store.language.code;
        const getOrder = await Order.findById(orderId, 'bidAmount nearByTempDrivers store user isDriverAssign orderStatus storeType driver oldDriver')
            .populate({ path: "user" })
            .populate({ path: "storeType", select: "storeType" })
            .exec();
        let firebaseTokens = getOrder.user.firebaseTokens
        let title = ''
        let body = ''
        switch (getOrder.storeType.storeType) {
            case 'TAXI':
                title = __('UPDATION_ON_SCHEDULE_RIDE');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_ASSIGN_TO_OTHER", name: getOrder.driver.name, type: "trip" });
                break;
            case 'PICKUPDROP':
                title = __('RIDE_REQUEST');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_REQUEST_FROM", name: getOrder.user.name, type: "trip" });

                break;
            case 'SERVICEPROVIDER':
                title = __('BOOKING_REQUEST_SUCCESS');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_REQUEST_FROM", name: getOrder.user.name, type: "order" });

                break;
            default:
                title = __('TRIP_REQUEST_SUCCESS');
                body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_REQUEST_FROM", name: getOrder.user.name, type: "order" });

                break;
        }
        let keys = store.firebase;
        let fcmData = {
            orderId: orderId,
            type: "orderRequest"
        }
        Push.sendPushToAll(firebaseTokens, title, body, fcmData, keys);
        socketHelper.nearByDriverSocket(getOrder.nearByTempDrivers, { type: "orderAcceptedByDriver", orderId: getOrder._id });
        if (getOrder.oldDriver) {
            socketHelper.singleSocket(getOrder.oldDriver, "Driver", { orderId, type: "newDriverAssign" });
        }
    } catch (error) {
        console.log("nearByDriversRequestNotification err", error);
    }
}
let sendRequestToDriver = async (store, driver, orderId) => {
    try {
        let lang = store.language.code;
        const getOrder = await Order.findById(orderId, 'bidAmount store user isDriverAssign orderStatus storeType')
            .populate({ path: "driver", select: "name" })
            .populate({ path: "storeType", select: "storeType" })
            .exec();
        let firebaseTokens = driver.firebaseTokens
        let title = ''
        let body = ''
        switch (getOrder.storeType.storeType) {
            case 'TAXI':
                title = __('RIDE_REQUEST');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_REQUEST_FROM_DRIVER", name: getOrder.driver.name, type: "trip" });
                break;
            case 'PICKUPDROP':
                title = __('RIDE_REQUEST');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_REQUEST_FROM", name: getOrder.driver.name, type: "trip" });

                break;
            case 'SERVICEPROVIDER':
                title = __('BOOKING_REQUEST_SUCCESS');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_REQUEST_FROM", name: getOrder.driver.name, type: "order" });

                break;
            default:
                title = __('TRIP_REQUEST_SUCCESS');
                body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_REQUEST_FROM", name: getOrder.driver.name, type: "order" });

                break;
        }
        let keys = store.firebase;
        let fcmData = {
            orderId: orderId,
            type: "orderRequest"
        }
        Push.sendPushToAll(firebaseTokens, title, body, fcmData, keys);
        socketHelper.nearByDriverSocket([driver._id], { type: "orderRequest", orderId: orderId, isScheduleOrderAssign: true });
        let update = { $addToSet: { nearByTempDrivers: driver._id } }
        let resdata = await Order.findOneAndUpdate({ _id: orderId }, update, { new: true });
    } catch (error) {
        console.log("nearByDriversRequestNotification err", error);
    }
}

let afterDriverRejectRequest = (store, order, user) => {
    ReportHelper.addRejectedReport(user._id)
    socketHelper.nearByDriverSocket(order.nearByTempDrivers, { type: "orderRejected", orderId: order._id });
}

let afterDriverAcceptRequest = async (store, getOrder) => {
    try {

        ReportHelper.addAcceptedReport(getOrder.driver._id);
        switch (getOrder.scheduledType) {
            case 'now':
                acceptInstantRequestNotification(store, getOrder);
                break;
            default:
                acceptScheduleRequestNotification(store, getOrder);
                break;
        }

        let orderResponseData = {
            orderId: getOrder._id,
            orderStatus: getOrder.orderStatus,
            isDriverAssign: getOrder.isDriverAssign,
            isDriverArrivedAtPickup: getOrder.isDriverArrivedAtPickup,
            isOrderMarkReady: getOrder.isOrderMarkReady,
            type: "orderAcceptedByDriver"
        }

        //emit socket to other driver who has been recieved request
        socketHelper.nearByDriverSocket(getOrder.nearByTempDrivers, { type: "orderAcceptedByDriver", orderId: getOrder._id });
        socketHelper.singleSocket(getOrder.user._id, "Customer", orderResponseData);

        if (!['TAXI', 'PICKUPDROP', 'SERVICEPROVIDER'].includes(getOrder.storeType.storeType)) {
            //update status to vendor
            socketHelper.singleSocket(getOrder.vendor._id, "Vendor", orderResponseData);
        }

        socketHelper.singleSocket(store.storeId, "Store", { orderId: getOrder._id }, 'storeListen');

    } catch (error) {
        console.log("afterDriverAcceptRequest err", error);
    }
}
let acceptScheduleRequestNotification = async (store, getOrder) => {
    try {

        let fcmData = {
            orderId: getOrder._id,
            type: "orderAcceptedByDriver"
        }
        let keys = store.firebase;
        let lang = getOrder.user.language && getOrder.user.language.code ? getOrder.user.language.code : store.language.code;
        if (getOrder.user.firebaseTokens) {
            let title = ''
            let body = ''
            switch (getOrder.storeType.storeType) {
                case 'TAXI':
                    title = __('REQUEST_CONFIRMED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_SCHEDULE_ACCEPTED_CUSTOMER", name: getOrder.driver.name, type: "trip" });
                case 'PICKUPDROP':
                    title = __('REQUEST_CONFIRMED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_SCHEDULE_ACCEPTED_CUSTOMER", name: getOrder.driver.name, type: "trip" });
                    break;
                case 'SERVICEPROVIDER':
                    title = __('BOOKING_ASSIGNED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_SCHEDULE_ACCEPTED_CUSTOMER", name: getOrder.driver.name, type: "order" });
                    break;
                case "FOOD":
                    title = __('TRIP_ASSIGNED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CUSTOMER_PICKUP", name: getOrder.driver.name, type: "order" });
                    break;
                default:
                    title = __('TRIP_ASSIGNED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CUSTOMER_PICKUP", name: getOrder.driver.name, type: "order" });
                    break;
            }

            Push.sendPushToAll(getOrder.user.firebaseTokens, title, body, fcmData, keys);
        }

    } catch (error) {
        console.log("acceptScheduleRequestNotification err", error);
    }
}
let acceptInstantRequestNotification = async (store, getOrder) => {
    try {

        let fcmData = {
            orderId: getOrder._id,
            type: "orderAcceptedByDriver"
        }
        let keys = store.firebase;
        let lang = getOrder.user.language && getOrder.user.language.code ? getOrder.user.language.code : store.language.code;
        if (getOrder.user.firebaseTokens) {
            let title = ''
            let body = ''
            switch (getOrder.storeType.storeType) {
                case 'TAXI':
                    title = __('REQUEST_CONFIRMED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_ACCEPTED_CUSTOMER", name: getOrder.driver.name, type: "trip" });
                case 'PICKUPDROP':
                    title = __('REQUEST_CONFIRMED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_ACCEPTED_CUSTOMER", name: getOrder.driver.name, type: "trip" });

                    break;
                case 'SERVICEPROVIDER':
                    title = __('BOOKING_ASSIGNED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_ACCEPTED_CUSTOMER", name: getOrder.driver.name, type: "order" });
                    break;
                case "FOOD":
                    title = __('TRIP_ASSIGNED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CUSTOMER_PICKUP", name: getOrder.driver.name, type: "order" });
                    break;
                default:
                    title = __('TRIP_ASSIGNED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CUSTOMER_PICKUP", name: getOrder.driver.name, type: "order" });
                    break;
            }

            Push.sendPushToAll(getOrder.user.firebaseTokens, title, body, fcmData, keys);
        }

    } catch (error) {
        console.log("acceptInstantRequestNotification err", error);
    }
}
let afterDriverArrivedRequest = async (store, getOrder) => {
    try {
        let keys = store.firebase;
        let lang = getOrder.user.language && getOrder.user.language.code ? getOrder.user.language.code : store.language.code;

        let fcmData = {
            orderId: getOrder._id,
            type: "orderArrivedAtRestaurant"
        }

        if (getOrder.user.firebaseTokens) {
            let title = ''
            let body = ''
            switch (getOrder.storeType.storeType) {
                case 'TAXI':
                    title = __('TRIP_CUSTOMER_ARRIVED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_CUSTOMER_ARRIVED", name: getOrder.driver.name, type: "trip" });
                case 'PICKUPDROP':
                    title = __('TRIP_CUSTOMER_ARRIVED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_CUSTOMER_ARRIVED", name: getOrder.driver.name, type: "trip" });
                    break;
                case 'SERVICEPROVIDER':
                    title = __('BOOKING_ARRIVED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_CUSTOMER_ARRIVED", name: getOrder.driver.name, type: "order" });
                    break;
                case 'FOOD':
                    title = __('TRIP_ARRIVED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "ORDER_CUSTOMER_ARRIVED", name: getOrder.driver.name, type: "order" });
                    break;
                default:
                    title = __('TRIP_ARRIVED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "STORE_ORDER_CUSTOMER_ARRIVED", name: getOrder.driver.name, type: "order" });
                    break;
            }
            Push.sendPushToAll(getOrder.user.firebaseTokens, title, body, fcmData, keys);
        }

        let orderResponseData = {
            orderId: getOrder._id,
            type: "orderArrivedAtRestaurant"
        }

        let customerOrderResponseData = {
            orderId: getOrder._id,
            orderStatus: getOrder.orderStatus,
            isDriverAssign: getOrder.isDriverAssign,
            isDriverArrivedAtPickup: getOrder.isDriverArrivedAtPickup,
            isOrderMarkReady: getOrder.isOrderMarkReady,
            type: "orderArrivedAtRestaurant"
        }

        //update status to customer
        socketHelper.singleSocket(getOrder.user._id, "Customer", customerOrderResponseData);

        if (!['TAXI', 'PICKUPDROP', 'SERVICEPROVIDER'].includes(getOrder.storeType.storeType)) {
            //update status to vendor
            socketHelper.singleSocket(getOrder.vendor._id, "Vendor", orderResponseData);
        }

        socketHelper.singleSocket(store.storeId, "Store", { orderId: getOrder._id }, 'storeListen');

    } catch (error) {
        console.log("afterDriverArrivedRequest err", error);
    }
}
let afterDriverScheduleStartedRequest = async (store, getOrder) => {
    try {
        let keys = store.firebase;
        let lang = getOrder.user.language && getOrder.user.language.code ? getOrder.user.language.code : store.language.code;

        let fcmData = {
            orderId: getOrder._id,
            type: "orderArrivedAtRestaurant"
        }

        if (getOrder.user.firebaseTokens) {
            let title = __('TRIP_SCHEDULE_START');
            let body = __('TRIP_SCHEDULE_START_CUSTOMER');
            switch (getOrder.storeType.storeType) {
                case 'TAXI':
                    title = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_SCHEDULE_START", name: getOrder.user.name, type: "trip" });
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_SCHEDULE_START_CUSTOMER", name: getOrder.driver.name, type: "trip" });
                    break;
                default:
                    title = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_SCHEDULE_START", name: getOrder.user.name, type: "trip" });
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_SCHEDULE_START_CUSTOMER", name: getOrder.driver.name, type: "trip" });
                    break;
            }
            Push.sendPushToAll(getOrder.user.firebaseTokens, title, body, fcmData, keys);
        }

        let customerOrderResponseData = {
            orderId: getOrder._id,
            orderStatus: getOrder.orderStatus,
            isDriverAssign: getOrder.isDriverAssign,
            isDriverArrivedAtPickup: getOrder.isDriverArrivedAtPickup,
            isOrderMarkReady: getOrder.isOrderMarkReady,
            type: "orderScheduleStarted"
        }

        //update status to customer
        socketHelper.singleSocket(getOrder.user._id, "Customer", customerOrderResponseData);

    } catch (error) {
        console.log("afterDriverScheduleStartedRequest err", error);
    }
}
let afterDriverPickedOrTripStartedRequest = async (store, getOrder) => {
    try {
        let keys = store.firebase;
        let lang = getOrder.user.language && getOrder.user.language.code ? getOrder.user.language.code : store.language.code;
        let orderResponseData = {
            orderId: getOrder._id,
            type: "orderPickedByDriver"
        }

        if (getOrder.user.firebaseTokens) {
            let title = ''
            let body = ''
            switch (getOrder.storeType.storeType) {
                case 'TAXI':
                    title = __('RIDE_START');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_READY_DRIVER", name: getOrder.driver.name, type: "trip" });
                    break;
                case 'PICKUPDROP':
                    title = __('RIDE_START');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "PICKUPDROP_READY_DRIVER", name: getOrder.driver.name, type: "trip" });
                    break;
                case 'SERVICEPROVIDER':
                    title = __('BOOKING_START');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_READY_DRIVER", name: getOrder.driver.name, type: "order" });
                    break;
                case 'FOOD':
                    title = __('TRIP_PICKED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CUSTOMER_PICKED", name: getOrder.driver.name, type: "order" });
                    break;
                default:
                    title = __('TRIP_PICKED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CUSTOMER_PICKED", name: getOrder.driver.name, type: "order" });
                    break;
            }
            Push.sendPushToAll(getOrder.user.firebaseTokens, title, body, orderResponseData, keys);
        }

        let customerOrderResponseData = {
            orderId: getOrder._id,
            orderStatus: getOrder.orderStatus,
            isDriverAssign: getOrder.isDriverAssign,
            isDriverArrivedAtPickup: getOrder.isDriverArrivedAtPickup,
            isOrderMarkReady: getOrder.isOrderMarkReady,
            type: "orderPickedByDriver"
        }

        socketHelper.singleSocket(getOrder.user._id, "Customer", customerOrderResponseData);

        if (!['TAXI', 'PICKUPDROP', 'SERVICEPROVIDER'].includes(getOrder.storeType.storeType)) {
            //update status to vendor
            socketHelper.singleSocket(getOrder.vendor._id, "Vendor", orderResponseData);
        }

        socketHelper.singleSocket(store.storeId, "Store", { orderId: getOrder._id }, 'storeListen');

    } catch (error) {
        console.log("afterDriverPickedOrTripStartedRequest err", error);
    }
}

let afterDriverDeliveredRequest = async (store, getOrder) => {
    try {
        let keys = store.firebase;
        let lang = getOrder.user.language && getOrder.user.language.code ? getOrder.user.language.code : store.language.code;
        let orderResponseData = {
            orderId: getOrder._id,
            type: "orderCompletedByDriver"
        }

        if (getOrder.user.firebaseTokens) {
            // let title = storeTyp.includes(getOrder.storeType.storeType) ? __('RIDE_COMPLETE') : __('TRIP_COMPLETED_SUCCESS');
            // let body = storeTyp.includes(getOrder.storeType.storeType) ? await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_CUSTOMER_COMPLETED", name: getOrder.driver.name, type: "trip" }) : await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CUSTOMER_COMPLETED", name: getOrder.driver.name, type: "order" });
            let title = ''
            let body = ''
            switch (getOrder.storeType.storeType) {
                case 'TAXI':
                    title = __('RIDE_COMPLETE');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "TRIP_COMPLETED_MSG", name: getOrder.driver.name, type: "trip" });
                    break;
                case 'PICKUPDROP':
                    title = __('PICKUPDROP_COMPLETED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "PICKUPDROP_CUSTOMER_COMPLETED", name: getOrder.driver.name, type: "trip" });
                    break;
                case 'SERVICEPROVIDER':
                    title = __('BOOKING_COMPLETED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_CUSTOMER_COMPLETED", name: getOrder.driver.name, type: "order" });
                    break;
                default:
                    title = __('TRIP_COMPLETED_SUCCESS');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CUSTOMER_COMPLETED", name: getOrder.driver.name, type: "order" });
                    break;
            }
            Push.sendPushToAll(getOrder.user.firebaseTokens, title, body, orderResponseData, keys);
        }

        ReportHelper.addCompletedReport(getOrder.driver._id);

        let customerOrderResponseData = {
            orderId: getOrder._id,
            orderStatus: getOrder.orderStatus,
            isDriverAssign: getOrder.isDriverAssign,
            isDriverArrivedAtPickup: getOrder.isDriverArrivedAtPickup,
            isOrderMarkReady: getOrder.isOrderMarkReady,
            type: "orderCompletedByDriver"
        }

        socketHelper.singleSocket(getOrder.user._id, "Customer", customerOrderResponseData);

        if (!['TAXI', 'PICKUPDROP', 'SERVICEPROVIDER'].includes(getOrder.storeType.storeType)) {
            ReportHelper.addCompletedReport(getOrder.vendor._id);
            socketHelper.singleSocket(getOrder.vendor._id, "Vendor", orderResponseData);
        }

        if (getOrder.paymentMethod === "stripe") {
            onlineTransfer(store, getOrder);
        }

        socketHelper.singleSocket(store.storeId, "Store", { orderId: getOrder._id }, 'storeListen');

    } catch (error) {
        console.log("afterDriverDeliveredRequest err", error);
    }
}

let restProcessAfterCompletion = (store, getOrder) => {
    try {
        if (["TAXI", "PICKUPDROP", "SERVICEPROVIDER"].includes(getOrder.storeType.storeType)) {
            Transaction.transactionForTaxi(store, getOrder);
            if ((["TAXI"].includes(getOrder.storeType.storeType))) {

                emailService.userTripCompletedEmail(getOrder);
                emailService.driverTripCompletedEmail(getOrder);
            }


        } else {
            Transaction.transactionForFoodOrGrocerType(store, getOrder);
            emailService.userOrderDeliveredEmail(getOrder);
        }
    } catch (error) {
        console.log("restProcessAfterCompletion err", error);
    }
}

let afterDriverCancelledRequest = async (store, getOrder) => {
    try {
        let keys = store.firebase;
        let lang = getOrder.user.language && getOrder.user.language.code ? getOrder.user.language.code : store.language.code;
        let orderResponseData = {
            orderId: getOrder._id,
            type: "orderCancelledByByDriver"
        }

        if (getOrder.user.firebaseTokens) {
            // let title = storeTyp.includes(getOrder.storeType.storeType) ? __('RIDE_CANCELLED') : __('TRIP_COMPLETED_SUCCESS');
            // let body = storeTyp.includes(getOrder.storeType.storeType) ? await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "RIDE_CANCELLED", name: getOrder.driver.name, type: "trip" }) : await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CUSTOMER_COMPLETED", name: getOrder.driver.name, type: "order" });
            let title = ''
            let body = ''
            switch (getOrder.storeType.storeType) {
                case 'TAXI':
                    title = __('RIDE_CANCELLED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "RIDE_CUSTOMER_CANCELLED", name: getOrder.driver.name, type: "trip" });
                case 'PICKUPDROP':
                    title = __('RIDE_CANCELLED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "RIDE_CUSTOMER_CANCELLED", name: getOrder.driver.name, type: "trip" });

                    break;
                case 'SERVICEPROVIDER':
                    title = __('BOOKING_CANCELLED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_DRIVER_CANCELLED", name: getOrder.driver.name, type: "order" });
                    break;
                default:
                    title = __('ORDER_CANCELLED');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CANCELLLED_CUSTOMER", name: getOrder.driver.name, type: "order" });

                    break;
            }

            Push.sendPushToAll(getOrder.user.firebaseTokens, title, body, orderResponseData, keys);
        }

        let customerOrderResponseData = {
            orderId: getOrder._id,
            orderStatus: getOrder.orderStatus,
            isDriverAssign: getOrder.isDriverAssign,
            isDriverArrivedAtPickup: getOrder.isDriverArrivedAtPickup,
            isOrderMarkReady: getOrder.isOrderMarkReady,
            type: "orderCancelledByByDriver"
        }

        socketHelper.singleSocket(getOrder.user._id, "Customer", customerOrderResponseData);

        if (!['TAXI', 'PICKUPDROP', 'SERVICEPROVIDER'].includes(getOrder.storeType.storeType)) {
            socketHelper.singleSocket(getOrder.vendor._id, "Vendor", orderResponseData);
        }

        socketHelper.singleSocket(store.storeId, "Store", { orderId: getOrder._id }, 'storeListen');

    } catch (error) {
        console.log("afterDriverCancelledRequest err", error);
    }
}

let onlineTransfer = async (getStore, order) => {
    try {
        //if online transfer enabled from admin and stripe connect feature available for vendor and driver..
        //this is only apply if stripe connect enabled from admin
        if (getStore.commissionTransfer && getStore.commissionTransfer.status && getStore.commissionTransfer.status === "online") {
            if (getStore.commissionTransfer.payoutSchedule === "later") {
                let current = new Date();
                current = new Date(current.setDate(current.getDate() + getStore.commissionTransfer.scheduleDays));
                console.log("current", current);
                agenda.schedule(current, 'online transfer', { id: order._id });
            } else if (getStore.commissionTransfer.payoutSchedule === "realTime") {
                stripeConnect.stripeCTransfer(order);
            }
        }
    } catch (error) {
        console.log("onlineTransfer", error);
    }
}

module.exports = {
    afterSendRequest,
    afterDriverRejectRequest,
    afterDriverAcceptRequest,
    afterDriverArrivedRequest,
    afterDriverPickedOrTripStartedRequest,
    afterDriverDeliveredRequest,
    afterDriverCancelledRequest,
    restProcessAfterCompletion,
    afterDriverScheduleStartedRequest,
    afterOrderAssign,
    sendRequestToDriver,
    setPriceafterSendRequest
}



