const axios = require('axios');
const Order = require('../../models/ordersTable');
const User = require('../../models/userTable');
const ObjectId = require('objectid');
const paymentMiddleware = require('../../middleware/payments');
const settingService = require('../../helper/settingService');
const Transaction = require("../../helper/transaction");
const productService = require('../../helper/productService');
module.exports = (agenda) => {
    agenda.define('check order status', { priority: 'high', concurrency: 10 }, async function (job, done) {
        done();
        let data = job.attrs.data;
        console.log("cron data", data);
        try {
            if (data.orderId) {
                let refundTotal = 0
                const getOrder = await Order.getOrderByIdAsync(data.orderId);
                //console.log("cron getOrder", getOrder);
                if (getOrder && getOrder.orderStatus != 'rejected') {
                    refundTotal = await checkrefundAmount(getOrder)
                }
                else {
                    refundTotal = getOrder.orderTotal
                }

                if (getOrder != null) {

                    if (getOrder.orderStatus === 'pending' || getOrder.orderStatus === 'rejected') {

                        let orderstatus = getOrder.orderStatus === 'pending' ? 'cancelled' : 'rejected'
                        const updateOrder = await Order.findOneAndUpdate({ _id: ObjectId(data.orderId) }, { orderStatus: orderstatus })
                            .populate({ path: 'user', select: 'wallet' })
                            .exec();

                        let title = getOrder.orderStatus === 'pending' ? __('ORDER_CANCELLED') : __('ORDER_REJECTED')
                        let body = __('ORDER_REFUND_CUSTOMER')//await helper.getTerminologyData({ lang: "en", storeId: updateOrder.store, constant: "ORDER_REFUND_CUSTOMER", type: "order" });

                        data.storeId = updateOrder.store;
                        data.payment_method = updateOrder.paymentMethod;
                        productService.manageProductStock(getOrder.line_items, true);

                        if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
                            data.payment_method = "braintree";
                        }

                        let checkPayment = await settingService.chekPaymentSetting(data);
                        data = { ...data, ...checkPayment.paymentSettings };
                        data.paymentMode = checkPayment.paymentMode;

                        if (data.payment_method === "stripe") {

                            if (data.paymentMode === 'sandbox') {
                                data.secretKey = data.sandboxSecretKey;
                            } else {
                                data.secretKey = data.liveSecretKey;
                            }

                            if (data.secretKey) {
                                paymentMiddleware.processStripeRefund({ secretKey: data.secretKey, chargeId: updateOrder.transactionDetails.id, amount: refundTotal }, async (presponse) => {
                                    if (presponse.status) {
                                        console.log("Stripe Refund Successfull ress!");
                                    } else {
                                        console.log("Stripe Error In Refund!")
                                    }
                                });
                            }
                        } else if (data.payment_method === "square") {

                            if (data.paymentMode === 'sandbox') {
                                data.secretKey = data.sandboxSecretKey;
                            } else {
                                data.secretKey = data.liveSecretKey;
                            }

                            if (data.secretKey) {

                                paymentMiddleware.refundAmountBySquare({ secretKey: data.secretKey, paymentId: updateOrder.transactionDetails.id, amount: refundTotal }, async (presponse) => {
                                    if (presponse.status) {
                                        console.log("Stripe Refund Successfull ress!");
                                    } else {
                                        console.log("Stripe Error In Refund!")
                                    }
                                });
                            }
                        }
                        else if (data.payment_method === "razorpay") {

                            if (data.paymentMode === 'sandbox') {
                                data.secretKey = data.sandboxKey_secret;
                                data.Key_id = data.sandboxKey_id;
                            } else {
                                data.secretKey = data.liveKey_secret;
                                data.Key_id = data.liveKey_id;
                            }

                            if (data.secretKey && data.Key_id) {
                                let refundData = {
                                    payment_id: updateOrder.transactionDetails.id,
                                    amount: refundTotal,
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
                            }
                        } else if (data.payment_method === "braintree") {

                            data.transactionId = updateOrder.transactionDetails.transaction.id;

                            paymentMiddleware.processRefundByBraintree(data, async (presponse) => {
                                if (presponse.status) {

                                    console.log("Braintree Refund Successfull ress!");
                                } else {
                                    console.log("Braintree Error In Refund!")
                                }
                            });

                        } else if (data.payment_method === "paystack") {
                            data.transactionId = updateOrder.transactionDetails.id;
                            let refundObj = {
                                chargeId: data.transactionId,
                                secretKey: data.secretKey,
                                cost: refundTotal,
                                currency: updateOrder.transactionDetails.currency
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

                        }
                        else if (data.payment_method === "pay360") {

                            if (data.paymentMode === 'sandbox') {
                                data.secretKey = data.secretKey;
                                data.isv_id = data.isvId;
                                data.merchantId = data.merchantId;
                                data.pay360BaseUrl = data.pay360BaseUrl ? data.pay360BaseUrl : env.pay360BaseUrl;
                            } else {

                                data.secretKey = data.livesecretKey;
                                data.isv_id = data.liveisvId;
                                data.merchantId = data.livemerchantId;
                                data.pay360BaseUrl = data.livepay360BaseUrl ? data.livepay360BaseUrl : env.pay360BaseUrl;

                            }

                            if (data.secretKey && data.isv_id) {
                                let refundData = {
                                    amount: refundTotal,
                                    JWT: data.secretKey,
                                    ISV_ID: data.isv_id,
                                    transactionId: updateOrder.transactionDetails.transactionId,
                                    pay360BaseUrl: data.pay360BaseUrl
                                }
                                paymentMiddleware.refundPay360(refundData, async (presponse) => {
                                    if (presponse.status) {
                                        console.log("pay360 Refund Successfull ress!");
                                    } else {
                                        console.log("pay360 Error In Refund!")
                                    }
                                });
                            }
                        } else if (data.payment_method === "dpo") {

                            if (!updateOrder.transactionDetails) {
                                return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                            }

                            if (getStore.paymentMode === 'sandbox') {
                                data.companytoken = data.companytoken;
                                data.endpoint = data.endpoint;
                                data.servicetype = data.servicenumber;
                            } else {
                                data.companytoken = data.livecompanytoken;
                                data.endpoint = data.liveendpoint;
                                data.servicetype = data.liveservicenumber;
                            }
                            if (!data.companytoken) {
                                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                            }
                            if (!data.endpoint) {
                                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                            }
                            if (!data.servicetype) {
                                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                            }

                            let refundData = {
                                amount: data.amount,
                                companytoken: data.companytoken,
                                endpoint: data.endpoint,
                                transactiontoken: updateOrder.transactionDetails.transactionId,
                                refundDetails: updateOrder.transactionDetails.refundDetails
                            }

                            paymentMiddleware.dpoRefundPayment(refundData, async (response) => {
                                if (!response.status) {
                                    console.log("err in refund Dpo", response.message)
                                    // res.json(helper.showDpoErrorResponse(response.message));
                                }
                                else {
                                    console.log("Dpo Refund Successfull ress!");
                                }
                            })
                        }
                        else if (data.payment_method === "flutterwave") {
                            if (data.paymentMode === 'sandbox') {
                                data.secretKey = data.sandboxSecretKey;
                                data.pubKey = data.sandboxPublishabelKey;
                            } else {
                                data.secretKey = data.liveSecretKey;
                                data.pubKey = data.livePublishabelKey;
                            };

                            let refundObj = {
                                secretKey: data.secretKey,
                                pubKey: data.pubKey,
                                transactionId: updateOrder.transactionDetails.id,
                                cost: refundTotal
                            }
                            console.log("refundObj driver:===>", refundObj)
                            if (data.secretKey && data.pubKey) {
                                paymentMiddleware.refundAmountByFlutterwave(refundObj, async (response2) => {
                                    console.log("response2:===>", response2);
                                    if (!response2.status) {
                                        console.log("In flutterwave refund-- eerr cron driver orderStatus");
                                        await helper.createSchedule('flutterwave refund', getOrder._id);
                                    }
                                    else {

                                        console.log("In flutterwave refund-- success cron driver orderStatus")
                                    }
                                })
                            }
                        }
                        else if (data.payment_method === "wallet" || data.payment_method === "moncash") {

                            body = __('REFUND_ADDTO_WALLET')

                            let wallet = helper.roundNumber(updateOrder.user.wallet + refundTotal);
                            await Transaction.userTransaction(getOrder, getOrder.user, { storeId: getOrder.store._id }, refundTotal, wallet, true);
                            User.updateUserProfile({ _id: updateOrder.user._id, wallet: wallet }, (err, resdata) => {
                                if (err) {
                                    console.log("Wallet Error In Refund!")
                                } else {
                                    console.log("Wallet Refund Successfull!");
                                }
                            });
                        }

                        try {

                            let socketUrl = env.socketUrlApi + '/request/vendor/cancelled';

                            // Send a POST request
                            let request = await axios({
                                method: 'post',
                                url: socketUrl,
                                data: {
                                    title: title,
                                    body: body,
                                    orderId: updateOrder._id
                                }
                            });

                        } catch (error) {
                            console.log("error socket axios", error);
                        }
                    }
                }
            }
        } catch (error) {
            console.log("cron error", error);
        }
    });
};

async function checkrefundAmount(getOrder) {
    let refundTotal = 0
    if (getOrder.store.storeVersion > 1) {
        let refunddata = await helper.checkorderstatus(getOrder)
        if (refunddata.refundAmount) {
            refundTotal = refunddata.refundAmount
        }
    }
    else {
        refundTotal = getOrder.orderTotal
    }
    return refundTotal
}