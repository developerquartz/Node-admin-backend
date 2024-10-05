const Coupon = require('../models/couponTable');
const Address = require('../models/addressTable');
const googleMap = require('../helper/googleMap');
const moduleConfig = require('../config/moduleConfig');
const vehicleType = require("../module/delivery/models/vehicelTypesTable");

let couponDiscountCalculation = async (storeTypeId, vendor, code, itemTotal) => {
    let discountTotal = 0;
    let couponType = null;
    let couponAmount = 0;
    let couponBy = null;
    let mainTotal = itemTotal;

    let getCoupon = await Coupon.findOne({ code: code, status: "active", $or: [{ type: "vendor", vendor: vendor }, { type: "global", storeType: storeTypeId }] });

    if (getCoupon != null) {

        couponType = getCoupon.discount_type;
        couponAmount = getCoupon.amount;
        couponBy = getCoupon.type;

        if (getCoupon.discount_type === 'percent') {
            itemTotal = helper.roundNumber((itemTotal - ((itemTotal * getCoupon.amount) / 100)));
            discountTotal = helper.roundNumber(((mainTotal * getCoupon.amount) / 100));
        }

        if (getCoupon.discount_type === 'flat') {
            itemTotal = helper.roundNumber((itemTotal - getCoupon.amount));
            discountTotal = helper.roundNumber(getCoupon.amount);
        }
    }

    return {
        discountTotal: discountTotal,
        couponType: couponType,
        couponBy: couponBy,
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
        tax = helper.roundNumber(((subTotal * taxAmount) / 100));
    }

    return {
        tax: tax,
        taxAmount: taxAmount
    }
}

let tipCalculation = (tip, subTotal, tipType) => {
    let tipAmount = 0;

    if (tip != 0) {

        tipAmount = tipType == "flat" ? helper.roundNumber(tip) : helper.roundNumber(((subTotal * tip) / 100));
    }

    return {
        tip: tip,
        tipAmount: tipAmount
    }
}

let deliveryFeeCalculation = async (data, getStoreType, getVendor, unit) => {

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
            let vehicleTypePrice = await getDeliveryFeeByVehicleType(getStoreType, data);
            if (!getDistanceAndTime.status) {
                message = getDistanceAndTime.message;
                return { message: message };
            }

            distance = getDistanceAndTime.distance;
            if (unit == 'miles') {
                let meter_distence = helper.kmToMeter(distance)
                distance = helper.MeterTomiles(meter_distence)
            }
            time = getDistanceAndTime.time;
            let totalDistancePrice;
            let totalTimePrice;
            let basePrice;
            if (getStoreType.deliveryFeeType === "unit") {
                if (["GROCERY"].includes(getStoreType.storeType) && vehicleTypePrice) {
                    totalDistancePrice = distance * vehicleTypePrice.pricePerUnitDistance;
                    totalTimePrice = time * vehicleTypePrice.pricePerUnitTimeMinute;
                    basePrice = vehicleTypePrice.basePrice;
                } else {
                    totalDistancePrice = distance * getStoreType.deliveryFeeSettings.per_unit_distance;
                    totalTimePrice = time * getStoreType.deliveryFeeSettings.per_unit_time;
                    basePrice = getStoreType.deliveryFeeSettings.base_price
                }

                deliveryFee = helper.roundNumber(basePrice + totalDistancePrice + totalTimePrice);

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

            const postmatesDelivery = require('../module/postmates/delivery');
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
        duration: time,
        deliveryFee: deliveryFee,
        deliveryFeeSettings: deliveryFeeSettings,
        billingDetails: billingDetails
    }
}
let getDeliveryFeeByVehicleType = async (storeType, data) => {
    let query = {};
    let vehicle = storeType.vehicleType;
    let getVehicleType = null;
    if (data.totalWeight && vehicle.length) {
        query = {
            "_id": { $in: vehicle },
            "weight": { "$exists": true },
            "weight.maxWeight": { $gte: data.totalWeight },
            "weight.minWeight": { $lte: data.totalWeight }
        }

        getVehicleType = await vehicleType.findOne(query).sort({ "weight.minWeight": -1 }).lean();

    }
    return getVehicleType;



}
let caculateEarning = (taxSettings, subTotal, tax, tipAmount, deliveryFee, commission, isSingleVendor, discountTotal, couponBy) => {
    let vendorEarning = 0;
    let deliveryBoyEarning = 0;
    let adminEarning = 0;
    let adminVendorEarning = 0;
    let adminDeliveryBoyEarning = 0;
    if (couponBy && couponBy === "global") {
        subTotal = helper.roundNumber(subTotal + discountTotal);
    }

    if (commission.vendor) {
        adminVendorEarning = isSingleVendor ? subTotal : helper.roundNumber((subTotal - ((subTotal * commission.vendor) / 100)));
        vendorEarning = isSingleVendor ? 0 : helper.roundNumber(((subTotal * commission.vendor) / 100));
    }
    if (commission.deliveryBoy) {
        adminDeliveryBoyEarning = helper.roundNumber((deliveryFee - ((deliveryFee * commission.deliveryBoy) / 100)));
        deliveryBoyEarning = helper.roundNumber(((deliveryFee * commission.deliveryBoy) / 100));

    }

    adminEarning = isSingleVendor ? helper.roundNumber(adminVendorEarning + adminDeliveryBoyEarning + tax) : helper.roundNumber(adminVendorEarning + adminDeliveryBoyEarning + (taxSettings.level === "store" ? tax : 0));
    deliveryBoyEarning = helper.roundNumber(deliveryBoyEarning + tipAmount);
    vendorEarning = isSingleVendor ? 0 : helper.roundNumber(vendorEarning + (taxSettings.level === "vendor" ? tax : 0));

    if (couponBy && couponBy === "global") {
        adminEarning = helper.roundNumber(adminEarning - discountTotal);
    }

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
        newadminDeliveryBoyEarning = helper.roundNumber((deliveryFee - ((deliveryFee * commission.deliveryBoy) / 100)));
        newdeliveryBoyEarning = helper.roundNumber(((deliveryFee * commission.deliveryBoy) / 100));
        let adminEarningWithoutDeliveryBoy = helper.roundNumber(adminEarning - adminDeliveryBoyEarning);
        adminEarning = helper.roundNumber(newadminDeliveryBoyEarning + adminEarningWithoutDeliveryBoy);
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