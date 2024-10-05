const axios = require('axios');
const qs = require('qs');

module.exports.getAccessToken = async (data, callback) => {
    try {
        const params = { "grant_type": "client_credentials" };

        let request = await axios({
            method: 'post',
            url: env.orangeMoneyAuthUrl,
            headers: {
                'cache-control': 'no-cache',
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${data.consumerKey}`
            },
            data: qs.stringify(params)
        });

        callback(null, request.data);

    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            callback(error.response.data, error.response.data);
            //console.log(error.response.status);
            //console.log(error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            callback(error.request, error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            callback(error.message, error.message);
        }
        //console.log(error.config);
        //callback(error.config)
    }
}

module.exports.paymentRequest = async (data, callback) => {

    let currency = "OUV";
    let TURL = env.orangeMoneyTransactionUrl;

    if (data.paymentMode === "live") {
        currency = data.currency;
        TURL = env.orangeMoneyLiveTransactionUrl;
    }

    let cData = {
        "merchant_key": data.merchantKey,
        "currency": currency,
        "order_id": data.customOrderId.toString(),
        "amount": Number(data.amount),
        "return_url": data.return_url,
        "cancel_url": data.return_url,
        "notif_url": data.notif_url,
        "lang": "en",
        "reference": data.storeName
    }

    console.log("cData", cData);

    try {

        let request = await axios({
            method: 'post',
            url: TURL,
            headers: {
                'cache-control': 'no-cache',
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.access_token}`
            },
            data: cData
        });

        callback(null, request.data);

    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            callback(error.response.data, error.response.data);
            //console.log(error.response.status);
            //console.log(error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            callback(error.request, error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            callback(error.message, error.message);
        }
        //console.log(error.config);
        //callback(error.config)
    }

}