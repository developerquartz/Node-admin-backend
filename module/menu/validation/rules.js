const menuConstant = require('../config/constant.json')

let addMenuValidation = () => {

    let rules = [
        { name: 'label', type: 'string', required: true, message: 'LABEL_IS_REQUIRED' },
        { name: 'status', type: 'string', required: true, message: 'STATUS_IS_REQUIRED' },
        { name: 'type', type: 'enum', required: true, message: 'TYPE_IS_REQUIRED',values: menuConstant.menuType, message_enum: "TYPE_INVALID_ENUM_VALUE"  }
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
let addMenuItems = () => {

    let rules = [
        { name: 'label', type: 'string', required: true, message: 'LABEL_IS_REQUIRED' },
        { name: 'status', type: 'string', required: true, message: 'STATUS_IS_REQUIRED' }
        ];

    return rules;
}
let addMenuItemsRule = () => {

    let rules = [
        { name: 'label', type: 'string', required: true, message: 'LABEL_IS_REQUIRED' },
        { name: 'status', type: 'string', required: true, message: 'STATUS_IS_REQUIRED' }
        ];

    return rules;
}
module.exports = {
    addMenuValidation,
    IdValidation,
    updateStatusValidation,
    addMenuItemsRule
}