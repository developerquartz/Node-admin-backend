const { addPackageValidation, IdValidation, updateStatusValidation, addVendorValidation } = require('./rules');
const { validateRule } = require('./validator');
const utilityFunc = require('../utility/functions');

let addPackage = async (req, res, next) => {
    try {
        req.logType = {
            module: 'package',
            function: 'validateAddPackage'
        }
        let payload = req.body;
        let rule = addPackageValidation();
        let validateAddPackage = validateRule(rule, payload);

        if (validateAddPackage) {
            let store = req.store;
            req.body.store = store.storeId;
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
let packageIdValidation = async (req, res, next) => {
    try {

        req.logType = {
            module: 'package',
            function: 'checkIdValidation'
        }

        let payload = { "_id": req.params._id };
        let rule = IdValidation();
        let validateAddPackage = validateRule(rule, payload);

        if (validateAddPackage) {
            let store = req.store;
            req.body.store = store.storeId;
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
let updatePackage = async (req, res, next) => {
    try {
        let payload = req.body

        req.logType = {
            module: 'package',
            function: 'updatePackageValidation'
        }

        let updatePackageValidationRule = IdValidation();
        let validateUpdatePackage = validateRule(updatePackageValidationRule, payload);
        if (validateUpdatePackage) {
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
            module: 'package',
            function: 'updateStatusValidation'
        }

        let updateStatusValidationRule = updateStatusValidation();
        let validateUpdateMenuStatus = validateRule(updateStatusValidationRule, payload);
        if (validateUpdateMenuStatus) {
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
let addVendor = async (req, res, next) => {
    try {
        req.logType = {
            module: 'vendor',
            function: 'validateAddVendor'
        }
        let payload = req.body;
        let rule = addVendorValidation();
        let validateAddVendor = validateRule(rule, payload);

        if (validateAddVendor) {
            let store = req.store;
            req.body.store = store.storeId;
            next();
        }

    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
let updateVendor = async (req, res, next) => {
    try {
        let payload = req.body

        req.logType = {
            module: 'vendor',
            function: 'updateVendorValidation'
        }

        let rule = IdValidation();
        let validateUpdateVendor = validateRule(rule, payload);
        if (validateUpdateVendor) {
            next();
        }
    } catch (error) {
        utilityFunc.sendErrorResponse(error, res);
    }
}
module.exports = {
    addVendor,
    updateVendor,
    addPackage,
    IdValidation: packageIdValidation,
    updatePackage,
    updateStatus
}