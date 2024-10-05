const ObjectId = require('objectid');
const orderMiddleware = require('../middleware/order');
const orderService = require('../services/order');

module.exports = {

    userOrderMiddleware: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data.user = user._id;
            let store = user.store;
            data.store = store.storeId;
            data.apiKey = store.apiKey
            let storeTypeDetails = req.storeTypeDetails;
            data.storeType = storeTypeDetails._id;

            let orderData = orderMiddleware.getOrderData(data, store, res) // get order data
            data = { ...data, ...orderData };
            let orderSuccessMsg = await orderService.getTerminologyData({ lang: "en", storeId: data.store, constant: "ORDER_ADDED_SUCCESS", type: "order" });
            //place order function call
            orderMiddleware.placeOrder(data, orderSuccessMsg, res);

        } catch (error) {
            console.log("create new order", error);
            utilityFunc.sendErrorResponse(error, res)
        }
    }
}