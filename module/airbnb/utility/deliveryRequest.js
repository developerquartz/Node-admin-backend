const User = require('../../../models/userTable');
const axios = require('axios');
const agenda = require('../../../cron/agenda');
const Push = require('../../../helper/pushNotification');

let getNearByUsers = async (source, radius, query, limit) => {
    console.log("source", source)
    console.log("radius", radius)
    console.log("query", query)
    console.log("limit", limit)
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
            { $limit: limit }
        ]);
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
let sendBookinNotificationToVendor = async (store, storeType, getOrder, vendor, user) => {
    try {

        let lang = store.language.code;
        let keys = store.firebase;

        let fcmData = {
            orderId: getOrder._id,
            type: "order"
        }
        let title = __('BOOKING_REQUEST_SUCCESS');
        let body = await helper.getTerminologyData({ lang: lang, storeId: store._id, constant: "NEW_BOOKING_VENDOR", name: user.name, type: "order" })

        if (vendor.firebaseTokens) {
            Push.sendPushToAll(vendor.firebaseTokens, title, body, fcmData, keys);
        }
    } catch (error) {
        console.log("afterOrderSuccess err axios", error);
    }
}
let afterOrderSuccess = async (store, storeType, getOrder, user) => {
    try {

        /*
        if (getStoreType.vendorWaitTime) {
            let vendorWaitTime = 'in ' + Number(getStoreType.vendorWaitTime) + ' minutes';
            agenda.schedule(vendorWaitTime, 'check order status', { orderId: orderId });
        }
        */
        console.log("\n<===afterOrderSuccess==>");

        try {
            let socketUrlApi = env.socketUrlApi + '/request/vendor';
            console.log("\nsocketUrlApi:", socketUrlApi);

            let title = __('BOOKING_REQUEST_SUCCESS');
            let body = await helper.getTerminologyData({ lang: store.language.code, storeId: store._id, constant: "NEW_BOOKING_VENDOR", name: user.name, type: "order" })
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
            console.log("afterOrderSuccess err axios", error);
        }

    } catch (error) {
        console.log("afterOrderSuccess err", error);
    }
}
module.exports = {
    getNearByUsers,
    afterAcceptRequest,
    afterOrderSuccess,
    sendBookinNotificationToVendor
}