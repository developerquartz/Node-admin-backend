const { addPlanValidation, IdValidation, updateStatusValidation } = require('./rules');
const { validateRule } = require('./validator');
const utilityFunc = require('../utility/functions');

let addAndUpdatePlan = async (req, res, next) => {
    try {
        req.logType = {
            module: 'subscription',
            function: 'validateAddPlan'
        }
        let payload = req.body;
        let rule = addPlanValidation();
        let validateAddPlan = validateRule(rule, payload);

        if (validateAddPlan) {
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
let objectIdValidation = async (req, res, next) => {
    try {

        req.logType = {
            module: 'subscription',
            function: 'checkIdValidation'
        }

        let payload = { "_id": req.params._id };
        let rule = IdValidation();
        let validateId = validateRule(rule, payload);
        if (validateId) {
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
let updateStatus = async (req, res, next) => {
    try {
        let payload = req.body

        req.logType = {
            module: 'subscription',
            function: 'updateStatusValidation'
        }

        let updateStatusValidationRule = updateStatusValidation();
        let isPassedValidation = validateRule(updateStatusValidationRule, payload);
        if (isPassedValidation) {
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
module.exports = {
    addAndUpdatePlan,
    IdValidation: objectIdValidation,
    updateStatus
}