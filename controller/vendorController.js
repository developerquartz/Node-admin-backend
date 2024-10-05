const User = require('../models/userTable');
const storeType = require('../models/storeTypeTable');
const Utils = require('../helper/utils');
const emailService = require("../helper/emailService");
const Document = require('../models/documentsTable');
const storeInitial = require('../initial/storeInitial');
const spltipay360data = require('../module/pay360split/controller/controller')
const paymentMiddleware = require('../middleware/payments');

module.exports = {

    createUser: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
            if (!data.storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }
            const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);
            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
            }
            data.storeType = getStoreType._id;
            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            }
            if (!data.mobileNumber) {
                return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_IS_REQUIRED'));
            }
            if (!data.countryCode) {
                return res.json(helper.showValidationErrorResponse('CC_IS_REQUIRED'));
            }
            if (!data.email) {
                return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
            }
            if (!data.password) {
                return res.json(helper.showValidationErrorResponse('PASSWORD_IS_REQUIRED'));
            }
            if (!data.address) {
                return res.json(helper.showValidationErrorResponse('ADDRESS_IS_REQUIRED'));
            }
            if (!data.lng) {
                return res.json(helper.showValidationErrorResponse('LNG_IS_REQUIRED'));
            }
            if (!data.lat) {
                return res.json(helper.showValidationErrorResponse('LAT_IS_REQUIRED'));
            }
            data.status = "created";
            data.role = "VENDOR";
            const getUser = await User.findOne({ email: data.email, role: { $in: ["ADMIN", "STAFF", "VENDOR"] }, status: { $nin: ["archived", "temp"] } });
            if (getUser != null) {
                return res.json(helper.showValidationErrorResponse('USER_EXISTS'));
            }
            const location = { type: "Point", coordinates: [Number(data.lng), Number(data.lat)] };
            data.userLocation = location;
            const getHash = await Utils.hashPassword(data.password);
            data.password = getHash.hashedPassword;
            data.salt = getHash.salt;
            data.deliveryType = getStoreType.deliveryType;
            let defaultData = await storeInitial.getVendorDefaultData(data, data.storeTypeId);
            data = { ...data, ...defaultData };
            let values = [];
            let complete = [];
            console.log("documents", data.documents);
            if (data.documents && data.documents.length > 0) {
                let message = '';
                let flag = false;
                for (let index = 0; index < data.documents.length; index++) {
                    let innerflag = false;
                    let fields = data.documents[index].fields;

                    if (fields && fields.length > 0) {
                        for (let index2 = 0; index2 < fields.length; index2++) {
                            let required = fields[index2].validation.required;
                            let value = fields[index2].value;
                            let type = fields[index2].type;
                            console.log("value", value);
                            if (required && type != 'checkbox') {
                                if (!value) {
                                    innerflag = true;
                                    message = fields[index2].label + ' is required';
                                    break;
                                }
                            }
                        }
                    }

                    if (innerflag) {
                        flag = true;
                        break;
                    }
                }

                if (flag) {
                    return res.json(helper.showParamsErrorResponse(message));
                }

                await Promise.all(data.documents.map(fields => {

                    //console.log("fields", fields);

                    if (fields.fields.length > 0) {
                        fields.fields.forEach(field => {
                            let obj = {
                                name: field.name,
                                value: field.value
                            }
                            if (field.type === 'checkbox') {
                                obj.options = field.options;
                            }
                            values.push(obj);
                        });
                    }

                    complete.push({ template: fields._id.toString(), isComplete: fields.isComplete });
                }))
            }
            let getpwyment_method = store.paymentSettings.filter(element => {
                return element.payment_method == "pay360" && element.status == true
            })
            if (getpwyment_method.length) {
                let pay360data = getpwyment_method[0]
                if (!pay360data.supplierId) {
                    return res.json(helper.showDatabaseErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
                }
                else {
                    if (!pay360data.apikey) {
                        return res.json(helper.showValidationErrorResponse('apikey key is missing'));
                    }
                    if (!pay360data.gatewayUrl) {
                        return res.json(helper.showValidationErrorResponse('gatewayUrlis missing'));
                    }
                    let checkdata = {
                        API_KEY: pay360data.apikey,
                        gatewayUrl: pay360data.gatewayUrl,
                        merchantId: pay360data.supplierId
                    }
                    paymentMiddleware.getbank360(checkdata, async (resdata1) => {
                        if (!resdata1.status) {
                            return res.json(helper.showValidationErrorResponse(resdata1.message));
                        }
                        else {
                            if (!resdata1.chargeId.length) {
                                console.log("else---")
                                return res.json(helper.showValidationErrorResponse("Supplier Bank account not found"))

                            }
                            else {
                                User.addUserByEmail(data, async (err, resdata) => {
                                    if (err) {
                                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                    } else {
                                        if (values.length > 0) {
                                            let doc = await Document.create({ user: resdata._id, values: values, complete: complete, date_created_utc: new Date() });
                                        }
                                        resdata.password = '';
                                        resdata.salt = '';
                                        res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', resdata));
                                        emailService.vendorRegisterEmail(resdata);
                                        spltipay360data.createMerchantUserbysignup(store, resdata)
                                    }
                                });
                            }
                        }
                    })
                }

            }
            else {
                User.addUserByEmail(data, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        if (values.length > 0) {
                            let doc = await Document.create({ user: resdata._id, values: values, complete: complete, date_created_utc: new Date() });
                        }
                        resdata.password = '';
                        resdata.salt = '';
                        res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', resdata));
                        emailService.vendorRegisterEmail(resdata);
                    }
                });
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userLogin: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;

            const getUser = await User.findOne({ store: data.store, email: data.email, role: "VENDOR" });

            if (getUser == null) {
                return res.json(helper.showValidationErrorResponse('EMAIL_NOT_EXISTS'));
            }

            if (getUser.status === 'blocked') {
                return res.json(helper.showValidationErrorResponse('USER_BLOCKED'));
            }

            if (getUser.status === 'rejected') {
                return res.json(helper.showValidationErrorResponse('USER_REJECTED'));
            }

            if (getUser.role === "ADMIN" || getUser.role === "VENDOR" || getUser.role === "DRIVER") {

                if (getUser.status === 'created') {
                    return res.json(helper.showValidationErrorResponse('USER_NOT_APPROVED'));
                }
            }

            const validPassword = await Utils.verifyPassword(getUser.password, data.password);

            if (validPassword) {
                const token = Utils.generateToken(getUser);

                if (getUser.tokens == null) {
                    getUser.tokens = token;
                } else {
                    getUser.tokens = getUser.tokens.concat({ token });

                    User.updateToken(getUser, (err, mytoken) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            mytoken.set("token", token, { strict: false });
                            let resdata = helper.showSuccessResponse('LOGIN_SUCCESS', mytoken);
                            res.json(resdata);
                        }
                    });
                }
            } else {
                return res.json(helper.showValidationErrorResponse('WRONG_PASSWORD'));
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userForgotPassword: async (req, res) => {
        try {
            let data = req.body;

            data.email = data.email.trim().toLowerCase();

            let getUser = await User.findOne({ email: data.email, status: "approved" });

            if (getUser != null) {
                data._id = getUser._id;
                let exptime = new Date();
                exptime.setHours(exptime.getHours() + 1);
                data.OTPexp = new Date(exptime);
                let OTP = Utils.generateOTP(4);
                data.OTP = OTP;
                getUser.OTP = OTP;

                User.updateOTP(data, (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let result = helper.showSuccessResponse('OTP_SUCCESS', resdata);
                        result.OTP = data.OTP;
                        result.OTPexp = data.OTPexp;

                        emailService.vendorForgotPasswordEmail(getUser);

                        res.json(result);
                    }
                });
            } else {
                return res.json(helper.showValidationErrorResponse('EMAIL_DOES_NOT_EXIST'));
            }
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userResetPassword: async (req, res) => {
        try {
            let data = req.body;
            // let store = req.store;
            // let hideThings = store.hideThings
            // let demo = hideThings.filter(element => element.type == "isDemo")
            // let is_demo = demo.length ? demo[0]['value'] : false
            // if (is_demo) {
            //     return res.json(helper.showValidationErrorResponse('DEMO_TYPE'));
            // }
            data.email = data.email.trim().toLowerCase();
            const passmain = data.password;
            let getUser = await User.findOne({ email: data.email, status: "approved" });

            if (getUser != null) {
                data._id = getUser._id;
                var cDate = new Date();
                var exptime = new Date(getUser.OTPexp);
                if (cDate.getTime() >= exptime.getTime()) {
                    return res.json(helper.showValidationErrorResponse('OTP_EXPIRED'));
                }

                if (getUser.OTP == data.OTP) {
                    const getHash = await Utils.hashPassword(data.password);
                    data.password = getHash.hashedPassword;
                    data.salt = getHash.salt;
                    /* const upass = await User.updatePassword(data);

                    const mTemplate = await Template.findOne({ store: getUser.store, constant: 'USER_RESET_PASSWORD' });

                    if (mTemplate == null || mTemplate == undefined) {
                        var msg = __('PASSWORD_RESET_MSG', passmain);
                        var sub = __('%s Reset Password', '');
                        var senemail = await mailgunSendEmail.sendEmail(upass.email, sub, msg);
                    } else {
                        var msg = mTemplate.body.replace('[password]', passmain);
                        var senemail = await mailgunSendEmail.sendEmail(upass.email, mTemplate.subject, msg);
                    } */

                    emailService.vendorResetPasswordEmail(getUser)

                    res.json(helper.showSuccessResponse('PASSWORD_RESET_SUCCESS', {}));
                } else {
                    return res.json(helper.showValidationErrorResponse('OTP_NOT_MATCH'));
                }
            } else {
                return res.json(helper.showValidationErrorResponse('EMAIL_DOES_NOT_EXISTS'));
            }
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    changeUserPassword: async (req, res) => {
        try {
            let data = req.body;
            let getUser = req.user;
            //let store = req.store;
            // let hideThings = store.hideThings
            // let demo = hideThings.filter(element => element.type == "isDemo")
            // let is_demo = demo.length ? demo[0]['value'] : false
            // if (is_demo) {
            //     return res.json(helper.showValidationErrorResponse('DEMO_TYPE'));
            // }
            const validPassword = await Utils.verifyPassword(getUser.password, data.currentPassword);

            if (validPassword) {
                const token = Utils.generateToken(getUser);

                if (getUser.tokens == null) {
                    getUser.tokens = token;
                } else {
                    getUser.tokens = getUser.tokens.concat({ token });
                    const getHash = await Utils.hashPassword(data.password);
                    data.password = getHash.hashedPassword;
                    data.salt = getHash.salt;
                    const upass = await User.updatePassword(data);

                    User.updateToken(getUser, async (err, mytoken) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            let resdata = helper.showSuccessResponse('PASSWORD_CHANGED_SUCCESS', mytoken);
                            resdata.token = token;
                            res.json(resdata);

                            emailService.vendorChangePasswordEmail(getUser)

                            /* const passmain = data.confirmPassword;

                            const mTemplate = await Template.findOne({ store: getUser.store, constant: 'USER_CHANGE_PASSWORD' });

                            if (mTemplate == null || mTemplate == undefined) {
                                var msg = __('PASSWORD_CHANGED_MSG', passmain);
                                var sub = __('PASSWORD_CHANGED_SUBJECT', '');
                                var senemail = await mailgunSendEmail.sendEmail(upass.email, sub, msg);
                            } else {
                                var msg = mTemplate.body.replace('[password]', passmain);
                                var senemail = await mailgunSendEmail.sendEmail(upass.email, mTemplate.subject, msg);
                            } */
                        }
                    });
                }
            } else {
                return res.json(helper.showValidationErrorResponse('WRONG_PASSWORD'));
            }
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    approveUser: async (req, res) => {
        try {
            let data = req.body;

            User.approveUser(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateUserStatus: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data._id = user._id;

            User.updateUserStatus(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateUserProfile: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data._id = user._id;
            //let store = req.store;
            // let hideThings = store.hideThings
            // let demo = hideThings.filter(element => element.type == "isDemo")
            // let is_demo = demo.length ? demo[0]['value'] : false
            if (user.email) {

                if (data.email.toString() != user.email.toString()) {
                    // if (is_demo) {
                    //     return res.json(helper.showValidationErrorResponse('DEMO_EMAIL'));
                    // }
                    const getUser = await User.findOne({ email: data.email, status: { $ne: "archived" } });

                    if (getUser != null) {
                        return res.json(helper.showValidationErrorResponse('EMAIL_ALREADY_EXISTS'));
                    }
                }

            }

            User.updateUserProfile(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserProfileById: async (req, res) => {
        try {
            res.json(helper.showSuccessResponse('DATA_SUCCESS', req.user));
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userLogout: async (req, res) => {
        try {
            req.user.tokens = req.user.tokens.filter((token) => {
                return token.token !== req.token;
            });

            const user = await User.findByIdAndUpdate(req.user._id, { tokens: req.user.tokens });

            res.json(helper.showSuccessResponse('LOGOUT_SUCCESS', user));

        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}