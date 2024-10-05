const User = require('../../models/userTable');
const ObjectId = require('objectid');
const Push = require('../../helper/pushNotification');
const Order = require("../../models/ordersTable");
module.exports = (agenda) => {
    agenda.define('schedule-ride-reminder', { priority: 'high', concurrency: 10 }, async function (job, done) {
        done();
        let data = job.attrs.data;
        console.log("cron schedule-ride-reminder", data);
        try {
            if (data.orderId) {
                let query = { _id: data.orderId, orderStatus: "confirmed" };
                Order.getOrderByCondition(query, (error, resdata) => {
                    if (error) {
                        console.log("DB Error===>", error);
                    }
                    if (resdata) {
                        let schedule_date = new Date(resdata.scheduled_utc);
                        const options = {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                        };
                        const formattedDate = schedule_date.toLocaleString("en-US", { timeZone: resdata.store.timezone, ...options });

                        //customer
                        sendPushNotification(resdata.user, formattedDate, resdata.store);
                        //driver
                        sendPushNotification(resdata.driver, formattedDate, resdata.store);
                    }

                })
            }
        } catch (error) {
            console.log("cron error", error);
        }
    });
};
async function sendPushNotification(user, schedule_date, store) {
    if (user.firebaseTokens.length) {
        let firstName = user.name.split(' ')[0];
        let title = __('SCHEDULE_RIDE_RIMINDER_TITLE', firstName);
        let body = __("SCHEDULE_RIDE_RIMINDER_DESC", schedule_date);
        let lang = store.language.code;

        body = await helper.getTerminologyData({
            lang: lang, storeId: store._id,
            constant: "SCHEDULE_RIDE_RIMINDER_DESC",
            date: schedule_date, type: "trip"
        });

        console.log(title)
        console.log(body)
        let fcmData = {
            userId: user._id,
        }
        Push.sendPushToAll(user.firebaseTokens, title, body, fcmData, store.firebase);
    }
}
