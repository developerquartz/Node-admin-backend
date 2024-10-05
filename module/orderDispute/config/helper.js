const moment = require('moment-timezone');

module.exports = {
    getVendorOpenCloseStatus: (isVendorAvailable, timeSlot, date, timezone) => {

        let check = helper.checkSurgeTime(date, timezone, timeSlot);
        let status = 'Close';

        if (isVendorAvailable && check.status) {
            status = 'Open';
        }

        return { status: status, startTime: check.data.startTime, endTime: check.data.endTime };
    },
    checkSurgeTime: (date, timezone, surgeHours) => {
        let status = false;
        let obj = {};

        let CurrentCityTime = module.exports.getDateAndTimeInCityTimezone(date, timezone);
        let currentDay = CurrentCityTime.day();
        let currentDate = CurrentCityTime.format('YYYY-MM-DD');
        let currentTimeUTC = new Date(CurrentCityTime.utc().format());
        let currentTimeTimestamp = currentTimeUTC.getTime();

        for (var i = 0; i < surgeHours.length; i++) {

            let dayStatus = surgeHours[i].dayStatus;
            let day = surgeHours[i].day;

            let startTime = surgeHours[i].startTime;
            let startTimeSplit = startTime.split(":");
            let startTimeHour = startTimeSplit[0];
            let startTimeMinute = startTimeSplit[1];
            let startTimeStructure = currentDate + " " + startTimeHour + ":" + startTimeMinute;
            let startTimeByTimezone = module.exports.getDateAndTimeInCityTimezone(startTimeStructure, timezone);
            let startTimeFormat = startTimeByTimezone.format('LT');
            //console.log("startTimeByTimezone", startTimeByTimezone.format('LLLL'));
            let startTimeUTC = new Date(startTimeByTimezone.utc().format());
            let startTimeTimestamp = startTimeUTC.getTime();

            let endTime = surgeHours[i].endTime;
            let endTimeSplit = endTime.split(":");
            let endTimeHour = endTimeSplit[0];
            let endTimeMinute = endTimeSplit[1];
            let endTimeStructure = currentDate + " " + endTimeHour + ":" + endTimeMinute;
            let endTimeByTimezone = module.exports.getDateAndTimeInCityTimezone(endTimeStructure, timezone);
            let endTimeFormat = endTimeByTimezone.format('LT');
            //console.log("endTimeByTimezone", endTimeByTimezone.format('LLLL'));
            let endTimeUTC = new Date(endTimeByTimezone.utc().format());
            let endTimeTimestamp = endTimeUTC.getTime();

            if (dayStatus === "yes" && currentDay === day && currentTimeTimestamp > startTimeTimestamp && currentTimeTimestamp < endTimeTimestamp) {
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
    getDateAndTimeInCityTimezone: (date, cityTimezone) => {

        let ad = moment.tz(date, cityTimezone);

        return ad;
    },

    roundNumber: (num) => {
        return Math.round(num * 100) / 100;
    },

    milesToMeter: (radius) => {
        return parseInt(radius * 1609.34);
    },

    kmToMeter: (radius) => {
        return parseInt(radius * 1000);
    },
}