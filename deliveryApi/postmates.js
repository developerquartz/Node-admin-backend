const Postmates = require('postmates');

let createDeliveryQuote = async (data, callback) => {

    const postmates = new Postmates(data.customer_id, data.key);

    let delivery = {
        pickup_address: "20 McAllister St, San Francisco, CA",
        dropoff_address: "101 Market St, San Francisco, CA"
    };

    postmates.quote(delivery, callback);
};

module.exports = {
    createDeliveryQuote
};