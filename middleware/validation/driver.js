const validator = require('validator');
const storeType = require('../../models/storeTypeTable');

module.exports = {
    driverSignupCheck: async (req, res, next) => {
        let data = req.body;
        console.log("driverSignupCheck data :", data);

        if (!req.store) {
            return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
        }

        let store = req.store;
        data.store = store.storeId;

        // if (!data.storeTypeId) {
        //     return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        // }

        // if (data.storeTypeId.length === 0) {
        //     return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        // }

        // req.body.storeType = data.storeTypeId;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
        }

        if (!data.mobileNumber) {
            return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_IS_REQUIRED'));
        }

        if (!validator.isMobilePhone(data.mobileNumber)) {
            return res.json(helper.showValidationErrorResponse('INVALID_MOBILE_NUMBER'));
        }

        if (!data.countryCode) {
            return res.json(helper.showValidationErrorResponse('CC_IS_REQUIRED'));
        }

        if (!data.email) {
            return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
        }

        if (!validator.isEmail(data.email)) {
            return res.json(helper.showValidationErrorResponse('INVALID_EMAIL'));
        }

        if (!data.password) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_IS_REQUIRED'));
        }

        if (!data.address) {
            return res.json(helper.showValidationErrorResponse('ADDRESS_IS_REQUIRED'));
        }

        if (data.status) {
            req.body.status = data.status;
        } else {
            req.body.status = "created";
        }

        next();
    },

    driverSignup: async (req, res, next) => {
        let data = req.body;

        if (!req.store) {
            return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
        }

        let store = req.store;
        req.body.store = store.storeId;

        // if (!data.storeTypeId) {
        //     return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        // }

        // if (data.storeTypeId.length === 0) {
        //     return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        // }

        // req.body.storeType = data.storeTypeId;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
        }

        if (!data.mobileNumber) {
            return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_IS_REQUIRED'));
        }

        if (!validator.isMobilePhone(data.mobileNumber)) {
            return res.json(helper.showValidationErrorResponse('INVALID_MOBILE_NUMBER'));
        }

        if (!data.countryCode) {
            return res.json(helper.showValidationErrorResponse('CC_IS_REQUIRED'));
        }

        if (!data.email) {
            return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
        }

        if (!validator.isEmail(data.email)) {
            return res.json(helper.showValidationErrorResponse('INVALID_EMAIL'));
        }

        if (!data.password) {
            return res.json(helper.showValidationErrorResponse('PASSWORD_IS_REQUIRED'));
        }

        if (!data.address) {
            return res.json(helper.showValidationErrorResponse('ADDRESS_IS_REQUIRED'));
        }

        // if (req.isApp) {
        //     if (!data.documents) {
        //         return res.json(helper.showValidationErrorResponse('DOCUMENTS_IS_REQUIRED'));
        //     }

        //     if (data.documents.length === 0) {
        //         return res.json(helper.showValidationErrorResponse('DOCUMENTS_IS_REQUIRED'));
        //     }
        // }

        if (data.status) {
            req.body.status = data.status;
        } else {
            req.body.status = "created";
        }

        next();
    },

    updateDriver: async (req, res, next) => {
        let data = req.body;

        if (!data.name) {
            return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
        }

        if (!data.countryCode) {
            return res.json(helper.showValidationErrorResponse('CC_IS_REQUIRED'));
        }

        if (!data.mobileNumber) {
            return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_IS_REQUIRED'));
        }

        if (!validator.isMobilePhone(data.mobileNumber)) {
            return res.json(helper.showValidationErrorResponse('INVALID_MOBILE_NUMBER'));
        }

        if (!data.email) {
            return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
        }

        if (!validator.isEmail(data.email)) {
            return res.json(helper.showValidationErrorResponse('INVALID_EMAIL'));
        }

        if (!data.address) {
            return res.json(helper.showValidationErrorResponse('ADDRESS_IS_REQUIRED'));
        }

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
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

    storeSetting: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID IS REQUIRED'));
        }

        next();
    },

    paymentSetting: async (req, res, next) => {
        let data = req.body;

        if (!data.paymentMode) {
            return res.json(helper.showValidationErrorResponse('PAYMENT_MODE_IS_REQUIRED'));
        }

        if (!data.paymentSettings) {
            return res.json(helper.showValidationErrorResponse('PAYMENT_SETTINGS_IS_REQUIRED'));
        }

        next();
    },

    taxSetting: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (!data.taxAmount) {
            return res.json(helper.showValidationErrorResponse('TAX_AMOUNT_IS_REQUIRED'));
        }

        next();
    },

    deliverySetting: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (!data.deliveryType) {
            return res.json(helper.showValidationErrorResponse('DELIVERY_TYPE_IS_REQUIRED'));
        }

        next();
    },

    commissionSetting: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (!data.deliveryType) {
            return res.json(helper.showValidationErrorResponse('DELIVERY_TYPE_IS_REQUIRED'));
        }

        next();
    },

    cancellationSetting: async (req, res) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (data.cancellationsetting.length === 0) {
            return res.json(helper.showValidationErrorResponse('CANCELLATION_POLICY_SETTING_IS_REQUIRED'));
        }

        next();
    },

    timeSlotSetting: async (req, res) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (data.timeSlot.length === 0) {
            return res.json(helper.showValidationErrorResponse('TIME_SLOT_SETTING_IS_REQUIRED'));
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