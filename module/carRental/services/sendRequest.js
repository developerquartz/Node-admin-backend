const deliveryRequest = require('../utility/deliveryRequest');
const sendRequest = require('../../delivery/utility/deliveryRequests');
const helperFun = require("../utility/helperFunction")
const Order = require('../../../models/ordersTable');
const User = require('../../../models/userTable');
const ObjectId = require('objectid');

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