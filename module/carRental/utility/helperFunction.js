const Coupon = require('../../../models/couponTable');
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
let couponDiscountCalculation = async (storeTypeId, code, itemTotal) => {
    let discountTotal = 0;
    let couponType = null;
    let couponAmount = 0;
    let couponBy = null;
    let mainTotal = itemTotal;

    let getCoupon = await Coupon.findOne({ code: code, status: "active", $or: [{ type: "global", storeType: storeTypeId }] });
    if (getCoupon != null) {

        couponType = getCoupon.discount_type;
        couponAmount = getCoupon.amount;
        couponBy = getCoupon.type;

        if (getCoupon.discount_type === 'percent') {
            itemTotal = helper.roundNumber((itemTotal - ((itemTotal * getCoupon.amount) / 100)));
            discountTotal = helper.roundNumber(((mainTotal * getCoupon.amount) / 100));
        }

        if (getCoupon.discount_type === 'flat') {
            if (itemTotal >= getCoupon.amount) {
                itemTotal = helper.roundNumber((itemTotal - getCoupon.amount));
                discountTotal = helper.roundNumber(getCoupon.amount);
            }
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

module.exports = {
    getDeliveryArea,
    couponDiscountCalculation
}