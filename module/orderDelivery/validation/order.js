const { createOrder, nearBy, estimateTrip, cancelTripRule } = require('./rules');
const { validateRule } = require('./validator');
const utilityFunc = require('../utility/functions');

let validationCreateOrder = (req, res, next) => {
    try {
        req.logType = {
            module: 'food',
            function: 'validationCreateOrder'
        }
        let payload = req.body;
        let createOrderRules = createOrder();
        let validateCreateTrip = validateRule(createOrderRules, payload);

        if (validateCreateTrip) {
            next();
        }
    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}

let validateNearBy = (req, res, next) => {
    try {
        req.logType = {
            module: 'taxi',
            function: 'nearBy'
        }
        let payload = req.body;
        let nearByRules = nearBy();
        let validateNearBy = validateRule(nearByRules, payload);

        if (validateNearBy) {
            next();
        }
    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}

let validateTripEstimate = (req, res, next) => {
    try {
        req.logType = {
            module: 'taxi',
            function: 'estimateTrip'
        }
        let payload = req.body;
        let estimateTripRules = estimateTrip();
        let validateEstimateTrip = validateRule(estimateTripRules, payload);

        if (validateEstimateTrip) {
            next();
        }
    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}

let cancelTrip = (req, res, next) => {
    try {
        req.logType = {
            module: 'taxi',
            function: 'cancelTripRule'
        }
        let payload = req.body;
        let cancelTripRules = cancelTripRule();
        let validateCancelTrip = validateRule(cancelTripRules, payload);

        if (validateCancelTrip) {
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}

module.exports = {
    validationCreateOrder,
    validateNearBy,
    validateTripEstimate,
    cancelTrip
}

