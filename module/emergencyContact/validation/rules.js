
let addContact = () => {
    let rules = [
        { name: 'name', type: 'string', required: true, message: 'NAME_IS_REQUIRED' },
        { name: 'countryCode', type: 'string', required: true, message: 'COUNTRY_CODE_IS_REQUIRED' },
        { name: 'mobileNumber', type: 'string', required: true, message: 'MOBILE_NUMBER_IS_REQUIRED' }
    ]
    return rules;
}
module.exports = {
    addContact
}