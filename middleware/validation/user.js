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

    isValidEmail: async (req, res, next) => {
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
    },

    enableUserNotifications: async (req, res, next) => {
        let data = req.body;

        if (!data.firebaseToken) {
            return res.json(helper.showValidationErrorResponse("TOKEN_IS_REQUIRED"));
        }

        next();
    },
    userDocuments: async (req, res, next) => {
        let data = req.body;
        let values = [];
        let complete = [];

        if (data.otherdocuments && data.otherdocuments.length > 0) {
            let message = "";
            let flag = false;
            let getDocTemplate = await DocumentTemplate.findOne({
                type: "qualificationInfo",
                role: "USER",
                store: store.storeId,
            });
            if (getDocTemplate == null) {
                return res.json(
                    helper.showValidationErrorResponse("INVALID_TEMPLATE")
                );
            }
            let innerflag = false;
            let fields = data.otherdocuments;
            let template = getDocTemplate;
            let templateType = getDocTemplate.type;

            if (fields && fields.length > 0) {
                for (let index2 = 0; index2 < fields.length; index2++) {
                    let required = fields[index2].validation.required;
                    let value = fields[index2].value;
                    let name = fields[index2].name;
                    let type = fields[index2].type;
                    let label = fields[index2].label;

                    if (required && type != "checkbox") {
                        if (!value) {
                            innerflag = true;
                            message = fields[index2].label + " is required";
                            break;
                        }
                    }
                    let obj = {
                        label: label,
                        name: name,
                        value: value,
                        type: type,
                    };
                    if (type === "checkbox") {
                        let options = fields[index2].options;
                        obj.options = options;
                    }

                    values.push(obj);
                }
            }

            if (innerflag) {
                return res.json(helper.showParamsErrorResponse(message));
            }
            complete.push({
                template: template._id.toString(),
                isComplete: template.isComplete,
            });
        }
        if (data.documents && data.documents.length > 0) {

            let message = '';
            let flag = false;

            for (let index = 0; index < data.documents.length; index++) {

                let innerflag = false;
                let fields = data.documents[index].fields;
                let template = data.documents[index];
                let templateType = data.documents[index].type;
                if (fields && fields.length > 0) {

                    for (let index2 = 0; index2 < fields.length; index2++) {
                        let required = fields[index2].validation.required;
                        let name = fields[index2].name;
                        let value = fields[index2].value;
                        let type = fields[index2].type;
                        let label = fields[index2].label;
                        let valueType = fields[index2].valueType

                        if (required && type != 'checkbox') {
                            if (!value) {
                                innerflag = true;
                                message = fields[index2].label + ' is required';
                                break;
                            }
                        }

                        let obj = {
                            label: label,
                            name: name,
                            value: value,
                            type: type
                        }
                        if (valueType) {
                            obj.valueType = valueType;
                        }
                        if (type === 'checkbox') {
                            let options = fields[index2].options;
                            obj.options = options;
                        }
                        values.push(obj);
                    }
                }

                if (innerflag) {
                    flag = true;
                    break;
                }
                complete.push({ template: template._id.toString(), isComplete: template.isComplete });
            }

            if (flag) {
                return res.json(helper.showParamsErrorResponse(message));
            }

        }

        req.documentDetails = {
            values, complete
        }
        next();
    },
    becomeHost: async (req, res, next) => {
        let data = req.body;
        if (!req.store) {
            return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
        }
        let langugeCode = ['en', 'fr', 'ht', 'zh'];
        let store = req.store;
        req.body.store = store.storeId;
        if (!data.mobileNumber) {
            return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_IS_REQUIRED'));
        }
        if (!validator.isMobilePhone(data.mobileNumber)) {
            return res.json(helper.showValidationErrorResponse('INVALID_MOBILE_NUMBER'));
        }
        if (!data.countryCode) {
            return res.json(helper.showValidationErrorResponse('CC_IS_REQUIRED'));
        }

        if (data.language) {
            let getLangugeCode = langugeCode.filter(i => {
                return i === data.language.code;
            });
            if (!getLangugeCode.length) {
                return res.json(helper.showValidationErrorResponse('INVALID_LANGUAGE_CODE'));
            }

        }
        if (data.status) {
            req.body.status = data.status;
        } else {
            req.body.status = "created";
        }

        next();
    },
}