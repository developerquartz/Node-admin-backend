const utilityFunc = require('../utility/functions');
const paymentMiddleware = require('../../../middleware/payments');
const Product = require('../../../models/productsTable')
const productVariationTable = require('../../../models/productVariationTable')
const ObjectId = require('objectid');
const orderService = require('../services/order');
const orderHelper = require('../config/helper');
const Order = require('../../../models/ordersTable');
const orderMiddleware = require('../middleware/order');
const deliveryRequest = require('./deliveryRequest');

let getOrderData = async (data, store, res) => {
    try {
        data.customOrderId = helper.generatorRandomNumber(6).toLowerCase();
        data.paymentMethod = data.payment_method;

        if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
            data.paymentMethod = 'braintree';
        }

        if (data.scheduledType && data.scheduledType === "scheduled") {

            if (!data.scheduledDate) throw new Error("SCHEDULE_DATE_IS_REQUIRED")

            if (!data.scheduledTime) throw new Error("SCHEDULE_TIME_IS_REQUIRED")

            if (!data.pickupTimezone) throw new Error("SCHEDULE_PICKUP_TIMEZONE_IS_REQUIRED")

            if (!helper.isValidDate(data.scheduledDate, "YYYY-MM-DD")) throw new Error("CORRECT_DATE_FORMAT")

            const getScheduleData = helper.getScheduleData("YYYY-MM-DD", data.scheduledDate, data.scheduledTime, data.pickupTimezone);

            if (getScheduleData.scheduled_utc.getTime() < getScheduleData.currentUTC.getTime())
            {
                return res.json(helper.showValidationErrorResponse('BOOKING_NOT_ALLOWED'));
            }

            data.scheduledDate = getScheduleData.scheduledDate;
            data.scheduledTime = getScheduleData.scheduledTime;
            data.scheduled_utc = getScheduleData.scheduled_utc;
            data.date_created = data.scheduledDate;
            data.time_created = data.scheduledTime
            data.date_created_utc = data.scheduled_utc;

        } else {
            data.date_created_utc = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');
        }
        const getStoreType = await orderService.getStoreTypeByIdAsync(data.storeTypeId);

        if (getStoreType === null) throw new Error("INVALID_STORE_TYPE")

        data.storeType = getStoreType._id;
        data.store = getStoreType.store._id;

        data.googleMapKey = store.googleMapKey.server;
        data.timezone = store.timezone;
        data.paymentMode = store.paymentMode;
        data.currency = store.currency.code;

        const getVendor = await orderService.getUserByIdAsync(data.vendor);

        if (getVendor === null) throw new Error("VENDOR_IS_INVALID")
        let vendorOpenClose = orderHelper.getVendorOpenCloseStatus(getVendor.isVendorAvailable, getVendor.timeSlot, data.date_created_utc, data.timezone);

        if (vendorOpenClose.status == 'Close') throw new Error("NOT_TAKING_ORDER")

        if (!data.items.length === 0) throw new Error("ITEMS_IS_REQUIRED")

        let lineData = await orderMiddleware.generateLineItems(data.items, getStoreType.storeType);

        if (lineData.isValidItem) throw new Error("INVALID_ITEMS")

        data.line_items = lineData.line_items;
        data.subTotal = orderHelper.roundNumber(lineData.itemTotal);

        //check coupon code
        if (data.coupon) {
            const couponCost = await orderPricing.couponDiscountCalculation(getVendor._id, data.coupon, data.subTotal);

            data.discountTotal = couponCost.discountTotal;
            data.couponType = couponCost.couponType;
            data.couponAmount = couponCost.couponAmount;
            data.subTotal = couponCost.itemTotal;
        }

        if (data.deliveryType === 'DELIVERY') {

            const getDeliveryFee = await orderPricing.deliveryFeeCalculation(data, getStoreType, getVendor);

            if (getDeliveryFee.message != null) throw new Error(getDeliveryFee.message)

            data = { ...data, ...getDeliveryFee };
        } else {
            data.deliveryFee = 0;
        }

        //calculate tax
        const getTax = orderPricing.taxCalculation(getStoreType.taxSettings, getVendor.taxAmount, data.subTotal);
        data.tax = getTax.tax;
        data.taxAmount = getTax.taxAmount;

        //calculate tip
        if (data.tip) {
            const getTip = orderPricing.tipCalculation(Number(data.tip), data.subTotal);
            data.tip = getTip.tip;
            data.tipAmount = getTip.tipAmount;
        } else {
            data.tipAmount = 0;
        }

        data.orderTotal = orderHelper.roundNumber(data.subTotal + data.tax + data.tipAmount + data.deliveryFee);

        if (data.orderStatus) {
            data.orderStatus = data.orderStatus;
        } else {
            data.orderStatus = "pending";
        }

        //calculate earning
        let vendorCommission = getVendor.commisionType && getVendor.commisionType === "override" ? getVendor.commission : getStoreType.commission;
        let driverCommission = getStoreType.commission.deliveryBoy;
        data.commission = {
            vendor: vendorCommission.vendor,
            deliveryBoy: driverCommission
        }
        const getEarning = await orderPricing.caculateEarning(getStoreType.taxSettings, data.subTotal, data.tax, data.tipAmount, data.deliveryFee, data.commission, store.isSingleVendor);
        data.vendorEarning = getEarning.vendorEarning;
        data.deliveryBoyEarning = getEarning.deliveryBoyEarning;
        data.adminEarning = getEarning.adminEarning;
        data.adminVendorEarning = getEarning.adminVendorEarning;
        data.adminDeliveryBoyEarning = getEarning.adminDeliveryBoyEarning;

        if (data.isLoyaltyPointsUsed) {

            if (!data.pointsToRedeem) throw new Error("PLEASE_ENTER_REDEEM_POINTS")

            let aLp = helper.calculateLoyalityPointsValue(data.pointsToRedeem, store.loyaltyPoints);

            data.orderTotal = helper.roundNumber(data.orderTotal - aLp.redemptionValue);

            data.redemptionValue = aLp.redemptionValue;
        }
        return data

    } catch (error) {
        error.error_description = 'Error in get order data middleware!';
        utilityFunc.sendErrorResponse(error, res);
    }
}

let generateLineItems = async (items, storeType) => {

    let generateData = { isValidItem: false, line_items: [], itemTotal: 0 };
    let data = {};

    if (storeType === 'FOOD') {
        data = await generateFoodLineItems(items);
    } else {
        data = await generateOtherStoreTypeLineItems(items);
    }

    return { ...generateData, ...data };
}

let generateFoodLineItems = async (items) => {
    let isValidItem = false;
    let line_items = [];
    let itemTotal = 0;

    for (let index = 0; index < items.length; index++) {
        let element = items[index];

        if (element.itemId) {
            let getItem = await Product.getProductByIdAsync(element.itemId);

            if (getItem === null) {
                isValidItem = true;
                break;
            }

            let obj = {};
            obj.product = getItem._id;
            obj.name = getItem.name;
            obj.productImage = (getItem.featured_image && getItem.featured_image.link) || "";
            obj.price = getItem.price;
            obj.veganType = getItem.veganType;
            obj.quantity = Number(element.quantity);
            let lineItemTotal = helper.roundNumber(obj.price * obj.quantity);
            let addonPrice = 0;

            if (element.addons != undefined) {
                if (element.addons.length > 0) {
                    element.addons.forEach(elements => {
                        addonPrice = addonPrice + Number(elements.price);
                    });
                    obj.addons = element.addons;
                } else {
                    obj.addons = [];
                }
            } else {
                obj.addons = [];
            }

            let lineTotal = helper.roundNumber(lineItemTotal + addonPrice);
            obj.lineTotal = lineTotal;

            itemTotal = itemTotal + lineTotal;

            line_items.push(obj);
        }

    }

    return { isValidItem: isValidItem, line_items: line_items, itemTotal };
}

let generateOtherStoreTypeLineItems = async (items) => {
    let isValidItem = false;
    let line_items = [];
    let itemTotal = 0;

    for (let index = 0; index < items.length; index++) {
        let element = items[index];

        if (element.itemId) {
            let getItem = await Product.getProductByIdAsync(element.itemId);

            if (getItem === null) {
                isValidItem = true;
                break;
            }

            let obj = {};
            obj.product = getItem._id;
            obj.name = getItem.name;
            obj.productImage = (getItem.featured_image && getItem.featured_image.link) || "";
            if (getItem.type === "simple") {
                obj.price = getItem.price;
            } else {
                const getVariation = await productVariationTable.getproductVariationByIdAsync(element.variation_id);

                if (getVariation === null) {
                    isValidItem = true;
                    break;
                }

                obj.variation_id = getVariation._id;
                obj.variation_title = element.variation_title;
                obj.price = getVariation.price;
            }

            obj.quantity = Number(element.quantity);
            let lineItemTotal = helper.roundNumber(obj.price * obj.quantity);
            let addonPrice = 0;
            let lineTotal = helper.roundNumber(lineItemTotal + addonPrice);
            obj.lineTotal = lineTotal;

            itemTotal = itemTotal + lineTotal;

            line_items.push(obj);
        }

    }

    return { isValidItem: isValidItem, line_items: line_items, itemTotal };
}

let beforeRequestSendToVendor = async (store, storeType, order, vendor, user, userToken, apiKey, res) => {
    try { 
        if (store.orderAutoApproval && vendor.orderAutoApproval) {
            deliveryRequest.autoAcceptRequestByRestaurant(order._id, userToken, apiKey, res)
        } else {
            deliveryRequest.afterOrderSuccess(order._id, user, storeType, order.store);
        }
        emailService.userOrderConfEmail(user, store, order);
        emailService.vendorNewOrderEmail(user, vendor, store, order);
    } catch (error) {
        console.log("beforeRequestSendToVendor err", error);
    }
}

let afterWebviewPaymentSuccess = async (data) => {
    let id = data.id;
    let transactionDetailsObj = data.transactionDetails ? { transactionDetails: data.transactionDetails } : {}
    let getOrder = await Order.findOneAndUpdate({ customOrderId: id }, { orderStatus: "pending", paymentStatus: "success", ...transactionDetailsObj })
        .populate({ path: "user", select: 'name email' })
        .populate({ path: "vendor", select: 'name email orderAutoApproval orderAutoCancel' })
        .populate({ path: "storeType", select: 'vendorWaitTime' })
        .populate({
            path: "store",
            select: 'storeName logo currency mailgun domain storeOrderAutoApproval',
            populate: {
                path: "logo",
                select: "link",
            }
        })
        .exec();

    beforeRequestSendToVendor(getOrder.store, getOrder.storeType, getOrder, getOrder.vendor, getOrder.user);
}

let placeOrder = async (data, orderSuccessMsg, res) => {

    switch (data.payment_method) {
        case "stripe": {

            if (!ObjectId.isValid(data.paymentSourceRef)) {
                utilityFunc.sendErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID", res);
            }

            if (data.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }

            if (!data.secretKey) {
                utilityFunc.sendErrorResponse("SETUP_PAYMENT_SETTING_FIRST", res);
            }

            let chargeData = {
                cost: data.orderTotal,
                paymentSourceRef: data.paymentSourceRef,
                secretKey: data.secretKey,
                currency: data.currency
            }

            paymentMiddleware.paymentByStripe(chargeData, (response) => {
                if (!response.status) {
                    utilityFunc.sendErrorResponse(response.message, res);
                } else {
                    data.transactionDetails = response.response;
                    data.paymentStatus = "success";
                    orderService.addOrder(data, async (err, resdata) => {
                        if (err) {
                            utilityFunc.sendErrorResponse("INTERNAL_DB_ERROR", res);
                        } else {
                            beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user,data.token, data.apiKey, res);
                            let message = {
                                message: orderSuccessMsg
                            }
                            utilityFunc.sendSuccessResponse(message, res, { orderId: resdata._id });
                        }
                    });
                }
            });
            break;
        }
        case "square": {

            if (!ObjectId.isValid(data.paymentSourceRef)) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
            }

            if (data.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            let chargeData = {
                cost: data.orderTotal,
                paymentSourceRef: data.paymentSourceRef,
                secretKey: data.secretKey,
                currency: data.currency
            }

            paymentMiddleware.paymentBySquare(chargeData, (response) => {
                if (!response.status) {
                    res.json(helper.showStripeErrorResponse(response.message, response.code));
                } else {
                    data.transactionDetails = response.response;
                    data.paymentStatus = "success";
                    orderService.addOrder(data, async (err, resdata) => {
                        if (err) {
                            utilityFunc.sendErrorResponse("INTERNAL_DB_ERROR", res);
                        } else {
                            beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user, data.token, data.apiKey, res);
                            let message = {
                                message: orderSuccessMsg
                            }
                            utilityFunc.sendSuccessResponse(message, res, { orderId: resdata._id });
                        }
                    });
                }
            });
            break;
        }
        case "razorpay" || "orangeMoney": {

            data.paymentStatus = "pending";
            data.orderStatus = "archived";

            orderService.addOrder(data, async (err, resdata) => {
                if (err) {
                    utilityFunc.sendErrorResponse("INTERNAL_DB_ERROR", res);
                } else {
                    let webViewUrl = env.apiUrl + "/order/webview?id=" + resdata.customOrderId + "&payment_method=" + data.payment_method + "&from=checkout";
                    let message = {
                        message: orderSuccessMsg
                    }
                    utilityFunc.sendSuccessResponse(message, res, { orderId: resdata._id.toString(), webViewUrl: webViewUrl });
                }
            });
            break;
        }
        case "paypal" || "googlepay" || "applepay": {

            if (!ObjectId.isValid(data.paymentSourceRef)) {
                utilityFunc.sendErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID", res);
            }

            if (getStore.paymentSettings.merchantId == null || getStore.paymentSettings.publicKey == null || getStore.paymentSettings.privateKey == null) {
                utilityFunc.sendErrorResponse("SETUP_PAYMENT_SETTING_FIRST", res);
            }

            let chargeData = {
                cost: data.orderTotal,
                paymentSourceRef: data.paymentSourceRef,
                merchantId: getStore.paymentSettings.merchantId,
                publicKey: getStore.paymentSettings.publicKey,
                privateKey: getStore.paymentSettings.privateKey,
                paymentMode: data.paymentMode,
                currency: data.currency
            }

            paymentMiddleware.paymentByBraintreeByCustomer(chargeData, (response) => {
                if (!response.status) {
                    utilityFunc.sendErrorResponse(response.message, res);
                } else {
                    data.transactionDetails = response.response;
                    data.paymentStatus = "success";
                    orderService.addOrder(data, async (err, resdata) => {
                        if (err) {
                            utilityFunc.sendErrorResponse("INTERNAL_DB_ERROR", res);
                        } else {
                            console.log("Order Created:", resdata._id);
                            beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user, data.token, data.apiKey, res);
                            let message = {
                                message: orderSuccessMsg
                            }
                            utilityFunc.sendSuccessResponse(message, res, { orderId: resdata._id });

                        }
                    });
                }
            });

            break;
        }
        case "wallet": {

            if (!user.wallet) {
                utilityFunc.sendErrorResponse("PLEASE_ADD_MONEY_TO_WALLET", res);
            }

            if (user.wallet < data.orderTotal) {
                utilityFunc.sendErrorResponse("WALLET_BALANCE_IS_LOW", res);
            }

            let wallet = orderHelper.roundNumber(user.wallet - data.orderTotal);
            orderService.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                if (err) {
                    utilityFunc.sendErrorResponse("INTERNAL_DB_ERROR", res);
                } else {

                    data.transactionDetails = {};
                    data.paymentStatus = "success";
                    orderService.addOrder(data, async (err, resdata) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user, data.token, data.apiKey, res);
                            let message = {
                                message: orderSuccessMsg
                            }
                            utilityFunc.sendSuccessResponse(message, res, { orderId: resdata._id });
                        }
                    });
                }
            });
            break;
        }
        case "cod": {
            data.transactionDetails = {};
            data.paymentStatus = "success";
            orderService.addOrder(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    console.log("Order Created:", resdata._id);
                    beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user, data.token, data.apiKey, res);
                    let message = {
                        message: orderSuccessMsg
                    }
                    utilityFunc.sendSuccessResponse(message, res, { orderId: resdata._id });
                }
            });
            break;
        }
        default:
            utilityFunc.sendErrorResponse("INVALID_PAYMENT_METHOD", res);
            break;
    }
}
module.exports = {
    getOrderData,
    generateLineItems,
    placeOrder
}