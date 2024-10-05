const utilityFunc = require('./functions');
const googleMap = require('./googleMap');
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
        /*  if (data.coupon) {
              coupanData = await couponDiscountCalculation(data.coupon, estimatedCost, data.storeTypeId);
              if (coupanData.discountTotal < estimatedCost) {
                  estimatedCost = utilityFunc.roundNumber(estimatedCost - coupanData.discountTotal);
              }
              else {
                  throw new Error("Coupon conde is not applicable")
              }
          }*/

        let loyaltyPointsData = {
            redemptionValue: 0
        };

        let redeemLoyalityPoints = {};

        /*  if (isLoyaltyPointsEnabled) {
              redeemLoyalityPoints = calculateLoyalityPoints(estimatedCost, store.loyaltyPoints);
          }
          if (isLoyaltyPointsEnabled && data.isLoyaltyPointsUsed) {
              if (data.pointsToRedeem <= redeemLoyalityPoints.maxRedeemPoints) {
                  let calculate_point = redeemLoyalityPoints.maxRedemptionValue / redeemLoyalityPoints.maxRedeemPoints;
                  loyaltyPointsData.redemptionValue = utilityFunc.roundNumber(data.pointsToRedeem * calculate_point);
                  if (loyaltyPointsData.redemptionValue < estimatedCost) {
                      estimatedCost = utilityFunc.roundNumber(estimatedCost - loyaltyPointsData.redemptionValue);
                  }
              }
          }*/

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


// ---------------------------------
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
        estimatedCost = Math.ceil(utilityFunc.roundNumber(totalPrice));
    } else if (unit === "miles") {
        let totalDistancePrice = element.pricePerUnitDistance * utilityFunc.kmToMiles(distance);
        let totalTimePrice = element.pricePerUnitTimeMinute * estimatedTime;
        let totalPrice = element.basePrice + totalDistancePrice + totalTimePrice;
        estimatedCost = Math.ceil(utilityFunc.roundNumber(totalPrice));
    }

    if (isSurgeTime === "yes") {
        estimatedCost = utilityFunc.roundNumber(estimatedCost * surgeMultiplier);
    }

    let actualCostWithoutDiscount = estimatedCost;

    let coupanData = {};

    // if (data.coupon) {
    //     coupanData = await couponDiscountCalculation(data.coupon, estimatedCost, data.storeTypeId);
    //     if (coupanData.discountTotal < estimatedCost) {
    //         estimatedCost = utilityFunc.roundNumber(estimatedCost - coupanData.discountTotal);
    //     }
    // }

    let loyaltyPointsData = {
        redemptionValue: 0
    };

    let redeemLoyalityPoints = {};

    // if (isLoyaltyPointsEnabled) {
    //     redeemLoyalityPoints = calculateLoyalityPoints(estimatedCost, store.loyaltyPoints);
    // }

    // if (isLoyaltyPointsEnabled && data.isLoyaltyPointsUsed && data.isLoyaltyPointsUsed == true && redeemLoyalityPoints.maxRedeemPoints && data.pointsToRedeem <= redeemLoyalityPoints.maxRedeemPoints) {
    //     loyaltyPointsData = calculateLoyalityPointsValue(data.pointsToRedeem, store.loyaltyPoints);

    //     if (loyaltyPointsData.redemptionValue < estimatedCost) {
    //         estimatedCost = utilityFunc.roundNumber(estimatedCost - loyaltyPointsData.redemptionValue);
    //     }
    // }

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
    getDeliveryArea: getDeliveryArea,
    estimatedCostCalculation: estimatedCostCalculation,
    CostCalculation: CostCalculation,
    caculateCostByVehicle: caculateCostByVehicle,
    calculateCostByHourlyVehicle
}