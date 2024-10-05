const Store = require('../models/storeTable');

let chekPaymentSetting = async (data) => {

    let flag = true;
    let paymentSettings = null;

    const getPayment = await Store.getStorePaymentSettingAsync(data.storeId);

    if (getPayment.paymentSettings.length === 0) {
        flag = false;
    }

    const getGatewaySetting = getPayment.paymentSettings.filter(payment => {
        return payment.payment_method === data.payment_method;
    });

    if (getGatewaySetting.length === 0) {
        flag = false;
    } else {
        paymentSettings = getGatewaySetting[0];
    }

    let paymentMode = getPayment.paymentMode;

    return {
        flag: flag,
        currency: getPayment.currency.code,
        paymentMode: paymentMode,
        paymentSettings: paymentSettings
    }
}

let chekStoreSetting = async (storeId, payment_method) => {

    let flag = true;
    let paymentSettings = null;

    const getPayment = await Store.getStoreSettingAsync(storeId);

    if (!getPayment.paymentSettings || getPayment.paymentSettings.length === 0) {
        flag = false;
    }

    const getGatewaySetting = getPayment.paymentSettings.filter(payment => {
        return payment.payment_method === payment_method;
    });

    if (getGatewaySetting.length === 0) {
        flag = false;
    } else {
        paymentSettings = getGatewaySetting[0];
    }

    let paymentMode = getPayment.paymentMode;

    return {
        _id: getPayment._id,
        flag: flag,
        paymentMode: paymentMode,
        paymentSettings: paymentSettings,
        timezone: getPayment.timezone,
        googleMapKey: getPayment.googleMapKey,
        loyaltyPoints: getPayment.loyaltyPoints,
        storeName: getPayment.storeName,
        // owneremail: getPayment.owner.email,
        currency: getPayment.currency,
        orderAutoApproval: getPayment.orderAutoApproval,
        logo: getPayment.logo,
        theme: getPayment.themeSettings.primaryColor,
        mailgun: getPayment.mailgun,
        language: getPayment.language,
        firebase: getPayment.firebase,
        domain: getPayment.domain,
        twilio: getPayment.twilio,
        orderAutoCancel: getPayment.orderAutoCancel,
        notifications: getPayment.notifications
    }
}

module.exports = {
    chekPaymentSetting,
    chekStoreSetting
}