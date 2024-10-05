const User = require('../../../models/userTable');
const axios = require('axios');
const agenda = require('../../../cron/agenda');
const Order = require('../../../models/ordersTable');
const ObjectId = require('objectid');
const stripeConnect = require('../../../helper/stripeConnectTransfer');
const deliveryMiddleWare = require('./delivery');

let afterOrderSuccess = async (orderId, user, getStoreType, storeId) => {
    try {

        if (getStoreType.vendorWaitTime) {
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

let afterRejectRequest = async (order) => {
    try {

        let socketUrlApi = env.socketUrlApi + '/request/vendor/reject';
        let title = __('ORDER_DECLINED');
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_DECLINED_CUSTOMER", type: "order" });

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
        let title = __('TRIP_ARRIVED_SUCCESS');
        let body = await helper.getTerminologyData({ lang: "en", storeId: order.store, constant: "ORDER_CUSTOMER_ARRIVED", name: order.driver.name, type: "order" });
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


let autoAcceptRequestByRestaurant = async (orderId, userToken, apiKey, res) => {
    try {
        let data = {
            _id: orderId
        };

        const getOrder = await Order.getOrderByIdAsyncForRes(data._id);

        data.orderStatus = "confirmed";
        data.date_vendor_confirmed_utc = new Date();
        data.isScheduleProcess = getOrder.scheduledType === "now" ? true : false;
        let nearByTempDrivers = [];
        data.nearByTempDrivers = [];
        data.isDriverFound = "no";

        if (getOrder.deliveryType == "DELIVERY") {

            // let radius = getOrder.storeType.deliveryAreaDriver ? getOrder.storeType.deliveryAreaDriver : 20;
            // let unit = getOrder.store.distanceUnit ? getOrder.store.distanceUnit : 'km';
            // radius = getDeliveryArea(radius, unit);

            // let query = {
            //     store: ObjectId(getOrder.store._id),
            //     onlineStatus: 'online',
            //     status: "approved",
            //     role: 'DRIVER'
            // };

            // if (getOrder.storeType.codWalletLimit) {

            //     if (getOrder.paymentMethod === "cod") {
            //         query['wallet'] = { "$exists": true, "$gt": getOrder.storeType.codWalletLimit };
            //     }
            // }

            // let limit = getOrder.storeType.noOfDriversPerRequest ? getOrder.storeType.noOfDriversPerRequest : 5;

            // let results = await getNearByUsers(getOrder.vendor.userLocation, radius, query, limit);

            // if (results.length > 0) {

            //     results.forEach(element => {
            //         nearByTempDrivers.push(element._id);
            //     });

            //     data.nearByTempDrivers = nearByTempDrivers;
            //     data.isDriverFound = "yes";

            // }

            let driverQuery = {
                apiType: 'sendRequest',
                orderId: orderId,
                storeTypeId: data.storeType,
                source: { lat: getOrder.pickUp.location.coordinates[1], lng: getOrder.pickUp.location.coordinates[0] },
                token: userToken,
                apiKey: apiKey
            };
            let results = await deliveryMiddleWare.deliveryApiCall(driverQuery, res);
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

module.exports = {
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
    afterBirdEyeViewOrderAssign
}