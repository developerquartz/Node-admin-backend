const ObjectId = require('objectid')


let validateRule = (rules, payload) => {
    let flag = false;
    let message = '';
    let error_description = '';

    if (payload) {

        for (let index = 0; index < rules.length; index++) {
            let rule = rules[index];
            if ((payload[rule.name] == undefined || !payload[rule.name]) && rule.required) {
                message = rule.message;
                error_description = 'Validation Error!';
                flag = true;
                break;
            } else if (!['array','objectid','enum'].includes(rule.type) && typeof payload[rule.name] !== rule.type) {
                message = "INVALID_DATA_TYPE";
                error_description = 'Missing Params or Params data type error!';
                flag = true;
                break;
            }  else if (rule.type == 'array' && !Array.isArray(payload[rule.name])) {
                message = "INVALID_DATA_TYPE";
                error_description = 'Missing Params or Params data type error!';
                flag = true;
                break;
            } else if (rule.type == 'objectid' && payload[rule.name] &&!ObjectId.isValid(payload[rule.name])) {
                message = "INVALID_DATA_TYPE";
                error_description = 'Missing Params or Params data type error!';
                flag = true;
                break;
            } else if (rule.type == 'enum' &&  payload[rule.name] && !rule.values.includes(payload[rule.name])) {
                message = "INVALID_DATA_TYPE";
                error_description = 'Missing Params or Params data type error!';
                flag = true;
                break;
            } 
        }

        if (flag) {
            let err = new Error(message);
            err.error_description = error_description;
            throw err;
        }

    } else {
        let err = new Error('NO_PAYLOAD_DATA');
        err.error_description = error_description;
        throw err;
    }

    return true;
}


module.exports = {
    validateRule
}