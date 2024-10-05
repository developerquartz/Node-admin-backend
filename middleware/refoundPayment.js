const Order = require('../models/ordersTable');
const User = require('../models/userTable');
const Store = require('../models/storeTable');
const Transaction = require("../helper/transaction");
const paymentMiddleware = require('./payments');
module.exports = {
    refundamountTouser: async (getOrder) => {
        module.exports.checkorderstatus(getOrder, async ({ refundAmount }) => {
            console.log("refundAmount:", refundAmount)
            if (!refundAmount) return;
            const data = {}
            data.storeId = getOrder.storeType.store;
            const getStoreType = await Store.getStorePaymentSettingAsync(data.storeId);
            const getGatewaySetting = getStoreType.paymentSettings.filter(payment => {
                return payment.payment_method === getOrder.paymentMethod;
            });
            if (getOrder.paymentMethod === "stripe") {

                if (getStoreType.paymentMode === 'sandbox') {
                    data.secretKey = getGatewaySetting[0].sandboxSecretKey;
                } else {
                    data.secretKey = getGatewaySetting[0].liveSecretKey;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    secretKey: data.secretKey,
                    chargeId: getOrder.transactionDetails.id,
                    amount: refundAmount
                }

                paymentMiddleware.processStripeRefund(chargeData, (response) => {
                    if (response.status) {
                        console.log("Stripe Refund Successfull ress!");
                    } else {
                        console.log("Stripe Error In Refund!")
                    }
                });

            } else if (getOrder.paymentMethod === "paystack") {

                if (getStoreType.paymentMode === 'sandbox') {
                    data.secretKey = getGatewaySetting[0].sandboxSecretKey;
                } else {
                    data.secretKey = getGatewaySetting[0].liveSecretKey;
                }

                let refundObj = {
                    chargeId: getOrder.transactionDetails.id,
                    secretKey: data.secretKey,
                    cost: refundAmount,
                    currency: getOrder.transactionDetails.currency
                }

                paymentMiddleware.refundAmountByPaystack(refundObj, (response) => {
                    if (response.status) {
                        console.log(response.message)
                    }
                    else {
                        console.log("Error In Refund!")
                        console.log(response.message);
                    }
                });

            } else if (getOrder.paymentMethod === "square") {

                if (getStoreType.paymentMode === 'sandbox') {
                    data.secretKey = getGatewaySetting[0].sandboxSecretKey;
                } else {
                    data.secretKey = getGatewaySetting[0].liveSecretKey;
                }

                let chargeData = {
                    secretKey: data.secretKey,
                    paymentId: getOrder.transactionDetails.id,
                    amount: refundAmount
                }

                paymentMiddleware.refundAmountBySquare(chargeData, async (presponse) => {
                    if (presponse.status) {
                        console.log("square Refund Successfull ress!");
                    } else {
                        console.log("square Error In Refund!")
                    }
                });

            } else if (getOrder.paymentMethod === "razorpay") {

                if (getStoreType.paymentMode === 'sandbox') {
                    data.secretKey = getGatewaySetting[0].sandboxKey_secret;
                    data.Key_id = getGatewaySetting[0].sandboxKey_id;
                } else {
                    data.secretKey = getGatewaySetting[0].liveKey_secret;
                    data.Key_id = getGatewaySetting[0].liveKey_id;
                }

                if (data.secretKey && data.Key_id) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let refundData = {
                    payment_id: getOrder.transactionDetails.id,
                    amount: refundAmount,
                    KEY_SECRET: data.secretKey,
                    KEY_ID: data.Key_id
                }

                paymentMiddleware.razorPayrefundPayment(refundData, async (presponse) => {
                    if (presponse.status) {
                        console.log("razorpay Refund Successfull ress!");
                    } else {
                        console.log("razorpay Error In Refund!")
                    }
                });

            } else if (getOrder.paymentMethod === "braintree") {

                if (getStoreType.paymentMode === 'sandbox') {
                    data.merchantId = getGatewaySetting[0].merchantId;
                    data.publicKey = getGatewaySetting[0].publicKey
                    data.privateKey = getGatewaySetting[0].privateKey
                } else {
                    data.merchantId = getGatewaySetting[0].liveKey_merchantId;
                    data.publicKey = getGatewaySetting[0].liveKey_publicKey
                    data.privateKey = getGatewaySetting[0].liveKey_privateKey
                }

                if (data.merchantId && data.publicKey && data.privateKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let refundData = {
                    transactionId: getOrder.transactionDetails.id,
                    merchantId: data.merchantId,
                    publicKey: data.publicKey,
                    privateKey: data.privateKey,
                }

                paymentMiddleware.processRefundByBraintree(refundData, async (presponse) => {
                    if (presponse.status) {

                        console.log("Braintree Refund Successfull ress!");
                    } else {
                        console.log("Braintree Error In Refund!")
                    }
                });

            }
            else if (getOrder.paymentMethod === "flutterwave") {
                if (getStoreType.paymentMode === "sandbox") {
                    data.secretKey = getGatewaySetting[0].sandboxSecretKey;
                    data.pubKey = getGatewaySetting[0].sandboxPublishabelKey;
                } else {
                    data.secretKey = getGatewaySetting[0].liveSecretKey;
                    data.pubKey = getGatewaySetting[0].livePublishabelKey;
                }
                let refundObj = {
                    secretKey: data.secretKey,
                    pubKey: data.pubKey,
                    transactionId: getOrder.transactionDetails.id,
                    cost: refundAmount,
                };
                if (data.secretKey && data.pubKey) {
                    paymentMiddleware.refundAmountByFlutterwave(refundObj, async (response) => {
                        console.log("response:===>", response);
                        if (!response.status) {
                            console.log("In flutterwave refund-- erorr customer cancle");
                            console.log("In flutterwave refund-- erorr msg", response.message);
                            await helper.createSchedule("flutterwave refund", getOrder._id);
                        } else {
                            console.log("In flutterwave refund-- success customer cancle");
                        }
                    }
                    );
                }
            }
            else if (getOrder.paymentMethod === "wallet") {

                body = "Your refund amount added in your wallet";

                let wallet = helper.roundNumber(getOrder.user.wallet + refundAmount);
                User.updateUserProfile({ _id: getOrder.user._id, wallet: wallet }, (err, resdata) => {
                    if (err) {
                        console.log("Wallet Error In Refund!")
                    } else {
                        Transaction.userTransaction(getOrder, getOrder.user, { storeId: getOrder.store._id }, refundAmount, wallet, true);
                        console.log("Wallet Refund Successfull!");
                    }
                });
            }
        })
    },
    checkorderstatus: async (getOrder, responseCallback) => {

        let refundAmount = 0;
        let refundType = null;
        const cancellationArray = getOrder.storeType.cancellationPolicy
        const status = getOrder.orderStatus
        const cancelRfundamount = getOrder.storeType.cancellationPartialRefundAmount;
        const found = cancellationArray.find(element => element.orderStatus == status && element.status);
        if (found) {
            if (found.refundType == 'partial' && cancelRfundamount > 0) {
                refundAmount = helper.roundNumber(getOrder.orderTotal * cancelRfundamount / 100);
            } else if (found.refundType === "full") {
                refundAmount = getOrder.orderTotal;
            }

            refundType = found.refundType;
        }

        responseCallback({ refundAmount: refundAmount, refundType: refundType });
    },


}