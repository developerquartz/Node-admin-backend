const utilityFunc = require('./functions');
const googleMap = require('./googleMap');
const Coupon = require('../../../models/couponTable');
const geofence = require('../../geofencing/models/geofenceTable')
const geofencingFun = require('../../../helper/geofencing')
const ObjectId = require('objectid');

let estimatedCostCalculation = async (store, data) => {
    try {
        switch (data.rideType) {
            case "hourly":
                return estimatedCostCalculationHourlyTrip(store, data);
            default:
                return estimatedCostCalculationDefault(store, data);
        }

    } catch (error) {
        throw error;
    }
};
let estimatedCostCalculationDefault = async (store, data) => {
    try {
        let getDistanceAndTime = {};
        let multiLoc = [];
        if ((data.dropOffMulti && data.dropOffMulti.length) || (data.multiStops && data.multiStops.length)) {
            multiLoc = data.dropOffMulti;
            if (data.dropOffMulti && data.dropOffMulti.length == 1) {
                getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(data.pickUp.location, multiLoc[0].location, store.googleMapKey.server);
            }
            else {
                if (data.multiStops && data.multiStops.length)
                    multiLoc = [{ ...data.dropOff }, ...data.multiStops];
                if (data.dropOffMulti && data.dropOffMulti.length)
                    multiLoc = [...data.dropOffMulti];
                for (let e = 0; e < multiLoc.length - 1; e++) {
                    let calculat = {};

                    if (!e) {
                        calculat = await googleMap.getDistanceMatrixInfoByAddress(data.pickUp.location, multiLoc[0].location, store.googleMapKey.server);
                        getDistanceAndTime.distance = calculat.distance
                        getDistanceAndTime.duration = calculat.duration
                    }
                    calculat = await googleMap.getDistanceMatrixInfoByAddress(multiLoc[e].location, multiLoc[e + 1].location, store.googleMapKey.server);
                    getDistanceAndTime.distance += calculat.distance
                    getDistanceAndTime.duration += calculat.duration

                }
            }
        }
        else {
            getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(data.pickUp.location, data.dropOff.location, store.googleMapKey.server);
        }
        getDistanceAndTime.distance = Math.floor(getDistanceAndTime.distance)

        data = { ...data, ...getDistanceAndTime };
        await Promise.all(data.vehicleTypesList.map(async (element) => {
            let calculateEstimatedCost = await caculateCostByVehicle(store, data, element);
            console.log("calculateEstimatedCost", calculateEstimatedCost);
            element.isSurgeTime = calculateEstimatedCost.isSurgeTime;
            element.estimatedCost = calculateEstimatedCost.estimatedCost;
            element.estimatedTime = calculateEstimatedCost.estimatedTime;
            element.distance = calculateEstimatedCost.distance;
            element.actualCostWithoutDiscount = calculateEstimatedCost.actualCostWithoutDiscount;
            element.discountTotal = calculateEstimatedCost.discountTotal;
            element.couponType = calculateEstimatedCost.couponType;
            element.couponAmount = calculateEstimatedCost.couponAmount;
            element.redemptionValue = calculateEstimatedCost.redemptionValue;
            element.points = calculateEstimatedCost.points;
            element.value = calculateEstimatedCost.value;
            element.maxRedeemPoints = calculateEstimatedCost.maxRedeemPoints;
            element.maxRedemptionValue = calculateEstimatedCost.maxRedemptionValue;
            element.pricePerUnitTimeMinute = calculateEstimatedCost.pricePerUnitTimeMinute;
            element.basePrice = calculateEstimatedCost.basePrice;
            element.pricePerUnitDistance = calculateEstimatedCost.pricePerUnitDistance;
        }));
        return data.vehicleTypesList;

    } catch (error) {
        throw error;
    }
};
let estimatedCostCalculationHourlyTrip = async (store, data) => {
    try {
        await Promise.all(data.vehicleTypesList.map(async (element) => {
            if (data.rideType == "hourly" && element.hourly && element.hourly.status) {
                let calculateEstimatedCost = await calculateCostByHourlyVehicle(store, data, element);
                console.log("calculateEstimatedCost:===================>", calculateEstimatedCost)
                element.isSurgeTime = calculateEstimatedCost.isSurgeTime;
                element.estimatedCost = calculateEstimatedCost.estimatedCost;
                element.couponAmount = calculateEstimatedCost.couponAmount;
                element.discountTotal = calculateEstimatedCost.discountTotal;
                element.actualCostWithoutDiscount = calculateEstimatedCost.actualCostWithoutDiscount;
                element.couponType = calculateEstimatedCost.couponType;
                element.redemptionValue = calculateEstimatedCost.redemptionValue;
                element.points = calculateEstimatedCost.points;
                element.value = calculateEstimatedCost.value;
                element.maxRedeemPoints = calculateEstimatedCost.maxRedeemPoints;
                element.maxRedemptionValue = calculateEstimatedCost.maxRedemptionValue;
                console.log("Journey type is Hourly");
            }
        }));
        return data.vehicleTypesList;

    } catch (error) {
        throw error;
    }
};
let CostCalculation = async (store, data) => {
    try {
        let getDistanceAndTime = {};
        if ((data.dropOffMulti && data.dropOffMulti.length) || (data.multiStops && data.multiStops.length)) {
            let multiLoc = data.dropOffMulti;
            if (data.dropOffMulti && data.dropOffMulti.length == 1) {
                getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(data.pickUp.location, multiLoc[0].location, store.googleMapKey.server);
            }
            else {
                if (data.multiStops && data.multiStops.length) {
                    multiLoc = [{ ...data.dropOff }, ...data.multiStops];
                }
                if (data.dropOffMulti && data.dropOffMulti.length) {
                    multiLoc = [...data.dropOffMulti];
                }
                for (let e = 0; e < multiLoc.length - 1; e++) {
                    let calculat = {}
                    if (!e) {
                        calculat = await googleMap.getDistanceMatrixInfoByAddress(data.pickUp.location, multiLoc[0].location, store.googleMapKey.server);
                        getDistanceAndTime.distance = calculat.distance
                        getDistanceAndTime.duration = calculat.duration
                    }
                    calculat = await googleMap.getDistanceMatrixInfoByAddress(multiLoc[e].location, multiLoc[e + 1].location, store.googleMapKey.server);
                    getDistanceAndTime.distance += calculat.distance
                    getDistanceAndTime.duration += calculat.duration

                }
            }
        }
        else {
            getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(data.pickUp.location, data.dropOff.location, store.googleMapKey.server);
        }
        getDistanceAndTime.distance = Math.floor(getDistanceAndTime.distance)
        //console.log("getDistanceAndTime-----*", getDistanceAndTime)
        return getDistanceAndTime;

    } catch (error) {
        throw error;
    }
};

let caculateCostByVehicle = async (store, data, element) => {
    try {
        let isSurgeTime = "no";
        let surgeMultiplier = 0;
        let checkvehicle = []
        let isdropwithinjeo = []
        let estimatedTime = data.duration;
        let distance = data.distance;
        let estimatedCost = 0;
        let unit = store.distanceUnit && store.distanceUnit === "miles" ? "miles" : "km";
        let timeZone = store.timezone;
        let isLoyaltyPointsEnabled = store.loyaltyPoints.status;

        if (element.isSurgeTime == true) {
            if (element.surgeTimeList.length > 0) {
                let surgeCheck = checkSurgeTime(timeZone, element.surgeTimeList);
                isSurgeTime = surgeCheck.isSurgeTime ? "yes" : "no";
                surgeMultiplier = surgeCheck.surgeMultiplier;
            }
        }
        // check baseprice, pricePerUnitDistance and pricePerUnitTimeMinute according jeo fence code here
        let checkjeofence = await geofence.find({ vehicleType: ObjectId(element._id), moduleType: 'taxi', status: "active" })
        console.log("checkjeofence-----", checkjeofence)
        const customerLocation = { type: "Point", coordinates: [Number(data.pickUp.location.lng), Number(data.pickUp.location.lat)] }
        let dropcustomerLocation = {}
        let UserdropObj = {}
        if (!data.dropOffMulti) {

            dropcustomerLocation = { type: "Point", coordinates: [Number(data.dropOff.location.lng), Number(data.dropOff.location.lat)] }
            UserdropObj = {
                customerLocation: dropcustomerLocation.coordinates,
                unit: unit
            }
        }
        let UserObj = {
            customerLocation: customerLocation.coordinates,
            unit: unit
        }
        if (checkjeofence && checkjeofence.length) {
            checkvehicle = await geofencingFun.TaxiGeoFenceCheck(UserObj, checkjeofence)
            if (!data.dropOffMulti) {
                isdropwithinjeo = await geofencingFun.TaxiGeoFenceCheck(UserdropObj, checkvehicle)
                //isdropwithinjeo = await geofencingFun.TaxiGeoFenceCheck(UserdropObj, checkjeofence)
            }
            console.log("before isdropwithinjeo---", isdropwithinjeo)
            if (isdropwithinjeo.length) {
                isdropwithinjeo.sort(function (a, b) {
                    if (b.radius && a.radius) {
                        return b.radius - a.radius;
                    }
                });
            }
            console.log("after isdropwithinjeo---", isdropwithinjeo)
        }
        if (checkjeofence.length && isdropwithinjeo.length) {
            if (unit === "km") {
                let totalDistancePrice = isdropwithinjeo[isdropwithinjeo.length - 1].pricePerUnitDistance * distance;
                let totalTimePrice = isdropwithinjeo[isdropwithinjeo.length - 1].pricePerUnitTimeMinute * estimatedTime;
                let totalPrice = isdropwithinjeo[isdropwithinjeo.length - 1].basePrice + totalDistancePrice + totalTimePrice;
                estimatedCost = Math.floor(utilityFunc.roundNumber(totalPrice));
            } else if (unit === "miles") {
                let totalDistancePrice = isdropwithinjeo[isdropwithinjeo.length - 1].pricePerUnitDistance * utilityFunc.kmToMiles(distance);
                let totalTimePrice = isdropwithinjeo[isdropwithinjeo.length - 1].pricePerUnitTimeMinute * estimatedTime;
                let totalPrice = isdropwithinjeo[isdropwithinjeo.length - 1].basePrice + totalDistancePrice + totalTimePrice;
                estimatedCost = utilityFunc.roundNumber(totalPrice);
                distance = Math.floor(utilityFunc.kmToMiles(distance)) || 1;
            }

        }
        else {
            if (unit === "km") {
                let totalDistancePrice = element.pricePerUnitDistance * distance;
                let totalTimePrice = element.pricePerUnitTimeMinute * estimatedTime;
                let totalPrice = element.basePrice + totalDistancePrice + totalTimePrice;
                estimatedCost = Math.floor(utilityFunc.roundNumber(totalPrice));
            } else if (unit === "miles") {
                let totalDistancePrice = element.pricePerUnitDistance * utilityFunc.kmToMiles(distance);
                let totalTimePrice = element.pricePerUnitTimeMinute * estimatedTime;
                let totalPrice = element.basePrice + totalDistancePrice + totalTimePrice;
                estimatedCost = utilityFunc.roundNumber(totalPrice);
                distance = Math.floor(utilityFunc.kmToMiles(distance)) || 1;
            }
        }

        if (isSurgeTime === "yes") {
            estimatedCost = utilityFunc.roundNumber(estimatedCost * surgeMultiplier);
        }

        let actualCostWithoutDiscount = estimatedCost;
        console.log("estimatedCost----------", estimatedCost)
        let coupanData = {};
        if (data.coupon) {
            coupanData = await couponDiscountCalculation(data.coupon, estimatedCost, data.storeTypeId);
            if (coupanData.discountTotal < estimatedCost) {
                estimatedCost = utilityFunc.roundNumber(estimatedCost - coupanData.discountTotal);
                coupanData.couponDiscount = coupanData.discountTotal;
            }
            // else {
            //     throw new Error('This Coupon code is not applicable');
            // }
        }

        let loyaltyPointsData = {
            redemptionValue: 0
        };

        let redeemLoyalityPoints = {};

        if (isLoyaltyPointsEnabled) {
            redeemLoyalityPoints = calculateLoyalityPoints(estimatedCost, store.loyaltyPoints);
        }
        if (isLoyaltyPointsEnabled && data.isLoyaltyPointsUsed) {
            if (data.pointsToRedeem <= redeemLoyalityPoints.maxRedeemPoints) {
                let calculate_point = redeemLoyalityPoints.maxRedemptionValue / redeemLoyalityPoints.maxRedeemPoints
                loyaltyPointsData.redemptionValue = utilityFunc.roundNumber(data.pointsToRedeem * calculate_point)
                //  loyaltyPointsData = calculateLoyalityPointsValue(data.pointsToRedeem, store.loyaltyPoints);
                if (loyaltyPointsData.redemptionValue < estimatedCost) {
                    estimatedCost = utilityFunc.roundNumber(estimatedCost - loyaltyPointsData.redemptionValue);
                    coupanData.discountTotal = coupanData.discountTotal + loyaltyPointsData.redemptionValue;
                }
            }
        }
        console.log("loyaltyPointsData----------", loyaltyPointsData)
        console.log("redeemLoyalityPoints----------", redeemLoyalityPoints)

        let returnObj = {
            isSurgeTime: isSurgeTime,
            surgeMultiplier: surgeMultiplier,
            estimatedTime: estimatedTime,
            actualCostWithoutDiscount: actualCostWithoutDiscount,
            estimatedCost: estimatedCost,
            distance: utilityFunc.roundNumber(distance),
            pricePerUnitTimeMinute: element.pricePerUnitTimeMinute,
            basePrice: element.basePrice,
            pricePerUnitDistance: element.pricePerUnitDistance,
            ...coupanData,
            ...loyaltyPointsData,
            ...redeemLoyalityPoints
        }

        if (checkjeofence.length && isdropwithinjeo.length) {
            returnObj["pricePerUnitTimeMinute"] = isdropwithinjeo[isdropwithinjeo.length - 1].pricePerUnitTimeMinute;
            returnObj["basePrice"] = isdropwithinjeo[isdropwithinjeo.length - 1].basePrice;
            returnObj["pricePerUnitTimeMinute"] = isdropwithinjeo[isdropwithinjeo.length - 1].pricePerUnitDistance;
        }

        if (data.itemTotal != undefined && data.itemTotal != null) {
            let totalordercost = estimatedCost;
            totalorderwithoutdiscount = actualCostWithoutDiscount + data.itemTotal;
            returnObj['estimatedCost'] = actualCostWithoutDiscount;
            returnObj['itemTotal'] = data.itemTotal;
            returnObj['totalOrderWithoutDiscount'] = totalorderwithoutdiscount;
            returnObj['totalOrder'] = utilityFunc.roundToFixed(totalordercost);
        }

        return returnObj;

    } catch (error) {
        throw new Error(error.message);
    }
};
let calculateCostByHourlyVehicle = async (store, data, element) => {
    try {
        let estimatedCost = 0;
        let isLoyaltyPointsEnabled = store.loyaltyPoints.status;
        let isSurgeTime = "no";
        let surgeMultiplier = 0;
        let timeZone = store.timezone;
        let unit = store.distanceUnit && store.distanceUnit === "miles" ? "miles" : "km";

        estimatedCost = Math.ceil(element.hourly.price * data.totalHours);

        let actualCostWithoutDiscount = estimatedCost;

        if (element.isSurgeTime == true) {
            if (element.surgeTimeList.length > 0) {
                let surgeCheck = checkSurgeTime(timeZone, element.surgeTimeList);
                isSurgeTime = surgeCheck.isSurgeTime ? "yes" : "no";
                surgeMultiplier = surgeCheck.surgeMultiplier;
            }
        }

        /* validating customer current location according Geo fence code here....*/
        let isEnabledJeoFence = false;
        let checkTaxiGeoFence = [];
        let checkGeoFence = await geofence.find({ vehicleType: ObjectId(element._id), moduleType: 'taxi', "hourly.status": true, status: "active" })
        const customerLocation = { type: "Point", coordinates: [Number(data.pickUp.location.lng), Number(data.pickUp.location.lat)] }
        let UserObj = {
            customerLocation: customerLocation.coordinates,
            unit
        }
        if (checkGeoFence && checkGeoFence.length) {
            checkTaxiGeoFence = await geofencingFun.TaxiGeoFenceCheck(UserObj, checkGeoFence);
            if (checkTaxiGeoFence.length) {
                checkTaxiGeoFence.sort(function (a, b) {
                    if (b.radius && a.radius) {
                        return b.radius - a.radius;
                    }
                });
                isEnabledJeoFence = true;
                checkTaxiGeoFence = checkTaxiGeoFence[checkTaxiGeoFence.length - 1] //getting last element
            }
        }
        if (checkGeoFence.length && isEnabledJeoFence) {
            estimatedCost = utilityFunc.roundNumber(checkTaxiGeoFence.hourly.price * data.totalHours);
        }
        /* ---------------------GeoFence code end here-----------------*/

        if (isSurgeTime === "yes") {
            estimatedCost = utilityFunc.roundNumber(estimatedCost * surgeMultiplier);
        }

        let coupanData = {};
        if (data.coupon) {
            coupanData = await couponDiscountCalculation(data.coupon, estimatedCost, data.storeTypeId);
            if (coupanData.discountTotal < estimatedCost) {
                estimatedCost = utilityFunc.roundNumber(estimatedCost - coupanData.discountTotal);
                coupanData.couponDiscount = coupanData.discountTotal;
            }
            else {
                throw new Error("Coupon conde is not applicable")
            }
        }

        let loyaltyPointsData = {
            redemptionValue: 0
        };

        let redeemLoyalityPoints = {};

        if (isLoyaltyPointsEnabled) {
            redeemLoyalityPoints = calculateLoyalityPoints(estimatedCost, store.loyaltyPoints);
        }
        if (isLoyaltyPointsEnabled && data.isLoyaltyPointsUsed) {
            if (data.pointsToRedeem <= redeemLoyalityPoints.maxRedeemPoints) {
                let calculate_point = redeemLoyalityPoints.maxRedemptionValue / redeemLoyalityPoints.maxRedeemPoints;
                loyaltyPointsData.redemptionValue = utilityFunc.roundNumber(data.pointsToRedeem * calculate_point);
                if (loyaltyPointsData.redemptionValue < estimatedCost) {
                    estimatedCost = utilityFunc.roundNumber(estimatedCost - loyaltyPointsData.redemptionValue);
                    coupanData.discountTotal = coupanData.discountTotal + loyaltyPointsData.redemptionValue;
                }
            }
        }




        return {
            isSurgeTime: isSurgeTime,
            surgeMultiplier: surgeMultiplier,
            estimatedCost: estimatedCost,
            actualCostWithoutDiscount: actualCostWithoutDiscount,
            ...coupanData,
            ...loyaltyPointsData,
            ...redeemLoyalityPoints
        }
    } catch (error) {
        throw new Error(error.message);
    }

}
let checkSurgeTime = (timezone, surgeHours) => {
    let isSurgeTime = false;
    let surgeMultiplier = 0;

    let CurrentCityTime = utilityFunc.getCurrentDateAndTimeInCityTimezoneFromUTC(timezone);
    let currentDay = CurrentCityTime.day();
    let currentDate = CurrentCityTime.format("YYYY-MM-DD");
    let currentTimeUTC = new Date(CurrentCityTime.utc().format());
    let currentTimeTimestamp = currentTimeUTC.getTime();

    for (let i = 0; i < surgeHours.length; i++) {
        let dayStatus = surgeHours[i].dayStatus;
        let day = surgeHours[i].day;

        let startTime = surgeHours[i].startTime
        let startTimeSplit = startTime.split(":")
        let startTimeHour = startTimeSplit[0]
        let startTimeMinute = startTimeSplit[1]
        let startTimeStructure = currentDate + " " + startTimeHour + ":" + startTimeMinute;
        let startTimeByTimezone = utilityFunc.getDateAndTimeInCityTimezone(startTimeStructure, timezone);
        let startTimeUTC = new Date(startTimeByTimezone.utc().format())
        let startTimeTimestamp = startTimeUTC.getTime()

        let endTime = surgeHours[i].endTime
        let endTimeSplit = endTime.split(":")
        let endTimeHour = endTimeSplit[0]
        let endTimeMinute = endTimeSplit[1]
        let endTimeStructure = currentDate + " " + endTimeHour + ":" + endTimeMinute;
        let endTimeByTimezone = utilityFunc.getDateAndTimeInCityTimezone(endTimeStructure, timezone);

        let endTimeUTC = new Date(endTimeByTimezone.utc().format())
        let endTimeTimestamp = endTimeUTC.getTime()
        let surgeMultipliers = surgeHours[i].surgeMultiplier

        if (
            dayStatus == true &&
            currentDay === day &&
            currentTimeTimestamp > startTimeTimestamp &&
            currentTimeTimestamp < endTimeTimestamp
        ) {
            isSurgeTime = true;
            surgeMultiplier = surgeMultipliers
            break;
        }
    }

    return { isSurgeTime: isSurgeTime, surgeMultiplier: surgeMultiplier }
};

let couponDiscountCalculation = async (code, itemTotal, storeType) => {

    let discountTotal = 0;
    let couponType = null;
    let couponAmount = 0;

    let condition = {
        "code": code,
        "status": "active",
        "storeType": ObjectId(storeType) //only for taxi anfd pickUp and dropOff
    }

    const getCoupon = await Coupon.getCouponByCondition(condition);

    if (getCoupon != null) {

        couponType = getCoupon.discount_type;
        couponAmount = getCoupon.amount;

        if (getCoupon.discount_type === 'percent') {
            discountTotal = utilityFunc.roundNumber(((itemTotal * getCoupon.amount) / 100));
            itemTotal = utilityFunc.roundNumber((itemTotal - ((itemTotal * getCoupon.amount) / 100)));
        }

        if (getCoupon.discount_type === 'flat') {
            itemTotal = utilityFunc.roundNumber((itemTotal - getCoupon.amount));
            discountTotal = utilityFunc.roundNumber(getCoupon.amount);
        }
    }
    return {
        coupon: code,
        discountTotal: discountTotal,
        couponType: couponType,
        couponAmount: couponAmount,
        itemTotal: itemTotal
    }
};

let calculateLoyalityPoints = (orderTotal, criteria) => {
    let points = 0;
    let value = 0;
    let redemptionValue = 0;
    let redemPoints = 0

    points = parseInt(((criteria.earningCriteria.points / criteria.earningCriteria.value) * orderTotal)); //(1/1000)*79.81 = 0.07981
    redemPoints = points;

    value = utilityFunc.roundNumber(((criteria.redemptionCriteria.value / criteria.earningCriteria.points) * points));//(100/1)*79.81 = 7981

    redemptionValue = value;

    let redemMax = utilityFunc.roundNumber((orderTotal - ((orderTotal * criteria.maxRedemptionPercentage) / 100))); //79.81-(79.81*3)/100 = 77.4157

    if (redemptionValue > redemMax) {
        redemptionValue = redemMax;
        redemPoints = parseInt(((criteria.earningCriteria.points / criteria.earningCriteria.value) * redemptionValue));
    }

    return { points: points, value: value, maxRedemptionValue: redemptionValue, maxRedeemPoints: redemPoints };
};

let calculateLoyalityPointsValue = (pointsToRedeem, criteria) => {

    let redemptionValue = 0;

    redemptionValue = utilityFunc.roundNumber(((criteria.redemptionCriteria.value / criteria.earningCriteria.points) * pointsToRedeem));

    return { redemptionValue: redemptionValue };
};

let tipCalculation = (tip, subTotal) => {
    let tipAmount = 0;

    if (tip != 0) {
        tipAmount = utilityFunc.roundNumber(((subTotal * tip) / 100));
    }

    return {
        tip: tip,
        tipAmount: tipAmount
    }
};

let getDeliveryArea = (radius, unit) => {
    if (unit) {
        unit = unit;
    } else {
        unit = 'km';
    }

    let deliveryArea = 0;

    if (unit === 'miles') {
        deliveryArea = utilityFunc.milesToMeter(radius);
    } else {
        deliveryArea = utilityFunc.kmToMeter(radius);
    }

    return deliveryArea;
}

module.exports = {
    estimatedCostCalculation,
    getDeliveryArea,
    CostCalculation,
    caculateCostByVehicle,
    calculateCostByHourlyVehicle
}
