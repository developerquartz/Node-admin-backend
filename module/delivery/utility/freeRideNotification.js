const Push = require('../../../helper/pushNotification');
const User = require("../../../models/userTable");
let freeRideAssignNotification = async (driverId) => {
    try {

        let driver = await User.findById(driverId, "name freeRideSetting firebaseTokens").populate("store", "firebase language");
        let numOfRide = 0;
        if (driver.freeRideSetting && driver.freeRideSetting.status) {
            numOfRide = driver.freeRideSetting.numOfRide;
        }

        let store = driver.store;
        let keys = store.firebase;
        let lang = driver.language && driver.language.code ? driver.language.code : store.language.code;
        let firstName = driver.name.split(' ')[0];
        let notifyResponseData = {
            driverId: driver._id,
            type: "freeRide"
        }
        if (driver.firebaseTokens) {
            let title = __('FREE_RIDE_ASSIGN_TITLE', firstName);
            let body = __('FREE_RIDE_ASSIGN_DESC', numOfRide);
            Push.sendPushToAll(driver.firebaseTokens, title, body, notifyResponseData, keys);
        }

    } catch (error) {
        console.log("freeRideAssignNotification err", error);
    }
}
let freeRideCompletedNotification = async (driverId) => {
    try {
        let driver = await User.findById(driverId, "name freeRideSetting firebaseTokens").populate("store", "firebase language");
        let store = driver.store;
        let keys = store.firebase;
        let lang = driver.language && driver.language.code ? driver.language.code : store.language.code;
        let firstName = driver.name.split(' ')[0];
        let notifyResponseData = {
            driverId: driver._id,
            type: "freeRide"
        }
        if (driver.firebaseTokens) {
            let title = __('FREE_RIDE_COMPLETED_TITLE', firstName);
            let body = __('FREE_RIDE_COMPLETED_DESC');
            Push.sendPushToAll(driver.firebaseTokens, title, body, notifyResponseData, keys);
        }

    } catch (error) {
        console.log("freeRideCompletedNotification err", error);
    }
}
module.exports = { freeRideCompletedNotification, freeRideAssignNotification }