const Order = require('../../../models/ordersTable');
const Push = require('./pushNotification');
const agenda = require('../../../cron/agenda');
const ReportHelper = require('./reports');
const axios = require('axios');
const storeTyp = ["TAXI", "PICKUPDROP"];

let afterNearByDriversFound = async (store, resdata, orderId) => {
    try {
        let nearByTempDrivers = [];
        let isDriverFound = "yes";
        let firebaseTokens = [];
        resdata.forEach(dresponse => {
            nearByTempDrivers.push(dresponse._id);
            ReportHelper.addRequestReport(dresponse._id)
            let requestSocketDriverData = {
                firebaseTokens: dresponse.firebaseTokens,
            }
            firebaseTokens.push(requestSocketDriverData);
        });
        await Order.findByIdAndUpdate(orderId, { nearByTempDrivers: nearByTempDrivers, isDriverFound: isDriverFound });
        nearByDriversRequestNotification(store, firebaseTokens, orderId);
        nearByDriverSocket(nearByTempDrivers, { type: "orderRequest", orderId: orderId });
    } catch (error) {
        console.log("afterNearByDriversFound err", error);
    }
}
let nearByDriversRequestNotification = async (store, firebaseTokens, orderId) => {
    try {
        const getOrder = await Order.findById(orderId, 'store isDriverAssign orderStatus storeType')
            .populate({ path: "user", select: "name" })
            .populate({ path: "storeType", select: "storeType" })
            .exec();

        let title = storeTyp.includes(getOrder.storeType.storeType) ? "Ride Request" : __('TRIP_REQUEST_SUCCESS');
        let body = storeTyp.includes(getOrder.storeType.storeType) ? `Ride request from: ${getOrder.user.name}` : await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_REQUEST_FROM", name: getOrder.user.name, type: "order" });

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
let nearByDriverSocket = async (users, resdata) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/nearby/socket';

        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                users: users,
                resdata: resdata
            }
        });
    } catch (error) {
        console.log("nearByDriverSocket err", error);
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
let autoAcceptRequestByRestaurant = async (orderId) => {
    try {
        let data = {
            _id: orderId
        };

        const getOrder = await Order.getOrderByIdAsyncForRes(data._id);

        data.orderStatus = "confirmed";
        data.date_vendor_confirmed_utc = new Date();
        data.isScheduleProcess = getOrder.scheduledType === "now" ? true : false;
        data.nearByTempDrivers = [];
        data.isDriverFound = "no";
        Order.updateOrderVendor(data, (err, resdata) => {
            if (err) {
                console.log(err)
            } else {
                console.log("accepted");
            }
        });
    } catch (error) {
        console.log(">>>>>>>>>>>>>", error);
    }
}
module.exports = {
    afterNearByDriversFound,
    afterAcceptRequest,
    autoAcceptRequestByRestaurant
}