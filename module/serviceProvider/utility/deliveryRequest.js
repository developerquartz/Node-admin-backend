const User = require('../../../models/userTable');
const axios = require('axios');
const agenda = require('../../../cron/agenda');
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

module.exports = {
    getNearByUsers,
    afterAcceptRequest
}