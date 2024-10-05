const Order = require('../../models/ordersTable');
const settingService = require('../../helper/settingService');
const paymentMiddleware = require('../../middleware/payments');
const ObjectId = require('objectid');
module.exports = (agenda) => {
    agenda.define('flutterwave refund', { priority: 'high', concurrency: 10 }, async function (job, done) {
        let data = job.attrs.data;
        console.log("cron flutterwave refund", data);
        try {
            if (data.transactionId && data.cost && data.storeId) {
                await refundForNewCardAdded(data);
            } else {
                await refundForOrderBooking(data);
            }

            done();
        } catch (error) {
            console.log("cron flutterwave err", error);
        }
    });
};
async function refundForNewCardAdded(data) {
    try {
        if (data.transactionId && data.cost && data.storeId) {
            data.payment_method = "flutterwave";

            let checkPayment = await settingService.chekPaymentSetting(data);
            data = { ...data, ...checkPayment.paymentSettings };
            data.paymentMode = checkPayment.paymentMode;
            if (data.paymentMode === 'sandbox') {
                data.secretKey = data.sandboxSecretKey;
                data.pubKey = data.sandboxPublishabelKey;
            } else {
                data.secretKey = data.liveSecretKey;
                data.pubKey = data.livePublishabelKey;
            };
            // console.log("crom data flutterwave:==>", data);

            if (data.secretKey && data.pubKey) {
                paymentMiddleware.refundAmountByFlutterwave(data, (response2) => {
                    if (!response2.status) {
                        console.log("In flutterwave refund-- eerr cron")
                    }
                    else {
                        console.log("In flutterwave refund-- success cron")
                    }
                })
            }

        }
    } catch (error) {
        console.log("cron flutterwave new card added refund err", error);
    }

}

async function refundForOrderBooking(data) {
    try {
        if (data.orderId) {
            let refundTotal = 0
            const getOrder = await Order.getOrderByIdAsync(data.orderId);

            if (getOrder && getOrder.orderStatus != 'rejected') {
                refundTotal = await checkrefundAmount(getOrder)
            }
            else {
                refundTotal = getOrder.orderTotal
            }

            if (refundTotal && getOrder != null && ["rejected", "pending", "cancelled"].includes(getOrder.orderStatus)) {

                let orderStatus = getOrder.orderStatus === 'cancelled' ? 'cancelled' : 'rejected';
                const updateOrder = await Order.findOneAndUpdate({ _id: ObjectId(data.orderId) }, { orderStatus });

                data.storeId = updateOrder.store;
                data.payment_method = updateOrder.paymentMethod;

                let checkPayment = await settingService.chekPaymentSetting(data);
                data = { ...data, ...checkPayment.paymentSettings };
                data.paymentMode = checkPayment.paymentMode;
                //console.log("data:===>", data)

                if (data.payment_method === "flutterwave") {
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
                    console.log("refundObj flutterwave refund cron job:===>", refundObj);

                    if (data.secretKey && data.pubKey) {
                        paymentMiddleware.refundAmountByFlutterwave(refundObj, (response2) => {
                            console.log("response2:===>", response2);
                            if (!response2.status) {
                                console.log("In flutterwave refund-- eerr cron")
                            }
                            else {
                                console.log("In flutterwave refund-- success cron")
                            }
                        })
                    }
                }
            }
        }
    } catch (error) {
        console.log("cron flutterwave for orders refund err", error);
    }

}
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