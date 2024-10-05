const Order = require("../models/ordersTable");
const Push = require("./pushNotification");
const SocketHelper = require("./socketHelper");
async function sendOrderPlacedNotificationToStore(orderId) {
    let getOrder = await Order.findById(orderId, 'store orderStatus vendor user')
        .populate("user", "name")
        .populate(
            {
                path: "store",
                select: 'notifications notificationSound owner firebase',
                populate: {
                    path: "owner",
                    select: "firebaseTokens"
                }
            })
        .exec();
    if (getOrder.store.notifications) {
        let checkStoreNotification = helper.checkNotification(getOrder.store.notifications.adminNotification, "orderPlaced", "notification");

        let notificationSound = null;

        if (checkStoreNotification) {
            notificationSound = getOrder.store.notificationSound;
        }
        let keys = env.firebase;

        if (getOrder.store.firebase) {
            keys = getOrder.store.firebase;
        }

        let title = __('ORDER_REQUEST_SUCCESS');
        let body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store._id, constant: "NEW_ORDER_STORE", name: getOrder.user.name, type: "order" })

        let orderStoreResponseData = {
            title,
            body,
            orderId: getOrder._id,
            type: "orderRequest",
            storeId: getOrder.store._id,
            notificationSound: notificationSound
        }
        if (checkStoreNotification && getOrder.store.owner && getOrder.store.owner.firebaseTokens) {

            let messages = [];
            getOrder.store.owner.firebaseTokens.map(nElement => {
                if (nElement.token) {
                    messages.push({
                        notification: {
                            title: title, body: body,
                            //sound: `https://main.hlc-staging.com/assets/sounds/notification-2309.wav`
                        },
                        token: nElement.token,
                        data: JSON.parse(JSON.stringify(orderStoreResponseData))
                    });
                }
            });
            SocketHelper.singleSocket(getOrder.store._id, "Store", orderStoreResponseData, 'storeNotification');

            if (messages.length > 0) {
                Push.sendBatchNotification(messages, "VENDOR", keys);
                console.log("sent notification to store...")
            }
        }
    }
}
module.exports = sendOrderPlacedNotificationToStore;