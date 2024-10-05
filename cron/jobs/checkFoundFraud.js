const User = require('../../models/userTable');
const ObjectId = require('objectid');
const Push = require('../../helper/pushNotification');
module.exports = (agenda) => {
    agenda.define('check-found-fraud', { priority: 'high', concurrency: 10 }, async function (job, done) {
        done();
        let data = job.attrs.data;
        console.log("cron check-found-fraud", data);
        try {
            if (data.driverId) {
                let getDriver = await User.findOne({ _id: data.driverId, isFoundFraud: true }).populate("store", "firebase storeName")
                if (getDriver) {
                    getDriver.isFoundFraud = false;
                    await getDriver.save();
                    if (getDriver.firebaseTokens.length) {
                        var names = getDriver.name.split(' ');
                        let firstName = names[0];
                        let body = __("UNBLOCK_ACCOUNT_DESC");
                        let fcmData = {
                            userId: getDriver._id,
                        }
                        let keys = getDriver.store.firebase;
                        let title = __('UNBLOCK_ACCOUNT_TITLE', firstName);
                        Push.sendPushToAll(getDriver.firebaseTokens, title, body, fcmData, keys);
                    }
                }
            }
        } catch (error) {
            console.log("cron error", error);
        }
    });
};
