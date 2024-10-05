const Order = require('../models/ordersTable');
const User = require('../models/userTable');
const Store = require('../models/storeTable');
const Transaction = require("../helper/transaction");
const paymentMiddleware = require('./payments');
const ObjectId = require("objectid");
const momentz = require("moment-timezone");
const settingService = require("../helper/settingService");
const orderService = require("../helper/orderService");

let charge = async (data, user, store, callback) => {
    let isDriectPayment = data.isDriectPayment == "true" ? true : false;
    let getStore = await settingService.chekStoreSetting(store.storeId, data.paymentMethod);

    if (!getStore.flag) {
        return callback("SETUP_PAYMENT_SETTING_FIRST", null);
    }

    if (getStore.flag && !getStore.paymentSettings.status) {
        return callback("PAYMENT_METHOD_DISABLE", null);
    }
    if (data.paymentMethod === "stripe") {
        if (!ObjectId.isValid(data.paymentSourceRef)) {
            return callback("PAYMENT_ID_IS_NOT_VALID_OBJECTID", null);
        }

        if (data.paymentMode === "sandbox") {
            data.secretKey = getStore.paymentSettings.sandboxSecretKey;
        } else {
            data.secretKey = getStore.paymentSettings.liveSecretKey;
        }
        if (!data.secretKey) {
            return callback("SETUP_PAYMENT_SETTING_FIRST", null);
        }

        let chargeData = {
            cost: data.orderTotal,
            paymentSourceRef: data.paymentSourceRef,
            secretKey: data.secretKey,
            currency: data.currency,
        };

        paymentMiddleware.paymentByStripe(chargeData, (response) => {
            if (!response.status) {
                return callback(response.message, null);
            } else {
                data.transactionDetails = response.response;
                data.paymentStatus = "success";
                return callback(null, response);
            }
        });
    } else if (data.paymentMethod === "paystack") {
        if (!isDriectPayment || isDriectPayment == "false") {
            if (!ObjectId.isValid(data.paymentSourceRef)) {
                return callback("PAYMENT_ID_IS_NOT_VALID_OBJECTID", null);
            }
            if (data.paymentMode === "sandbox") {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }
            if (!data.secretKey) {
                return callback("SETUP_PAYMENT_SETTING_FIRST", null);
            }

            let chargeData = {
                cost: data.orderTotal,
                paymentSourceRef: data.paymentSourceRef,
                secretKey: data.secretKey,
                currency: data.currency,
            };
            paymentMiddleware.paymentChargebyPaystack(chargeData, (response) => {
                if (!response.status) {
                    return callback(response.message, null);

                } else {
                    console.log("response.status!", response.response.status);
                    if (response.response.status != "success") {
                        console.log("Payment failed");
                        return callback(response.response.gateway_response, null);

                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        return callback(null, data);
                    }
                }
            });
        }
    } else if (data.paymentMethod === "flutterwave") {
        let isDriectPayment = data.isDriectPayment;
        if (!isDriectPayment || isDriectPayment == "false") {
            if (!ObjectId.isValid(data.paymentSourceRef)) {
                return callback("PAYMENT_ID_IS_NOT_VALID_OBJECTID", null);
            }
            if (getStore.paymentMode === "sandbox") {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                data.pubKey = getStore.paymentSettings.sandboxPublishabelKey;
                data.enckey = getStore.paymentSettings.sandboxEncKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
                data.pubKey = getStore.paymentSettings.livePublishabelKey;
                data.enckey = getStore.paymentSettings.liveEncKey;
            }
            let chargeData = {
                cost: data.orderTotal,
                paymentSourceRef: data.paymentSourceRef,
                secretKey: data.secretKey,
                pubKey: data.pubKey,
                enckey: data.enckey,
                currency: data.currency,
            };
            paymentMiddleware.paymentChargebyFlutterwave(chargeData, (response) => {
                if (!response.status) {
                    return callback(response.message, null);
                } else {
                    console.log("response.status:", response.response.status);
                    if (response.response.status != "successful") {
                        console.log("Payment failed");
                        return callback(response.message, null);
                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        return callback(null, data);
                    }
                }
            }
            );
        }
    } else if (data.paymentMethod === "square") {
        if (!ObjectId.isValid(data.paymentSourceRef)) {
            return callback("PAYMENT_ID_IS_NOT_VALID_OBJECTID", null);
        }
        if (data.paymentMode === "sandbox") {
            data.secretKey = getStore.paymentSettings.sandboxSecretKey;
        } else {
            data.secretKey = getStore.paymentSettings.liveSecretKey;
        }
        if (!data.secretKey) {
            return callback("SETUP_PAYMENT_SETTING_FIRST", null);
        }

        let chargeData = {
            cost: data.orderTotal,
            paymentSourceRef: data.paymentSourceRef,
            secretKey: data.secretKey,
            currency: data.currency,
        };

        paymentMiddleware.paymentBySquare(chargeData, (response) => {
            if (!response.status) {
                return callback(response.message, null);
            } else {
                data.transactionDetails = response.response;
                data.paymentStatus = "success";
                return callback(null, data);

            }
        });
    } else if (data.paymentMethod === "razorpay" || data.paymentMethod === "orangeMoney") {
        data.paymentStatus = "pending";
        data.orderStatus = "archived";

    } else if (data.paymentMethod === "moncash") {
        data.paymentStatus = "pending";
        data.orderStatus = "archived";
    } else if (data.paymentMethod === "dpo") {
        if (getStore.paymentMode === "sandbox") {
            data.companytoken = getStore.paymentSettings.companytoken;
            data.endpoint = getStore.paymentSettings.endpoint;
            data.servicetype = getStore.paymentSettings.servicenumber;
        } else {
            data.companytoken = getStore.paymentSettings.livecompanytoken;
            data.endpoint = getStore.paymentSettings.liveendpoint;
            data.servicetype = getStore.paymentSettings.liveservicenumber;
        }
        if (!data.companytoken || !data.endpoint || !data.servicetype) {
            return callback("SETUP_PAYMENT_SETTING_FIRST", null);
        }
        let todaydate = Date.now();
        let servicedate = momentz.tz(todaydate, getStore.timezone).format("YYYY/MM/DD HH:mm");
        chargeData = {
            companytoken: data.companytoken,
            currency: getStore.currency.code,
            amount: data.orderTotal,
            endpoint: data.endpoint,
            servicetype: data.servicetype,
            servicedescription: "User create order amount",
            servicedate: servicedate,
        };
        paymentMiddleware.dpoCreatePayment(chargeData, async (response) => {
            if (!response.status) {
                return callback(response.message, null);
            } else {
                let carddata = {
                    companytoken: data.companytoken,
                    endpoint: data.endpoint,
                    transactiontoken: response.data.TransToken,
                    paymentSourceRef: data.paymentSourceRef,
                };
                paymentMiddleware.chargebycard(carddata, async (cdres) => {
                    if (!cdres.status) {
                        let cancelrequest = {
                            companytoken: data.companytoken,
                            endpoint: data.endpoint,
                            transactiontoken: response.data.TransToken,
                        };
                        paymentMiddleware.dpoCancelPayment(
                            cancelrequest,
                            async (cancelres) => {
                                if (!cancelres.status) {
                                    console.log(
                                        "order dpo cancel request error  message---",
                                        cancelres.message
                                    );
                                } else {
                                    console.log("order dpo request cancelled", cancelres);
                                }
                            }
                        );
                        return callback(cdres.message, null);

                    } else {
                        console.log("order charge by card data---", cdres);
                        let transactiondta = {
                            transactionId: response.data.TransToken,
                            refundDetails:
                                data.orderTotal +
                                " amount has been creatdited of " +
                                data.customOrderId +
                                " order",
                        };
                        data.transactionDetails = transactiondta;
                        data.paymentStatus = "success";
                        return callback(null, data);
                    }
                });
            }
        });
    } else if (data.paymentMethod === "pay360") {
        if (
            !getVendor.pay360Split ||
            !getVendor.pay360Split.status ||
            !getVendor.pay360Split.accountId ||
            !getVendor.pay360Split.merchantId
        ) {
            return callback("SETUP_PAYMENT_SETTING_FIRST", null);
        }

        if (!ObjectId.isValid(data.paymentSourceRef)) {
            return callback("PAYMENT_ID_IS_NOT_VALID_OBJECTID", null);
        }

        data.paymentStatus = "pending";
        data.orderStatus = "archived";
    } else if (
        data.paymentMethod === "paypal" || data.paymentMethod === "googlepay" || data.paymentMethod === "applepay") {
        if (!ObjectId.isValid(data.paymentSourceRef)) {
            return callback("PAYMENT_ID_IS_NOT_VALID_OBJECTID", null);
        }

        if (getStore.paymentSettings.merchantId == null || getStore.paymentSettings.publicKey == null || getStore.paymentSettings.privateKey == null) {
            return callback("SETUP_PAYMENT_SETTING_FIRST", null);
        }

        let chargeData = {
            cost: data.orderTotal,
            paymentSourceRef: data.paymentSourceRef,
            merchantId: getStore.paymentSettings.merchantId,
            publicKey: getStore.paymentSettings.publicKey,
            privateKey: getStore.paymentSettings.privateKey,
            paymentMode: data.paymentMode,
            currency: data.currency,
        };

        paymentMiddleware.paymentByBraintreeByCustomer(
            chargeData,
            (response) => {
                if (!response.status) {
                    return callback(response.message, null);

                } else {
                    data.transactionDetails = response.response;
                    data.paymentStatus = "success";
                    return callback(null, data);

                }
            }
        );
    } else if (data.paymentMethod === "wallet") {
        if (!user.wallet) {
            return callback("PLEASE_ADD_MONEY_TO_WALLET", null);
        }

        if (user.wallet < data.orderTotal) {
            return callback("WALLET_BALANCE_IS_LOW", null);
        }

        let wallet = helper.roundNumber(user.wallet - data.orderTotal);
        User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
            if (err) {
                return callback("INTERNAL_DB_ERROR", err);
            } else {
                // Transaction.userTransaction(resdata, user, store, data.orderTotal, wallet);
                data.transactionDetails = {};
                data.paymentStatus = "success";
                return callback(null, data);

            }
        }
        );
    } else if (data.paymentMethod === "cod") {
        data.transactionDetails = {};
        data.paymentStatus = "success";
        return callback(null, data);
    } else {
        return callback("INVALID_PAYMENT_METHOD", null);
    }
};
let paymentChargeForOrder = async (req, res) => {
    let data = req.body
    //console.log("paymentChargeForOrder-------data-----", JSON.stringify(data))
    let getOrder = await Order.findById(data.orderId)
    let getStore = data.getStore
    if (getOrder == null) {
        return res.json(helper.showValidationErrorResponse("INVALID_ORDER_ID"));
    }
    let isDriectPayment = data.isDriectPayment;
    let orderSuccessMsg = await helper.getTerminologyData({
        lang: "en",
        storeId: data.store,
        constant: "ORDER_ADDED_SUCCESS",
        type: "order",
    });
    let orderResData = {
        scheduledType: data.scheduledType,
        paymentStatus: "success",
        paymentMethod: data.paymentMethod,
        paymentSourceRef: data.paymentSourceRef,
        orderStatus: "pending",
        journeyType: data.journeyType,
        rideType: data.rideType,
    };
    if (data.payment_method === "stripe") {
        if (!ObjectId.isValid(data.paymentSourceRef)) {
            return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
        }
        if (data.paymentMode === "sandbox") {
            data.secretKey = getStore.paymentSettings.sandboxSecretKey;
        } else {
            data.secretKey = getStore.paymentSettings.liveSecretKey;
        }
        if (!data.secretKey) {
            return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        let chargeData = {
            cost: getOrder.orderTotal,
            paymentSourceRef: data.paymentSourceRef,
            secretKey: data.secretKey,
            currency: data.currency,
        };
        paymentMiddleware.paymentByStripe(chargeData, (response) => {
            if (!response.status) {
                res.json(helper.showStripeErrorResponse(response.message, response.code));
            } else {
                //data.transactionDetails = response.response;
                //data.paymentStatus = "success";
                let update = {
                    _id: data.orderId,
                    paymentStatus: "success",
                    transactionDetails: response.response,
                    orderStatus: "pending"
                }
                Order.updateOrderVendorNew(update, async (err, resdata) => {
                    if (err) {
                        console.log("err db", err);
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        console.log("Order Created:", resdata._id);
                        res.json(helper.showSuccessResponse(orderSuccessMsg, {
                            orderId: resdata._id,
                            ...orderResData
                        }));
                        orderService.beforeRequestSendToVendor(data.getStore, data.getStoreType, resdata, data.getVendor, data.user);
                        orderService.manageProductStock(resdata.line_items, false);
                    }
                });
            }
        });
    } else if (data.payment_method === "paystack") {
        if (!isDriectPayment || isDriectPayment == "false") {
            if (!ObjectId.isValid(data.paymentSourceRef)) {
                return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
            }
            if (data.paymentMode === "sandbox") {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }
            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
            }
            let chargeData = {
                cost: data.orderTotal,
                paymentSourceRef: data.paymentSourceRef,
                secretKey: data.secretKey,
                currency: data.currency,
            };
            paymentMiddleware.paymentChargebyPaystack(chargeData, (response) => {
                if (!response.status) {
                    return res.json(helper.showValidationErrorResponse(response.message));
                } else {
                    console.log("response.status!", response.response.status);
                    if (response.response.status != "success") {
                        console.log("Payment failed");
                        return res.json(helper.showValidationErrorResponse(response.message));
                    } else {
                        // data.transactionDetails = response.response;
                        // data.paymentStatus = "success";
                        let update = {
                            _id: data.orderId,
                            paymentStatus: "success",
                            transactionDetails: response.response,
                            orderStatus: "pending"
                        }
                        Order.updateOrderVendorNew(update, async (err, resdata) => {
                            if (err) {
                                console.log("err db", err);
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("Order Created:", resdata._id);
                                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                                    orderId: resdata._id,
                                    ...orderResData
                                }));
                                orderService.beforeRequestSendToVendor(data.getStore, data.getStoreType, resdata, data.getVendor, data.user);
                                orderService.manageProductStock(resdata.line_items, false);
                            }
                        });
                    }
                }
            });
        } else {
            Order.OrderByIdNew(data.orderId, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let returnUrl = env.apiUrl + "card/paystack/return?id=" + resdata.customOrderId + "&payment_method=paystack&from=checkout&amount=" + getOrder.orderTotal;
                    let sendData = {
                        orderId: resdata._id.toString(),
                        id: resdata.customOrderId.toString(),
                        payment_method: "paystack",
                        from: "checkout",
                        amount: getOrder.orderTotal,
                        returnUrl: returnUrl,
                    };
                    res.json(helper.showSuccessResponse(orderSuccessMsg, sendData));
                }
            });
        }
    } else if (data.paymentMethod === "flutterwave") {
        console.log("flutterwave")
        if (!isDriectPayment || isDriectPayment == "false") {
            if (!ObjectId.isValid(data.paymentSourceRef)) {
                return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
            }
            if (getStore.paymentMode === "sandbox") {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                data.pubKey = getStore.paymentSettings.sandboxPublishabelKey;
                data.enckey = getStore.paymentSettings.sandboxEncKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
                data.pubKey = getStore.paymentSettings.livePublishabelKey;
                data.enckey = getStore.paymentSettings.liveEncKey;
            }
            let chargeData = {
                cost: getOrder.orderTotal,
                paymentSourceRef: data.paymentSourceRef,
                secretKey: data.secretKey,
                pubKey: data.pubKey,
                enckey: data.enckey,
                currency: data.currency,
            };
            paymentMiddleware.paymentChargebyFlutterwave(chargeData, (response) => {
                if (!response.status) {
                    return res.json(helper.showValidationErrorResponse(response.message));
                } else {
                    console.log("response.status delivery", response.response.status);
                    if (response.response.status != "successful") {
                        console.log("Payment failed");
                        return res.json(helper.showValidationErrorResponse(response.message));
                    } else {
                        // data.transactionDetails = response.response;
                        // data.paymentStatus = "success";
                        let update = {
                            _id: data.orderId,
                            paymentStatus: "success",
                            transactionDetails: response.response,
                            orderStatus: "pending"
                        }
                        Order.updateOrderVendorNew(update, async (err, resdata) => {
                            if (err) {
                                console.log("err db", err);
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("Order Created:", resdata._id);
                                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                                    orderId: resdata._id,
                                    ...orderResData
                                }));
                                orderService.beforeRequestSendToVendor(data.getStore, data.getStoreType, resdata, data.getVendor, data.user);
                                orderService.manageProductStock(resdata.line_items, false);
                            }
                        });
                    }
                }
            });
        } else {
            console.log("isDriectPayment tru")
            data.paymentStatus = "pending";
            data.orderStatus = "archived";
            Order.OrderByIdNew(data.orderId, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    console.log("resdata tru")
                    let returnUrl = env.apiUrl + "card/flutterwave/return?id=" + resdata.customOrderId + "&payment_method=flutterwave&from=checkout&amount=" + getOrder.orderTotal;
                    let sendData = {
                        orderId: resdata._id.toString(),
                        id: resdata.customOrderId.toString(),
                        payment_method: "flutterwave",
                        from: "checkout",
                        amount: getOrder.orderTotal,
                        returnUrl: returnUrl,
                    };
                    res.json(helper.showSuccessResponse(orderSuccessMsg, sendData));
                }
            });
        }
    } else if (data.payment_method === "square") {
        if (!ObjectId.isValid(data.paymentSourceRef)) {
            return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
        }
        if (data.paymentMode === "sandbox") {
            data.secretKey = getStore.paymentSettings.sandboxSecretKey;
        } else {
            data.secretKey = getStore.paymentSettings.liveSecretKey;
        }
        if (!data.secretKey) {
            return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        let chargeData = {
            cost: getOrder.orderTotal,
            paymentSourceRef: data.paymentSourceRef,
            secretKey: data.secretKey,
            currency: data.currency,
        };
        paymentMiddleware.paymentBySquare(chargeData, (response) => {
            if (!response.status) {
                return res.json(helper.showValidationErrorResponse(response.message));
            } else {
                data.transactionDetails = response.response;
                data.paymentStatus = "success";
                let update = {
                    _id: data.orderId,
                    paymentStatus: "success",
                    transactionDetails: response.response,
                    orderStatus: "pending"
                }
                Order.updateOrderVendorNew(update, async (err, resdata) => {
                    if (err) {
                        console.log("err db", err);
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        console.log("Order Created:", resdata._id);
                        res.json(helper.showSuccessResponse(orderSuccessMsg, {
                            orderId: resdata._id,
                            ...orderResData
                        }));
                        orderService.beforeRequestSendToVendor(data.getStore, data.getStoreType, resdata, data.getVendor, data.user);
                        orderService.manageProductStock(resdata.line_items, false);
                    }
                });
            }
        });
    } else if (data.payment_method === "razorpay" || data.payment_method === "orangeMoney") {
        data.paymentStatus = "pending";
        data.orderStatus = "archived";
        Order.OrderByIdNew(data.orderId, async (err, resdata) => {
            if (err) {
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                let webViewUrl = env.apiUrl + "/order/webview?id=" + resdata.customOrderId + "&payment_method=" + data.payment_method + "&from=checkout";
                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                    orderId: resdata._id.toString(),
                    payment_method: data.payment_method,
                    webViewUrl: webViewUrl,
                }));
            }
        });
    } else if (data.payment_method === "moncash") {
        data.paymentStatus = "pending";
        data.orderStatus = "archived";
        Order.OrderByIdNew(data.orderId, async (err, resdata) => {
            if (err) {
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                let webViewUrl = env.apiUrl + "card/webview?id=" + resdata.customOrderId + "&payment_method=" + data.payment_method + "&from=checkout";
                console.log("fdfdf", orderSuccessMsg, {
                    orderId: resdata._id.toString(),
                    payment_method: data.paymentMethod,
                    webViewUrl: webViewUrl,
                });
                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                    orderId: resdata._id.toString(),
                    payment_method: data.payment_method,
                    webViewUrl: webViewUrl,
                }));
            }
        });
    } else if (data.payment_method === "dpo") {
        if (getStore.paymentMode === "sandbox") {
            data.companytoken = getStore.paymentSettings.companytoken;
            data.endpoint = getStore.paymentSettings.endpoint;
            data.servicetype = getStore.paymentSettings.servicenumber;
        } else {
            data.companytoken = getStore.paymentSettings.livecompanytoken;
            data.endpoint = getStore.paymentSettings.liveendpoint;
            data.servicetype = getStore.paymentSettings.liveservicenumber;
        }
        if (!data.companytoken) {
            return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        if (!data.endpoint) {
            return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        if (!data.servicetype) {
            return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        let todaydate = Date.now();
        let servicedate = momentz.tz(todaydate, getStore.timezone).format("YYYY/MM/DD HH:mm");
        chargeData = {
            companytoken: data.companytoken,
            currency: getStore.currency.code,
            amount: getOrder.orderTotal,
            endpoint: data.endpoint,
            servicetype: data.servicetype,
            servicedescription: "User create order amount",
            servicedate: servicedate,
        };
        paymentMiddleware.dpoCreatePayment(chargeData, async (response) => {
            if (!response.status) {
                return res.json(helper.showValidationErrorResponse(response.message));
            } else {
                //console.log("response---wallet", response)
                let carddata = {
                    companytoken: data.companytoken,
                    endpoint: data.endpoint,
                    transactiontoken: response.data.TransToken,
                    paymentSourceRef: data.paymentSourceRef,
                };
                paymentMiddleware.chargebycard(carddata, async (cdres) => {
                    if (!cdres.status) {
                        let cancelrequest = {
                            companytoken: data.companytoken,
                            endpoint: data.endpoint,
                            transactiontoken: response.data.TransToken,
                        };
                        paymentMiddleware.dpoCancelPayment(cancelrequest, async (cancelres) => {
                            if (!cancelres.status) {
                                console.log("order dpo cancel request error  message---", cancelres.message);
                                //return res.json(helper.showValidationErrorResponse(response.message));
                            } else {
                                console.log("order dpo request cancelled", cancelres);
                            }
                        });
                        return res.json(helper.showValidationErrorResponse(cdres.message));
                    } else {
                        console.log("order charge by card data---", cdres);
                        let transactiondta = {
                            transactionId: response.data.TransToken,
                            refundDetails: data.orderTotal + " amount has been creatdited of " + data.customOrderId + " order",
                        };
                        data.transactionDetails = transactiondta;
                        data.paymentStatus = "success";
                        let update = {
                            _id: data.orderId,
                            paymentStatus: "success",
                            transactionDetails: transactiondta,
                            orderStatus: "pending"
                        }
                        Order.updateOrderVendorNew(update, async (err, orderresdata) => {
                            if (err) {
                                console.log("err db", err);
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("Order Created:", orderresdata._id);
                                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                                    orderId: orderresdata._id,
                                    ...orderResData
                                }));
                                orderService.beforeRequestSendToVendor(data.getStore, data.getStoreType, orderresdata, data.getVendor, data.user);
                                orderService.manageProductStock(orderresdata.line_items, false);
                            }
                        });
                    }
                });
            }
        });
    } else if (data.payment_method === "pay360") {
        if (!getVendor.pay360Split || !getVendor.pay360Split.status || !getVendor.pay360Split.accountId || !getVendor.pay360Split.merchantId) {
            return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST_VENDOR"));
        }
        if (!ObjectId.isValid(data.paymentSourceRef)) {
            return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
        }
        data.paymentStatus = "pending";
        data.orderStatus = "archived";
        Order.OrderByIdNew(data.orderId, async (err, resdata) => {
            if (err) {
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                let webViewUrl = env.apiUrl + "/card/webview?id=" + resdata.customOrderId + "&payment_method=" + data.payment_method + "&from=checkout&ref=" + data.paymentSourceRef;
                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                    orderId: resdata._id.toString(),
                    payment_method: data.payment_method,
                    webViewUrl: webViewUrl,
                }));
            }
        });
    } else if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
        if (!ObjectId.isValid(data.paymentSourceRef)) {
            return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
        }
        if (getStore.paymentSettings.merchantId == null || getStore.paymentSettings.publicKey == null || getStore.paymentSettings.privateKey == null) {
            return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        let chargeData = {
            cost: data.orderTotal,
            paymentSourceRef: data.paymentSourceRef,
            merchantId: getStore.paymentSettings.merchantId,
            publicKey: getStore.paymentSettings.publicKey,
            privateKey: getStore.paymentSettings.privateKey,
            paymentMode: data.paymentMode,
            currency: data.currency,
        };
        paymentMiddleware.paymentByBraintreeByCustomer(chargeData,
            (response) => {
                if (!response.status) {
                    res.json(helper.showBraintreeErrorResponse(response.message, response.code));
                } else {
                    data.transactionDetails = response.response;
                    data.paymentStatus = "success";
                    let update = {
                        _id: data.orderId,
                        paymentStatus: "success",
                        transactionDetails: response.response,
                        orderStatus: "pending"
                    }
                    Order.updateOrderVendorNew(update, async (err, resdata) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            console.log("Order Created:", resdata._id);
                            res.json(helper.showSuccessResponse(orderSuccessMsg, {
                                orderId: resdata._id,
                            }));
                            orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                            orderService.manageProductStock(resdata.line_items, false);
                        }
                    });
                }
            });
    } else if (data.payment_method === "wallet") {
        if (!user.wallet) {
            return res.json(helper.showValidationErrorResponse("PLEASE_ADD_MONEY_TO_WALLET"));
        }
        if (user.wallet < data.orderTotal) {
            return res.json(helper.showValidationErrorResponse("WALLET_BALANCE_IS_LOW"));
        }
        let wallet = helper.roundNumber(user.wallet - data.orderTotal);
        User.updateUserProfile({
            _id: user._id,
            wallet: wallet
        },
            (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    data.transactionDetails = {};
                    data.paymentStatus = "success";
                    let update = {
                        _id: data.orderId,
                        paymentStatus: "success",
                        transactionDetails: {},
                        orderStatus: "pending"
                    }
                    Order.updateOrderVendorNew(update, async (err, resdata) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            console.log("Order Created:", resdata._id);
                            Transaction.userTransaction(resdata, user, store, data.orderTotal, wallet);
                            res.json(helper.showSuccessResponse(orderSuccessMsg, {
                                orderId: resdata._id,
                                ...orderResData
                            }));
                            orderService.beforeRequestSendToVendor(data.getStore, data.getStoreType, resdata, data.getVendor, data.user);
                            orderService.manageProductStock(resdata.line_items, false);
                        }
                    });
                }
            });
    } else if (data.payment_method === "cod") {
        data.transactionDetails = {};
        data.paymentStatus = "success";
        let update = {
            _id: data.orderId,
            paymentStatus: "success",
            transactionDetails: {},
            orderStatus: "pending"
        }
        Order.updateOrderVendorNew(update, async (err, resdata) => {
            if (err) {
                console.log("cod---", err);
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                console.log("Order Created:", resdata._id);
                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                    orderId: resdata._id,
                    ...orderResData
                }));
                orderService.beforeRequestSendToVendor(data.getStore, data.getStoreType, resdata, data.getVendor, data.user);
                orderService.manageProductStock(resdata.line_items, false);
            }
        });
    } else if (data.payment_method === "cardOnDelivery") {
        data.transactionDetails = {};
        data.paymentStatus = "success";
        let update = {
            _id: data.orderId,
            paymentStatus: "success",
            transactionDetails: {},
            orderStatus: "pending"
        }
        Order.updateOrderVendorNew(update, async (err, resdata) => {
            if (err) {
                console.log("cod---", err);
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
                console.log("Order Created:", resdata._id);
                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                    orderId: resdata._id,
                    ...orderResData
                }));
                orderService.beforeRequestSendToVendor(data.getStore, data.getStoreType, resdata, data.getVendor, data.user);
                orderService.manageProductStock(resdata.line_items, false);
            }
        });
    } else {
        return res.json(helper.showValidationErrorResponse("INVALID_PAYMENT_METHOD"));
    }
}
module.exports = {
    charge,
    paymentChargeForOrder
};