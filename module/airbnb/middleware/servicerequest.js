const socketHelper = require('../../../helper/socketHelper');
const Order = require('../../../models/ordersTable')
const sendRequest = require('../../delivery/utility/deliveryRequests');
let sndrquestSrviceProvider = async (resdata, driverData) => {
    try {
        let orderId = resdata._id, provider = driverData
        const getOrder = await Order.OrderById(orderId)
        let store = getOrder.store;
        sendRequest.afterSendRequest(store, provider, orderId);
    } catch (error) {
        console.log("err in send request to driver---", error)
    }
}

module.exports = {
    sndrquestSrviceProvider
}