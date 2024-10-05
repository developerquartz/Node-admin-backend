
let addPackageValidation = () => {

    let rules = [
        { name: 'name', type: 'string', required: true, message: 'NAME_IS_REQUIRED' },
        { name: 'image', type: 'array', required: true, message: 'IMAGE_IS_REQUIRED' },
        { name: 'features', type: 'array', required: true, message: 'FEATURES_IS_REQUIRED' },
        { name: 'price', type: 'number', required: true, message: 'PRICE_IS_REQUIRED' },
        { name: 'vendor', type: 'objectid', required: true, message: 'VENDOR_IS_REQUIRED' },
    ];

    return rules;
}
let addVendorValidation = () => {

    let rules = [
        { name: 'name', type: 'string', required: true, message: 'NAME_IS_REQUIRED' },
        { name: 'address', type: 'string', required: true, message: 'ADDRESS_IS_REQUIRED' },
        { name: 'email', type: 'string', required: true, message: 'EMAIL_IS_REQUIRED' },
        { name: 'mobileNumber', type: 'string', required: true, message: 'MOBILE_NUMBER_IS_REQUIRED' },
        { name: 'countryCode', type: 'string', required: true, message: 'COUNTRY_CODE_IS_REQUIRED' },
        { name: 'location', type: 'object', required: true, message: 'LOCATION_IS_REQUIRED' },
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
    addPackageValidation,
    IdValidation,
    updateStatusValidation,
    addVendorValidation
}