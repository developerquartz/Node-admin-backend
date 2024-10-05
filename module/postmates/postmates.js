let createDeliveryQuote = (data, callback) => {

    const Postmates = require('postmates');

    const postmates = new Postmates(data.customer_id, data.key);

    let delivery = {
        pickup_address: data.pickup_address,
        dropoff_address: data.dropoff_address
    };

    postmates.quote(delivery, callback);
};

let createDeliveryQuoteAsync = (data, callback) => {

    const Postmates = require('postmates');

    const postmates = new Postmates(data.customer_id, data.key);

    let delivery = {
        pickup_address: data.pickup_address,
        dropoff_address: data.dropoff_address
    };

    console.log("delivery", delivery);

    return postmates.quote(delivery, callback);
};

let createDelivery = async (data, callback) => {

    var delivery = {
        manifest: "a box of kittens",
        pickup_name: "The Warehouse",
        pickup_address: "20 McAllister St, San Francisco, CA",
        pickup_phone_number: "555-555-5555",
        pickup_business_name: "Optional Pickup Business Name, Inc.",
        pickup_notes: "Optional note that this is Invoice #123",
        dropoff_name: "Alice",
        dropoff_address: "101 Market St, San Francisco, CA",
        dropoff_phone_number: "415-555-1234",
        dropoff_business_name: "Optional Dropoff Business Name, Inc.",
        dropoff_notes: "Optional note to ring the bell",
        quote_id: "qUdje83jhdk"
    };

    postmates.new(delivery, function (err, res) {
        // `res.body`
    });
}

module.exports = {
    createDeliveryQuote,
    createDelivery,
    createDeliveryQuoteAsync
};