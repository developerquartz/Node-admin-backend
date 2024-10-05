
let addDispute = () => {

    let rules = [

        { name: 'disputeWith', type: 'enum', required: true, message: 'DISPUTEWITH_IS_REQUIRED', values: ["driver", "vendor", "serviceProvider"], message_enum: "DISPUTEWITH_INVALID_ENUM_VALUE" },
        { name: 'status', type: 'enum', required: true, message: 'STATUS_IS_REQUIRED', values: ["open", "closed", "cancelled"], message_enum: "STATUS_INVALID_ENUM_VALUE" },
        { name: 'orderId', type: 'objectid', required: true, message: 'ORDER_ID_IS_REQUIRED' },
        { name: 'reason', type: 'string', required: true, message: 'REASON_IS_REQUIRED' },
        { name: 'description', type: 'string', required: true, message: 'DESCRIPTION_IS_REQUIRED' },
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
    addDispute,
    nearBy,
    estimateTrip,
    cancelTripRule
}