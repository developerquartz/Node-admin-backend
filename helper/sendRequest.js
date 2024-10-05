const Order = require('../models/ordersTable');
const deliveryMiddleWare = require('./delivery');
let sendRequest = async (orderId) => {
    try {
        let storeTyp = ["TAXI", "PICKUPDROP"];
        let vehicleType;
        let source;
        let vehicleTypeQuery = '';
        const getOrder = await Order.findById(orderId)
            .populate({
                path: "store", select: "hideThings distanceUnit api_key codWalletLimit notifications notificationSound firebase",
                populate: {
                    path: "owner",
                    select: "firebaseTokens"
                }
            })
            .populate({ path: "storeType", select: "poolDriverRadius storeType vehicleType deliveryAreaDriver noOfDriversPerRequest codWalletLimit bidSettings isPriceSetForRequest" })
            .populate({ path: "vendor", select: "userLocation" })
            .exec();

        let store = getOrder.store;

        let storeTypeDetails = getOrder.storeType;

        let radius = storeTypeDetails.deliveryAreaDriver ? storeTypeDetails.deliveryAreaDriver : 20;
        let unit = store.distanceUnit ? store.distanceUnit : 'km';
        let maxDistance = helper.getDeliveryArea(radius, unit);
        if (storeTyp.includes(getOrder.storeType.storeType)) {
            vehicleType = [getOrder.vehicleType._id];
            source = { lat: getOrder.pickUp.location.coordinates[1], lng: getOrder.pickUp.location.coordinates[0] };
        }
        else {
            source = { lat: getOrder.vendor.userLocation.coordinates[1], lng: getOrder.vendor.userLocation.coordinates[0] };
            vehicleType = storeTypeDetails.vehicleType;
        }
        if (["GROCERY"].includes(getOrder.storeType.storeType) && getOrder.totalWeight) {
            vehicleTypeQuery = {
                "vehicleType.weight": { "$exists": true }, "vehicleType.weight.minWeight": { $lte: getOrder.totalWeight },
                "vehicleType.weight.maxWeight": { $gte: getOrder.totalWeight }
            };
        }
        let query = {
            store: store._id,
            onlineStatus: 'online',
            status: "approved",
            role: 'DRIVER'
        };
        if (storeTyp.includes(getOrder.storeType.storeType)) {
            query.isTranpotationService = true
        }
        if (getOrder.store.codWalletLimit) {

            if (getOrder.paymentMethod === "cod") {
                query['wallet'] = { "$exists": true, "$gte": getOrder.store.codWalletLimit };
            };
            if (helper.isValidHidethings(store, "showHideFreeRideSetting")) {
                if (query['wallet']) {
                    query["$or"] = [
                        { "freeRideSetting.status": true },
                        { wallet: { "$exists": true, "$gte": getOrder.store.codWalletLimit, "$gte": getOrder.orderTotal } }
                    ];
                    delete query['wallet'];
                }

            };
        }
        if (getOrder.isPreferredDriver && getOrder.isPreferredDriver === "yes") {
            query._id = getOrder.preferredDriverId;
        }

        if (getOrder.rideType == "pool") {
            query.onlineStatus = { $nin: ["offline"] };
            radius = storeTypeDetails.poolDriverRadius ? storeTypeDetails.poolDriverRadius : 5;
            maxDistance = helper.getDeliveryArea(radius, unit);
        }

        let limit = storeTypeDetails.noOfDriversPerRequest ? storeTypeDetails.noOfDriversPerRequest : 10;
        let apiType = "sendRequest"
        if (storeTypeDetails.isPriceSetForRequest) {
            apiType = "setPriceSendRequest"
        }
        let driverQuery = {
            apiType: apiType,
            source: source,
            orderId: orderId,
            vehicleType: vehicleType,
            maxDistance: maxDistance,
            query: query,
            limit: limit,
            apiKey: store.api_key,
            rideType: getOrder.rideType,
            storeType: getOrder.storeType.storeType,
            vehicleTypeQuery: vehicleTypeQuery
        };
        let results = await deliveryMiddleWare.deliveryApiCall(driverQuery);

    } catch (error) {
        console.log("sendRequest err", error);
    }
}
module.exports = {
    sendRequest
}