
const socketHelper = require('../../../helper/socketHelper');

module.exports = {
    afterSendBidRequest: async (resdata, store, orderId) => {
        try {
            module.exports.sendRequestToNearByDrivers(async (data, store, resdata) => {
                if (resdata && resdata.nearByTempDrivers > 0) {
                    socketHelper.nearByDriverSocket(resdata.nearByTempDrivers, { type: "orderRequest", orderId: orderId });
                }
            })

            //here need to implemention more things in the next....

        } catch (error) {
            console.log("after raise bid requests", error);
        }
    },
    sendRequestToNearByDrivers: async (data, store, responseCallback) => {
        try {
            let query = {
                store: ObjectId(store.storeId),
                onlineStatus: 'online',
                status: "approved",
                role: 'DRIVER'
            };

            let radius = storeTypeDetails.deliveryAreaDriver ? storeTypeDetails.deliveryAreaDriver : 20;
            let unit = store.distanceUnit ? store.distanceUnit : 'km';
            let maxDistance = helper.getDeliveryArea(radius, unit);

            if (data.query.store) {
                data.query.store = ObjectId(data.query.store);
            }

            if (data.query._id) {
                data.query._id = ObjectId(data.query._id);
            }

            let source = { lat: data.pickUp.location.coordinates[1], lng: getOrder.pickUp.location.coordinates[0] };

            User.aggregate(
                [
                    {
                        "$geoNear": {
                            "near": source,
                            "distanceField": "distance",
                            key: "userLocation",
                            "spherical": true,
                            "maxDistance": maxDistance,
                            query: data.query,
                        }
                    },
                    {
                        $lookup: {
                            from: "vehicles",
                            localField: "vehicle",
                            foreignField: "_id",
                            as: "vehicles"
                        }
                    },
                    { $unwind: '$vehicles' },
                    {
                        $match: {
                            'vehicles.vehicleType': { $in: [getOrder.vehicleType._id] }
                        }
                    },
                    { $sort: { distance: 1 } },
                    { $limit: data.limit ? data.limit : 10 },
                    { $project: { _id: 1, name: 1, onlineStatus: 1, userLocation: 1, distance: 1, "vehicles.vehicleType": 1, firebaseTokens: 1 } }
                ], async (err, resdata) => {
                    if (err) {
                        console.log("err", err);
                        responseCallback(err)
                    } else {
                        responseCallback(resdata)
                    }
                });
        } catch (error) {
            console.log("nearByDrivers", error);
        }
    },
    incrementAmountFun: (amount) => {
        amount = Number(amount);
        if (amount > 0 && amount < 10) {
            return 1;
        } else {
            return helper.truncNumber(amount / 10);
        }
    },
    bidOfferAmountArray: (amount, incrementAmount) => {
        amount = Number(amount);
        incrementAmount = Number(incrementAmount);
        let sum = amount;
        let offerAmount = [];
        for (let i = 0; i < 3; i++) {
            sum = sum + incrementAmount
            offerAmount.push(sum)
        }
        return offerAmount;
    }
}