
module.exports = {
    validateDateFormat: async (req, res, next) => {
        let data = req.body;
        let store = req.store;

        data.timezone = store.timezone;
        if (data.checkInDate && data.checkOutDate) {
            if (!data.checkInTime) {
                return res.json(helper.showValidationErrorResponse('PLAN_TRIP_TIME_IS_REQUIRED'));
            }
            if (!data.checkOutTime) {
                return res.json(helper.showValidationErrorResponse('END_TRIP_TIME_IS_REQUIRED'));
            }


            if (!helper.isValidDate(data.checkInDate, "YYYY-MM-DD")) {
                return res.json(helper.showValidationErrorResponse('CORRECT_DATE_FORMAT'));
            }
            if (!helper.isValidDate(data.checkOutDate, "YYYY-MM-DD")) {
                return res.json(helper.showValidationErrorResponse('CORRECT_DATE_FORMAT'));
            }

            const getCheckOutData = helper.getScheduleData("YYYY-MM-DD", data.checkOutDate, data.checkOutTime, data.timezone);
            const getCheckInData = helper.getScheduleData("YYYY-MM-DD", data.checkInDate, data.checkInTime, data.timezone);


            if (getCheckOutData.scheduled_utc.getTime() < getCheckInData.scheduled_utc.getTime()) {
                return res.json(helper.showValidationErrorResponse("BOOKING_NOT_ALLOWED"));
            }

            if (getCheckInData.scheduled_utc.getTime() < getCheckInData.currentUTC.getTime()) {
                return res.json(helper.showValidationErrorResponse("BOOKING_NOT_ALLOWED"));
            }
            req.getCheckOutData = getCheckOutData;
            req.getCheckInData = getCheckInData;
        }

        next();
    }
}