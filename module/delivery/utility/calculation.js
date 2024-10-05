const utilityFunc = require('./functions');
const googleMap = require('./googleMap');
const Coupon = require('../../../models/couponTable');
const ObjectId = require('objectid');
const User = require("../../../models/userTable");
let tripFareAndEarningCalculation = (order) => {
    let driverPercentCharge;
    if (!order.vehicleType) {
        driverPercentCharge = order.storeType.commission.deliveryBoy
    }
    else {
        driverPercentCharge = order.vehicleType.driverPercentCharge;
    }
    if (order.driver && typeof order.driver == "object") {
        if (order.driver.commisionType == "override" && order.driver.commission && order.driver.commission.deliveryBoy)
            driverPercentCharge = order.driver.commission.deliveryBoy;
        else if (order.driver.freeRideSetting && order.driver.freeRideSetting.status)
            driverPercentCharge = 100;

    };
    console.log("driverPercentCharge:==>", driverPercentCharge)
    let deliveryBoyEarning = 0;
    let adminEarning = 0;
    deliveryBoyEarning = utilityFunc.roundNumber((order.subTotal * Number(driverPercentCharge)) / 100);
    let dboyoderttalEarning = utilityFunc.roundNumber((order.orderTotal * Number(driverPercentCharge)) / 100);
    adminEarning = utilityFunc.roundNumber(order.orderTotal - dboyoderttalEarning);
    return { adminEarning: adminEarning, deliveryBoyEarning: deliveryBoyEarning };
}

let estimatedCostCalculation = async (store, data) => {
    try {
        const getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(data.pickUp.location, data.dropOff.location, store.googleMapKey.server);
        //console.log("getDistanceAndTime :", getDistanceAndTime);

        data = { ...data, ...getDistanceAndTime };
        await Promise.all(data.vehicleTypesList.map(async (element) => {
            let calculateEstimatedCost = await caculateCostByVehicle(store, data, element);
            console.log("calculateEstimatedCost", calculateEstimatedCost);
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
        }));
        return data.vehicleTypesList;

    } catch (error) {
        throw error;
    }
};

let caculateCostByVehicle = async (store, data, element) => {
    let isSurgeTime = "no";
    let surgeMultiplier = 0;
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

    if (unit === "km") {
        let totalDistancePrice = element.pricePerUnitDistance * distance;
        let totalTimePrice = element.pricePerUnitTimeMinute * estimatedTime;
        let totalPrice = element.basePrice + totalDistancePrice + totalTimePrice;
        estimatedCost = utilityFunc.roundNumber(totalPrice);
    } else if (unit === "miles") {
        let totalDistancePrice = element.pricePerUnitDistance * utilityFunc.kmToMiles(distance);
        let totalTimePrice = element.pricePerUnitTimeMinute * estimatedTime;
        let totalPrice = element.basePrice + totalDistancePrice + totalTimePrice;
        estimatedCost = utilityFunc.roundNumber(totalPrice);
    }

    if (isSurgeTime === "yes") {
        estimatedCost = utilityFunc.roundNumber(estimatedCost * surgeMultiplier);
    }

    let actualCostWithoutDiscount = estimatedCost;

    let coupanData = {};

    if (data.coupon) {
        coupanData = await couponDiscountCalculation(data.coupon, estimatedCost, data.storeTypeId);
        if (coupanData.discountTotal < estimatedCost) {
            estimatedCost = utilityFunc.roundNumber(estimatedCost - coupanData.discountTotal);
        }
    }

    let loyaltyPointsData = {
        redemptionValue: 0
    };

    let redeemLoyalityPoints = {};

    if (isLoyaltyPointsEnabled) {
        redeemLoyalityPoints = calculateLoyalityPoints(estimatedCost, store.loyaltyPoints);
    }

    if (isLoyaltyPointsEnabled && data.isLoyaltyPointsUsed && data.isLoyaltyPointsUsed == true && redeemLoyalityPoints.maxRedeemPoints && data.pointsToRedeem <= redeemLoyalityPoints.maxRedeemPoints) {
        loyaltyPointsData = calculateLoyalityPointsValue(data.pointsToRedeem, store.loyaltyPoints);

        if (loyaltyPointsData.redemptionValue < estimatedCost) {
            estimatedCost = utilityFunc.roundNumber(estimatedCost - loyaltyPointsData.redemptionValue);
        }
    }



    return {
        isSurgeTime: isSurgeTime,
        surgeMultiplier: surgeMultiplier,
        estimatedTime: estimatedTime,
        actualCostWithoutDiscount: actualCostWithoutDiscount,
        estimatedCost: estimatedCost,
        distance: utilityFunc.roundNumber(distance),
        ...coupanData,
        ...loyaltyPointsData,
        ...redeemLoyalityPoints
    }
};

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
    console.log("getCoupon :", getCoupon);

    if (getCoupon != null) {

        couponType = getCoupon.discount_type;
        couponAmount = getCoupon.amount;

        if (getCoupon.discount_type === 'percent') {
            itemTotal = utilityFunc.roundNumber((itemTotal - ((itemTotal * getCoupon.amount) / 100)));
            discountTotal = utilityFunc.roundNumber(((itemTotal * getCoupon.amount) / 100));
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
        tipAmount = utilityFunc.roundNumber(((orderTotal * tip) / 100));
    }

    return {
        tip: tip,
        tipAmount: tipAmount
    }
};

module.exports = {
    estimatedCostCalculation,
    tripFareAndEarningCalculation
}
