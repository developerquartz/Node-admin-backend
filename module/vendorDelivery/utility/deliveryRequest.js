const axios = require('axios');
const User = require('../../../models/userTable');
const agenda = require('../../../cron/agenda');
const stripeConnect = require('../../../helper/stripeConnectTransfer');
const socketHelper = require('../../../helper/socketHelper');
const sendRequestHelper = require('../../../helper/sendRequest');
const Push = require('../../../helper/pushNotification');

let afterAcceptRequest = async (order) => {
    try {
        if (order.scheduledType === "now" && order.deliveryType == "DELIVERY") {
            if (order.vendor.orderAutoCancel && order.store.orderAutoCancel) {
                if (order.storeType.driverWaitTime) {
                    let driverWaitTime = 'in ' + Number(order.storeType.driverWaitTime) + ' minutes';
                    agenda.schedule(driverWaitTime, 'check order status driver', { orderId: order._id });
                }
            }
        }

        let orderResponseData = {
            orderId: order._id,
            orderStatus: order.orderStatus,
            isDriverAssign: order.isDriverAssign,
            isDriverArrivedAtPickup: order.isDriverArrivedAtPickup,
            isOrderMarkReady: order.isOrderMarkReady,
            type: "orderAcceptedByRestaurant"
        }

        socketHelper.singleSocket(order.user._id, "Customer", orderResponseData);
        socketHelper.singleSocket(order.vendor._id, "Vendor", orderResponseData);
        socketHelper.singleSocket(order.store._id, "Store", { orderId: order._id }, 'storeListen');

        if (order.user.firebaseTokens) {
            let keys = order.store.firebase;

            let fcmData = {
                orderId: order._id,
                type: "orderAcceptedByRestaurant"
            }
            let { title, body } = await getNotificationTitle(order);
            // let titlec = __('ORDER_ACCEPTED');
            // let bodyc = await helper.getTerminologyData({ lang: "en", storeId: order.store._id, constant: "ORDER_ACCEPTED_CUSTOMER", type: "order" });

            Push.sendPushToAll(order.user.firebaseTokens, title, body, fcmData, keys);
        }

        if (order.deliveryType == "DELIVERY" && order.scheduledType === "now") {
            sendRequestHelper.sendRequest(order._id);
        }
    } catch (error) {
        console.log("afterAcceptRequest err", error);
    }
}

let afterRejectRequest = async (order) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/vendor/reject';
        let lang = order.store.language && order.store.language.code || "en";
        let title = '';
        let body = '';

        switch (order.storeType.storeType) {

            case 'CARRENTAL':
            case 'AIRBNB':
                title = __('BOOKING_DECLINED');
                body = await helper.getTerminologyData({ lang: lang, storeId: order.store._id, constant: "BOOKING_DECLINED_CUSTOMER", type: "order" });
                break;
            default:
                title = __('ORDER_DECLINED');
                body = await helper.getTerminologyData({ lang: lang, storeId: order.store._id, constant: "ORDER_DECLINED_CUSTOMER", type: "order" });

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
        console.log("afterRejectRequest err", error);
    }
}

let afterScheduleProcess = async (order) => {
    try {

        if (order.storeType.driverWaitTime) {
            let driverWaitTime = 'in ' + Number(order.storeType.driverWaitTime) + ' minutes';
            agenda.schedule(driverWaitTime, 'check order status driver', { orderId: order._id });
        }

        try {
            let socketUrlApi = env.socketUrlApi + '/request/vendor/process';
            let title = __('ORDER_PROCESS');
            let body = await helper.getTerminologyData({ lang: "en", storeId: order.store._id, constant: "ORDER_PROCESS_VENDOR", type: "order" });

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
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store._id, constant: "ORDER_READY_DRIVER", type: "order" });
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

        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store._id, constant: "ORDER_CUSTOMER_COMPLETED", name: order.vendor.name, type: "order" });

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

let afterOrderCancelled = async (title, body, order) => {
    try {

        let socketUrl = env.socketUrlApi + '/request/vendor/cancelled';

        // Send a POST request
        let request = await axios({
            method: 'post',
            url: socketUrl,
            data: {
                title: title,
                body: body,
                orderId: order._id
            }
        });

    } catch (error) {
        console.log("error socket afterOrderCancelled", error);
    }
}

let afterOrderCancelledByVendor = async (getOrder) => {
    try {

        let socketUrl = env.socketUrlApi + '/request/vendor/cancelled';
        let lang = getOrder.store.language && getOrder.store.language.code || "en";
        let title = '';
        let body = '';

        switch (getOrder.storeType.storeType) {

            case 'CARRENTAL':
            case 'AIRBNB':
                title = __('BOOKING_CANCELLED');
                body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store._id, constant: "BOOKING_CUSTOMER_CANCELLED", name: getOrder.user.name, type: "order" });

                break;
            default:
                title = __('ORDER_CANCELLED');
                body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store._id, constant: "ORDER_CANCELLLED_CUSTOMER", name: getOrder.user.name, type: "order" });

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
let getNearByUsers = async (source, radius, query, limit) => {

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
            { $limit: limit },
            { $project: { _id: 1 } }
        ]);
}
let getNotificationTitle = async (getOrder) => {
    let lang = getOrder.store.language && getOrder.store.language.code ? getOrder.store.language.code : "en";
    let title = '';
    let body = '';
    switch (getOrder.storeType.storeType) {

        case 'CARRENTAL':
            title = __('BOOKING_ACCEPTED');
            body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "BOOKING_ACCEPTED_CUSTOMER_BY_VENDOR", type: "order" });

            break;
        case 'FOOD':
            title = __('ORDER_ACCEPTED');
            body = await helper.getTerminologyData({ lang: lang, storeId: getOrder.store, constant: "ORDER_ACCEPTED_CUSTOMER", type: "order" });

            break;
        default:
            title = __('ORDER_ACCEPTED');
            body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_ACCEPTED_CUSTOMER", type: "order" });

            break;
    }
    return { title, body };


}

module.exports = {
    afterAcceptRequest,
    afterRejectRequest,
    getDeliveryArea,
    afterVendorDeliveredRequest,
    afterMarkReady,
    afetrPaymentNotify,
    afterScheduleProcess,
    afterOrderCancelled,
    afterBirdEyeViewOrderAssign,
    getNearByUsers,
    afterOrderCancelledByVendor
}