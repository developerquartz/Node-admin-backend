const Coupon = require('../../../models/couponTable');
const Address = require('../../../models/addressTable');
const googleMap = require('../utility/googleMap');
const moduleConfig = require('../../../config/moduleConfig');
const orderHelper = require('../config/helper')

let couponDiscountCalculation = async (vendor, code, itemTotal) => {
    let discountTotal = 0;
    let couponType = null;
    let couponAmount = 0;

    const getCoupon = await Coupon.findOne({ code: code, vendor: vendor });

    if (getCoupon != null) {

        couponType = getCoupon.discount_type;
        couponAmount = getCoupon.amount;

        if (getCoupon.discount_type === 'percent') {
            itemTotal = orderHelper.roundNumber((itemTotal - ((itemTotal * getCoupon.amount) / 100)));
            discountTotal = orderHelper.roundNumber(((itemTotal * getCoupon.amount) / 100));
        }

        if (getCoupon.discount_type === 'flat') {
            itemTotal = orderHelper.roundNumber((itemTotal - getCoupon.amount));
            discountTotal = orderHelper.roundNumber(getCoupon.amount);
        }
    }

    return {
        discountTotal: discountTotal,
        couponType: couponType,
        couponAmount: couponAmount,
        itemTotal: itemTotal
    }
}

let taxCalculation = (taxSettings, taxAmount, subTotal) => {
    let tax = 0;

    if (taxSettings.level === "store") {
        taxAmount = taxSettings.percentage;
    }

    if (taxAmount != 0) {
        tax = orderHelper.roundNumber(((subTotal * taxAmount) / 100));
    }

    return {
        tax: tax,
        taxAmount: taxAmount
    }
}

let tipCalculation = (tip, subTotal) => {
    let tipAmount = 0;

    if (tip != 0) {
        tipAmount = orderHelper.roundNumber(((subTotal * tip) / 100));
    }

    return {
        tip: tip,
        tipAmount: tipAmount
    }
}

let deliveryFeeCalculation = async (data, getStoreType, getVendor) => {

    let message = null;
    let deliveryFee = 0;
    let deliveryFeeSettings = {};
    let distance = 0;
    let time = 0;

    if (!data.addressId) {
        message = 'ADDRESS_ID_IS_REQUIRED';
        return { message: message };
    }

    const getAddress = await Address.getAddressByIdAsync(data.addressId);

    if (getAddress == null) {
        message = 'ADDRESS_IS_INVALID';
        return { message: message };
    }

    let billingDetails = getAddress;

    if (getStoreType.deliveryPlatform.platform === 'self') {

        const isFreeDelivery = checkFreeDelivery(data.subTotal, getStoreType.freeDeliverySettings);

        if (!isFreeDelivery) {
            const getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(getVendor.address, getAddress.address, data.googleMapKey);

            if (!getDistanceAndTime.status) {
                message = getDistanceAndTime.message;
                return { message: message };
            }

            distance = getDistanceAndTime.distance;
            time = getDistanceAndTime.time;

            if (getStoreType.deliveryFeeType === "unit") {
                let totalDistancePrice = distance * getStoreType.deliveryFeeSettings.per_unit_distance;
                let totalTimePrice = time * getStoreType.deliveryFeeSettings.per_unit_time;
                deliveryFee = orderHelper.roundNumber(getStoreType.deliveryFeeSettings.base_price + totalDistancePrice + totalTimePrice);
            }
        }

    } else if (getStoreType.deliveryPlatform.platform === 'other') {

        if (moduleConfig[2].type === "postmates" && moduleConfig[2].status && getStoreType.deliveryPlatform.deliveryProviderType === 'postmates') {

            const getDeliveryProviderKeys = getStoreType.deliveryPlatform.deliveryProvider.filter(deliveryProvider => {
                return deliveryProvider.type === 'postmates';
            });

            if (getDeliveryProviderKeys.length === 0) {
                message = 'DELIVERY_PROVIDER_API_KEYS_IS_REQUIRED';
                return { message: message };
            }

            let DeliveryProviderKeys = getDeliveryProviderKeys[0];

            if (!DeliveryProviderKeys.keys.authenticationKey || !DeliveryProviderKeys.keys.customerId) {
                message = 'DELIVERY_PROVIDER_API_KEYS_IS_REQUIRED';
                return { message: message };
            }

            const postmatesDelivery = require('../../postmates/delivery');
            let quoteData = {
                pickup_address: getVendor.address,
                dropoff_address: getAddress.address,
                customer_id: DeliveryProviderKeys.keys.customerId,
                key: DeliveryProviderKeys.keys.authenticationKey
            }

            let getQuote = await postmatesDelivery.getDeliveryQuote(quoteData);
            console.log("getQuote", getQuote);
            if (getQuote.kind === "error") {
                message = getQuote.message;
                return { message: message };
            } else {
                deliveryFee = getQuote.fee;
            }
        } else {
            message = 'ACCESS_DENIED_FOR_OTHER_DELIVERY_PLATFORM';
            return { message: message };
        }

    }

    return {
        message: message,
        distance: distance,
        time: time,
        deliveryFee: deliveryFee,
        deliveryFeeSettings: deliveryFeeSettings,
        billingDetails: billingDetails
    }
}

let caculateEarning = (taxSettings, subTotal, tax, tipAmount, deliveryFee, commission, isSingleVendor) => {
    let vendorEarning = 0;
    let deliveryBoyEarning = 0;
    let adminEarning = 0;
    let adminVendorEarning = 0;
    let adminDeliveryBoyEarning = 0;

    if (commission.vendor) {
        adminVendorEarning = isSingleVendor ? subTotal : orderHelper.roundNumber((subTotal - ((subTotal * commission.vendor) / 100)));
        vendorEarning = isSingleVendor ? 0 : orderHelper.roundNumber(((subTotal * commission.vendor) / 100));
    }

    if (commission.deliveryBoy) {
        adminDeliveryBoyEarning = orderHelper.roundNumber((deliveryFee - ((deliveryFee * commission.deliveryBoy) / 100)));
        deliveryBoyEarning = orderHelper.roundNumber(((deliveryFee * commission.deliveryBoy) / 100));
    }

    adminEarning = isSingleVendor ? orderHelper.roundNumber(adminVendorEarning + adminDeliveryBoyEarning + tax) : orderHelper.roundNumber(adminVendorEarning + adminDeliveryBoyEarning + (taxSettings.level === "store" ? tax : 0));
    deliveryBoyEarning = orderHelper.roundNumber(deliveryBoyEarning + tipAmount);
    vendorEarning = isSingleVendor ? 0 : orderHelper.roundNumber(vendorEarning + (taxSettings.level === "vendor" ? tax : 0));

    return {
        vendorEarning: vendorEarning,
        deliveryBoyEarning: deliveryBoyEarning,
        adminVendorEarning: adminVendorEarning,
        adminDeliveryBoyEarning: adminDeliveryBoyEarning,
        adminEarning: adminEarning
    }
}

let calculateDeliveryBoyOverrideEarning = (deliveryFee, deliveryBoyEarning, adminDeliveryBoyEarning, adminEarning, commission) => {

    let newdeliveryBoyEarning = deliveryBoyEarning;
    let newadminDeliveryBoyEarning = adminDeliveryBoyEarning;

    if (commission.deliveryBoy) {
        newadminDeliveryBoyEarning = orderHelper.roundNumber((deliveryFee - ((deliveryFee * commission.deliveryBoy) / 100)));
        newdeliveryBoyEarning = orderHelper.roundNumber(((deliveryFee * commission.deliveryBoy) / 100));
        let adminEarningWithoutDeliveryBoy = orderHelper.roundNumber(adminEarning - adminDeliveryBoyEarning);
        adminEarning = orderHelper.roundNumber(newadminDeliveryBoyEarning + adminEarningWithoutDeliveryBoy);
    }

    return {
        deliveryBoyEarning: newdeliveryBoyEarning,
        adminDeliveryBoyEarning: newadminDeliveryBoyEarning,
        adminEarning: adminEarning
    }
}

let checkFreeDelivery = (subTotal, freeDeliverySettings) => {

    let isFreeDelivery = false;

    if (freeDeliverySettings && freeDeliverySettings.status === true) {

        if (freeDeliverySettings.range && freeDeliverySettings.range.length > 0) {

            for (let index = 0; index < freeDeliverySettings.range.length; index++) {
                let element = freeDeliverySettings.range[index];

                if (subTotal >= element.minOrderValue && subTotal <= element.maxOrderValue) {
                    isFreeDelivery = true;
                    break;
                }

            }
        }
    }

    return isFreeDelivery;

}

module.exports = {
    couponDiscountCalculation,
    taxCalculation,
    tipCalculation,
    deliveryFeeCalculation,
    caculateEarning,
    calculateDeliveryBoyOverrideEarning
}