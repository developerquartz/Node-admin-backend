
module.exports = {
    validateDateFormat: async (req, res, next) => {
        let data = req.body;
        let store = req.store;

        data.timezone = store.timezone;
        if (!data.checkInDate) {
            return res.json(helper.showValidationErrorResponse('PLAN_TRIP_IS_REQUIRED'));
        }
        if (!data.checkOutDate) {
            return res.json(helper.showValidationErrorResponse('END_TRIP_IS_REQUIRED'));
        }

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
        const getcheckInData = helper.getScheduleData("YYYY-MM-DD", data.checkInDate, data.checkInTime, data.timezone);


        if (getCheckOutData.scheduled_utc.getTime() < getcheckInData.scheduled_utc.getTime()) {
            return res.json(helper.showValidationErrorResponse("BOOKING_NOT_ALLOWED"));
        }

        if (getcheckInData.scheduled_utc.getTime() < getcheckInData.currentUTC.getTime()) {
            return res.json(helper.showValidationErrorResponse("BOOKING_NOT_ALLOWED"));
        }
        req.getCheckOutData = getCheckOutData;
        req.getcheckInData = getcheckInData;


        next();
    }
}