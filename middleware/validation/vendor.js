const validator = require('validator');

module.exports = {

    storeSignup: async (req, res, next) => {
        let data = req.body;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
        }

        if (!data.mobileNumber) {
            return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_IS_REQUIRED'));
        }

        if (!data.email) {
            return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
        }

        if (!validator.isEmail(data.email)) {
            return res.json(helper.showValidationErrorResponse('EMAIL_INVALID'));
        }

        if (!data.country) {
            return res.json(helper.showValidationErrorResponse('COUNTRY_IS_REQUIRED'));
        }

        if (data.storeType.length === 0) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_IS_REQUIRED'));
        }

        if (!data.password) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_IS_REQUIRED'));
        };

        if (!data.storeName) {
            return res.json(helper.showValidationErrorResponse('STORE_NAME_IS_REQUIRED'));
        }

        if (!data.language) {
            return res.json(helper.showValidationErrorResponse('LANGUAGE_IS_REQUIRED'));
        }

        if (!data.currency) {
            return res.json(helper.showValidationErrorResponse('CURRENCY_IS_REQUIRED'));
        }

        if (!data.timezone) {
            return res.json(helper.showValidationErrorResponse('TIMEZONE_IS_REQUIRED'));
        }

        next();
    },

    userLogin: async (req, res, next) => {
        let data = req.body;

        if (!data.email) {
            return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
        }

        if (!validator.isEmail(data.email)) {
            return res.json(helper.showValidationErrorResponse('EMAIL_INVALID'));
        }

        if (!data.password) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_IS_REQUIRED'));
        };

        next();
    },

    userForgotPassword: async (req, res, next) => {
        let data = req.body;

        if (!data.email) {
            return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
        }

        if (!validator.isEmail(data.email)) {
            return res.json(helper.showValidationErrorResponse('EMAIL_INVALID'));
        }

        next();
    },

    userResetPassword: async (req, res, next) => {

        let data = req.body;

        if (!data.email) {
            return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
        }

        if (!validator.isEmail(data.email)) {
            return res.json(helper.showValidationErrorResponse('EMAIL_INVALID'));
        }

        if (!data.password) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_IS_REQUIRED'));
        }

        if (!data.confirmPassword) {
            return res.json(helper.showValidationErrorResponse('CNF_PASSWORD_IS_REQUIRED'));
        }

        if (data.password != data.confirmPassword) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_CNFPASSWORD_NOT_MATCH'));
        }

        next();
    },

    userChangePassword: async (req, res, next) => {
        let data = req.body;

        if (!data.password) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_IS_REQUIRED'));
        }

        if (!data.confirmPassword) {
            return res.json(helper.showValidationErrorResponse('CNF_PASSWORD_IS_REQUIRED'));
        }

        if (!data.currentPassword) {
            return res.json(helper.showValidationErrorResponse('CURRENT_PASSWORD_IS_REQUIRED'));
        }

        if (data.password === data.currentPassword) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_MUST_BE_DIFFERENT'));
        }

        if (data.confirmPassword != data.password) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_CNFPASSWORD_NOT_MATCH'));
        }

        next();
    },

    updateUserStatus: async (req, res, next) => {
        let data = req.body;

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }

        next();
    },

    updateUserProfile: async (req, res, next) => {
        let data = req.body;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
        }

        if (!data.mobileNumber) {
            return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_IS_REQUIRED'));
        }

        if (!data.email) {
            return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
        }

        if (!validator.isEmail(data.email)) {
            return res.json(helper.showValidationErrorResponse('EMAIL_INVALID'));
        }

        if (!data.country) {
            return res.json(helper.showValidationErrorResponse('COUNTRY_IS_REQUIRED'));
        }

        if (!data.role) {
            return res.json(helper.showValidationErrorResponse('ROLE_IS_REQUIRED'));
        }

        if (data.storeType.length === 0) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_IS_REQUIRED'));
        }

        if (!data.password) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_IS_REQUIRED'));
        };

        if (!data.storeName) {
            return res.json(helper.showValidationErrorResponse('STORE_NAME_IS_REQUIRED'));
        }

        if (!data.language) {
            return res.json(helper.showValidationErrorResponse('LANGUAGE_IS_REQUIRED'));
        }

        if (!data.currency) {
            return res.json(helper.showValidationErrorResponse('CURRENCY_IS_REQUIRED'));
        }

        if (!data.timezone) {
            return res.json(helper.showValidationErrorResponse('TIMEZONE_IS_REQUIRED'));
        }

        next();
    }
}