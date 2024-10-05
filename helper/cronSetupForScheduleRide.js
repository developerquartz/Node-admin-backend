const agenda = require("../cron/agenda");
let Order = require("../models/ordersTable");
let setupCronAgenda = async (getOrder) => {
    try {
        if (getOrder.scheduledType != "scheduled") return;
        if (getOrder.storeType.storeType != "TAXI") return;
        let getScheduleDate = new Date(getOrder.scheduled_utc);
        let currDate = new Date();

        //schedule for 24 hrs before notification...
        let getTimeBefore = helper.subtractHours(getScheduleDate, 24, "hours");
        if (dateInPast(currDate, getTimeBefore)) {
            createSchedule("schedule-ride-reminder", getTimeBefore, getOrder._id);
        }
        //schedule for 1 hrs before notification...
        getTimeBefore = helper.subtractHours(getScheduleDate, 01, "hours");
        if (dateInPast(currDate, getTimeBefore)) {
            createSchedule("schedule-ride-reminder", getTimeBefore, getOrder._id);
        }


    } catch (error) {
        console.log(error)
    }
}
function createSchedule(name, time, orderId) {
    let scheduleTime = new Date(time);
    agenda.schedule(scheduleTime, name, { orderId });
}
function dateInPast(startDate, endDate) {
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    return startDate.getTime() < endDate.getTime();
}
module.exports = setupCronAgenda;