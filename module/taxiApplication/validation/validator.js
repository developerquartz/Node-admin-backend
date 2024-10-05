const ObjectId = require('objectid')
const tripService = require('../../../helper/orderService');
const utility = require("../utility/bidRequests");
let validateRule = (rules, payload) => {
    let flag = false;
    let message = '';
    let error_description = '';

    if (payload) {
        for (let index = 0; index < rules.length; index++) {
            let rule = rules[index];
            if ((payload[rule.name] == undefined || !payload[rule.name]) && rule.required) {
                message = rule.message;
                error_description = 'Validation Error!';
                flag = true;
                break;
            } else if (!['array', 'objectid', 'enum', 'number'].includes(rule.type) && typeof payload[rule.name] !== rule.type) {
                message = "INVALID_DATA_TYPE";
                error_description = 'Missing Params or Params data type error!';
                flag = true;
                break;
            } else if (rule.required && rule.type == 'array' && !Array.isArray(payload[rule.name])) {
                message = "INVALID_DATA_TYPE";
                error_description = 'Invalid Array!';
                flag = true;
                break;
            } else if (rule.required && rule.type == 'objectid' && payload[rule.name] && !ObjectId.isValid(payload[rule.name])) {
                message = "INVALID_DATA_TYPE";
                error_description = 'Invalid ObjectId';
                flag = true;
                break;
            } else if (rule.required && rule.type == 'enum' && payload[rule.name] && !rule.values.includes(payload[rule.name])) {
                message = "INVALID_ENUM_VALUE";
                error_description = rule.name + ' should be: ' + rule.values;
                flag = true;
                break;
            }
        }

        if (flag) {
            let err = new Error(message);
            err.error_description = error_description;
            throw err;
        }

    } else {
        let err = new Error('NO_PAYLOAD_DATA');
        err.error_description = error_description;
        throw err;
    }

    return true;
}
let taxiValidation = async (storeTypeDetails, data) => {

    //uncomment it when bid features implementation complete.
    let bidSettings = storeTypeDetails.bidSettings;
    if (data.isBidRequest && bidSettings && bidSettings.status) {
        if (!data.bidAmount) {
            return ["BID_AMOUNT_IS_REQUIRED", data];
        }
        let getAvgBidAmount = helper.roundNumber((data.orderTotal * bidSettings.percentage) / 100);
        getAvgBidAmount = helper.roundNumber(data.orderTotal) - getAvgBidAmount;
        if (data.bidAmount < getAvgBidAmount) {
            let msg = __("BID_AMOUNT_IS_INVALID", Math.ceil(getAvgBidAmount));
            return [msg, data];
        }
        console.log("bidAmount:", data.bidAmount)
        data.bidAmount = Number(data.bidAmount).toFixed(2);
        console.log("getAvgBidAmount:", getAvgBidAmount)

        let incrementAmount;
        if (data.isBidRequest && storeTypeDetails.bidSettings && storeTypeDetails.bidSettings.status) {
            incrementAmount = utility.incrementAmountFun(data.bidAmount);
        }
        if (incrementAmount) {
            data.bidOfferAmount = utility.bidOfferAmountArray(data.bidAmount, incrementAmount);
        }
        // commented for temprary.
        /* let type = 0
         if(data.bidAmount >= 1 && data.bidAmount <=999){
            type = 1
         }else if(data.bidAmount >= 1000 && data.bidAmount <=10000){
            type = 2
         }
         if(type == 1 && data.bidAmount >= 1000){
            return ["MAX_BID_AMOUNT", data];
         }else if(type == 2 && data.bidAmount >= 1000){
            return ["MAX_BID_AMOUNT", data];
         }*/

    };
    if (data.rideType == "normal" && data.multiStops && data.multiStops.length) {
        let verifyStopLocationArrays = await tripService.verifymultiStopsData(data.multiStops)
        if (verifyStopLocationArrays.isValidStopLocation) {
            return [verifyStopLocationArrays.message, data];
        }
        data.multiStopLocation = verifyStopLocationArrays.multiStop;
        data.isRemainStops = true;
        data.isMultiStopsStarted = false;
        data.remainStopsCount = data.multiStops.length;
    }
    if (data.rideType === "pool") {
        if (!data.noOfSeats) {
            return ["NO_OF_SEATS_IS_REQUIRED", data];
        }
    };

    return [null, data];
}
let pickUpDropValidation = async (storeTypeDetails, data) => {
    if (storeTypeDetails.multiDropsSettings) {
        if (data.dropOffMulti && data.dropOffMulti.length) {
            let dropmulti = JSON.parse(JSON.stringify(data.dropOffMulti));
            let verifyItems = await tripService.verifyMultiLocationData(dropmulti, storeTypeDetails);
            if (verifyItems.isValidItem) {
                return [verifyItems.message, data];
            }
            data.dropOffMulti = verifyItems.items;
            data.multiOrderstatus = false;
            data.itemTotal = verifyItems.lineTotal;
            data.line_items = verifyItems.lineItem;
        }
        else {
            return ["INVALID_ITEMS", data];
        }
    }
    else {
        if ((data.line_items && !data.line_items.length) || !data.line_items) {
            return ["line items required", data]
        }

        let verifyItems = await tripService.verifyLineItemData(data.line_items)
        if (verifyItems.isValidItem) {
            return [verifyItems.message, data]
        }
    }
    return [null, data];
}
let validateBookingRequiredField = async (storeTypeDetails, data) => {
    switch (storeTypeDetails.storeType) {
        case "PICKUPDROP":
            return await pickUpDropValidation(storeTypeDetails, data);
        case "TAXI":
            return await taxiValidation(storeTypeDetails, data);
        default:
            return "INVALID_OPERATION";
    }

}
module.exports = {
    validateRule,
    validateBookingRequiredField
}