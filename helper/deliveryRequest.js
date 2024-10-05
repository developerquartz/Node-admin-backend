const User = require('../models/userTable');
const axios = require('axios');
const agenda = require('../cron/agenda');
const Order = require('../models/ordersTable');
const ObjectId = require('objectid');
const stripeConnect = require('./stripeConnectTransfer');
const Push = require('./pushNotification');
const socketHelper = require('./socketHelper');

let getNearByUsers = async (source, radius, query, limit, vehicleTypeQuery = {}, vehicleType) => {
    let newQuery = {};
    if (vehicleType && vehicleType.length) {
        newQuery['vehicles.vehicleType'] = { $in: vehicleType }
    }
    if (vehicleTypeQuery) {
        newQuery = { ...newQuery, ...vehicleTypeQuery };
    }
    console.log("newQuery:==>", newQuery)

    return User.aggregate(
        [
            {
                "$geoNear": {
                    "near": source,
                    "distanceField": "distance",
                    key: "userLocation",
                    "spherical": true,
                    "maxDistance": radius,
                    query: query,
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
            { $unwind: { path: '$vehicles', "preserveNullAndEmptyArrays": true } },
            {
                $match: newQuery
            },
            { $limit: limit },
            { $project: { _id: 1, vehicle: 1, vehicleType: "$vehicleType" } }
        ]);
}

let afterOrderSuccess = async (orderId, user, getStoreType, storeId, vendor, store, paymentMethod) => {
    try {
        if (store.orderAutoCancel && vendor.orderAutoCancel && getStoreType.vendorWaitTime) {
            let vendorWaitTime = 'in ' + Number(getStoreType.vendorWaitTime) + ' minutes';
            agenda.schedule(vendorWaitTime, 'check order status', { orderId: orderId });

        }


        try {
            let socketUrlApi = env.socketUrlApi + '/request/vendor';
            let title = __('ORDER_REQUEST_SUCCESS');
            let body = await helper.getTerminologyData({ lang: "en", storeId: storeId, constant: "NEW_ORDER_VENDOR", name: user.name, type: "order" })
            // Send a POST request

            let request = await axios({
                method: 'post',
                url: socketUrlApi,
                data: {
                    title: title,
                    body: body,
                    orderId: orderId
                }
            });
        } catch (error) {
            console.log("afterOrderSuccess err axios", error);
        }

    } catch (error) {
        console.log("afterOrderSuccess err", error);
    }
}

let afterAcceptRequest = async (order) => {
    try {

        if (order.isDriverFound === "yes" && order.scheduledType === "now") {

            if (order.storeType.driverWaitTime) {
                let driverWaitTime = 'in ' + Number(order.storeType.driverWaitTime) + ' minutes';
                agenda.schedule(driverWaitTime, 'check order status driver', { orderId: order._id });
            }

        }

        try {
            //send request to nearbyDrivers
            let socketUrlApi = env.socketUrlApi + '/request/drivers';
            let title = __('TRIP_REQUEST_SUCCESS');
            let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_REQUEST_FROM", name: order.user.name, type: "order" });
            let titlec = __('ORDER_ACCEPTED');
            let bodyc = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_ACCEPTED_CUSTOMER", type: "order" });

            if (["CARRENTAL", "AIRBNB"].includes(order.storeType.storeType)) {
                titlec = __('BOOKING_ACCEPTED');
                bodyc = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "BOOKING_ACCEPTED_CUSTOMER_BY_VENDOR", type: "order" });

            }

            // Send a POST request
            let request = await axios({
                method: 'post',
                url: socketUrlApi,
                data: {
                    title: title,
                    body: body,
                    titlec: titlec,
                    bodyc: bodyc,
                    orderId: order._id
                }
            });
        } catch (error) {
            console.log("afterAcceptRequest err axios", error);
        }
    } catch (error) {
        console.log("afterAcceptRequest err", error);
    }
}

let afterOrderStatus = async (order) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/vendor/cancelled';
        let title = __('ORDER_CANCELLED');
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_REFUND_CUSTOMER", type: "order" });

        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                title: title,
                body: body,
                orderId: order._id
            }
        });

    } catch (error) {
        console.log("afterCronOrderStatus err", error);
    }
}

let afterRejectRequest = async (getOrder) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/vendor/reject';
        let title = __('ORDER_DECLINED');
        let body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_DECLINED_CUSTOMER", type: "order" });
        if (["CARRENTAL", "AIRBNB"].includes(getOrder.storeType.storeType)) {
            title = __('BOOKING_DECLINED');
            body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "BOOKING_DECLINED_CUSTOMER", type: "order" });

        }
        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                title: title,
                body: body,
                orderId: getOrder._id
            }
        });
    } catch (error) {
        console.log("afterRejectRequest err", error);
    }
}

let afterDriverAcceptRequest = async (order) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/driver/accept';
        let title = __('TRIP_ASSIGNED_SUCCESS');
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_CUSTOMER_PICKUP", name: order.driver.name, type: "order" });
        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                title: title,
                body: body,
                orderId: order._id
            }
        });
    } catch (error) {
        console.log("afterDriverAcceptRequest err", error);
    }
}

let afterDriverArrivedRequest = async (order) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/driver/arrived';
        // let title = __('TRIP_ARRIVED_SUCCESS');
        // let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_CUSTOMER_ARRIVED", name: order.driver.name, type: "order" });
        let title = ''
        let body = ''
        let lang = order.store.language.code || "en";
        switch (order.storeType.storeType) {
            case 'TAXI':
                title = __('TRIP_CUSTOMER_ARRIVED');
                body = await helper.getTerminologyData({ lang: lang, storeId: order.store._id, constant: "TRIP_CUSTOMER_ARRIVED", name: order.driver.name, type: "trip" });
            case 'PICKUPDROP':
                title = __('TRIP_CUSTOMER_ARRIVED');
                body = await helper.getTerminologyData({ lang: lang, storeId: order.store._id, constant: "TRIP_CUSTOMER_ARRIVED", name: order.driver.name, type: "trip" });
                break;
            case 'SERVICEPROVIDER':
                title = __('BOOKING_ARRIVED_SUCCESS');
                body = await helper.getTerminologyData({ lang: lang, storeId: order.store._id, constant: "BOOKING_CUSTOMER_ARRIVED", name: order.driver.name, type: "order" });
                break;
            case 'FOOD':
                title = __('TRIP_ARRIVED_SUCCESS');
                body = await helper.getTerminologyData({ lang: lang, storeId: order.store._id, constant: "ORDER_CUSTOMER_ARRIVED", name: order.driver.name, type: "order" });
                break;
            default:
                title = __('TRIP_ARRIVED_SUCCESS');
                body = await helper.getTerminologyData({ lang: lang, storeId: order.store._id, constant: "STORE_ORDER_CUSTOMER_ARRIVED", name: order.driver.name, type: "order" });
                break;
        }
        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                title: title,
                body: body,
                orderId: order._id
            }
        });
    } catch (error) {
        console.log("afterDriverArrivedRequest err", error);
    }
}

let afterDriverPickedRequest = async (order) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/driver/picked';
        let title = __('TRIP_PICKED_SUCCESS');
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_CUSTOMER_PICKED", name: order.driver.name, type: "order" });
        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                title: title,
                body: body,
                orderId: order._id
            }
        });
    } catch (error) {
        console.log("afterDriverPickedRequest err", error);
    }
}

let afterScheduleProcess = async (order) => {
    try {

        if (order.isDriverFound === "yes") {
            if (order.storeType.driverWaitTime) {
                let driverWaitTime = 'in ' + Number(order.storeType.driverWaitTime) + ' minutes';
                agenda.schedule(driverWaitTime, 'check order status driver', { orderId: order._id });
            }
        }

        try {
            let socketUrlApi = env.socketUrlApi + '/request/vendor/process';
            let title = __('ORDER_PROCESS');
            let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_PROCESS_VENDOR", type: "order" });

            // Send a POST request
            let request = await axios({
                method: 'post',
                url: socketUrlApi,
                data: {
                    title: title,
                    body: body,
                    orderId: order._id
                }
            });
        } catch (error) {
            console.log("afterScheduleProcess err inner", error);
        }
    } catch (error) {
        console.log("afterScheduleProcess err", error);
    }
}

let afterMarkReady = async (order) => {
    try {

        let socketUrlApi = env.socketUrlApi + '/request/vendor/mark';
        let title = __('ORDER_READY');
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_READY_DRIVER", type: "order" });
        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                title: title,
                body: body,
                orderId: order._id
            }
        });
    } catch (error) {
        console.log("afterMarkReady err", error);
    }
}

let afterVendorDeliveredRequest = async (order) => {
    try {
        onlineTransfer(order);

        let socketUrlApi = env.socketUrlApi + '/request/driver/delivered';
        let title = __('TRIP_COMPLETED_SUCCESS');
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_CUSTOMER_COMPLETED", name: order.vendor.name, type: "order" });

        if (["CARRENTAL", "AIRBNB"].includes(order.storeType.storeType)) {
            title = __('BOOKING_COMPLETED_SUCCESS');
            body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "BOOKING_CUSTOMER_COMPLETED", name: order.vendor.name, type: "order" });

        }

        try {
            // Send a POST request
            let request = await axios({
                method: 'post',
                url: socketUrlApi,
                data: {
                    title: title,
                    body: body,
                    orderId: order._id
                }
            });
        } catch (error) {
            console.log("afterVendorDeliveredRequest axios err", error);
        }

    } catch (error) {
        console.log("afterVendorDeliveredRequest err", error);
    }
}

let afterDriverDeliveredRequest = async (order) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/driver/delivered';
        let title = __('TRIP_COMPLETED_SUCCESS');
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_CUSTOMER_COMPLETED", name: order.driver.name, type: "order" });

        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                title: title,
                body: body,
                orderId: order._id
            }
        });

        onlineTransfer(order);

    } catch (error) {
        console.log("afterDriverDeliveredRequest err", error);
    }
}

let onlineTransfer = async (order) => {
    try {
        //if online transfer enabled from admin and stripe connect feature available for vendor and driver..
        //this is only apply if stripe connect enabled from admin
        let getStore = order.store;
        console.log("getStore", getStore);
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

let getDeliveryArea = (radius, unit) => {
    if (unit) {
        unit = unit;
    } else {
        unit = 'km';
    }

    let deliveryArea = 0;

    if (unit === 'miles') {
        deliveryArea = helper.milesToMeter(radius);
    } else {
        deliveryArea = helper.kmToMeter(radius);
    }

    return deliveryArea;
}


let autoAcceptRequestByRestaurant = async (orderId) => {
    try {
        let data = {
            _id: orderId
        };

        const getOrder = await Order.getOrderByIdAsyncForRes(data._id)

        let vehicleType = getOrder.storeType.vehicleType;

        data.orderStatus = "confirmed";
        data.date_vendor_confirmed_utc = new Date();
        data.isScheduleProcess = getOrder.scheduledType === "now" ? true : false;
        let nearByTempDrivers = [];
        data.nearByTempDrivers = [];
        data.isDriverFound = "no";
        if (getOrder.deliveryType == "DELIVERY") {

            let radius = getOrder.storeType.deliveryAreaDriver ? getOrder.storeType.deliveryAreaDriver : 20;
            let unit = getOrder.store.distanceUnit ? getOrder.store.distanceUnit : 'km';
            radius = getDeliveryArea(radius, unit);

            let query = {
                store: ObjectId(getOrder.store._id),
                onlineStatus: 'online',
                status: "approved",
                role: 'DRIVER'
            };
            let assignVehicleQuery = {};
            if (getOrder.store.codWalletLimit) {

                if (getOrder.paymentMethod === "cod") {
                    query['wallet'] = { "$exists": true, "$gt": getOrder.storeType.codWalletLimit };
                }
            }
            if (getOrder.totalWeight) {
                assignVehicleQuery = {
                    "vehicleType.weight": { "$exists": true },
                    "vehicleType.weight.maxWeight": { $gte: getOrder.totalWeight },
                    "vehicleType.weight.minWeight": { $lte: getOrder.totalWeight }

                };

            }

            let limit = getOrder.storeType.noOfDriversPerRequest ? getOrder.storeType.noOfDriversPerRequest : 5;

            let results = await getNearByUsers(getOrder.vendor.userLocation, radius, query, limit, assignVehicleQuery, vehicleType);
            if (results.length > 0) {

                results.forEach(element => {
                    nearByTempDrivers.push(element._id);
                });

                data.nearByTempDrivers = nearByTempDrivers;
                data.isDriverFound = "yes";

            }
        }

        Order.updateOrderVendor(data, (err, resdata) => {
            if (err) {
            } else {
                afterAcceptRequest(resdata);
            }
        });
    } catch (error) {
        console.log(">>>>>>>>>>>>>", error);
    }
}

let afetrPaymentNotify = async (orderId, status, from) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/payment/notify';

        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                orderId: orderId,
                status: status,
                from: from
            }
        });
    } catch (error) {
        console.log("afetrPaymentNotify err", error);
    }
}

let afterOrderCancelled = async (getOrder, getNearByUsers) => {
    try {

        let socketUrl = env.socketUrlApi + '/request/vendor/cancelled';

        let lang = getOrder.store.language.code;
        let title = '';
        let body = '';

        switch (getOrder.storeType.storeType) {
            case 'TAXI':
                title = __('RIDE_CANCELLED');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "RIDE_CUSTOMER_CANCELLED", name: getOrder.user.name, type: "trip" });
            case 'PICKUPDROP':
                title = __('RIDE_CANCELLED');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "RIDE_CUSTOMER_CANCELLED", name: getOrder.user.name, type: "trip" });

                break;
            case 'SERVICEPROVIDER':
                title = __('BOOKING_CANCELLED');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store._id, constant: "BOOKING_DRIVER_CANCELLED", name: getOrder.user.name, type: "order" });

                break;
            default:
                title = __('ORDER_CANCELLED');
                body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CANCELLLED_CUSTOMER", name: getOrder.user.name, type: "order" });

                break;
        }

        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrl,
            data: {
                title: title,
                body: body,
                orderId: getOrder._id
            }
        });

    } catch (error) {
        console.log("error socket afterOrderCancelled", error);
    }
}

let afterOrderCancelledNew = async (getOrder) => {
    try {

        let storeTyp = ["TAXI", "PICKUPDROP", "SERVICEPROVIDER"];

        let store = getOrder.store;
        let lang = store.language.code
        let fcmData = {
            orderId: getOrder._id,
            type: "orderCancelled"
        }
        // console.log("is working---> afterOrderCancelledNew")
        let keys = store.firebase;
        let title = storeTyp.includes(getOrder.storeType.storeType) ? __('RIDE_CANCELLED') : __('ORDER_CANCELLED');

        if (getOrder.user.firebaseTokens) {

            // let body = storeTyp.includes(getOrder.storeType.storeType) ? await helper.getTerminologyData({ lang:lang, storeId: getOrder.store._id, constant: "RIDE_CANCELLED", name: getOrder.user.name, type: "trip" }) : await helper.getTerminologyData({ lang:lang, storeId: getOrder.store._id, constant: "ORDER_REFUND_CUSTOMER", name: getOrder.user.name, type: "order" });
            let body = ''
            switch (getOrder.storeType.storeType) {
                case 'TAXI':
                    title = __('RIDE_CANCELLED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "RIDE_CUSTOMER_CANCELLED", name: getOrder.user.name, type: "trip" });
                case 'PICKUPDROP':
                    title = __('RIDE_CANCELLED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "RIDE_CUSTOMER_CANCELLED", name: getOrder.user.name, type: "trip" });

                    break;
                case 'SERVICEPROVIDER':
                    title = __('BOOKING_CANCELLED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store._id, constant: "BOOKING_CUSTOMER_CANCELLED", name: getOrder.user.name, type: "order" });

                    break;
                default:
                    title = __('ORDER_CANCELLED');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CANCELLLED_CUSTOMER_BY_CUSTOMER", name: getOrder.user.name, type: "order" });

                    break;
            }

            Push.sendPushToAll(getOrder.user.firebaseTokens, title, body, fcmData, keys);
        }

        let orderResponseData = {
            orderId: getOrder._id,
            orderStatus: getOrder.orderStatus,
            isDriverAssign: getOrder.isDriverAssign,
            isDriverArrivedAtPickup: getOrder.isDriverArrivedAtPickup,
            isOrderMarkReady: getOrder.isOrderMarkReady,
            type: "orderCancelled"
        }

        if (getOrder.nearByTempDrivers && getOrder.nearByTempDrivers.length > 0) {
            socketHelper.nearByDriverSocket(getOrder.nearByTempDrivers, { type: "orderCancelled", orderId: getOrder._id });
        }

        socketHelper.singleSocket(getOrder.user._id, "Customer", orderResponseData);

        if (!['TAXI', 'PICKUPDROP', 'SERVICEPROVIDER'].includes(getOrder.storeType.storeType)) {
            //update status to vendor
            socketHelper.singleSocket(getOrder.vendor._id, "Vendor", orderResponseData);
        }
        if (getOrder.isDriverAssign) {
            let isthereAnyPoolTrips = await Order.getDriverCurrentPoolTrips(getOrder.driver._id);
            if (!isthereAnyPoolTrips.length) {
                await User.findByIdAndUpdate(getOrder.driver._id, { onlineStatus: "online" });
                let bodyv = getOrder.customOrderId + __('has been cancelled');
                socketHelper.singleSocket(getOrder.driver._id, "Driver", orderResponseData);

                if (getOrder.driver.firebaseTokens) {
                    Push.sendPushToAll(getOrder.driver.firebaseTokens, title, bodyv, fcmData, keys);
                }
            }
            if (!isthereAnyPoolTrips.length) { // manage for avoid fraud settings....;
                await User.findOneAndUpdate({ _id: getOrder.driver._id, isFoundFraud: true }, { onlineStatus: "offline" });
            }
        }

        socketHelper.singleSocket(store._id, "Store", { orderId: getOrder._id }, 'storeListen');

    } catch (error) {
        console.log("afterOrderCancelledNew err", error);
    }
}
let afterAutoOrderCancelled = async (getOrder) => {
    try {

        let storeTyp = ["TAXI", "PICKUPDROP", "SERVICEPROVIDER"];

        let store = getOrder.store;
        let lang = store.language.code
        let fcmData = {
            orderId: getOrder._id,
            type: "orderCancelled"
        }
        let keys = store.firebase;
        let title = storeTyp.includes(getOrder.storeType.storeType) ? __('RIDE_CANCELLED') : __('ORDER_CANCELLED');

        if (getOrder.user.firebaseTokens) {
            let body = ''
            switch (getOrder.storeType.storeType) {
                case 'TAXI':
                    title = __('RIDE_CANCELLED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "RIDE_CUSTOMER_AUTO_CANCELLED", name: getOrder.user.name, type: "trip" });
                case 'PICKUPDROP':
                    title = __('RIDE_CANCELLED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "RIDE_CUSTOMER_AUTO_CANCELLED", name: getOrder.user.name, type: "trip" });

                    break;
                case 'SERVICEPROVIDER':
                    title = __('BOOKING_CANCELLED');
                    body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store._id, constant: "BOOKING_CUSTOMER_AUTO_CANCELLED", name: getOrder.user.name, type: "order" });

                    break;
                default:
                    title = __('ORDER_CANCELLED');
                    body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_CANCELLLED_CUSTOMER_BY_CUSTOMER", name: getOrder.user.name, type: "order" });

                    break;
            }

            Push.sendPushToAll(getOrder.user.firebaseTokens, title, body, fcmData, keys);
        }

        let orderResponseData = {
            orderId: getOrder._id,
            orderStatus: getOrder.orderStatus,
            isDriverAssign: getOrder.isDriverAssign,
            isDriverArrivedAtPickup: getOrder.isDriverArrivedAtPickup,
            isOrderMarkReady: getOrder.isOrderMarkReady,
            type: "orderCancelled"
        }

        if (getOrder.nearByTempDrivers && getOrder.nearByTempDrivers.length > 0) {
            socketHelper.nearByDriverSocket(getOrder.nearByTempDrivers, { type: "orderCancelled", orderId: getOrder._id });
        }

        socketHelper.singleSocket(getOrder.user._id, "Customer", orderResponseData);

        if (!['TAXI', 'PICKUPDROP', 'SERVICEPROVIDER'].includes(getOrder.storeType.storeType)) {
            socketHelper.singleSocket(getOrder.vendor._id, "Vendor", orderResponseData);
        }
        if (getOrder.isDriverAssign) {
            let isthereAnyPoolTrips = await Order.getDriverCurrentPoolTrips(getOrder.driver._id);
            if (!isthereAnyPoolTrips.length) {
                await User.findByIdAndUpdate(getOrder.driver._id, { onlineStatus: "online" });
                let bodyv = getOrder.customOrderId + __('has been cancelled');
                socketHelper.singleSocket(getOrder.driver._id, "Driver", orderResponseData);

                if (getOrder.driver.firebaseTokens) {
                    Push.sendPushToAll(getOrder.driver.firebaseTokens, title, bodyv, fcmData, keys);
                }
            }
            if (!isthereAnyPoolTrips.length) { // manage for avoid fraud settings....;
                await User.findOneAndUpdate({ _id: getOrder.driver._id, isFoundFraud: true }, { onlineStatus: "offline" });
            }
        }

        socketHelper.singleSocket(store._id, "Store", { orderId: getOrder._id }, 'storeListen');

    } catch (error) {
        console.log("afterOrderCancelledNew err", error);
    }
}
const afterOrderCancelledForBeforeTrip = async (getOrder) => {
    try {
        if (getOrder.nearByTempDrivers && getOrder.nearByTempDrivers.length > 0) {
            socketHelper.nearByDriverSocket(getOrder.nearByTempDrivers, { type: "orderCancelled", orderId: getOrder._id });
        }
        getOrder.orderStatus = "archived"; // removing order for trip request cancel from customer before accept driver.
        await getOrder.save();
    } catch (error) {
        console.log("error:===>", error)
    }
};
let afterBirdEyeViewOrderAssign = async (order) => {
    try {
        //send request to nearbyDrivers
        let socketUrlApi = env.socketUrlApi + '/request/bev/driver';
        let title = __('TRIP_REQUEST_SUCCESS');
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_REQUEST_FROM", name: order.user.name, type: "order" });

        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                title: title,
                body: body,
                orderId: order._id
            }
        });
    } catch (error) {
        console.log("afterBirdEyeViewOrderAssign err", error);
    }
}
let afterFoundFraudDriver = async (getOrder) => {
    try {
        let store = getOrder.store;
        let driver = getOrder.driver;
        let avoidFraudSetting = store.avoidFraudSetting;
        let getBlockTime = helper.roundNumber(avoidFraudSetting.driverBlockTime * 60) //converting into minutes;
        let unblockTime = `in ${getBlockTime} minutes`;
        agenda.schedule(unblockTime, "check-found-fraud", { driverId: driver._id });

        var names = driver.name.split(' ');
        let firstName = names[0];
        let body = __("BLOCK_ACCOUNT_DESC");
        let title = __('BLOCK_ACCOUNT_TITLE', firstName);

        let update = { isFoundFraud: true, onlineStatus: "offline", fraud_found_date_utc: new Date() };
        let updateDriver = await User.findOneAndUpdate({ _id: getOrder.driver._id }, update, { new: true });
        if (driver.firebaseTokens.length) {
            let fcmData = {
                userId: driver._id,
            }
            let keys = store.firebase;
            Push.sendPushToAll(driver.firebaseTokens, title, body, fcmData, keys);
        }
    } catch (error) {
        console.log("afterFoundFraudDriver err", error);
    }
}
module.exports = {
    getNearByUsers,
    afterOrderSuccess,
    afterAcceptRequest,
    afterRejectRequest,
    getDeliveryArea,
    afterDriverAcceptRequest,
    afterDriverArrivedRequest,
    afterDriverPickedRequest,
    afterVendorDeliveredRequest,
    afterDriverDeliveredRequest,
    afterMarkReady,
    afterOrderStatus,
    autoAcceptRequestByRestaurant,
    afetrPaymentNotify,
    afterScheduleProcess,
    afterOrderCancelled,
    afterBirdEyeViewOrderAssign,
    afterOrderCancelledNew,
    afterOrderCancelledForBeforeTrip,
    afterFoundFraudDriver,
    afterAutoOrderCancelled
}