const Review = require('../models/reviewTable');
const Order = require('../models/ordersTable');
const User = require('../models/userTable');
const ObjectId = require('objectid');
const paymentMiddleware = require('../middleware/payments');
const Transaction = require('../helper/transaction');
const momentz = require('moment-timezone');

module.exports = {

    feedbackByDriverToCustomer: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data.reviewed_by = user._id;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_IS_REQUIRED'));
            }

            data.order = data._id;

            const getOrder = await Order.getOrderByIdAsync(data.order);

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_IS_NOT_VALID'));
            }

            data.reviewed_to = getOrder.user._id;

            if (!data.review) {
                return res.json(helper.showValidationErrorResponse('REVIEW_IS_REQUIRED'));
            }

            if (!data.rating) {
                return res.json(helper.showValidationErrorResponse('REVIEW_RATING_IS_REQUIRED'));
            }

            delete data._id;

            const getUser = await User.getUserByIdAsync(data.reviewed_to);

            Review.addReview(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    //update product avg rating
                    module.exports.updateUserAvgRating(getUser, resdata._id);
                    res.json(helper.showSuccessResponse('ORDER_RATING_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    feedbackByCustomerToVendor: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data.reviewed_by = user._id;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_IS_REQUIRED'));
            }

            data.order = data._id;

            const getOrder = await Order.getOrderByIdAsync(data.order);

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_IS_NOT_VALID'));
            }

            data.reviewed_to = getOrder.vendor._id;

            // if (!data.review) {
            //     return res.json(helper.showValidationErrorResponse('REVIEW_IS_REQUIRED'));
            // }

            if (!data.rating) {
                return res.json(helper.showValidationErrorResponse('REVIEW_RATING_IS_REQUIRED'));
            }

            delete data._id;

            const getUser = await User.getUserByIdAsync(data.reviewed_to);

            Review.addReview(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    //update product avg rating
                    module.exports.updateUserAvgRating(getUser, resdata._id);
                    res.json(helper.showSuccessResponse('ORDER_RATING_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    feedbackByCustomerToDriver: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            // console.log("data:==>", data)

            data.reviewed_by = user._id;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_IS_REQUIRED'));
            }

            data.order = data._id;

            const getOrder = await Order.getOrderByIdAsync(data.order);

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_IS_NOT_VALID'));
            }
            if (!getOrder.driver) {
                return res.json(helper.showValidationErrorResponse('DRIVER_NOT_EXIST'));
            }
            data.reviewed_to = getOrder.driver._id;
            data.tipType = store.tipType ? store.tipType : "percentage";

            if (data.tip) {
                console.log("before--", getOrder.store.currency.code)
                if (getOrder.paymentMethod === "stripe") {
                    if (getOrder.orderTotal >= 1) {
                        if (getOrder.store.currency.code == "INR") {
                            if (getOrder.orderTotal >= 40.800) {
                                let getTip = helper.getTipAmount(data.tipType, data.tip, getOrder.orderTotal);
                                await module.exports.chargeTipFromCustomer(data.tipType, data.tip, getTip, getOrder, store);
                            }
                            else {
                                return res.json(helper.showValidationErrorResponse('Order amount should be greater than ' + getOrder.store.currency.sign + '41'));
                            }
                        }
                        else if (getOrder.store.currency.code == "NGN") {
                            if (getOrder.orderTotal >= 217.75) {
                                let getTip = helper.getTipAmount(data.tipType, data.tip, getOrder.orderTotal);
                                await module.exports.chargeTipFromCustomer(data.tipType, data.tip, getTip, getOrder, store);
                            }
                            else {
                                return res.json(helper.showValidationErrorResponse('Order amount should be greater than ' + getOrder.store.currency.sign + '218'));
                            }
                        }
                        else if (getOrder.store.currency.code == "ZMW") {
                            if (getOrder.orderTotal >= 10) {
                                let getTip = helper.getTipAmount(data.tipType, data.tip, getOrder.orderTotal);
                                await module.exports.chargeTipFromCustomer(data.tipType, data.tip, getTip, getOrder, store);
                            }
                            else {
                                return res.json(helper.showValidationErrorResponse('Order amount should be greater than ' + getOrder.store.currency.sign + '10'));
                            }
                        }
                        else if (getOrder.store.currency.code == "ZAR") {
                            if (getOrder.orderTotal >= 8.81) {
                                let getTip = helper.getTipAmount(data.tipType, data.tip, getOrder.orderTotal);
                                await module.exports.chargeTipFromCustomer(data.tipType, data.tip, getTip, getOrder, store);
                            }
                            else {
                                return res.json(helper.showValidationErrorResponse('Order amount should be greater than ' + getOrder.store.currency.sign + '9'));
                            }
                        }
                        else if (getOrder.store.currency.code == "HTG") {
                            if (getOrder.orderTotal >= 60) {
                                let getTip = helper.getTipAmount(data.tipType, data.tip, getOrder.orderTotal);
                                await module.exports.chargeTipFromCustomer(data.tipType, data.tip, getTip, getOrder, store);
                            }
                            else {
                                return res.json(helper.showValidationErrorResponse('Order amount should be greater than ' + getOrder.store.currency.sign + '60'));
                            }
                        }
                        else {
                            let getTip = helper.getTipAmount(data.tipType, data.tip, getOrder.orderTotal);
                            await module.exports.chargeTipFromCustomer(data.tipType, data.tip, getTip, getOrder, store);
                        }
                    }
                    else {
                        return res.json(helper.showValidationErrorResponse('Order amount should be greater than ' + getOrder.store.currency.sign + '1'));
                    }
                }
                else {
                    let getTip = helper.getTipAmount(data.tipType, data.tip, getOrder.orderTotal);
                    await module.exports.chargeTipFromCustomer(data.tipType, data.tip, getTip, getOrder, store);
                }
                //await Order.updateOne({ _id: getOrder._id }, { tip: data.tip, tipType: data.tipType })

            }

            // if (!data.review) {
            //     return res.json(helper.showValidationErrorResponse('REVIEW_IS_REQUIRED'));
            // }

            if (!data.rating) {
                return res.json(helper.showValidationErrorResponse('REVIEW_RATING_IS_REQUIRED'));
            }

            delete data._id;

            const getUser = await User.getUserByIdAsync(data.reviewed_to);

            Review.addReview(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    //update product avg rating
                    module.exports.updateUserAvgRating(getUser, resdata._id);
                    res.json(helper.showSuccessResponse('ORDER_RATING_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("error:", error);
            res.json(helper.showInternalServerErrorResponse(error));
        }
    },

    chargeTipFromCustomer: async (tipType, tip, tipAmount, getOrder, store) => {
        return new Promise(async (resolve, reject) => {
            try {

                let data = {};
                let amountdata;
                data.currency = store.currency.code;
                getOrder.paymentMethod = getOrder.paymentMethod == "paypal" ? "braintree" : getOrder.paymentMethod
                let getGatewaySetting = store.paymentSettings.filter(payment => {
                    return payment.payment_method === getOrder.paymentMethod;
                });

                if (getOrder.paymentMethod === "stripe") {

                    if (store.paymentMode === 'sandbox') {
                        data.secretKey = getGatewaySetting[0].sandboxSecretKey;
                    } else {
                        data.secretKey = getGatewaySetting[0].liveSecretKey;
                    }

                    let chargeData = {
                        cost: tipAmount,
                        paymentSourceRef: getOrder.paymentSourceRef,
                        secretKey: data.secretKey,
                        currency: data.currency
                    }
                    //console.log("chargeData---", chargeData)

                    paymentMiddleware.paymentByStripe(chargeData, async (response) => {
                        if (response.status) {
                            console.log("Stripe tip charge Successfull ress!");
                            await Order.findByIdAndUpdate(getOrder._id, { tipType: tipType, tip: tip, tipAmount: tipAmount });
                            await Transaction.tipTransactionByCystomerToDriver(tipAmount, getOrder);
                            resolve(response)
                        } else {
                            console.log("Stripe tip charge err!", response)
                            console.log("tipType", tipType)
                            if (tipType == 'percentage') {
                                if (store.currency.code == "INR") {
                                    amountdata = Math.ceil(4008 / getOrder.orderTotal) + '%'
                                    reject('Tip amount should be at least ' + amountdata + " for this order")
                                }
                                else if (store.currency.code == "NGN") {
                                    amountdata = Math.ceil(21775 / getOrder.orderTotal) + '%'
                                    reject('Tip amount should be at least ' + amountdata + " for this order")
                                }
                                else if (store.currency.code == "ZMW") {
                                    amountdata = Math.ceil(799 / getOrder.orderTotal) + '%'
                                    reject('Tip amount should be at least ' + amountdata + " for this order")
                                }
                                else if (store.currency.code == "ZAR") {
                                    amountdata = Math.ceil(881 / getOrder.orderTotal) + '%'
                                    reject('Tip amount should be at least ' + amountdata + " for this order")
                                }
                                else if (store.currency.code == "HTG") {
                                    amountdata = Math.ceil(6000 / getOrder.orderTotal) + '%'
                                    reject('Tip amount should be at least ' + amountdata + " for this order")
                                }
                                else {
                                    amountdata = Math.ceil(50 / getOrder.orderTotal) + '%'
                                    reject('Tip amount should be at least ' + amountdata + " for this order")
                                }
                            }
                            else {
                                if (response.message) {
                                    reject("Tip " + response.message + " for this order")
                                }
                                else {
                                    reject("Tip is not available for this order")
                                }

                            }
                        }
                    });

                }
                else if (getOrder.paymentMethod === "paystack") {

                    if (store.paymentMode === 'sandbox') {
                        data.secretKey = getGatewaySetting[0].sandboxSecretKey;
                    } else {
                        data.secretKey = getGatewaySetting[0].liveSecretKey;
                    }
                    if (getOrder.paymentSourceRef && getOrder.paymentSourceRef != "paystack") {

                        let chargeData = {
                            cost: tipAmount,
                            paymentSourceRef: getOrder.paymentSourceRef,
                            secretKey: data.secretKey,
                            currency: data.currency
                        }
                        paymentMiddleware.paymentChargebyPaystack(chargeData, async (response) => {
                            if (!response.status) {
                                console.log("Paystack tip charge err!", response)
                                reject("Paystack tip charge err!")
                            } else {
                                console.log("response.status for tip", response.response.status)
                                if (response.response.status != "success") {
                                    console.log("Payment failed--", response.response)
                                    reject("Paystack tip charge err")
                                    //res.json(helper.showStripeErrorResponse(response.response.gateway_response, response.response.status));

                                }
                                else {
                                    console.log("Paystack tip charge Successfull ress!");
                                    await Order.findByIdAndUpdate(getOrder._id, { tipType: tipType, tip: tip, tipAmount: tipAmount });
                                    await Transaction.tipTransactionByCystomerToDriver(tipAmount, getOrder);
                                    resolve(response)
                                }
                            }
                        })
                    }
                    else {
                        console.log("Paystack tip charge err!!", getOrder.paymentSourceRef)
                        reject("Direct Paystack not support for tip")
                    }

                }
                else if (getOrder.paymentMethod === "braintree") {


                    let chargeData = {
                        cost: tipAmount,
                        paymentSourceRef: getOrder.paymentSourceRef,
                        merchantId: getGatewaySetting[0].merchantId,
                        publicKey: getGatewaySetting[0].publicKey,
                        privateKey: getGatewaySetting[0].privateKey,
                        paymentMode: store.paymentMode,
                        currency: data.currency
                    }

                    paymentMiddleware.paymentByBraintreeByCustomer(chargeData, async (response) => {
                        if (!response.status) {
                            console.log("Braintree: tip charge err!", response);
                            reject("Braintree: tip charge err!")
                        } else {

                            console.log("Braintree: tip charge Successfull ress!");
                            await Order.findByIdAndUpdate(getOrder._id, { tipType: tipType, tip: tip, tipAmount: tipAmount });
                            await Transaction.tipTransactionByCystomerToDriver(tipAmount, getOrder);
                            resolve(response)
                        }
                    });

                }
                else if (getOrder.paymentMethod === "dpo") {

                    if (store.paymentMode === 'sandbox') {
                        data.companytoken = getGatewaySetting[0].companytoken;
                        data.endpoint = getGatewaySetting[0].endpoint;
                        data.servicetype = getGatewaySetting[0].servicenumber;
                    } else {
                        data.companytoken = getGatewaySetting[0].livecompanytoken;
                        data.endpoint = getGatewaySetting[0].liveendpoint;
                        data.servicetype = getGatewaySetting[0].liveservicenumber;

                    }
                    if (!data.companytoken) {
                        reject({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                    }
                    if (!data.endpoint) {
                        reject({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                    }
                    if (!data.servicetype) {
                        reject({ status: false, error: 'SETUP_PAYMENT_SETTING_FIRST' });
                    }
                    let todaydate = Date.now()
                    let servicedate = momentz.tz(todaydate, store.timezone).format("YYYY/MM/DD HH:mm");
                    let chargeData = {
                        companytoken: data.companytoken,
                        currency: data.currency,
                        amount: tipAmount,
                        endpoint: data.endpoint,
                        servicetype: data.servicetype,
                        servicedescription: "User create service",
                        servicedate: servicedate
                    }
                    paymentMiddleware.dpoCreatePayment(chargeData, async (response) => {
                        if (!response.status) {
                            reject({ status: false, error: response.message });
                        }
                        else {
                            let carddata = {
                                companytoken: data.companytoken,
                                endpoint: data.endpoint,
                                transactiontoken: response.data.TransToken,
                                paymentSourceRef: getOrder.paymentSourceRef
                            }
                            paymentMiddleware.chargebycard(carddata, async (cdres) => {
                                if (!cdres.status) {
                                    let cancelrequest = {
                                        companytoken: data.companytoken,
                                        endpoint: data.endpoint,
                                        transactiontoken: response.data.TransToken
                                    }
                                    paymentMiddleware.dpoCancelPayment(cancelrequest, async (cancelres) => {
                                        if (!cancelres.status) {
                                            console.log("trip dpo cancel request error  message---", cancelres.message)
                                        }
                                        else {
                                            console.log("trip dpo request cancelled", cancelres)
                                        }
                                    })
                                    reject({ status: false, error: cdres.message });
                                }
                                else {

                                    console.log("DPO tip charge Successfull ress!");
                                    await Order.findByIdAndUpdate(getOrder._id, { tipType: tipType, tip: tip, tipAmount: tipAmount });
                                    await Transaction.tipTransactionByCystomerToDriver(tipAmount, getOrder);
                                    resolve(response)

                                    console.log("trip charge by card data---", cdres)

                                }
                            })
                        }
                    })
                }
                else if (getOrder.paymentMethod === "flutterwave") {

                    if (store.paymentMode === 'sandbox') {
                        data.secretKey = getGatewaySetting[0].sandboxSecretKey;
                        data.pubKey = getGatewaySetting[0].sandboxPublishabelKey;
                    } else {
                        data.secretKey = getGatewaySetting[0].liveSecretKey;
                        data.pubKey = getGatewaySetting[0].livePublishabelKey;
                    }
                    if (getOrder.paymentSourceRef && getOrder.paymentSourceRef != "flutterwave") {

                        let chargeData = {
                            cost: tipAmount,
                            paymentSourceRef: getOrder.paymentSourceRef,
                            secretKey: data.secretKey,
                            pubKey:data.pubKey,
                            currency: data.currency
                        }
                        paymentMiddleware.paymentChargebyFlutterwave(chargeData, async (response) => {
                            if (!response.status) {
                                console.log("Flutterwave tip charge err!", response);
                                reject("Flutterwave tip charge err!")
                            } else {
                                console.log("response.status for tip", response.response.status);
                                if (response.response.status != "successful") {
                                    console.log("Payment failed")
                                    reject(response.response, response.response.status);
                                }
                                else {
                                    console.log("Flutterwave tip charge Successfull ress!");
                                    await Order.findByIdAndUpdate(getOrder._id, { tipType: tipType, tip: tip, tipAmount: tipAmount });
                                    await Transaction.tipTransactionByCystomerToDriver(tipAmount, getOrder);
                                    resolve(response)
                                }
                            }
                        })
                    }
                    else {
                        console.log("Flutterwave tip charge err!!", getOrder.paymentSourceRef)
                        reject("Direct Flutterwave not support for tip")
                    }

                }
                else if (getOrder.paymentMethod === "wallet") {

                    if (!getOrder.user.wallet) throw new Error("PLEASE_ADD_MONEY_TO_WALLET");
                    if (getOrder.user.wallet < tipAmount) throw new Error("WALLET_BALANCE_IS_LOW");

                    let wallet = helper.roundNumber(getOrder.user.wallet - tipAmount);
                    User.updateUserProfile({ _id: getOrder.user._id, wallet: wallet }, async (err, response) => {
                        if (err) {
                            console.log("Wallet tip charge err!", response)
                            reject("Wallet tip charge err!")
                        } else {
                            console.log("Wallet tip charge Successfull ress!");
                            await Order.findByIdAndUpdate(getOrder._id, { tipType: tipType, tip: tip, tipAmount: tipAmount });
                            await Transaction.tipTransactionByCystomerToDriver(tipAmount, getOrder);
                            resolve(response)
                        }
                    });

                }
                else {
                    reject(getOrder.paymentMethod + " payment not supported")
                }
            } catch (error) {
                console.log("chargeTipFromCustomer", error);
                reject(error)
            }
        })

    },

    updateUserAvgRating: async (user, reviewId) => {

        Review.aggregate([
            {
                "$match": {
                    $and: [{ rating: { "$exists": true, "$gt": 0 } },
                    { reviewed_to: ObjectId(user._id) }
                    ]
                }
            },
            { $group: { _id: "$reviewed_to", average_rating: { $avg: "$rating" } } }
        ]
            , (err, resdata) => {
                if (err) {
                    console.log("error in finding product avg,rating!");
                } else {

                    let reviewDetails = {
                        _id: user._id,
                        reviewId: reviewId,
                        avgRating: helper.roundNumber(resdata[0].average_rating),
                        reviewCount: user.reviewCount + 1
                    }
                    User.updateReviewDetails(reviewDetails, (err, result) => {
                        if (err) {
                            console.log("Unable to update review!")
                        } else {
                            console.log("Product rating updated!")
                            return result;

                        }
                    });
                }
            });
    }
}