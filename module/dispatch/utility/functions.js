const moment = require('moment-timezone');

let sendErrorResponse = function (err, res) {
    return res.status(err.status_code || 200).send({ "status": "failure", "status_code": err.status_code || 200, message: err.message, error_description: err.error_description || '', data: err.data || {} });
};

let sendSuccessResponse = function (result, res, other) {
    let sendData = { "status": "success", "status_code": result.status_code || 200, message: result.message || 'SUCCESS!', data: result.data || {}, totalcount: result.count || 0 };
    sendData = { ...sendData, ...other };
    return res.status(result.status_code || 200).send(sendData);
};

let getCurrentDateAndTimeInCityTimezoneFromUTC = (cityTimezone) => {
    let a = moment.tz(new Date(), cityTimezone)
    return a;
};

let getDateAndTimeInCityTimezone = (date, cityTimezone) => {
    let a = moment.tz(date, cityTimezone)
    return a;
};

let roundNumber = (num) => {
    return Math.round(num * 100) / 100;
}

let generateOTP = (codelength) => {
    return Math.floor(Math.random() * (Math.pow(10, (codelength - 1)) * 9)) + Math.pow(10, (codelength - 1));
};

let generatorRandomNumber = (length) => {
    if (typeof length == "undefined")
        length = 2;
    var token = "";
    var possible = "123456789";
    for (var i = 0; i < length; i++)
        token += possible.charAt(Math.floor(Math.random() * possible.length));
    return token;
};

let getScheduleData = (format, sd, st, pickupTimezone) => {
    let dateStructure = sd + " " + st;
    let ar = helper.getDateAndTimeInCityTimezone(dateStructure, pickupTimezone);
    let scheduledTime = ar.format('LT'); //08:30 PM
    let scheduledDate = ar.format('L'); //04/09/1986
    let scheduled_utcs = new Date(ar.utc().format());

    return { scheduledDate: scheduledDate, scheduledTime: scheduledTime, scheduled_utc: scheduled_utcs, currentUTC: new Date() };
};

let isValidDate = (date, format) => {
    var validDateFormat = moment(date, format).isValid();

    return validDateFormat;
};

let milesToMeter = (radius) => {
    return parseInt(radius * 1609.34);
};

let kmToMeter = (radius) => {
    return parseInt(radius * 1000);
};

let kmToMiles = (radius) => {
    return roundNumber(radius * 0.621371);
};

module.exports = {
    sendErrorResponse,
    sendSuccessResponse,
    getCurrentDateAndTimeInCityTimezoneFromUTC,
    getDateAndTimeInCityTimezone,
    roundNumber,
    generateOTP,
    generatorRandomNumber,
    getScheduleData,
    isValidDate,
    kmToMiles,
    milesToMeter,
    kmToMeter
}
