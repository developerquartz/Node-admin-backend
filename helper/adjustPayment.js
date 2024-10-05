const User = require("../models/userTable");
const Push = require('./pushNotification');
let adjustmentPaymentNotify = async (payment_to, amount, type, paymentFrom) => {
    try {
        let users = await User.findOne({ _id: payment_to }, "firebaseTokens store").populate("store", "firebase storeName currency");
        let capitalize = type[0].toUpperCase() + type.slice(1) + "ed";
        if (users && users.firebaseTokens.length) {
            let body = `${users.store.storeName} ${capitalize} ${users.store.currency.sign || $}${amount} to your wallet.`;
            let fcmData = {
                userId: users._id,
                type
            }
            let keys = users.store.firebase;
            let title = __('PAYMENT_ADJUSMENT', capitalize);
            Push.sendPushToAll(users.firebaseTokens, title, body, fcmData, keys);
        }

    } catch (error) {
        console.log("error:", error)
    }
}
let walletToWalletSendMoneyNotify = async (payment_to, amount, type, paymentFrom, paymentTo) => {
    try {
        let users = await User.findOne({ _id: payment_to }, "firebaseTokens store").populate("store", "firebase storeName currency");
        let capitalize = type[0].toUpperCase() + type.slice(1) + "ed";
        if (users && users.firebaseTokens.length) {
            let body = `You have received the amount ${users.store.currency.sign || $}${amount} from ${paymentFrom.name} in your wallet.`;
            if (type == "debit") {
                body = `You have send the amount ${users.store.currency.sign || $}${amount} to ${paymentTo.name} from your wallet.`;
            };
            let fcmData = {
                userId: users._id,
                type
            }
            let keys = users.store.firebase;
            let title = __('PAYMENT_ADJUSMENT', capitalize);
            Push.sendPushToAll(users.firebaseTokens, title, body, fcmData, keys);
        }

    } catch (error) {
        console.log("error:", error)
    }
}
module.exports = {
    adjustmentPaymentNotify,
    walletToWalletSendMoneyNotify
}