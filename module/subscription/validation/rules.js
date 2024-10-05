
let addPlanValidation = () => {
    let rules = [
        { name: 'name', type: 'string', required: true, message: 'NAME_IS_REQUIRED' },
        { name: 'status', type: 'enum', required: true, message: 'STATUS_IS_REQUIRED', values: ["active", "inactive"], message_enum: "INVALID_STATUS_VALUE" },
        { name: 'features', type: 'array', required: true, message: 'FEATURES_IS_REQUIRED' },
        { name: 'price', type: 'number', required: true, message: 'PRICE_IS_REQUIRED' },
        { name: 'description', type: 'string', required: true, message: 'DESCRIPTION_IS_REQUIRED' },
        { name: 'type', type: 'enum', required: true, message: 'TYPE_IS_REQUIRED', values: ["basic", "premium", "ultimate"], message_enum: "IS_TYPE_INVALID_ENUM" },
        { name: 'interval', type: 'enum', required: true, message: 'INTERVAL_IS_REQUIRED', values: ["month", "semiAnnual", "year"], message_enum: "IS_INTERVAL_INVALID_ENUM" },
    ];

    return rules;
}
let IdValidation = () => {

    let rules = [
        { name: '_id', type: 'objectid', required: true, message: 'ID_IS_REQUIRED' }
    ];

    return rules;
}
let updateStatusValidation = () => {

    let rules = [
        { name: '_id', type: 'array', required: true, message: 'ARRAY_ID_IS_REQUIRED' },
        { name: 'status', type: 'string', required: true, message: 'STATUS_IS_REQUIRED' }
    ];

    return rules;
}

module.exports = {
    addPlanValidation,
    IdValidation,
    updateStatusValidation,
}