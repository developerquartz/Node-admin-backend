let getDeliveryArea = (radius, unit) => {
    if (unit) {
        unit = unit;
    } else {
        unit = 'km';
    }

    let deliveryArea = 0;

    if (unit === 'miles') {
        deliveryArea = helper.milesToMeter(radius);
    } else {
        deliveryArea = helper.kmToMeter(radius);
    }

    return parseInt(deliveryArea);
}
let isEnablePrePayment = (getOrder) => {
    let storeType = ["TAXI", "PICKUPDROP"];
    let isPrePaymentEnabled = getOrder.storeType.paymentSettings && getOrder.storeType.paymentSettings.isPrePayment || false;
    return storeType.includes(getOrder.storeType.storeType) && isPrePaymentEnabled;
}

module.exports = {
    getDeliveryArea,
    isEnablePrePayment
}