const fetch = require('node-fetch');


async function paystackTransaction(body_data, callback) {
    let url = "https://api.paystack.co/transaction/initialize"
    let data_obj = {
        "amount": body_data.amount,
        "email": body_data.email,
        "callback_url": body_data.callback_url
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { Authorization: "Bearer " + body_data.secretKey, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    let obj = {}
    if (request.status == 200) {


        callback(true, data)
    }
    else {
        obj.message = data.detail ? data.detail : "Sometning went wrong in Paystackwebview transaction"
        callback(false, obj)
    }
}

module.exports = {
    paystackTransaction
}