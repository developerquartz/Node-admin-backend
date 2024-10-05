const settingService = require('./settingService');
const Order = require('../models/ordersTable');
const Transaction = require("./transaction");
const paymentMiddleware = require('../middleware/payments');

let stripeCTransfer = async (order) => {
    try {
        let data = {};
        data._id = order._id;

        if (data._id) {
            const getOrder = await Order.findById(data._id, 'orderStatus store storeType paymentMethod transactionDetails vendor driver vendorEarning deliveryBoyEarning deliveryType')
                .populate({ path: 'vendor', select: 'stripeConnect' })
                .populate({ path: 'driver', select: 'stripeConnect' })
                .populate({ path: 'storeType', select: 'storeType' })
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
                    data.storeTypeId = getOrder.storeType._id;

                    //console.log("getOrder", getOrder);

                    if (data.secretKey) {

                        if (!["TAXI", "PICKUPDROP"].includes(getOrder.storeType.storeType)) {

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

                        }

                        if ((getOrder.deliveryType && getOrder.deliveryType == "DELIVERY") || ["TAXI", "PICKUPDROP"].includes(getOrder.storeType.storeType)) {
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
    } catch (error) {
        console.log("err in stripe connect realtime transfer", error);
    }
}

module.exports = {
    stripeCTransfer
}