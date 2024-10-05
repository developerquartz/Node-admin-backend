const moment = require("moment-timezone");
const Config = require("../config/constants.json");
const axios = require("axios");
const csv = require("csvtojson");
var fs = require("fs");
const logTable = require("../models/logTable");
const terminologyTable = require("../models/terminologyTable");
const User = require("../models/userTable");
const validator = require("validator");
const { parse } = require("json2csv");
const ObjectId = require("objectid");
const menuServices = require("../module/menu/service/menu");
const geolib = require("geolib");
const agenda = require("../cron/agenda");
const vehicleTypeModel = require('../module/delivery/models/vehicelTypesTable');
const storeType = require("../models/storeTypeTable");
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
    isPointWithinRadius: (point, centerPoint, radius) => {
        return geolib.isPointWithinRadius(
            point, // { latitude: 51.525, longitude: 7.4575 },
            centerPoint, //{ latitude: 51.5175, longitude: 7.4678 },
            radius //5000
        );
    },
    isPointInPolygon: (point, polygon) => {
        return geolib.isPointInPolygon(
            point, // { latitude: 51.525, longitude: 7.4575 },
            polygon // [{ latitude: 51.5, longitude: 7.4 },{ latitude: 51.555, longitude: 7.4 },{ latitude: 51.555, longitude: 7.625 },{ latitude: 51.5125, longitude: 7.625 }]
        ); //[[],[],[]]
    },
    isPointInLine: (point, lineStart, lineEnd) => {
        return geolib.isPointInLine(
            point, // { latitude: 51.525, longitude: 7.4575 },
            lineStart, //{ latitude: 51.5175, longitude: 7.4678 },
            lineEnd //{ latitude: 51.5175, longitude: 7.4678 },
        );
    },
    csvToJson: async (filePath) => {
        let jsonArray = await csv().fromFile(filePath);
        if (jsonArray.length > 0) return jsonArray;
        else return [];
    },
    json2csv: async (data, key) => {
        try {
            const fields = key;
            const column = { fields };
            var csv = parse(data, column);
            return { status: true, csv };
        } catch (err) {
            console.error(err);
            return { status: false, csv: [] };
        }
    },
    unlinkLocalFile: async (filePath) => {
        try {
            fs.unlinkSync(filePath);
            //file removed
        } catch (err) {
            //    console.error(err)
        }
    },
    importObjectValidation: async (errMsg, itm, distinctArray, userType, key) => {
        if (
            !itm.name ||
            !itm.email ||
            itm.email === "" ||
            !itm.password ||
            (userType != "User" && !itm.address) ||
            !itm.mobileNumber
        ) {
            errMsg +=
                "name,email,mobileNumber,address and password fields are required in valid format ,";
            Object.assign(itm, { rowStatus: "failure" });
            Object.assign(itm, {
                reason:
                    "name,email,mobileNumber,address and password fields are required in valid format.",
            });
        } else if (
            !validator.isMobilePhone(itm.mobileNumber) ||
            !validator.isEmail(itm.email)
        ) {
            errMsg +=
                "name,email,mobileNumber,address and password fields are required in valid format ,";

            Object.assign(itm, { rowStatus: "failure" });
            Object.assign(itm, { reason: "email or mobileNumber is invalid." });
        } else if (distinctArray.includes(itm[key])) {
            Object.assign(itm, { rowStatus: "failure" });
            Object.assign(itm, {
                reason: userType + " is already exist with this " + key + ".",
            });
        } else {
            Object.assign(itm, { rowStatus: "success" });
            Object.assign(itm, { reason: "" });
        }

        return { itm, errMsg };
    },
    importProductObjectValidation: async (
        errMsg,
        itm,
        checkCat,
        checkAddon,
        checkBrand,
        storeType
    ) => {
        if (
            !itm.name ||
            !itm.price ||
            !itm.type ||
            !itm.sku ||
            itm.categories.length == 0 ||
            !itm.stock_status
        ) {
            console.log("in if dataaa-----");
            errMsg +=
                "name,categories,price,type,sku and stock_status fields are required in " +
                itm.SNO +
                " row,";
            Object.assign(itm, { rowStatus: "failure" });
            Object.assign(itm, {
                reason:
                    "name,categories,price,type,sku and stock_status fields are required",
            });
        }
        // else if (storeType === "FOOD" && itm.addons.length > 0 && (checkAddon.length == 0 || itm.addons.length != checkAddon[0].name.length)) {
        //     errMsg += "Addons not found in " + itm.SNO + " row,";
        //     Object.assign(itm, { rowStatus: "failure" });
        //     Object.assign(itm, { reason: "addons not found" });
        // }
        else if (
            storeType != "FOOD" &&
            itm.brand &&
            (!checkBrand || checkBrand == undefined)
        ) {
            console.log("in brand data---");
            errMsg += "Brand not found in " + itm.SNO + " row,";
            Object.assign(itm, { rowStatus: "failure" });
            Object.assign(itm, { reason: "brand not found" });
        }
        // else if (checkCat.length == 0 || itm.categories.length > checkCat[0].catName.length) {
        //     errMsg += "catgory not found in " + itm.SNO + " row,";
        //     Object.assign(itm, { rowStatus: "failure" });
        //     Object.assign(itm, { reason: "catgory not found" });
        // }
        // else if (Number(itm.compare_price) < Number(itm.price)) {
        //     errMsg += "compare_price must be greater then price in " + itm.SNO + " row,";
        //     Object.assign(itm, { rowStatus: "failure" });
        //     Object.assign(itm, { reason: "compare_price must be greater then price" });

        // }
        else {
            console.log("checkBrand:===>", checkBrand)
            if (checkBrand) itm.brand = checkBrand._id;
            // else
            // delete itm.brand
            // if (checkAddon.length > 0)
            //     itm.addons = checkAddon[0].addonId
            // if (checkCat.length > 0)
            //     itm.categories = checkCat[0].catId

            Object.assign(itm, { rowStatus: "success" });
            Object.assign(itm, { reason: "" });
        }

        return { itm, errMsg };
    },
    importProductVariationObjectValidation: async (
        errMsg,
        itm,
        distinctArray,
        checkAttribute,
        key
    ) => {
        if (!itm.product_id || !itm.price || !itm.sku || !itm.stock_status) {
            errMsg +=
                "product_id,price,sku and stock_status fields are required in " +
                itm.SNO +
                " row ,";
            Object.assign(itm, { rowStatus: "failure" });
            Object.assign(itm, {
                reason: "product_id,price,sku and stock_status fields are required",
            });
        } else if (!distinctArray.includes(itm[key])) {
            errMsg +=
                "product Id" + itm.product_id + " is invalid in " + itm.SNO + " row ,";

            Object.assign(itm, { rowStatus: "failure" });
            Object.assign(itm, { reason: "Product not found with this product id." });
        } else if (checkAttribute.length == 0) {
            errMsg +=
                "Attribute and Attribute terms  are required in " + itm.SNO + " row ,";

            Object.assign(itm, { rowStatus: "failure" });
            Object.assign(itm, {
                reason: "Attribute and Attribute terms is required.",
            });
        } else if (checkAttribute.length > 0) {
            let checkAttributeStatus = true;
            checkAttribute.forEach((element) => {
                if (!element.name || !element.terms) checkAttributeStatus = false;
            });
            if (!checkAttributeStatus) {
                errMsg +=
                    "Attribute and Attribute terms  are required in " +
                    itm.SNO +
                    " row ,";

                Object.assign(itm, { rowStatus: "failure" });
                Object.assign(itm, {
                    reason: "Attribute and Attribute terms are required.",
                });
            } else {
                Object.assign(itm, { rowStatus: "success" });
                Object.assign(itm, { reason: "" });
            }
        } else {
            Object.assign(itm, { rowStatus: "success" });
            Object.assign(itm, { reason: "" });
        }

        return { itm, errMsg };
    },
    groupByKey: async (xs, key) => {
        try {
            var groupBy = function (xs, key) {
                return xs.reduce(function (rv, x) {
                    (rv[x[key].trim()] = rv[x[key].trim()] || []).push(x);
                    return rv;
                }, {});
            };
            let data = groupBy(xs, key);
            if (data) return data;
            else return {};
        } catch (err) {
            console.log("catch error :", err);
        }
    },
    checkRequestParams: (request_data_body, params_array, response) => {
        var missing_param = "";
        var is_missing = false;
        var invalid_param = "";
        var is_invalid_param = false;
        if (request_data_body) {
            params_array.forEach(function (param) {
                //console.log(param.name)
                if (request_data_body[param.name] == undefined) {
                    missing_param = param.name;
                    is_missing = true;
                } else {
                    if (typeof request_data_body[param.name] !== param.type) {
                        is_invalid_param = true;
                        invalid_param = param.name;
                    }
                }
            });

            if (is_missing) {
                //console.log("missing")
                response({
                    status: false,
                    error_code: error_message.ERROR_CODE_PARAMETER_MISSING,
                    message: missing_param + " parameter missing!",
                });
            } else if (is_invalid_param) {
                //console.log("invaid param")
                response({
                    status: false,
                    error_code: error_message.ERROR_CODE_PARAMETER_INVALID,
                    message: invalid_param + " parameter invalid data type!",
                });
            } else {
                response({ status: true });
            }
        } else {
            response({ status: true });
        }
    },

    getDistanceFromTwoLocation: (fromLocation, toLocation) => {
        var lat1 = fromLocation[0];
        var lat2 = toLocation[0];
        var lon1 = fromLocation[1];
        var lon2 = toLocation[1];

        ///////  TOTAL DISTANCE ////

        var R = 6371; // km (change this constant to get miles)
        var dLat = ((lat2 - lat1) * Math.PI) / 180;
        var dLon = ((lon2 - lon1) * Math.PI) / 180;
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    tokenGenerator: (length) => {
        if (typeof length == "undefined") length = 32;
        var token = "";
        var possible =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < length; i++)
            token += possible.charAt(Math.floor(Math.random() * possible.length));
        return token;
    },

    generatorRandomChar: (length) => {
        if (typeof length == "undefined") length = 2;
        var token = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (var i = 0; i < length; i++)
            token += possible.charAt(Math.floor(Math.random() * possible.length));
        return token;
    },

    generatorRandomNumber: (length) => {
        if (typeof length == "undefined") length = 2;
        var token = "";
        var possible = "123456789";
        for (var i = 0; i < length; i++)
            token += possible.charAt(Math.floor(Math.random() * possible.length));
        return token;
    },

    getTimeDifferenceInDay: (endDate, startDate) => {
        var difference = 0;
        var startDateFormat = moment(startDate, "YYYY-MM-DD");
        var endDateFormat = moment(endDate, "YYYY-MM-DD");
        difference = endDateFormat.diff(startDateFormat, "days");
        difference = difference.toFixed(2);

        return difference;
    },

    getTimeDifferenceInSecond: (endDate, startDate) => {
        var difference = 0;
        var startDateFormat = moment(startDate);
        var endDateFormat = moment(endDate);
        difference = endDateFormat.diff(startDateFormat, "seconds");
        difference = difference.toFixed(2);

        return difference;
    },

    getTimeDifferenceInMinute: (endDate, startDate) => {
        var difference = 0;
        var startDateFormat = moment(startDate);
        var endDateFormat = moment(endDate);
        difference = endDateFormat.diff(startDateFormat, "minutes");
        difference = Math.round(difference);
        return difference;
    },

    getDates: (startDate, endDate) => {
        //let endDate2 = new Date(endDate.setDate(endDate.getDate() - 1));
        var startDateFormat = moment(startDate, "YYYY-MM-DD");
        var endDateFormat = moment(endDate, "YYYY-MM-DD");

        var dateArray = [];
        var currentDate = moment(startDateFormat);
        var stopDate = moment(endDateFormat);
        while (currentDate < stopDate) {
            dateArray.push(moment(currentDate).format("YYYY-MM-DD"));
            currentDate = moment(currentDate).add(1, "days");
        }
        return dateArray;
    },

    getWeekDates: (startDate, endDate) => {
        //let endDate2 = new Date(endDate.setDate(endDate.getDate() - 1));
        var startDateFormat = moment(startDate, "YYYY-MM-DD");
        var endDateFormat = moment(endDate, "YYYY-MM-DD");

        var dateArray = [];
        var currentDate = moment(startDateFormat);
        var stopDate = moment(endDateFormat);
        while (currentDate < stopDate) {
            dateArray.push(
                moment(currentDate).startOf("isoWeek").format("YYYY-MM-DD")
            );
            currentDate = moment(currentDate).add(1, "days");
        }

        const unique = dateArray.filter((v, i, a) => a.indexOf(v) === i);

        return unique;
    },

    showParamsErrorResponse: (message) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5001,
            error_description: "Missing Params or Params data type error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },
    showValidationResponseWithData: (message, data) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5002,
            error_description: "Validation Error!",
            message: __(message),
            data: data,
            error: {},
        };
        return resData;
    },

    showValidationErrorResponse: (message) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5002,
            error_description: "Validation Error!",
            message: __(message),
            data: {},
            error: {},
        };
        return resData;
    },

    showInternalServerErrorResponse: (message) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5003,
            error_description: "Internal Coding error or Params Undefined!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },

    showUnathorizedErrorResponse: (message) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5004,
            error_description: "Invalid Login Credential!",
            message: __(message),
            data: {},
            error: {},
        };
        return resData;
    },

    showUnathorizedErrorResponseAccess: (message) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5011,
            error_description: "You have not access for this!",
            message: __(message),
            data: {},
            error: {},
        };
        return resData;
    },

    showUnathorizedAppErrorResponse: (message) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5004,
            error_description: "Unathorized Access!",
            message: __(message),
            data: {},
            error: {},
        };
        return resData;
    },

    showUnathorizedAppErrorWithErrorCode: (message, error_code) => {
        let resData = {
            status: "failure",
            status_code: 200,
            error_code: Number(error_code),
            error_description: "Unathorized Access!",
            message: __(message),
            data: {},
            error: {},
        };
        return resData;
    },

    showDatabaseErrorResponse: (message, error) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5005,
            error_description: "Database error!",
            message: __(message),
            data: {},
            error: error,
        };
        return resData;
    },

    showAWSImageUploadErrorResponse: (message, error) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5006,
            error_description: "AWS error!",
            message: __(message),
            data: {},
            error: error,
        };
        return resData;
    },

    showTwillioErrorResponse: (message) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5007,
            error_description: "Twillio Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },

    showGoogleMapsErrorResponse: (message) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5008,
            error_description: "Google Maps Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },

    showStripeErrorResponse: (message, code) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5009,
            stripe_error_code: code,
            error_description: "Stripe Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },

    showPaystackErrorResponse: (message, code) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5009,
            paystack_error_code: code,
            error_description: "Paysatck Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },
    showFlutterwaveErrorResponse: (message, code) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5009,
            flutterwave_error_code: code,
            error_description: "Flutterwave Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },
    showPay360ErrorResponse: (message, code) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5009,
            pay360_error_code: code,
            error_description: "Pay360 Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },
    showDpoErrorResponse: (message, code) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5009,
            dpo_error_code: code,
            error_description: "Dpo Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },
    showMonCashErrorResponse: (message, code) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5009,
            monCash_error_code: code,
            error_description: "monCash Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },
    showBraintreeErrorResponse: (message, code) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5018,
            braintree_error_code: code,
            error_description: "Braintree Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },

    showApiErrorResponse: (message, code) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5019,
            api_error_code: code,
            error_description: "Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },

    showSquareErrorResponse: (message) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 5010,
            error_description: "Square Api Error!",
            message: message,
            data: {},
            error: {},
        };
        return resData;
    },

    showSuccessResponse: (message, data) => {
        var resData = {
            status: "success",
            status_code: 200,
            message: __(message),
            data: data,
        };
        return resData;
    },
    showValidationResponseWithData: (message, data) => {
        var resData = {
            status: "failure",
            status_code: 200,
            error_code: 50017,
            message: __(message),
            data: data,
        };
        return resData;
    },
    showSuccessResponseCount: (message, data, count) => {
        var resData = {
            status: "success",
            status_code: 200,
            message: __(message),
            data: data,
            totalcount: count,
        };
        return resData;
    },

    getAge: (dob) => {
        var DOBFD = moment(dob, "YYYYMMDD");

        var age = moment().diff(DOBFD, "years");

        return age;
    },

    isValidDate: (date, format) => {
        var validDateFormat = moment(date, format).isValid();

        return validDateFormat;
    },
    subtractHours: (date, hours = 1, action = "hours") => {
        return moment(date).subtract(hours, action);;
    },

    getScheduleData: (format, sd, st, pickupTimezone) => {
        let dateStructure = sd + " " + st;
        let ar = helper.getDateAndTimeInCityTimezone(dateStructure, pickupTimezone);
        let scheduledTime = ar.format("LT"); //08:30 PM
        let scheduledDate = ar.format("L"); //04/09/1986
        let scheduledTime24 = ar.format('HH:mm'); //20:30
        let scheduledDateIST = ar.format("DD-MM-YYYY");
        let scheduled_utcs = new Date(ar.utc().format());

        return {
            scheduledDate: scheduledDate,
            scheduledTime: scheduledTime,
            scheduled_utc: scheduled_utcs,
            currentUTC: new Date(),
            scheduledTime24: scheduledTime24,
            scheduledDateIST: scheduledDateIST
        };
    },

    roundNumber: (num) => {
        return Math.round(num * 100) / 100;
    },
    truncNumber: (num) => {
        return Math.trunc(num);
    },

    milesToMeter: (radius) => {
        return parseInt(radius * 1609.34);
    },

    kmToMeter: (radius) => {
        return parseInt(radius * 1000);
    },

    MeterTomiles: (radius) => {
        return helper.roundNumber(radius / 1609.34);
    },
    capitalize: (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    getDeliveryArea: (radius, unit) => {
        if (unit) {
            unit = unit;
        } else {
            unit = "km";
        }

        let deliveryArea = 0;

        if (unit === "miles") {
            deliveryArea = helper.milesToMeter(radius);
        } else {
            deliveryArea = helper.kmToMeter(radius);
        }

        return deliveryArea;
    },

    getCardIcon: (type) => {
        let icons = Config.CARD_ICONS.filter((element) => element.type === type);

        let icon =
            "https://hlcstagings3.s3.us-east-2.amazonaws.com/1704354128727visa.png";
        if (icons.length > 0) {
            icon = icons[0].link;
        }
        return icon;
    },

    getCurrentDateAndTimeInCityTimezoneFromUTC: (cityTimezone) => {
        let as = moment.tz(new Date(), cityTimezone);

        return as;
    },

    getDateAndTimeInCityTimezone: (date, cityTimezone) => {
        let ad = moment.tz(date, cityTimezone);

        return ad;
    },
    checkMonthdate: (date) => {
        let aftermonth = moment(date).add(1, "month").format("YYYY-MM-DD");

        return new Date(aftermonth);
    },
    checkSurgeTime: (date, timezone, surgeHours) => {
        let status = false;
        let obj = {};

        let CurrentCityTime = helper.getDateAndTimeInCityTimezone(date, timezone);
        let currentDay = CurrentCityTime.day();
        let currentDate = CurrentCityTime.format("YYYY-MM-DD");
        let currentTimeUTC = new Date(CurrentCityTime.utc().format());
        let currentTimeTimestamp = currentTimeUTC.getTime();

        for (var i = 0; i < surgeHours.length; i++) {
            let dayStatus = surgeHours[i].dayStatus;
            let day = surgeHours[i].day;

            let startTime = surgeHours[i].startTime;
            let startTimeSplit = startTime.split(":");
            let startTimeHour = startTimeSplit[0];
            let startTimeMinute = startTimeSplit[1];
            let startTimeStructure =
                currentDate + " " + startTimeHour + ":" + startTimeMinute;
            let startTimeByTimezone = helper.getDateAndTimeInCityTimezone(
                startTimeStructure,
                timezone
            );
            let startTimeFormat = startTimeByTimezone.format("LT");
            //console.log("startTimeByTimezone", startTimeByTimezone.format('LLLL'));
            let startTimeUTC = new Date(startTimeByTimezone.utc().format());
            let startTimeTimestamp = startTimeUTC.getTime();

            let endTime = surgeHours[i].endTime;
            let endTimeSplit = endTime.split(":");
            let endTimeHour = endTimeSplit[0];
            let endTimeMinute = endTimeSplit[1];
            let endTimeStructure =
                currentDate + " " + endTimeHour + ":" + endTimeMinute;
            let endTimeByTimezone = helper.getDateAndTimeInCityTimezone(
                endTimeStructure,
                timezone
            );
            let endTimeFormat = endTimeByTimezone.format("LT");
            //console.log("endTimeByTimezone", endTimeByTimezone.format('LLLL'));
            let endTimeUTC = new Date(endTimeByTimezone.utc().format());
            let endTimeTimestamp = endTimeUTC.getTime();

            if (
                dayStatus === "yes" &&
                currentDay === day &&
                currentTimeTimestamp > startTimeTimestamp &&
                currentTimeTimestamp < endTimeTimestamp
            ) {
                status = true;
                obj.endTime = endTimeFormat;
                obj.startTime = startTimeFormat;
                break;
            } else {
                obj.endTime = endTimeFormat;
                obj.startTime = startTimeFormat;
            }
        }

        return { status: status, data: obj };
    },
    validateDeliverTimeSlotForVender: (date, timezone, deliveryTimeSlot) => {
        let status = false;
        let obj = {};
        let CurrentCityTime = helper.getDateAndTimeInCityTimezone(date || new Date(), timezone);
        let currentDate = CurrentCityTime.format("YYYY-MM-DD");
        let currentTimeUTC = new Date(CurrentCityTime.utc().format());
        let currentTimeTimestamp = currentTimeUTC.getTime();

        let dayStatus = deliveryTimeSlot.status;

        let startTime = deliveryTimeSlot.startTime;
        let startTimeSplit = startTime.split(":");
        let startTimeHour = startTimeSplit[0];
        let startTimeMinute = startTimeSplit[1];
        let startTimeStructure =
            currentDate + " " + startTimeHour + ":" + startTimeMinute;
        let startTimeByTimezone = helper.getDateAndTimeInCityTimezone(
            startTimeStructure,
            timezone
        );
        let startTimeFormat = startTimeByTimezone.format("LT");
        let startTimeUTC = new Date(startTimeByTimezone.utc().format());
        let startTimeTimestamp = startTimeUTC.getTime();

        let endTime = deliveryTimeSlot.endTime;
        let endTimeSplit = endTime.split(":");
        let endTimeHour = endTimeSplit[0];
        let endTimeMinute = endTimeSplit[1];
        let endTimeStructure =
            currentDate + " " + endTimeHour + ":" + endTimeMinute;
        let endTimeByTimezone = helper.getDateAndTimeInCityTimezone(
            endTimeStructure,
            timezone
        );
        let endTimeFormat = endTimeByTimezone.format("LT");
        //console.log("endTimeByTimezone", endTimeByTimezone.format('LLLL'));
        let endTimeUTC = new Date(endTimeByTimezone.utc().format());
        let endTimeTimestamp = endTimeUTC.getTime();
        if (dayStatus && currentTimeTimestamp > startTimeTimestamp && currentTimeTimestamp < endTimeTimestamp) {
            status = true;
            obj.endTime = endTimeFormat;
            obj.startTime = startTimeFormat;
        } else {
            obj.endTime = endTimeFormat;
            obj.startTime = startTimeFormat;
        }

        return { status: status, data: obj };
    },
    getVendorOpenCloseStatus: (isVendorAvailable, timeSlot, date, timezone) => {
        let check = helper.checkSurgeTime(date, timezone, timeSlot);
        let status = "Close";

        if (isVendorAvailable && check.status) {
            status = "Open";
        }

        return {
            status: status,
            startTime: check.data.startTime,
            endTime: check.data.endTime,
        };
    },
    getVendorOpenCloseStatusForScheduleOrder: (
        isVendorAvailable,
        timeSlot,
        date,
        timezone
    ) => {
        let check = helper.checkSurgeTime(date, timezone, timeSlot);
        let status = "Close";

        if (check.status) {
            status = "Open";
        }

        return {
            status: status,
            startTime: check.data.startTime,
            endTime: check.data.endTime,
        };
    },
    getVendorOpenCloseStatusNew: (vendor, date, timezone) => {
        let startTime = "";
        let endTime = "";
        let status = "Close";

        switch (vendor.vendorAvailability) {
            case "off":
                status = "Close";
                break;
            case "always":
                status = "Open";
                break;
            case "day":
                let check = helper.checkSurgeTime(date, timezone, vendor.timeSlot);
                if (check.status) {
                    status = "Open";
                }
                startTime = check.data.startTime;
                endTime = check.data.endTime;
                break;
            default:
                break;
        }

        return { status: status, startTime, endTime: endTime };
    },

    updateTerminologyScript: async (processTerminology) => {
        try {
            let customerTerminology = require("../config/customer-lang-" +
                processTerminology.lang +
                ".json");
            let staticTerminology = customerTerminology.langJSON_arr;
            let orderTerminology = customerTerminology.orderLang_arr;
            let ALlterminology = [
                ...processTerminology.values,
                ...staticTerminology,
                ...orderTerminology,
            ];

            let terminologyData = {
                lang: processTerminology.lang,
                status: processTerminology.status,
                store: processTerminology.store._id,
                user: processTerminology.user,
                type: processTerminology.type,
                values: ALlterminology,
                web_name: processTerminology.store.domain.replace("www.", "").trim(),
            };

            //let setting_url = process.env.NODE_ENV === "production" ? "https://" + processTerminology.store.domain + "/update-lang" : env.updateSettings + "/update-lang";
            let setting_url = env.updateSettings + "/update-lang";
            let requestTerminology = await axios({
                method: "post",
                url: setting_url,
                data: terminologyData,
            }).then((request2) => {
                if (request2.data) {
                    let obj = {
                        type: "UPDATE_TERMINOLOGY",
                        id: processTerminology.store._id,
                        idType: "stores",
                        message: "Update store terminology",
                        notes: request2.data["message"],
                        meta_data: [
                            { key: "storeName", value: processTerminology.store.storeName },
                            { key: "slug", value: processTerminology.store.slug },
                        ],
                    };
                    if (request2.data.status == "failure") obj.status = "error";

                    logTable.addLog(obj, (err, data) => { });
                }
            });
        } catch (error) {
            console.log("errrrrrrrr-------", error);
            let obj = {
                type: "UPDATE_TERMINOLOGY",
                id: processTerminology.store._id,
                idType: "stores",
                message: "Update store terminology",
                notes: "404 error",
                meta_data: [
                    { key: "storeName", value: processTerminology.store.storeName },
                    { key: "slug", value: processTerminology.store.slug },
                ],
            };
            obj.status = "error";

            logTable.addLog(obj, (err, data) => { });
        }
    },

    updateConfigStoreSetting: async (store) => {
        try {
            let getStoreSettingJson = await helper.getStoreSettingJson(store);

            let url = getStoreSettingJson.domain + "update-website";

            let setting_url = env.updateSettings + "/update-website";

            // Send a POST request
            let request = await axios({
                method: "post",
                url: setting_url,
                data: getStoreSettingJson,
            });
            if (request.data) {
                let obj = {
                    type: "UPDATE_SETTING",
                    id: store._id,
                    idType: "stores",
                    message: "Create Store Setting",
                    notes: request.data["message"],
                    meta_data: [
                        { key: "storeName", value: store.storeName },
                        { key: "slug", value: store.slug },
                    ],
                };
                if (request.data.status == "ERROR") obj.status = "error";

                logTable.addLog(obj, (err, data) => { });
            }
        } catch (error) {
            let obj = {
                type: "UPDATE_SETTING",
                id: store._id,
                idType: "stores",
                message: "Unable to create Store Setting",
                notes: "404 error",
                meta_data: [
                    { key: "storeName", value: store.storeName },
                    { key: "slug", value: store.slug },
                ],
            };
            obj.status = "error";

            logTable.addLog(obj, (err, data) => { });
        }
    },

    getStoreSettingJson: async (store) => {
        try {
            let obj = {};
            obj.api_key = store.api_key;
            obj.status = store.status;
            let url = "https://" + store.domain + "/";
            obj.domain = url;
            obj.web_name = store.domain.replace("www.", "").trim();
            obj.storeName = store.storeName;
            obj.mobileNumber = store.mobileNumber;
            obj.email = store.email;
            obj.headerScript = store.chatCodeScript;
            obj.whatsapp_number = store.whatsapp_number;
            obj.tawk_direct_chat_link = store.tawk_direct_chat_link;
            obj.storeType = store.storeType;
            if (store.logo) {
                obj.logo = store.logo.link;
            } else {
                obj.logo =
                    "https://mnc.s3.us-east-2.amazonaws.com/1616072511893logo.png";
            }

            if (store.favIcon) {
                obj.favIcon = store.favIcon.link;
            } else {
                obj.favIcon =
                    "https://mnc.s3.us-east-2.amazonaws.com/1616131296310favicon.ico";
            }

            obj.bannerImage = store.bannerImage.link;
            obj.bannerText = store.bannerText;
            obj.language = store.language;
            obj.currency = store.currency;
            obj.country = store.country;
            obj.distanceUnit = store.distanceUnit;
            obj.timezone = store.timezone;
            obj.paymentMode = store.paymentMode;
            obj.paymentSettings = store.paymentSettings;
            obj.themeSettings = store.themeSettings;
            obj.socialMedia = store.socialMedia;
            obj.socialMediaLoginSignUp = store.socialMediaLoginSignUp;
            let isFacebookLogin = false;
            let isGoogleLogin = false;
            let isAppleLogin = false;
            if (
                store.socialMediaLoginSignUp &&
                store.socialMediaLoginSignUp.length > 0
            ) {
                store.socialMediaLoginSignUp.forEach((element) => {
                    if (
                        element.status &&
                        element.type === "facebook" &&
                        element.keys.clientId != null &&
                        element.keys.secretKey != null
                    ) {
                        isFacebookLogin = true;
                    }

                    if (
                        element.status &&
                        element.type === "google" &&
                        element.keys.clientId != null &&
                        element.keys.secretKey != null
                    ) {
                        isGoogleLogin = true;
                    }

                    if (
                        element.status &&
                        element.type === "apple" &&
                        element.keys.appId != null &&
                        element.keys.teamId != null &&
                        element.keys.keyId != null &&
                        element.keys.keyContent != null
                    ) {
                        isAppleLogin = true;
                    }
                });
            }

            obj.isFacebookLogin = isFacebookLogin;
            obj.isGoogleLogin = isGoogleLogin;
            obj.isAppleLogin = isAppleLogin;

            obj.appUrl = store.appUrl;
            obj.socketUrl = env.socketUrl;
            obj.apiUrl = env.apiUrl;
            obj.poweredBy = env.poweredBy;
            obj.poweredByLink = env.poweredByLink;
            obj.deliveryMultiStoretype = store.deliveryMultiStoretype;
            obj.googleMapKey = store.googleMapKey;
            obj.removeBranding = store.removeBranding;
            obj.loyaltyPoints = store.loyaltyPoints;
            obj.gtmHeadScript = store.gtmHeadScript;
            obj.gtmBodyScript = store.gtmBodyScript;
            obj.menu = await module.exports.getMenuList(store._id);
            obj.is_web_allow = store.is_web_allow;
            let today = new Date();
            today.setHours(0, 0, 0, 0);
            let status = "inactive";
            if (
                new Date(today).getTime() < new Date(store.plan.endDate).getTime() ||
                ["active", "gracePeriod"].includes(store.status)
            ) {
                status = "active";
            }

            let isSingleVendor = false;
            let isSingleCategory = false;

            if (store.plan) {
                let planObj = {};
                let days = Number(
                    module.exports.getTimeDifferenceInDay(store.plan.endDate, today)
                );
                if (store.plan.isTrial) {
                    planObj.name = "Trial";
                    planObj.daysLeftToExpire = days > 0 ? days : 0;
                    planObj.status = status;
                    obj.plan = planObj;
                } else if (store.plan.isTrial == false && store.plan.billingPlan) {
                    planObj.name = store.plan.billingPlan.name;
                    planObj.daysLeftToExpire = days > 0 ? days : 0;
                    planObj.status = status;
                    obj.plan = planObj;
                }

                if (
                    store.plan.billingPlan.type &&
                    store.plan.billingPlan.type === "basic"
                ) {
                    isSingleVendor = true;
                }

                if (
                    store.plan.billingPlan.type &&
                    store.plan.billingPlan.type === "premium"
                ) {
                    isSingleCategory = true;
                }
            }

            obj.isSingleVendor = isSingleVendor;
            obj.isSingleCategory = isSingleCategory;
            let singleVendorData = {};

            if (isSingleVendor) {
                let getSVD = await helper.getSingleVendorData(
                    store.storeType,
                    store.domain
                );
                singleVendorData = getSVD;
            }

            if (isSingleCategory) {
                let getSVD = await helper.getSingleCategoryData(store.storeType);
                singleVendorData = getSVD;
            }

            obj.singleVendorData = singleVendorData;

            obj.cookiePolicy = store.cookiePolicy;
            obj.storeVersion = store.storeVersion;

            return obj;
        } catch (error) {
            console.log("error :", error);
        }
    },

    getMenuList: async (storeId) => {
        try {
            let obj = {};
            obj.store = storeId;

            obj.status = "active";
            let menuData = await menuServices.getMenuAsync(obj);
            if (menuData) return menuData;
            else return [];
        } catch (err) {
            console.log("catch error :", err);
            return [];
        }
    },

    getSingleVendorData: async (storeTypes, domain) => {
        let singleVendorData = {};

        const getstoreType = storeTypes.filter((storeType) => {
            return storeType.status === "active";
        });

        if (getstoreType.length > 0) {
            await Promise.all(
                getstoreType.map(async (element) => {
                    let getVendor = await User.find(
                        { storeType: { $in: [ObjectId(element._id)] }, role: "VENDOR" },
                        "name"
                    ).limit(1);
                    if (getVendor.length > 0) {
                        let webViewUrl =
                            "https://" +
                            domain +
                            "/applistingview?&type=" +
                            element.storeType.toLowerCase() +
                            "&store=" +
                            element._id.toString() +
                            "&id=" +
                            getVendor[0]._id;
                        singleVendorData.vendor = getVendor[0]._id;
                        if (element.storeType == "SERVICEPROVIDER") {
                            singleVendorData.requestType = element.requestType;
                        }
                        if (element.storeType == "TAXI") {
                            singleVendorData.bidSettings = element.bidSettings
                                ? element.bidSettings
                                : {};
                        }
                        if (element.storeType == "PICKUPDROP") {
                            singleVendorData.multiDropsSettings = element.multiDropsSettings
                                ? true
                                : false;
                            singleVendorData.returnTypeList = element.returnTypeList;
                        }
                        singleVendorData.name = getVendor[0].name;
                        singleVendorData.storeTypeId = element._id;
                        singleVendorData.storeType = element.storeType;
                        singleVendorData.deliveryType = element.deliveryType;
                        singleVendorData.webViewUrl = webViewUrl;
                    }
                })
            );
        }
        return singleVendorData;
    },

    getSingleCategoryData: async (storeTypes) => {
        let singleVendorData = {};

        const getstoreType = storeTypes.filter((storeType) => {
            return storeType.status === "active";
        });

        if (getstoreType.length > 0) {
            await Promise.all(
                getstoreType.map(async (element) => {
                    singleVendorData.storeTypeId = element._id;
                    singleVendorData.storeType = element.storeType;
                    singleVendorData.deliveryType = element.deliveryType;
                })
            );
        }
        return singleVendorData;
    },

    getTerminologyData: async (data) => {
        let body = "";

        const logData = await terminologyTable.findOne(
            {
                lang: data.lang,
                store: data.storeId,
                type: data.type,
            },
            { values: { $elemMatch: { constant: data.constant } } }
        );
        if (logData != null && logData.values && logData.values.length > 0) {
            body = logData.values[0].value;
        } else {
            body = __(data.constant);
        }

        if (data.name) {
            body = body.replace("{name}", data.name);
        }
        if (data.date) {
            body = body.replace("{date}", data.date);
        }
        return body;
    },

    calculateLoyalityPoints: (orderTotal, criteria) => {
        let points = 0;
        let value = 0;
        let redemptionValue = 0;
        let redemPoints = 0;

        points = parseInt(
            (criteria.earningCriteria.points / criteria.earningCriteria.value) *
            orderTotal
        );
        redemPoints = points;

        value = helper.roundNumber(
            (criteria.redemptionCriteria.value / criteria.earningCriteria.points) *
            points
        );

        redemptionValue = value;

        let redemMax = helper.roundNumber(
            orderTotal - (orderTotal * criteria.maxRedemptionPercentage) / 100
        );

        if (redemptionValue > redemMax) {
            redemptionValue = redemMax;
            redemPoints = parseInt(
                (criteria.earningCriteria.points / criteria.earningCriteria.value) *
                redemptionValue
            );
        }

        return {
            points: points,
            value: value,
            redemptionValue: redemptionValue,
            redemPoints: redemPoints,
        };
    },

    calculateLoyalityPointsValue: (pointsToRedeem, criteria) => {
        let redemptionValue = 0;

        redemptionValue = helper.roundNumber(
            (criteria.redemptionCriteria.value / criteria.earningCriteria.points) *
            pointsToRedeem
        );

        return { redemptionValue: redemptionValue };
    },

    createLogForScript: async (obj) => {
        if (obj.status == "failure") {
            obj.status = "error";
        }

        if (obj.status == "success1") {
            obj.status = "success";
        }

        logTable.addLog(obj, (err, data) => { });
    },

    getIp: (req) => {
        let ip =
            (typeof req.headers["x-forwarded-for"] === "string" &&
                req.headers["x-forwarded-for"].split(",").shift()) ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
        console.log("ip", ip);
        return ip;
    },

    getTipAmount: (tipType, tip, orderTotal) => {
        let tipAmount = tip;

        if (tipType == "percentage") {
            tipAmount = helper.roundNumber((orderTotal * tip) / 100);
        }

        return tipAmount;
    },
    checkorderstatus: async function (getOrder) {
        let refundAmount = 0;
        let refundType = null;
        const cancellationArray = getOrder.storeType.cancellationPolicy;
        const status = getOrder.orderStatus;
        const cancelRfundamount =
            getOrder.storeType.cancellationPartialRefundAmount;
        const found = cancellationArray.find(
            (element) => element.orderStatus == status && element.status
        );
        if (found) {
            if (found.refundType == "partial" && cancelRfundamount > 0) {
                refundAmount = helper.roundNumber(
                    (getOrder.orderTotal * cancelRfundamount) / 100
                );
            } else if (found.refundType === "full") {
                refundAmount = getOrder.orderTotal;
            }

            refundType = found.refundType;
        }
        return { refundAmount: refundAmount, refundType: refundType };
    },
    convertToUnit: (weight, unit) => {
        switch (unit) {
            case "kg":
                weight = (weight / 1000) * 1000;
                break;
            case "gm":
                weight = weight / 1000;
                break;
            default:
                weight = weight;
        }
        return weight;
    },
    createSchedule: (name, orderId) => {
        let RefundProceedTime = "in 5 minutes";
        console.log("orderId:==>", orderId);
        agenda.schedule(RefundProceedTime, name, { orderId: orderId });
    },
    isValidHidethings: (store, name) => {
        let isAssignEnable =
            store.hideThings &&
            store.hideThings.find((element) => element.type == name);
        return isAssignEnable && isAssignEnable.value;
    },
    getVendorOpenCloseStatusByDeliveryType: (
        vendor,
        date,
        timezone,
        deliverType
    ) => {
        let check;
        let status = "Close";
        switch (deliverType) {
            case "DELIVERY":
                check = helper.checkSurgeTime(date, timezone, vendor.deliveryTimeSlot);
                break;
            case "TAKEAWAY":
                check = helper.checkSurgeTime(date, timezone, vendor.takeAwayTimeSlot);
                break;
            default:
                check = helper.checkSurgeTime(date, timezone, vendor.timeSlot);
                break;
        }
        if (vendor.isVendorAvailable && check.status) {
            status = "Open";
        }
        return {
            status: status,
            startTime: check.data.startTime,
            endTime: check.data.endTime,
        };
    },
    getVendorDeliveryTypeStatusForNewFeatures: (vendor, date, timezone) => {

        let checkDelivery = helper.validateDeliverTimeSlotForVender(date, timezone, helper.getDeliveryTimeSlot(vendor, timezone));

        let status = "Open";
        let isDeliveryTypeAvailable = false;
        let deliveryStatus = "Close";
        if (vendor.isVendorAvailable && checkDelivery.status) {
            deliveryStatus = "Open";
            isDeliveryTypeAvailable = true;
            status = "Open";
        } else {
            vendor.deliveryType = helper.removeElementFromArray(vendor.deliveryType, "DELIVERY");
        }
        if (vendor.deliveryType && !vendor.deliveryType.length) {
            status = "Close";
            deliveryStatus = "Close";
        }
        let deliveryObj = {
            deliveryStatus,
            deliveryStartTime: checkDelivery.data.startTime,
            deliveryEndTime: checkDelivery.data.endTime,
        };

        return { ...deliveryObj, status: status, isDeliveryTypeAvailable };
    },

    hideContactInfoForDemo: (is_demo, resdata) => {
        if (is_demo) {
            return helper.hideContactDetails(resdata);
        }
        return resdata;
    },
    hideContactInfoForStaff: (hideContactInfo, resdata) => {
        if (hideContactInfo && hideContactInfo.length) {
            if (hideContactInfo.includes("CUSTOMER") && resdata.user) {
                resdata.user.email = helper.hideEmail(resdata.user.email);
                resdata.user.mobileNumber = helper.hideMobile(
                    resdata.user.mobileNumber
                );
            }
            if (hideContactInfo.includes("VENDOR") && resdata.vendor) {
                resdata.vendor.email = helper.hideEmail(resdata.vendor.email);
                resdata.vendor.mobileNumber = helper.hideMobile(
                    resdata.vendor.mobileNumber
                );
            }
            if (hideContactInfo.includes("DRIVER") && resdata.driver) {
                resdata.driver.email = helper.hideEmail(resdata.driver.email);
                resdata.driver.mobileNumber = helper.hideMobile(
                    resdata.driver.mobileNumber
                );
            }
        }
        return resdata;
    },
    hideContactDetails: (resdata) => {
        if (resdata.user) {
            resdata.user.email = helper.hideEmail(resdata.user.email);
            resdata.user.mobileNumber = helper.hideMobile(resdata.user.mobileNumber);
        }
        if (resdata.vendor) {
            resdata.vendor.email = helper.hideEmail(resdata.vendor.email);
            resdata.vendor.mobileNumber = helper.hideMobile(
                resdata.vendor.mobileNumber
            );
        }
        if (resdata.driver) {
            resdata.driver.email = helper.hideEmail(resdata.driver.email);
            resdata.driver.mobileNumber = helper.hideMobile(
                resdata.driver.mobileNumber
            );
        }
        return resdata;
    },
    hideEmail: (email) => {
        return email ? email.replace(/.(?=.{10})/g, "*") : email;
    },
    hideMobile: (mobileNumber) => {
        return mobileNumber
            ? mobileNumber.replace(/.(?=.{2})/g, "*")
            : mobileNumber;
    },
    validateHideContactInfo: (hideContactInfo, role) => {
        if (!hideContactInfo) return false;
        let user;
        switch (role) {
            case "USER":
                user = "CUSTOMER";
                break;
            case "DRIVER":
                user = "DRIVER";
                break;
            case "VENDOR":
                user = "VENDOR";
                break;
            case "CUSTOMER":
                user = "CUSTOMER";
                break;
        }
        return hideContactInfo.includes(user);
    },
    removeElementFromArray: (arr, value) => {
        return arr.filter(function (ele) {
            return ele != value;
        });
    },
    getDeliveryTimeSlot: (vendor, timezone) => {
        let slot = vendor.deliveryTimeSlot;
        let currentDate = new Date().toLocaleString("en-US", { timeZone: timezone });
        currentDate = new Date(currentDate);
        console.log("currentDate time slot:", currentDate);
        switch ((currentDate.getDay()).toString()) {
            case "0":    //Sunday
                slot = vendor.weekendDayDeliveryTimeSlot && vendor.weekendDayDeliveryTimeSlot.sundaySlot;
                break;
            case "6":    //Saturday
                slot = vendor.weekendDayDeliveryTimeSlot && vendor.weekendDayDeliveryTimeSlot.saturdaySlot;
                break;
            default:
                slot = vendor.deliveryTimeSlot;
        };

        if (slot && slot.status) {
            return slot;
        } else {
            return false;
        }
    },
    generateSendRequestQuery: (data) => {
        let query;
        if (data.storeType != "TAXI")
            return query = { 'vehicles.vehicleType': { $in: data.vehicleType } };

        if (data.rideType == "pool")
            query = {
                "$or": [{ "enabledRideShare": true, "vehicleType.vehicle": "car" }, { "enabledRideShare": true, 'vehicles.vehicleType': { $in: data.vehicleType } }],
            }
        else
            query = {
                "$or": [
                    { "enabledRideShare": false, "vehicleType.type": "pool" },
                    {
                        $or: [{ "enabledRideShare": false }, { "enabledRideShare": { $exists: false } }],
                        'vehicles.vehicleType': { $in: data.vehicleType }
                    }
                ],
            }
        return query;
    },
    getActivePaymentMethodForSaveCard: (data) => {
        const { isStripeActive, isSquareActive, isPaystackActive, isPay360Active, isMoncashActive, isDpoActive, isFlutterwaveActive, isPaypalActive } = data;
        if (isStripeActive)
            return "stripe"
        if (isSquareActive)
            return "square"
        if (isPaystackActive)
            return "paystack"
        if (isPay360Active)
            return "pay360"
        if (isMoncashActive)
            return "moncash"
        if (isDpoActive)
            return "dpo"
        if (isFlutterwaveActive)
            return "flutterwave"
        if (isPaypalActive)
            return "paypal"
    },
    getTaxiSetting: (resdata) => {
        let getstoreType = resdata.storeType.filter(storeType => {
            return storeType.status === 'active' && storeType.storeType === "TAXI";
        });
        if (getstoreType.length > 0) {
            resdata.set("hourlyTripSettings", getstoreType[0].hourlyTripSettings, { strict: false });
            resdata.set("multiStopsTripSettings", getstoreType[0].multiStopsTripSettings, { strict: false });
            resdata.set("isEnableCarPool", getstoreType[0].isEnableCarPool, { strict: false });
            resdata.set("bidSettings", getstoreType[0].bidSettings, { strict: false });
        };
        return resdata;
    },
    getPickDropSetting: (resdata) => {
        let getstoreType = resdata.storeType.filter(storeType => {
            return storeType.status === 'active' && storeType.storeType === "PICKUPDROP";
        });
        if (getstoreType.length > 0) {
            resdata.set("multiDropsSettings", getstoreType[0].multiDropsSettings, { strict: false });
            resdata.set("returnTypeList", getstoreType[0].returnTypeList, { strict: false })
        };
        return resdata;
    },
    getFields: (list, field) => {
        //  reduce the provided list to an array only containing the requested field
        return list.reduce(function (carry, item) {
            //  check if the item is actually an object and does contain the field
            if (typeof item === 'object' && field in item) {
                // carry.push(item[field]);
                carry = carry.concat(item[field]);

            }

            //  return the 'carry' (which is the list of matched field values)
            return carry;
        }, []);
    },
    checkNotification: (notifications, type, key) => {
        let notificationStatus = false;

        if (notifications && notifications.length > 0) {
            let getNoification = notifications.filter(notification => {
                return notification.type === type;
            });

            if (getNoification.length > 0) {
                let getValues = getNoification[0].values.filter(value => {
                    return value.key === key;
                });

                if (getValues.length > 0) {
                    notificationStatus = getValues[0].value;
                }
            }
        }
        return notificationStatus;
    },
};
