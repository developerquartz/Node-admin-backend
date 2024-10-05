const { addDispute } = require('./rules');
const { validateRule } = require('./validator');
const utilityFunc = require('../utility/functions');

let addDisputeValidate = (req, res, next) => {
    try {
        req.logType = {
            module: 'orderDispute',
            function: 'addDisputeValidate'
        }
        let payload = req.body;
        let createOrderRules = addDispute();
        let validateCreateTrip = validateRule(createOrderRules, payload);

        if (validateCreateTrip) {
            next();
        }
    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}


module.exports = {
    addDisputeValidate
}

