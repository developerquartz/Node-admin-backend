const vehicleTypeModel = require('./models/vehicelTypesTable')
const Coupon = require('../../models/couponTable');
const moment = require('moment-timezone');
const storeType = require('../../models/storeTypeTable');

module.exports = {

  addDefaultVehicleType: async (storeId) => {

    let vehicalType = [
      {
        "features": [
          "Feature 1",
          "Feature 2"
        ],
        "image": "61237c3db311dce166239c1f",
        "isSurgeTime": false,
        "type": "normal",
        "status": "active",
        "name": "Bike",
        "vehicle": "bike",
        "maxPersons": 4,
        "basePrice": 10,
        "pricePerUnitDistance": 0.15,
        "pricePerUnitTimeMinute": 0.5,
        "driverPercentCharge": 90,
        "waitingTimeStartAfterMin": 1,
        "waitingTimePrice": 2,
        "info": "Lorem Ipsum",
        "surgeTimeList": [
          {
            "dayStatus": true,
            "startTime": "09:00",
            "endTime": "23:59",
            "surgeMultiplier": 2
          }
        ],
        "store": storeId,
        "date_created_utc": new Date(),
        "meta_data": []
      },
      {
        "features": [
          "Feature 1",
          "Feature 2"
        ],
        "image": "61237c72b311dce166239c20",
        "isSurgeTime": false,
        "type": "normal",
        "status": "active",
        "name": "Car",
        "vehicle": "car",
        "maxPersons": 4,
        "basePrice": 10,
        "pricePerUnitDistance": 0.15,
        "pricePerUnitTimeMinute": 0.5,
        "driverPercentCharge": 90,
        "waitingTimeStartAfterMin": 1,
        "waitingTimePrice": 2,
        "info": "Lorem Ipsum",
        "surgeTimeList": [
          {
            "dayStatus": true,
            "startTime": "09:00",
            "endTime": "23:59",
            "surgeMultiplier": 2
          }
        ],
        "store": storeId,
        "date_created_utc": new Date(),
        "meta_data": []
      },
      {
        "features": [
          "Feature 1",
          "Feature 2"
        ],
        "image": "61237c72b311dce166239c20",
        "isSurgeTime": false,
        "type": "pool",
        "status": "inactive",
        "name": "Pool Ride",
        "vehicle": "car",
        "maxPersons": 4,
        "basePrice": 10,
        "pricePerUnitDistance": 0.15,
        "pricePerUnitTimeMinute": 0.5,
        "driverPercentCharge": 90,
        "waitingTimeStartAfterMin": 1,
        "waitingTimePrice": 2,
        "info": "Lorem Ipsum",
        "surgeTimeList": [
          {
            "dayStatus": false,
            "startTime": "09:00",
            "endTime": "23:59",
            "surgeMultiplier": 2
          }
        ],
        "store": storeId,
        "date_created_utc": new Date(),
        "meta_data": []
      }
    ];

    let vehicleData = await vehicleTypeModel.insertMany(vehicalType);

    let bikeId = vehicleData.find(item => item.name === "Bike")._id;
    return await storeType.bulkWrite([
      {
        updateMany: {
          "filter": { "store": storeId, "storeType": { $nin: ["AIRBNB", "SERVICEPROVIDER", "CARRENTAL"] } },
          "update": { $set: { "vehicleType": [] } }
        }
      },
      {
        updateMany: {
          "filter": { "store": storeId, "storeType": { $nin: ["AIRBNB", "SERVICEPROVIDER", "CARRENTAL"] } },
          "update": { $addToSet: { "vehicleType": bikeId } }
        }
      },
    ])
  },
  checkSurgeTime: (timezone, surgeHours) => {
    var isSurgeTime = "no"
    var surgeMultiplier = 0

    var CurrentCityTime = module.exports.getCurrentDateAndTimeInCityTimezoneFromUTC(
      timezone
    )
    var currentDay = CurrentCityTime.day()
    var currentDate = CurrentCityTime.format("YYYY-MM-DD")
    var currentTimeUTC = new Date(CurrentCityTime.utc().format())
    var currentTimeTimestamp = currentTimeUTC.getTime()

    for (var i = 0; i < surgeHours.length; i++) {
      var dayStatus = surgeHours[i].dayStatus
      var day = surgeHours[i].day

      var startTime = surgeHours[i].startTime
      var startTimeSplit = startTime.split(":")
      var startTimeHour = startTimeSplit[0]
      var startTimeMinute = startTimeSplit[1]
      var startTimeStructure =
        currentDate + " " + startTimeHour + ":" + startTimeMinute
      var startTimeByTimezone = module.exports.getDateAndTimeInCityTimezone(
        startTimeStructure,
        timezone
      )
      //console.log("startTimeByTimezone", startTimeByTimezone.format('LLLL'));
      var startTimeUTC = new Date(startTimeByTimezone.utc().format())
      var startTimeTimestamp = startTimeUTC.getTime()

      var endTime = surgeHours[i].endTime
      var endTimeSplit = endTime.split(":")
      var endTimeHour = endTimeSplit[0]
      var endTimeMinute = endTimeSplit[1]
      var endTimeStructure =
        currentDate + " " + endTimeHour + ":" + endTimeMinute
      var endTimeByTimezone = module.exports.getDateAndTimeInCityTimezone(
        endTimeStructure,
        timezone
      )
      //console.log("endTimeByTimezone", endTimeByTimezone.format('LLLL'));
      var endTimeUTC = new Date(endTimeByTimezone.utc().format())
      var endTimeTimestamp = endTimeUTC.getTime()
      var surgeMultipliers = surgeHours[i].surgeMultiplier

      if (
        dayStatus === "yes" &&
        currentDay === day &&
        currentTimeTimestamp > startTimeTimestamp &&
        currentTimeTimestamp < endTimeTimestamp
      ) {
        isSurgeTime = "yes"
        surgeMultiplier = surgeMultipliers
        break
      }
    }

    return { isSurgeTime: isSurgeTime, surgeMultiplier: surgeMultiplier }
  },
  caculateTripEstimatedCost: (timeZone, distance, time, element) => {
    console.log(
      "timeZone,distance, time, element :",
      timeZone,
      distance,
      time,
      element
    )

    var isSurgeTime = "no"
    var surgeMultiplier = 0
    var estimatedCost = 0
    var unit = ""
    //distance in km default
    console.log("surge element :", element)

    if (element.isSurgeTime === "yes") {
      if (element.surgeTimeList.length > 0) {
        var surgeCheck = module.exports.checkSurgeTime(timeZone, element.surgeTimeList)
        isSurgeTime = surgeCheck.isSurgeTime
        surgeMultiplier = surgeCheck.surgeMultiplier
      }
    }

    if (element.unit === "km") {
      distance = distance //distance in km

      var baseDistancePrice = element.basePrice
      var leftDistance = distance
      var leftDistancePrice = element.pricePerUnitDistance * leftDistance
      var totalDistancePrice = baseDistancePrice + leftDistancePrice
      var totalTimePrice = element.pricePerUnitTimeMinute * time
      var totalPrice = totalDistancePrice + totalTimePrice
      unit = "km"
      estimatedCost = module.exports.roundNumber(totalPrice)

      if (estimatedCost < element.minimumFare) {
        estimatedCost = element.minimumFare
      }

      if (isSurgeTime === "yes") {
        estimatedCost = module.exports.roundNumber(estimatedCost * surgeMultiplier);
      }
    } else if (element.unit === "mile") {
      distance = distance * 0.621371 //distance in miles
      var baseDistancePrice = element.basePrice
      var leftDistance = distance
      var leftDistancePrice = element.pricePerUnitDistance * leftDistance
      var totalDistancePrice = baseDistancePrice + leftDistancePrice
      var totalTimePrice = element.pricePerUnitTimeMinute * time
      var totalPrice = totalDistancePrice + totalTimePrice
      unit = "km"
      estimatedCost = module.exports.roundNumber(totalPrice)

      if (estimatedCost < element.minimumFare) {
        estimatedCost = element.minimumFare
      }

      if (isSurgeTime === "yes") {
        estimatedCost = module.exports.roundNumber(estimatedCost * surgeMultiplier);
      }
    }

    return {
      isSurgeTime: isSurgeTime,
      surgeMultiplier: surgeMultiplier,
      unit: unit,
      estimatedCost: estimatedCost,
      distance: module.exports.roundNumber(distance),
    }
  },

  getCurrentDateAndTimeInCityTimezoneFromUTC: (cityTimezone) => {
    var a = moment.tz(new Date(), cityTimezone)

    return a
  },
  getDateAndTimeInCityTimezone: (date, cityTimezone) => {
    console.log("Date", date)
    console.log("TimeZone", cityTimezone)

    var a = moment.tz(date, cityTimezone)

    return a
  },
  getDeliveryArea: (radius, unit) => {
    if (unit) {
      unit = unit;
    } else {
      unit = 'km';
    }

    let deliveryArea = 0;

    if (unit === 'miles') {
      deliveryArea = helper.milesToMeter(radius);
    } else {
      deliveryArea = helper.kmToMeter(radius);
    }

    return deliveryArea;
  },
  roundNumber: (num) => {
    return Math.round(num * 100) / 100
  },
  couponDiscountCalculation: async (code, itemTotal) => {
    let discountTotal = 0;
    let couponType = null;
    let couponAmount = 0;


    const getCoupon = await Coupon.getCouponByCode(code);

    if (getCoupon != null) {

      couponType = getCoupon.discount_type;
      couponAmount = getCoupon.amount;

      if (getCoupon.discount_type === 'percent') {
        itemTotal = module.exports.roundNumber((itemTotal - ((itemTotal * getCoupon.amount) / 100)));
        discountTotal = module.exports.roundNumber(((itemTotal * getCoupon.amount) / 100));
      }

      if (getCoupon.discount_type === 'flat') {
        itemTotal = module.exports.roundNumber((itemTotal - getCoupon.amount));
        discountTotal = module.exports.roundNumber(getCoupon.amount);
      }
    }

    return {
      discountTotal: discountTotal,
      couponType: couponType,
      couponAmount: couponAmount,
      itemTotal: itemTotal
    }
  },
  calculateLoyalityPoints: (orderTotal, criteria) => {

    let points = 0;
    let value = 0;
    let redemptionValue = 0;
    let redemPoints = 0
    console.log("orderTotal, criteria :", orderTotal, criteria);

    points = parseInt(((criteria.earningCriteria.points / criteria.earningCriteria.value) * orderTotal)); //(1/1000)*79.81 = 0.07981
    redemPoints = points;
    console.log("redemPoints :", redemPoints);

    value = module.exports.roundNumber(((criteria.redemptionCriteria.value / criteria.earningCriteria.points) * points));//(100/1)*79.81 = 7981

    redemptionValue = value;
    console.log("redemptionValue :", redemptionValue);

    let redemMax = module.exports.roundNumber((orderTotal - ((orderTotal * criteria.maxRedemptionPercentage) / 100))); //79.81-(79.81*3)/100 = 77.4157
    console.log("redemMax :", redemMax);

    if (redemptionValue > redemMax) {
      redemptionValue = redemMax;
      redemPoints = parseInt(((criteria.earningCriteria.points / criteria.earningCriteria.value) * redemptionValue));
    }

    return { points: points, value: value, redemptionValue: redemptionValue, redemPoints: redemPoints };
  },
  calculateLoyalityPointsValue: (pointsToRedeem, criteria) => {

    let redemptionValue = 0;

    redemptionValue = module.exports.roundNumber(((criteria.redemptionCriteria.value / criteria.earningCriteria.points) * pointsToRedeem));

    return { redemptionValue: redemptionValue };
  },
  tipCalculation: (tip, subTotal) => {
    let tipAmount = 0;

    if (tip != 0) {
      tipAmount = module.exports.roundNumber(((subTotal * tip) / 100));
    }

    return {
      tip: tip,
      tipAmount: tipAmount
    }
  },
  taxCalculation: (taxAmount, subTotal) => {
    let tax = 0;

    if (taxAmount != 0) {
      tax = module.exports.roundNumber(((subTotal * taxAmount) / 100));
    }

    return {
      tax: tax,
      taxAmount: taxAmount
    }
  },
  caculateEarning: (subTotal, tax, tipAmount, driverPercentCharge) => {
    let deliveryBoyEarning = 0;
    let adminEarning = 0;
    let adminDeliveryBoyEarning = 0;


    if (driverPercentCharge) {
      adminDeliveryBoyEarning = module.exports.roundNumber((subTotal - ((subTotal * driverPercentCharge) / 100)));
      deliveryBoyEarning = module.exports.roundNumber(((subTotal * driverPercentCharge) / 100));
    }

    adminEarning = module.exports.roundNumber(adminDeliveryBoyEarning + tax);
    deliveryBoyEarning = module.exports.roundNumber(deliveryBoyEarning + tipAmount);

    return {
      deliveryBoyEarning: deliveryBoyEarning,
      adminDeliveryBoyEarning: adminDeliveryBoyEarning,
      adminEarning: adminEarning
    }
  },
  generateOTP: (codelength) => {
    return Math.floor(Math.random() * (Math.pow(10, (codelength - 1)) * 9)) + Math.pow(10, (codelength - 1));
  },
  generatorRandomNumber: (length) => {

    if (typeof length == "undefined")
      length = 2;
    var token = "";
    var possible = "123456789";
    for (var i = 0; i < length; i++)
      token += possible.charAt(Math.floor(Math.random() * possible.length));
    return token;
  },
  getScheduleData: (format, sd, st, pickupTimezone) => {

    let dateStructure = sd + " " + st;
    console.log("dateStructure", dateStructure);
    let ar = helper.getDateAndTimeInCityTimezone(dateStructure, pickupTimezone);
    let scheduledTime = ar.format('LT'); //08:30 PM
    let scheduledDate = ar.format('L'); //04/09/1986
    let scheduled_utcs = new Date(ar.utc().format());

    return { scheduledDate: scheduledDate, scheduledTime: scheduledTime, scheduled_utc: scheduled_utcs, currentUTC: new Date() };
  },
  isValidDate: (date, format) => {

    var validDateFormat = moment(date, format).isValid();

    return validDateFormat;
  }

}