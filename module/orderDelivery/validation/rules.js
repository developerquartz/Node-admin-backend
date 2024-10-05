
let createOrder = () => {

    let rules = [

        { name: 'scheduledType', type: 'enum', required: true, message: 'SCHEDULE_TYPE_IS_REQUIRED', values: ["now", "scheduled"], message_enum: "SCHEDULE_TYPE_INVALID_ENUM_VALUE" },
        { name: 'deliveryType', type: 'enum', required: true, message: 'DELIVERY_TYPE_IS_REQUIRED', values: ["DELIVERY"], message_enum: "DELIVERY_TYPE_INVALID_ENUM_VALUE"},
        { name: 'payment_method', type: 'enum', required: true, message: 'PAYMENT_METHOD_IS_REQUIRED', values: ["stripe", "paypal", "razorpay", "orangeMoney", "cod", "wallet"], message_enum: "PAYMENT_METHOD_INVALID_ENUM_VALUE" },
        { name: 'paymentSourceRef', type: 'objectid', required: true, message: 'PAYMENT_ID_IS_REQUIRED' },
        { name: 'storeTypeId', type: 'objectid', required: true, message: 'STORE_TYPE_ID_IS_REQUIRED' },
        { name: 'vendor', type: 'string', required: false, message: 'VENDOR_IS_REQUIRED' },
        { name: 'scheduledDate', type: 'string', required: false, message: 'SCHEDULE_DATE_IS_REQUIRED' },
        { name: 'scheduledTime', type: 'string', required: false, message: 'SCHEDULE_TIME_IS_REQUIRED' },
        { name: 'pickupTimezone', type: 'string', required: false, message: 'SCHEDULE_PICKUP_TIMEZONE_IS_REQUIRED' },

        { name: 'items', type: 'array', required: true, message: 'ITEMS_IS_REQUIRED' },
        
         ];

    return rules;
}

let nearBy = () => {
    let rules = [
        { name: 'source', type: 'object', required: true, message: 'PICKUP_LOCATION_IS_REQUIRED' }
    ]
    return rules;
}

let estimateTrip = () => {
    let rules = [
        { name: 'pickUp', type: 'object', required: true, message: 'PICKUP_LOCATION_IS_REQUIRED' },
        { name: 'dropOff', type: 'object', required: true, message: 'DROPOFF_LOCATION_IS_REQUIRED' }
    ]
    return rules;
}

let cancelTripRule = () => {
    let rules = [
        { name: '_id', type: 'objectid', required: true, message: 'ID_IS_REQUIRED' }
    ]
    return rules;
}

module.exports = {
    createOrder,
    nearBy,
    estimateTrip,
    cancelTripRule
}