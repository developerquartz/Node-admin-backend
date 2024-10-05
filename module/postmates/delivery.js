const postmates = require('./postmates');
const axios = require('axios');
const qs = require('qs');

module.exports.postmatesDeliveryFeeQuote = (data, responseCallback) => {
    postmates.createDeliveryQuote(data, (err, response) => {
        if (response.body.kind === "error") {
            responseCallback({ status: false, message: response.body.message, code: response.statusCode });
        } else {
            responseCallback({ status: true, response: response.body });
        }
    });
}

module.exports.postmatesCreateDelivery = async (data, responseCallback) => {
    postmates.createDelivery(data, (err, response) => {
        if (response.body.kind === "error") {
            responseCallback({ status: false, message: response.body.message, code: response.statusCode });
        } else {
            responseCallback({ status: true, response: response.body });
        }
    });
}

module.exports.postmatesDeliveryFeeQuoteAsync = async (data) => {
    const response = await postmates.createDeliveryQuoteAsync(data);
    console.log("response", response);
    if (response.body.kind === "error") {
        return { status: false, message: response.body.message, code: response.statusCode };
    } else {
        return { status: true, response: response.body };
    }
}

module.exports.getDeliveryQuote = async (data) => {
    try {
        console.log("getDeliveryQuote", data);
        let params = qs.stringify({
            'dropoff_address': data.pickup_address,
            'pickup_address': data.dropoff_address
        });
        let config = {
            method: 'post',
            url: 'https://api.postmates.com/v1/customers/' + data.customer_id + '/delivery_quotes',
            headers: {
                'cache-control': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded'
                //'Authorization': `Basic ${data.key}`
            },
            data: params
        };

        let request = await axios(config);

        return request.data;

    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            //callback(error.response.data, error.response.data);
            return error.response.data;
            //console.log(error.response.status);
            //console.log(error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            //callback(error.request, error.request);
            return error.request;
        } else {
            // Something happened in setting up the request that triggered an Error
            callback(error.message, error.message);
            return error.message;
        }
        //console.log(error.config);
        //callback(error.config)
    }
}