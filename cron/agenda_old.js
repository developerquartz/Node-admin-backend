const Agenda = require('agenda');
const axios = require('axios');
const Order = require('../models/ordersTable');
const ObjectId = require('objectid');
const paymentMiddleware = require('../middleware/payments');
const User = require('../models/userTable');
const Store = require('../models/storeTable');
const Transaction = require("../helper/transaction");
const File = require('../models/fileTable.js');
const awsimageuploadFromUrl = require('../lib/awsimageuploadFromUrl');
const settingService = require('../helper/settingService');
const Terminology = require('../models/terminologyTable');
//const orderService = require('../helper/orderService');

//****Database connection mongodb using mongoose */
const mongoConnectionString = env.mongoAtlasUri;
var agenda = new Agenda({ db: { address: mongoConnectionString, collection: 'agendaJobs', mongo: { useCreateIndex: true, useFindAndModify: false, useNewUrlParser: true, useUnifiedTopology: true } } });

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

                if (getOrder.orderStatus === 'pending') {

                    let orderstatus = getOrder.orderStatus === 'pending' ? 'cancelled' : 'rejected'
                    const updateOrder = await Order.findOneAndUpdate({ _id: ObjectId(data.orderId) }, { orderStatus: orderstatus })
                        .populate({ path: 'user', select: 'wallet' })
                        .exec();

                    let title = getOrder.orderStatus === 'pending' ? __('ORDER_CANCELLED') : __('ORDER_REJECTED')
                    let body = __('ORDER_REFUND_CUSTOMER')//await helper.getTerminologyData({ lang: "en", storeId: updateOrder.store, constant: "ORDER_REFUND_CUSTOMER", type: "order" });

                    data.storeId = updateOrder.store;
                    data.payment_method = updateOrder.paymentMethod;
                    //orderService.manageProductStock(getOrder.line_items, true);


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
                    }
                    if (data.payment_method === "dpo") {

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
agenda.define('check order status driver', { priority: 'high', concurrency: 10 }, async function (job, done) {
    done();
    let data = job.attrs.data;
    console.log("cron data driver", data);
    try {
        if (data.orderId) {
            // const getOrder = await Order.findById(data.orderId, 'orderStatus isDriverAssign store');
            let refundTotal = 0
            const getOrder = await Order.getOrderByIdAsync(data.orderId);
            // console.log("order status driver", getOrder);
            if (getOrder && getOrder.orderStatus == 'confirmed') {
                refundTotal = await checkrefundAmount(getOrder)
            }

            if (getOrder != null) {

                if (getOrder.orderStatus === 'confirmed' && !getOrder.isDriverAssign) {

                    const updateOrder = await Order.findOneAndUpdate({ _id: ObjectId(data.orderId) }, { orderStatus: "cancelled" })
                        .populate({ path: 'user', select: 'wallet' })
                        .exec();


                    let title = __('ORDER_CANCELLED')
                    let body = __('ORDER_REFUND_CUSTOMER')

                    data.storeId = updateOrder.store;
                    data.payment_method = updateOrder.paymentMethod;

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

                    let socketUrl = env.socketUrlApi + '/request/driver/cancelled';

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
                }
            }
        }
    } catch (error) {
        console.log("cron error", error);
    }
});
agenda.define('checkScheduleDriver', async function (job, done) {
    done();
    console.log("Check Schedule Driver!");
    try {
        const getOrder = await Order.updateMany({ scheduledType: "scheduled", orderStatus: "confirmed", scheduled_utc: { $lt: new Date() } }, { orderStatus: "cancelled" });
    } catch (error) {
        console.log(" Schedule Driver error in agenda", error);
    }
});

agenda.define('order not accepted by driver', { priority: 'high', concurrency: 10 }, async function (job, done) {
    done();
    let data = job.attrs.data;
    console.log("Order not accepted------", data);
    try {
        if (data.orderId) {
            const getOrder = await Order.findById(data.orderId, 'orderStatus isDriverAssign store')
                .populate({ path: "store", select: "api_key" })
                .exec();

            if (getOrder != null) {

                if (getOrder.orderStatus === 'pending' && !getOrder.isDriverAssign) {

                    let apiUrl = env.apiUrl + 'user/cancelorder';

                    // Send a POST request
                    let request = await axios({
                        method: 'post',
                        url: apiUrl,
                        headers: {
                            'cache-control': 'no-cache',
                            "Content-Type": "application/json",
                            "apikey": getOrder.store.api_key
                        },
                        data: {
                            _id: getOrder._id
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.log("cron error", error);
    }
});

agenda.define('check setup store', { priority: 'high', concurrency: 10 }, async function (job, done) {
    done();
    let data = job.attrs.data;
    console.log("store data", data);
    let getStore = await Store.findById(data.storeId)
        .populate({ path: 'storeType', select: 'storeType label storeVendorType status' })
        .populate({ path: 'logo' })
        .populate({ path: 'bannerImage' })
        .populate({ path: 'favIcon' })
        .populate({ path: 'plan.billingPlan' })
        .exec();

    helper.updateConfigStoreSetting(getStore);

    let processTerminology = await Terminology.findOne({ store: data.storeId, type: "customers", lang: "en" }).populate('store', 'domain')
    if (processTerminology)
        await helper.updateTerminologyScript(processTerminology)

});

agenda.define("check_image_url", async (job, done) => {
    console.log("check 3rd party image url and update it on server!");
    // return;

    File.find({ $and: [{ link: { $not: { $regex: "https://mnc.s3.us-east-2.amazonaws.com/" } } }, { link: { $not: { $regex: "https://hlclives3.s3.us-east-2.amazonaws.com/" } } }, { link: { $not: { $regex: "https://hlcstagings3.s3.us-east-2.amazonaws.com/" } } }] })
        .limit(50)
        .then(async getFiles => {
            console.log("getFiles ", getFiles)

            if (getFiles.length <= 0) return done();

            let data = {};

            for (let i = 0; i < getFiles.length; i++) {

                awsimageuploadFromUrl(getFiles[i].link, async (err, result) => {
                    if (err)
                        console.log("error :", err);
                    else {
                        console.log("result :", result)
                        if (result.isCorrupted) {
                            let obj = { key: 'isCorrupted', value: 'yes' }
                            let isCorruptedStatus = false
                            if (getFiles[i].meta_data.length > 0)
                                getFiles[i].meta_data.forEach(element => {
                                    if (element.key == "isCorrupted" && element.value == 'yes')
                                        isCorruptedStatus = true;
                                    return;
                                });
                            if (isCorruptedStatus == false)
                                await File.findByIdAndUpdate(getFiles[i]._id, { $addToSet: { meta_data: obj } })

                            console.log("Image is corrupted");
                        }
                        else {
                            // let obj1 = {key:'isCorrupted',value:'no'}

                            await File.findByIdAndUpdate(getFiles[i]._id,
                                {
                                    $set: {
                                        link: result.Location
                                    }
                                    // ,
                                    // $addToSet: { meta_data:obj1 }
                                })
                        }
                    }

                })

            }

            done()
        }).catch(error => {
            done()
            console.log("Error ", error)
        })
});

agenda.define('online transfer', { priority: 'high', concurrency: 10 }, async function (job, done) {
    let data = job.attrs.data;
    console.log("cron online transfer", data);
    try {
        if (data.id) {
            const getOrder = await Order.findById(data.id, 'orderStatus store storeType paymentMethod transactionDetails vendor driver vendorEarning deliveryBoyEarning deliveryType')
                .populate({ path: 'vendor', select: 'stripeConnect' })
                .populate({ path: 'driver', select: 'stripeConnect' })
                .exec();

            if (getOrder != null) {

                if (getOrder.orderStatus === 'completed' && getOrder.paymentMethod === "stripe") {
                    //console.log("online transfer cron getOrder", getOrder);
                    data.storeId = getOrder.store;
                    data.payment_method = getOrder.paymentMethod;

                    let checkPayment = await settingService.chekPaymentSetting(data);
                    data = { ...data, ...checkPayment.paymentSettings };
                    data.paymentMode = checkPayment.paymentMode;
                    data.currency = checkPayment.currency;

                    if (data.paymentMode === 'sandbox') {
                        data.secretKey = data.sandboxSecretKey;
                    } else {
                        data.secretKey = data.liveSecretKey;
                    }

                    data.store = getOrder.store;
                    data.type = "debit";
                    data.storeTypeId = getOrder.storeType;

                    //console.log("getOrder", getOrder);

                    if (data.secretKey) {

                        if (getOrder.vendor.stripeConnect && getOrder.vendor.stripeConnect.status && getOrder.vendor.stripeConnect.accountId != null) {

                            paymentMiddleware.transferStripeFund({ currency: data.currency, destination: getOrder.vendor.stripeConnect.accountId, secretKey: data.secretKey, source_transaction: getOrder.transactionDetails.id, amount: getOrder.vendorEarning }, async (presponse) => {
                                if (presponse.status) {
                                    console.log("Stripe vendor transfer Successfull ress!");
                                    data.description = 'Transfer with Ref: Account No. ' + getOrder.vendor.stripeConnect.accountId;
                                    data.payment_to = getOrder.vendor._id;
                                    data.userType = "VENDOR";
                                    data.amount = getOrder.vendorEarning;
                                    let addedTransaction = await Transaction.addTransaction(null, data.storeTypeId, data.userType, data.store, data.payment_to, data.amount, data.type, data.description, null, null, null, true);
                                } else {
                                    console.log("Stripe Error In vendor transfer!", presponse.message);
                                }
                            });
                        }

                        if (getOrder.deliveryType == "DELIVERY") {
                            if (getOrder.driver.stripeConnect && getOrder.driver.stripeConnect.status && getOrder.driver.stripeConnect.accountId != null) {

                                paymentMiddleware.transferStripeFund({ currency: data.currency, destination: getOrder.driver.stripeConnect.accountId, secretKey: data.secretKey, source_transaction: getOrder.transactionDetails.id, amount: getOrder.deliveryBoyEarning }, async (presponse) => {
                                    if (presponse.status) {
                                        console.log("Stripe driver transfer Successfull ress!");
                                        data.description = 'Transfer with Ref: Account No. ' + getOrder.driver.stripeConnect.accountId;
                                        data.payment_to = getOrder.driver._id;
                                        data.userType = "DRIVER";
                                        data.amount = getOrder.deliveryBoyEarning;
                                        let addedTransaction = await Transaction.addTransaction(null, data.storeTypeId, data.userType, data.store, data.payment_to, data.amount, data.type, data.description, null, null, null, true);
                                    } else {
                                        console.log("Stripe Error In driver transfer!", presponse.message);
                                    }
                                });
                            }
                        }

                    }

                }
            }
        }

        done();
    } catch (error) {
        console.log("cron online transfer err", error);
    }
});

function graceful() {
    agenda.stop(function () {
        process.exit(0);
    });
}

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);

module.exports = agenda;