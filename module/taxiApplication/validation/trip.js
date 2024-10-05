const { createTrip, nearBy, estimateTrip, cancelTripRule, estimateHourlyTrip, createHourlyTripRules, createPackageTripRules } = require('./rules');
const { validateRule } = require('./validator');
const utilityFunc = require('../utility/functions');

let validationCreateTrip = (req, res, next) => {
    try {
        req.logType = {
            module: 'taxi',
            function: 'validationCreateTrip'
        }
        let payload = req.body;
        console.log("payload===>", JSON.stringify(payload))
        let storeTypeDetails = req.storeTypeDetails;
        let validateCreateTrip;
        let createTripRules = createTrip();
        let validateByHoursTrips = createHourlyTripRules();
        if (storeTypeDetails.multiDropsSettings) {
            return next();
        } else if (payload.rideType === "hourly") {
            validateCreateTrip = validateRule(validateByHoursTrips, payload);
        }
        else {
            validateCreateTrip = validateRule(createTripRules, payload);
        }

        if (validateCreateTrip) {
            next();
        }
    } catch (error) {
        console.log("error :", error);
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
        let storeTypeDetails = req.storeTypeDetails;
        let payload = req.body;
        console.log("Eastimate cost payload===>", JSON.stringify(payload))
        let estimateTripRules = estimateTrip();
        let estimateTripRulesForHourlyTrip = estimateHourlyTrip();
        if (storeTypeDetails.multiDropsSettings) {
            return next();
        }
        let validateEstimateTrip;
        if (payload.rideType == "hourly") {
            validateEstimateTrip = validateRule(estimateTripRulesForHourlyTrip, payload);
        }
        else {
            validateEstimateTrip = validateRule(estimateTripRules, payload);
        }
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
};
let validationPackageTrip = (req, res, next) => {
    try {
        req.logType = {
            module: 'taxi',
            function: 'package service trip'
        }
        let payload = req.body;
        let validateServiceTrip = validateRule(createPackageTripRules(), payload);
        if (validateServiceTrip) {
            next();
        }
    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}

module.exports = {
    validationCreateTrip,
    validateNearBy,
    validateTripEstimate,
    cancelTrip,
    validationPackageTrip
}

