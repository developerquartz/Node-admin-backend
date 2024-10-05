const moncash = require('nodejs-moncash-sdk');

var payment_creator = "";

async function monocashonfigure(data) {
    moncash.configure({
        mode: data.paymentMode,
        client_id: data.secretId,
        client_secret: data.secretKey
    });
    payment_creator = moncash.payment;
}
async function createPayment(data, callback) {
    await monocashonfigure(data);
    //let orderId = Date.now()
    payment_creator.create({ amount: data.amount, orderId: data.orderId }, (error, res) => {
        let obj = {}
        if (error) {
            console.log("in moncash create payment error---", error.response)
            obj.status = error.response.status
            obj.message = error.response.message
            callback(true, obj)
        }
        else {
            let paymenturi = payment_creator.redirect_uri(res)
            if (paymenturi.includes('http')) {
                obj.redirectUrl = paymenturi.replace('http:', '')
            }
            else {
                obj.redirectUrl = paymenturi
            }
            callback(false, obj)

        }

    })

}
async function capturePayment(data, callback) {
    await monocashonfigure(data);
    moncash.capture.getByTransactionId(data.transaction_id, (error, res) => {
        let obj = {}
        if (error) {
            console.log("in moncash verify transaction error---", error.response)
            obj.status = error.response.status
            obj.message = error.response.message
            callback(true, obj)
        }
        else {
            callback(false, res)
        }

    });
}

module.exports = {
    createPayment,
    capturePayment
}