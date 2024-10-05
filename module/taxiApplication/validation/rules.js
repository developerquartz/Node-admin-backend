
let createTrip = () => {
    // { name: 'distance', type: 'number', required: true, message: 'ESTIMATED_DISTANCE_IS_REQUIRED' },
    let rules = [
        { name: 'estimatedTime', type: 'number', required: true, message: 'ESTIMATED_TIME_IS_REQUIRED' },
        { name: 'vehicleType', type: 'objectid', required: true, message: 'VEHICLE_TYPE_IS_REQUIRED' },
        { name: 'pickUp', type: 'object', required: true, message: 'PICKUP_LOCATION_IS_REQUIRED' },
        { name: 'dropOff', type: 'object', required: true, message: 'DROPOFF_LOCATION_IS_REQUIRED' },
        { name: 'scheduledType', type: 'enum', required: true, message: 'SCHEDULE_TYPE_IS_REQUIRED', values: ["now", "scheduled"], message_enum: "SCHEDULE_TYPE_INVALID_ENUM_VALUE" },
        { name: 'paymentMethod', type: 'enum', required: true, message: 'PAYMENT_METHOD_IS_REQUIRED', values: ["flutterwave", "stripe", "braintree", "paypal", "razorpay", "orangeMoney", "cod", "wallet", "paystack", "pay360", "moncashbutton", "moncash", "dpo"], message_enum: "PAYMENT_METHOD_INVALID_ENUM_VALUE" },
        { name: 'scheduledDate', type: 'string', required: false, message: 'SCHEDULE_DATE_IS_REQUIRED' },
        { name: 'scheduledTime', type: 'string', required: false, message: 'SCHEDULE_TIME_IS_REQUIRED' },
        { name: 'isPreferredDriver', type: 'enum', required: true, message: 'PREFERRED_DRIVER_STATUS_IS_REQUIRED', values: ["yes", "no"], message_enum: "IS_PREFERRED_DRIVER_INVALID_ENUM" },
        { name: 'preferredDriverId', type: 'objectid', required: false, message: 'PREFERRED_DRIVERID_IS_REQUIRED' },
        { name: 'paymentSourceRef', type: 'objectid', required: false, message: 'PAYMENT_SOURCE_REF_IS_REQUIRED' }
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
let estimateHourlyTrip = () => {
    let rules = [
        { name: 'pickUp', type: 'object', required: true, message: 'PICKUP_LOCATION_IS_REQUIRED' },
        { name: 'totalHours', type: 'number', required: true, message: 'TOTAL_HOURS_IS_REQUIRED' },
        { name: 'rideType', type: 'string', required: true, message: 'RIDE_TYPE_IS_REQUIRED', values: ["hourly"], message_enum: "IS_RIDE_TYPE_INVALID_ENUM" },

    ]
    return rules;
}
let createHourlyTripRules = () => {
    let rules = [
        { name: 'rideType', type: 'string', required: true, message: 'RIDE_TYPE_IS_REQUIRED', values: ["hourly"], message_enum: "IS_RIDE_TYPE_INVALID_ENUM" },
        { name: 'vehicleType', type: 'objectid', required: true, message: 'VEHICLE_TYPE_IS_REQUIRED' },
        { name: 'pickUp', type: 'object', required: true, message: 'PICKUP_LOCATION_IS_REQUIRED' },
        { name: 'scheduledType', type: 'enum', required: true, message: 'SCHEDULE_TYPE_IS_REQUIRED', values: ["now", "scheduled"], message_enum: "SCHEDULE_TYPE_INVALID_ENUM_VALUE" },
        { name: 'paymentMethod', type: 'enum', required: true, message: 'PAYMENT_METHOD_IS_REQUIRED', values: ["flutterwave", "stripe", "braintree", "paypal", "razorpay", "orangeMoney", "cod", "wallet", "paystack", "pay360", "moncashbutton", "moncash", "dpo"], message_enum: "PAYMENT_METHOD_INVALID_ENUM_VALUE" },
        { name: 'scheduledDate', type: 'string', required: false, message: 'SCHEDULE_DATE_IS_REQUIRED' },
        { name: 'scheduledTime', type: 'string', required: false, message: 'SCHEDULE_TIME_IS_REQUIRED' },
        { name: 'isPreferredDriver', type: 'enum', required: true, message: 'PREFERRED_DRIVER_STATUS_IS_REQUIRED', values: ["yes", "no"], message_enum: "IS_PREFERRED_DRIVER_INVALID_ENUM" },
        { name: 'preferredDriverId', type: 'objectid', required: false, message: 'PREFERRED_DRIVERID_IS_REQUIRED' },
        { name: 'paymentSourceRef', type: 'objectid', required: false, message: 'PAYMENT_SOURCE_REF_IS_REQUIRED' },
        { name: 'totalHours', type: 'number', required: true, message: 'TOTAL_HOURS_IS_REQUIRED' },

    ]
    return rules;
}
let cancelTripRule = () => {
    let rules = [
        { name: '_id', type: 'objectid', required: true, message: 'ID_IS_REQUIRED' }
    ]
    return rules;
}
let createPackageTripRules = () => {
    let rules = [
        { name: 'rideType', type: 'string', required: true, message: 'RIDE_TYPE_IS_REQUIRED', values: ["normal"], message_enum: "IS_RIDE_TYPE_INVALID_ENUM" },
        { name: 'packageId', type: 'objectid', required: true, message: 'PACKAGE_ID_IS_REQUIRED' },
        { name: 'pickUp', type: 'object', required: true, message: 'PICKUP_LOCATION_IS_REQUIRED' },
        { name: 'scheduledType', type: 'enum', required: true, message: 'SCHEDULE_TYPE_IS_REQUIRED', values: ["now", "scheduled"], message_enum: "SCHEDULE_TYPE_INVALID_ENUM_VALUE" },
        { name: 'paymentMethod', type: 'enum', required: true, message: 'PAYMENT_METHOD_IS_REQUIRED', values: ["flutterwave", "stripe", "braintree", "paypal", "razorpay", "orangeMoney", "cod", "wallet", "paystack", "pay360", "moncashbutton", "moncash", "dpo"], message_enum: "PAYMENT_METHOD_INVALID_ENUM_VALUE" },
        { name: 'scheduledDate', type: 'string', required: false, message: 'SCHEDULE_DATE_IS_REQUIRED' },
        { name: 'scheduledTime', type: 'string', required: false, message: 'SCHEDULE_TIME_IS_REQUIRED' },
        { name: 'paymentSourceRef', type: 'objectid', required: false, message: 'PAYMENT_SOURCE_REF_IS_REQUIRED' },
    ]
    return rules;
}
module.exports = {
    createTrip,
    nearBy,
    estimateTrip,
    cancelTripRule,
    estimateHourlyTrip,
    createHourlyTripRules,
    createPackageTripRules
}