const deliveryRequest = require('../utility/deliveryRequest');
const sendRequest = require('../../delivery/utility/deliveryRequests');
const helperFun = require("../utility/helperFunction")
const Order = require('../../../models/ordersTable');
const User = require('../../../models/userTable');
const ObjectId = require('objectid');
// let sndrquestSrviceProvider = async (resdata) => {
//     try {
//         let orderId = resdata._id, providerId = resdata.driver, data = {}, poductId = resdata.serviceId

//         // const getOrder = await Order.findById(orderId)
//         //     .populate({ path: "store", select: "distanceUnit api_key" })
//         //     .populate({ path: "storeType", select: "storeType vehicleType deliveryAreaDriver noOfDriversPerRequest codWalletLimit" })
//         //     .populate({ path: "user", select: "userLocation" })
//         //     .exec();


//         const getOrder = await Order.OrderById(orderId)
//         let store = getOrder.store;

//         let storeTypeDetails = getOrder.storeType;
//         data._id = getOrder._id
//         let nearByTempDrivers = [];
//         data.nearByTempDrivers = [];
//         data.isDriverFound = "no";
//         let radius = storeTypeDetails.deliveryAreaDriver ? storeTypeDetails.deliveryAreaDriver : 20;
//         let unit = store.distanceUnit ? store.distanceUnit : 'km';
//         let maxDistance = helper.getDeliveryArea(radius, unit);
//         let query = {
//             store: store._id,
//             onlineStatus: 'online',
//             status: "approved",
//             role: 'DRIVER'
//         };

//         if (getOrder.isPreferredDriver && getOrder.isPreferredDriver === "yes") {
//             query._id = getOrder.preferredDriverId;
//         }

//         //let limit = storeTypeDetails.noOfDriversPerRequest ? storeTypeDetails.noOfDriversPerRequest : 10;

//         if (getOrder.storeType.codWalletLimit) {

//             if (getOrder.paymentMethod === "cod") {
//                 query['wallet'] = { "$exists": true, "$gt": getOrder.storeType.codWalletLimit };
//             }
//         }
//         if (getOrder.storeType.requestType == "Random") {
//             let serviceId
//             if (poductId.length) {
//                 serviceId = poductId.map(element => element = ObjectId(element))
//             }
//             console.log("serviceId in random--")
//             console.log(serviceId)
//             query.serviceId = { $all: serviceId }
//             console.log("query--in random")
//             console.log(query)
//             let limit = getOrder.storeType.noOfDriversPerRequest ? getOrder.storeType.noOfDriversPerRequest : 5;

//             let results = await deliveryRequest.getNearByUsers(getOrder.pickUp.location, maxDistance, query, limit);
//             // if (results.length > 0) {

//             //     results.forEach(element => {
//             //         nearByTempDrivers.push(element._id);
//             //     });

//             //     data.nearByTempDrivers = nearByTempDrivers;
//             //     data.isDriverFound = "yes";

//             // }
//             console.log(results)
//             if (results.length) {
//                 sendRequest.afterSendRequest(store, results, getOrder._id);
//             }
//         }
//         else {
//             let provider_array = []
//             if (!providerId) {
//                 console.log("SERVICE PROVIDER REQUIRED")
//             }
//             const getuser = await User.findOne({ _id: ObjectId(providerId) })
//             if (getuser) {
//                 provider_array.push(getuser)
//                 sendRequest.afterSendRequest(store, provider_array, orderId);
//             }
//         }
//         // else {
//         //     if (!providerId) {
//         //         console.log("SERVICE PROVIDER REQUIRED")
//         //     }
//         //     nearByTempDrivers.push(providerId);

//         //     data.nearByTempDrivers = nearByTempDrivers;
//         //     data.isDriverFound = "yes";
//         // }
//         // Order.updateOrderVendor(data, (err, resdata) => {
//         //     if (err) {
//         //         console.log("INTERNAL_DB_ERROR", err)
//         //     } else {
//         //         let orderResponseData = {
//         //             orderId: resdata._id,
//         //             success: true,
//         //             type: resdata.orderStatus
//         //         }
//         //         deliveryRequest.afterAcceptRequest(resdata);
//         //     }
//         // });
//     } catch (error) {
//         console.log("sndrquestSrviceProvider err", error);
//     }
// }
let checkDrivers = async (data) => {
    try {
        console.log("-data--",data)
        let serviceId =data.serviceId.map(element => element = ObjectId(element))
        let query = {
            store: data.storeId,
            onlineStatus: 'online',
            status: "approved",
            role: 'DRIVER'
        };
        query.serviceId = { $all: serviceId }
        if (data.codWalletLimit) {

            if (data.paymentMethod === "cod") {
                query['wallet'] = { "$exists": true, "$gt": data.codWalletLimit };
            }
        }
        let radius = data.radius
        let unit = data.unit
        let maxDistance = helperFun.getDeliveryArea(radius, unit);
        let limit =data.limit
        let results = await deliveryRequest.getNearByUsers(data.pickUp.location, maxDistance, query, limit);
        return results
    } catch (error) {
        console.log("err in driver find---",error)
        return []
    }
}
module.exports = {
    checkDrivers
}