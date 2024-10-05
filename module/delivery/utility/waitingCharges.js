const ObjectId = require('objectid');
const Order = require('../../../models/ordersTable');
let calculateWaitingCharge = async (req, res, next) => {
    try {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        let getOrder = await Order.findById(data._id, 'multiStopStartAt multiStopsEndAt isMultiStopsStarted rideType multiStop totalWaitTime storeType vehicleType orderTotal subTotal')
            .populate({ path: 'storeType', select: "storeType multiStopsTripSettings", options: { lean: true } })

        if (getOrder == null) {
            return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
        }
        if (getOrder.storeType.storeType != "TAXI" || (getOrder.rideType == "normal" && !getOrder.multiStop.length)) {
            return next();
        }
        if (getOrder.isMultiStopsStarted && !getOrder.multiStopsEndAt) {
            let freeWaitTime = getOrder.storeType.multiStopsTripSettings ? getOrder.storeType.multiStopsTripSettings.waitingTime : 120;
            freeWaitTime = Math.floor(freeWaitTime / 60);// convert to minute
            let waitingTime = helper.getTimeDifferenceInMinute(new Date(), getOrder.multiStopStartAt);
            console.log("current waitingTime:===>", waitingTime);

            if (freeWaitTime < waitingTime) {
                getOrder.totalWaitTime = waitingTime - freeWaitTime
            }
        }
        let waitTimeCharge = getOrder.vehicleType.pricePerUnitTimeMinute;
        let totalWaitTimeCharge = (waitTimeCharge * getOrder.totalWaitTime);

        let orderTotal = (totalWaitTimeCharge + getOrder.orderTotal);
        if (orderTotal) {
            getOrder.orderTotal = orderTotal;
            getOrder.totalWaitTimeCharge = totalWaitTimeCharge;
            delete getOrder.storeType;
            await getOrder.save();
        }

        next();


    } catch (error) {
        console.log(error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}

module.exports = {
    calculateWaitingCharge
}