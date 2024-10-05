const Flutterwave = require('flutterwave-node-v3');
function paymenthandlerCharge(data, callback) {
    const payload = {
        "token": data.authorization_code,
        "currency": data.currency,
        "amount": data.amount,
        "email": data.email,
        "tx_ref": "MC" + Math.random().toString(36).substring(2, 12).toUpperCase(),
        enckey: data.enckey,
    }
    const flw = new Flutterwave(data.pubKey, data.secretKey);

    flw.Tokenized.charge(payload).then((res) => {
        console.log(res);
        if (res.data && res.data.status === "successful") {
            // Success! Confirm the customer's payment
            callback(true, res)

        } else {
            // Inform the customer their payment was unsuccessful
            callback(false, res)
        }
    }).catch((error) => {
        callback(false, error)
    });


}

function refundAmount(data, callback) {
    const flw = new Flutterwave(data.pubKey, data.secretKey);

    const payload = {
        "id": data.transaction.toString(),
        "amount": data.cost
    }
    flw.Transaction.refund(payload).then((res) => {
        console.log(res);
        if (res.status === "success") {
            callback(true, res)
        } else {
            callback(false, res)
        }
    }).catch((error) => {
        callback(false, error)
    });
}

function verifyPayemnt(data, callback) {
    const flw = new Flutterwave(data.pubKey, data.secretKey);
    flw.Transaction.verify({ id: data.transaction }).then((res) => {
        console.log("verifyPayemnt", res);
        if (res.data.status === "successful") {
            // Success! Confirm the customer's payment
            callback(true, res)

        } else {
            // Inform the customer their payment was unsuccessful
            callback(false, res)
        }
    }).catch((error) => {
        callback(false, error)
    });
}

module.exports = {
    paymenthandlerCharge,
    refundAmount,
    verifyPayemnt
}
