const User = require('../../../models/userTable');
const Utils = require('../../../helper/utils');
const Order = require('../../../models/ordersTable');
const ObjectId = require('objectid');
const paymentLedger = require('../../../models/paymentLedgerTable');
const Report = require('../../../models/reportTable');
const Document = require('../../../models/documentsTable')
const Store = require('../../../models/storeTable');
const emailService = require("../../../helper/emailService")
const driverVehicle = require('../models/driverVehicleTable');
var randomstring = require("randomstring");
const { calculteReferredCommission } = require("../../../helper/referralCommission");

module.exports = {

    createUserCheck: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;

            const getUser = await User.findOne({ store: store.storeId, email: data.email, role: "DRIVER", email: data.email, status: { $ne: "archived" } });

            if (getUser != null) {
                return res.json(helper.showValidationErrorResponse('USER_EXISTS'));
            }

            res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', data));
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    createUser: async (req, res) => {
        try {
            let data = req.body;
            console.log("data-------->", data)
            let store = req.store;
            data.store = store.storeId;
            const getUser = await User.findOne({ store: store.storeId, email: data.email, role: "DRIVER", status: { $ne: "archived" } });
            if (getUser != null) {
                return res.json(helper.showValidationErrorResponse('USER_EXISTS'));
            }
            const getHash = await Utils.hashPassword(data.password);
            data.password = getHash.hashedPassword;
            data.salt = getHash.salt;
            data.role = "DRIVER";
            data.onlineStatus = "offline";
            data.stripeConnect = {
                status: false,
                accountId: null
            };
            data.status = "created";
            let values = [];
            let complete = [];
            let vehicleInfo = [];
            if (data.documents && data.documents.length > 0) {
                let message = '';
                let flag = false;
                for (let index = 0; index < data.documents.length; index++) {

                    let innerflag = false;
                    let vehicleInfoValues = [];
                    let fields = data.documents[index].fields;
                    let template = data.documents[index];
                    let templateType = data.documents[index].type;

                    if (templateType && templateType === "vehicleInfo") {
                        if (!template.vehicleType) {
                            flag = true;
                            message = "Please select vehicle type";
                            break;
                        }
                    }

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
                                obj.valueType = valueType
                            }
                            if (type === 'checkbox') {
                                let options = fields[index2].options;
                                obj.options = options;
                            }

                            if (templateType && templateType === "vehicleInfo") {
                                vehicleInfoValues.push(obj);
                            } else {
                                values.push(obj);
                            }
                        }
                    }

                    if (innerflag) {
                        flag = true;
                        break;
                    }

                    if (vehicleInfoValues.length > 0) {

                        let vehicleObj = {
                            template: template._id,
                            vehicleType: template.vehicleType,
                            values: vehicleInfoValues,
                            complete: [{ template: template._id.toString(), isComplete: template.isComplete }]
                        }

                        vehicleInfo.push(vehicleObj);
                    } else {
                        complete.push({ template: template._id.toString(), isComplete: template.isComplete });
                    }

                }

                if (flag) {
                    return res.json(helper.showParamsErrorResponse(message));
                }

            }
            if (data.otherdocument && data.otherdocument.length > 0) {
                let message = '';
                let flag = false;
                for (let index = 0; index < data.otherdocument.length; index++) {
                    let innerflag = false;
                    let fields = data.otherdocument[index].fields;
                    let template = data.otherdocument[index];
                    if (fields && fields.length > 0) {

                        for (let index2 = 0; index2 < fields.length; index2++) {
                            let required = fields[index2].validation.required;
                            let name = fields[index2].name;
                            let value = fields[index2].value;
                            let type = fields[index2].type;
                            let label = fields[index2].label;

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
            };
            console.log("delivery register by referralCode", data.referralCode)
            data.referralCode = data.name.charAt(0).toUpperCase() + data.name.charAt(1).toUpperCase() + randomstring.generate(10).toUpperCase();
            User.addDriverByEmail(data, async (err, resdata) => {
                if (err) {
                    console.log("err----", err)
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (values.length > 0) {
                        let doc = await Document.create({ user: resdata._id, values: values, complete: complete, date_created_utc: new Date() });
                    }

                    if (vehicleInfo.length > 0) {
                        await Promise.all(vehicleInfo.map(item => {
                            item.user = resdata._id;
                            item.date_created_utc = new Date();
                            return item;
                        }));

                        let vehicle = await driverVehicle.insertMany(vehicleInfo);

                        await User.findByIdAndUpdate(resdata._id, { vehicle: vehicle[0]._id });
                    }

                    emailService.driverRegisterEmail(resdata);

                    res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', resdata));

                    if (data.referredBy) {
                        calculteReferredCommission(data.referredBy, store, "Driver", resdata);
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    becomeHost: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
            const getUser = await User.findOne({ store: store.storeId, email: data.email, role: "DRIVER", status: { $ne: "archived" } });
            if (getUser != null) {
                return res.json(helper.showValidationErrorResponse('USER_EXISTS'));
            }
            const getHash = await Utils.hashPassword(data.password);
            data.password = getHash.hashedPassword;
            data.salt = getHash.salt;
            data.role = "DRIVER";
            data.onlineStatus = "offline";
            data.isHost = true
            data.stripeConnect = {
                status: false,
                accountId: null
            };
            data.status = "created";
            let values = [];
            let complete = [];
            let vehicleInfo = [];
            if (data.documents && data.documents.length > 0) {
                let message = '';
                let flag = false;
                for (let index = 0; index < data.documents.length; index++) {
                    let innerflag = false;
                    let vehicleInfoValues = [];
                    let fields = data.documents[index].fields;
                    let template = data.documents[index];
                    let templateType = data.documents[index].type;
                    if (templateType && templateType === "vehicleInfo") {
                        if (!template.vehicleType) {
                            flag = true;
                            message = "Please select vehicle type";
                            break;
                        }
                    }
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
                                obj.valueType = valueType
                            }
                            if (type === 'checkbox') {
                                let options = fields[index2].options;
                                obj.options = options;
                            }
                            if (templateType && templateType === "vehicleInfo") {
                                vehicleInfoValues.push(obj);
                            } else {
                                values.push(obj);
                            }
                        }
                    }
                    if (innerflag) {
                        flag = true;
                        break;
                    }
                    if (vehicleInfoValues.length > 0) {
                        let vehicleObj = {
                            template: template._id,
                            vehicleType: template.vehicleType,
                            values: vehicleInfoValues,
                            complete: [{ template: template._id.toString(), isComplete: template.isComplete }]
                        }
                        vehicleInfo.push(vehicleObj);
                    } else {
                        complete.push({ template: template._id.toString(), isComplete: template.isComplete });
                    }
                }
                if (flag) {
                    return res.json(helper.showParamsErrorResponse(message));
                }
            }
            if (data.otherdocument && data.otherdocument.length > 0) {
                let message = '';
                let flag = false;
                for (let index = 0; index < data.otherdocument.length; index++) {
                    let innerflag = false;
                    let fields = data.otherdocument[index].fields;
                    let template = data.otherdocument[index];
                    if (fields && fields.length > 0) {
                        for (let index2 = 0; index2 < fields.length; index2++) {
                            let required = fields[index2].validation.required;
                            let name = fields[index2].name;
                            let value = fields[index2].value;
                            let type = fields[index2].type;
                            let label = fields[index2].label;
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
            };
            User.addDriverByEmail(data, async (err, resdata) => {
                if (err) {
                    console.log("err----", err)
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (values.length > 0) {
                        let doc = await Document.create({ user: resdata._id, values: values, complete: complete, date_created_utc: new Date() });
                    }
                    if (vehicleInfo.length > 0) {
                        await Promise.all(vehicleInfo.map(item => {
                            item.user = resdata._id;
                            item.date_created_utc = new Date();
                            return item;
                        }));
                        let vehicle = await driverVehicle.insertMany(vehicleInfo);
                        await User.findByIdAndUpdate(resdata._id, { vehicle: vehicle[0]._id });
                    }
                    emailService.driverRegisterEmail(resdata);
                    res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', resdata));
                    if (data.referredBy) {
                        calculteReferredCommission(data.referredBy, store, "Driver", resdata);
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    userLogin: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let qry = {
                store: store.storeId,
                email: data.email,
                role: "DRIVER",
                status: { $ne: "archived" }
            }
            if (data.isTranpotationService) {
                qry.isTranpotationService = true
            } else if (data.isDeliveryService) {
                qry.isDeliveryService = true
            }
            console.log("qry----->", qry)
            const getUser = await User.findOne(qry)
                .populate({ path: 'store', select: 'status' })
                .exec();

            if (!getUser)
                return res.json(helper.showValidationErrorResponse('DRIVER_NOT_EXIST'));

            if (!getUser.store && getUser.store && getUser.store.status != "active")
                return res.json(helper.showUnathorizedAppErrorResponse('STORE_IS_NOT_ACTIVE'));

            if (getUser == null) {
                return res.json(helper.showValidationErrorResponse('EMAIL_NOT_EXISTS'));
            }

            if (getUser.status === 'blocked') {
                return res.json(helper.showValidationErrorResponse('USER_BLOCKED'));
            }

            if (getUser.status === 'rejected') {
                return res.json(helper.showValidationErrorResponse('USER_REJECTED'));
            }

            if (getUser.status === 'inactive') {
                return res.json(helper.showValidationErrorResponse('USER_REJECTED'));
            }

            if (getUser.role === "ADMIN" || getUser.role === "VENDOR" || getUser.role === "DRIVER") {

                if (getUser.status === 'created') {
                    return res.json(helper.showValidationErrorResponse('USER_NOT_APPROVED'));
                }
            }

            const validPassword = await Utils.verifyPassword(getUser.password, data.password);

            if (data.firebaseToken) {
                let token = data.firebaseToken;
                getUser.firebaseToken = token;
                getUser.firebaseTokens = [{ token }];
            }

            console.log("getUser", getUser.firebaseTokens);

            if (validPassword) {
                let token = Utils.generateToken(getUser, store.tokenExpiresIn);

                getUser.tokens = [{ token }];

                User.updateTokenDeliveryBoy(getUser, (err, mytoken) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let resdata = helper.showSuccessResponse('LOGIN_SUCCESS', mytoken);
                        resdata.token = token;
                        res.json(resdata);
                    }
                });
            } else {
                return res.json(helper.showValidationErrorResponse('WRONG_PASSWORD'));
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userLogout: async (req, res) => {
        try {

            let obj = {
                tokens: [],
                firebaseTokens: []
            }

            if (req.user.onlineStatus === "online") {
                obj.onlineStatus = "offline";
            }

            const resdata = await User.findByIdAndUpdate(req.user._id, obj, { new: true });

            res.json(helper.showSuccessResponse('LOGOUT_SUCCESS', resdata));

        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userForgotPassword: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.email = data.email.trim().toLowerCase();

            let getUser = await User.findOne({ store: store.storeId, email: data.email, role: "DRIVER", status: { $nin: ["archived", "temp"] } });

            if (getUser != null) {
                data._id = getUser._id;
                let exptime = new Date();
                exptime.setHours(exptime.getHours() + 1);
                data.OTPexp = exptime;
                let OTP = Utils.generateOTP(4);
                data.OTP = OTP;
                getUser.OTP = OTP;

                emailService.driverForgotPasswordEmail(getUser);

                User.updateOTP(data, (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let result = helper.showSuccessResponse('OTP_SUCCESS', resdata);
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

    driverResendOTP: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.email = data.email.trim().toLowerCase();

            let getUser = await User.findOne({ store: store.storeId, email: data.email, role: "DRIVER", status: { $ne: "archived" } });

            let exptime = new Date();
            exptime.setHours(exptime.getHours() + 1);
            data.OTPexp = exptime;
            let OTP = Utils.generateOTP(4);
            data.OTP = OTP;
            getUser.OTP = OTP;

            emailService.driverForgotPasswordEmail(getUser);

            if (getUser != null) {
                data._id = getUser._id;
                User.updateOTP(data, (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let result = helper.showSuccessResponse('OTP_SUCCESS', resdata);
                        res.json(result);
                    }
                });
            } else {
                let result = helper.showSuccessResponse('OTP_SUCCESS', data);
                res.json(result);
            }
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userResetPassword: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let hideThings = store.hideThings
            let demo = hideThings.filter(element => element.type == "isDemo")
            let is_demo = demo.length ? demo[0]['value'] : false
            if (is_demo) {
                return res.json(helper.showValidationErrorResponse('DEMO_TYPE'));
            }
            data.email = data.email.trim().toLowerCase();
            const passmain = data.password;
            const getUser = await User.findOne({ store: store.storeId, email: data.email, role: "DRIVER", status: { $ne: "archived" } });

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
                    const upass = await User.updatePassword(data);

                    res.json(helper.showSuccessResponse('PASSWORD_RESET_SUCCESS', {}));

                    emailService.driverResetPasswordEmail(getUser)
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
            let store = req.store;
            let hideThings = store.hideThings
            let demo = hideThings.filter(element => element.type == "isDemo")
            let is_demo = demo.length ? demo[0]['value'] : false
            if (is_demo) {
                return res.json(helper.showValidationErrorResponse('DEMO_TYPE'));
            }
            else {

                const validPassword = await Utils.verifyPassword(getUser.password, data.currentPassword);

                if (validPassword) {
                    const token = Utils.generateToken(getUser, store.tokenExpiresIn);

                    if (getUser.tokens == null) {
                        getUser.tokens = token;
                    } else {
                        data._id = getUser._id;
                        getUser.tokens = getUser.tokens.concat({ token });
                        const getHash = await Utils.hashPassword(data.password);
                        data.password = getHash.hashedPassword;
                        data.salt = getHash.salt;
                        const upass = await User.updatePassword(data);

                        User.updateTokenDeliveryBoy(getUser, async (err, mytoken) => {
                            if (err) {
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                let resdata = helper.showSuccessResponse('PASSWORD_CHANGED_SUCCESS', mytoken);
                                resdata.token = token;
                                res.json(resdata);

                                emailService.driverChangePasswordEmail(getUser);
                            }
                        });
                    }
                } else {
                    return res.json(helper.showValidationErrorResponse('WRONG_PASSWORD'));
                }
            }
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserProfileById: async (req, res) => {
        try {
            let user = req.user;
            let id = user._id;
            let store = req.store;
            let getBankFields = await Store.findById(store.storeId, 'bankFields');

            let bankFields = [];

            if (getBankFields != null) {

                if (getBankFields.bankFields && getBankFields.bankFields.length > 0) {
                    bankFields = getBankFields.bankFields;
                }
            }

            User.getUserByIdForDeliveryBoy(id, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    resdata.password = '';
                    resdata.salt = '';
                    resdata.tokens = [];
                    let isOnlineTransfer = false;

                    if (resdata.store.commissionTransfer) {
                        if (resdata.store.commissionTransfer.status && resdata.store.commissionTransfer.status === "online") {
                            isOnlineTransfer = true;
                        }
                    }

                    let getBalance = await paymentLedger
                        .find({ payment_to: resdata._id })
                        .sort({ date_created_utc: -1 })
                        .limit(1);

                    let balance = 0;

                    if (getBalance.length > 0) {
                        balance = getBalance[0].balance;
                    }
                    if (store.isSingleVendor == true) {
                        let wallet_limit = resdata.store.storeType[0].codWalletLimit
                        resdata.set("wallet_limit", wallet_limit, { strict: false });
                    }
                    resdata.set("wallet", balance, { strict: false });

                    if (bankFields.length > 0 && resdata.bankFields && resdata.bankFields.length > 0) {

                        await Promise.all(bankFields.map(element => {

                            let value = '';

                            let getField = resdata.bankFields.filter(ele => {
                                return ele.key === element.key;
                            });

                            if (getField.length > 0) {
                                value = getField[0].value;
                            }

                            element['value'] = value;

                        }));
                    }

                    resdata.set("bankFields", bankFields, { strict: false });
                    resdata.set("isOnlineTransfer", isOnlineTransfer, { strict: false });

                    return res.json(helper.showSuccessResponse('USER_DETAIL', resdata));
                }
            });
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateStatus: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data._id = user._id;

            if (!data.onlineStatus) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
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

    updateStatusDummy: async (req, res) => {
        try {
            let data = req.body;

            User.findOneAndUpdate({ email: data.email }, data, (err, resdata) => {
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
            let store = req.store;
            data.store = store.storeId;
            let hideThings = store.hideThings
            let demo = hideThings.filter(element => element.type == "isDemo")
            let is_demo = demo.length ? demo[0]['value'] : false
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

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

            if (!data.address) {
                return res.json(helper.showValidationErrorResponse('ADDRESS_IS_REQUIRED'));
            }
            if (user.mobileNumber) {
                if (data.mobileNumber.toString() != user.mobileNumber.toString()) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_PHONE'));
                    }
                    // const getUser = await User.findOne({ store: data.store, mobileNumber: data.mobileNumber, role: "USER", status: { $ne: "archived" } });

                    // if (getUser != null) {
                    //     return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_ALREADY_EXISTS'));
                    // }
                }
            }
            else {
                if (data.mobileNumber) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_PHONE'));
                    }
                }
            }
            if (user.email) {

                if (data.email.toString() != user.email.toString()) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_EMAIL'));
                    }
                    const getUser = await User.findOne({ store: data.store, email: data.email, role: "DRIVER", status: { $ne: "archived" } });

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

    updateUserProfileImage: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data._id = user._id;

            if (!data.profileImage) {
                return res.json(helper.showValidationErrorResponse('IMAGE_ID_IS_REQUIRED'));
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
    updateTripFareSettings: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let update = { setTripFareSetting: { status: true } };
            update._id = user._id;
            if (data.pricePerUnitDistance) {
                update["setTripFareSetting"]["pricePerUnitDistance"] = data.pricePerUnitDistance;
            }
            if (data.pricePerUnitTimeMinute) {
                update["setTripFareSetting"]["pricePerUnitTimeMinute"] = data.pricePerUnitTimeMinute;
            }
            if (data.basePrice) {
                update["setTripFareSetting"]["basePrice"] = data.basePrice;
            }
            if (data.status && typeof data.status == "boolean") {
                update["setTripFareSetting"]["status"] = data.status;
            }
            let requireField = ["pricePerUnitDistance", "basePrice", "pricePerUnitTimeMinute"];
            let getfield = requireField.find(i => data[i]);
            if (!getfield) {
                return res.json(helper.showValidationErrorResponse('FARE_IS_REQUIRED'));
            }

            User.updateUserProfile(update, (err, resdata) => {
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
    updateDriverByAdmin: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
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

    getDriverDetailsById: async (req, res) => {
        try {
            let id = req.params._id;
            let store = req.store;

            let getBankFields = await Store.findById(store.storeId, 'bankFields');

            let bankFields = [];

            if (getBankFields != null) {

                if (getBankFields.bankFields && getBankFields.bankFields.length > 0) {
                    bankFields = getBankFields.bankFields;
                }
            }

            User.getUserById(id, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    resdata.password = '';
                    resdata.salt = '';
                    resdata.tokens = [];
                    let [latestOrders, totalOrders, orderAvgValue, driverEarning] = await Promise.all([
                        Order.aggregate([{ $match: { driver: ObjectId(resdata._id) } }, { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customerDetails' } }, { $lookup: { from: 'users', localField: 'vendor', foreignField: '_id', as: 'vendorDetails' } }, { $lookup: { from: 'storetypes', localField: 'storeType', foreignField: '_id', as: 'storeType' } }, { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } }, { $unwind: { path: "$vendorDetails", preserveNullAndEmptyArrays: true } }, { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } }, { $project: { customOrderId: 1, billingDetails: 1, shippingDetails: 1, line_items: 1, vendor: 1, user: 1, isDriverAssign: 1, isDriverArrivedAtPickup: 1, isOrderMarkReady: 1, subTotal: 1, tax: 1, taxAmount: 1, tip: 1, tipAmount: 1, discountTotal: 1, deliveryFee: 1, orderTotal: 1, orderStatus: 1, date_created_utc: 1, vendorDetails: { name: 1, address: 1, profileImage: 1 }, customerDetails: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1 }, vendorDetails: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1 }, "storeType.storeType": 1 } }, { $sort: { date_created_utc: -1 } }, { $limit: 10 }]),
                        Order.aggregate([{ $match: { driver: ObjectId(resdata._id), orderStatus: "completed" } }]),
                        Order.aggregate([{ $match: { driver: ObjectId(resdata._id), orderStatus: "completed" } }, { $group: { _id: null, orderAvg: { $avg: "$orderTotal" } } }]),
                        Order.aggregate([{ $match: { driver: ObjectId(resdata._id), orderStatus: "completed" } }, { $group: { _id: null, deliveryBoyEarning: { $sum: "$deliveryBoyEarning" } } }]),
                    ]);

                    if (bankFields.length > 0 && resdata.bankFields && resdata.bankFields.length > 0) {

                        await Promise.all(bankFields.map(element => {

                            let value = '';

                            let getField = resdata.bankFields.filter(ele => {
                                return ele.key === element.key;
                            });

                            if (getField.length > 0) {
                                value = getField[0].value;
                            }

                            element['value'] = value;

                        }));
                    }

                    resdata.set("bankFields", bankFields, { strict: false });
                    resdata.set("latestOrders", latestOrders, { strict: false });
                    resdata.set("totalOrders", totalOrders.length, { strict: false });
                    resdata.set("orderAvgValue", orderAvgValue.length > 0 ? orderAvgValue[0].orderAvg : 0, { strict: false });
                    resdata.set("driverEarning", driverEarning.length > 0 ? helper.roundNumber(driverEarning[0].deliveryBoyEarning) : 0, { strict: false });
                    return res.json(helper.showSuccessResponse('USER_DETAIL', resdata));
                }
            });
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    archiveUserByAdmin: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            User.updateUserProfile(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getDrivers: async (req, res) => {
        try {
            const data = req.body;
            const store = req.store;
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let obj = {};
            obj.store = ObjectId(store.storeId);

            // let getBankFields = await Store.findById(obj.store, 'bankFields');

            // var bankFields = [];

            // if (getBankFields != null) {

            //     if (getBankFields.bankFields && getBankFields.bankFields.length > 0) {
            //         bankFields = getBankFields.bankFields;
            //     }
            // }

            // if (!data.storeTypeId) {
            //     return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            // }

            //obj.storeType = { $in: [ObjectId(data.storeTypeId)] };
            obj.role = "DRIVER";

            if (data.fieldName && data.fieldValue) {
                obj[data.fieldName] = { $regex: data.fieldValue || '', $options: 'i' };
            } else {
                obj.status = { $ne: "archived" };
            }

            if (data.search) {
                obj['$or'] = [];
                obj['$or'].push({ name: { $regex: data.search || '', $options: 'i' } })
                obj['$or'].push({ email: { $regex: data.search || '', $options: 'i' } })
                obj['$or'].push({ mobileNumber: { $regex: data.search || '', $options: 'i' } })
            }
            let count = await User.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let totalcount = count.length > 0 ? count[0].count : 0;
            User.getUsersWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount));
                }
            });
        } catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    driverAddBankAccount: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data._id = user._id;
            let store = req.store;
            let getBankFields = await Store.findById(store.storeId, 'bankFields');

            let bankFields = [];

            if (getBankFields != null) {

                if (getBankFields.bankFields && getBankFields.bankFields.length > 0) {
                    bankFields = getBankFields.bankFields;
                }
            }

            if (data.bankFields.length == 0) {
                return res.json(helper.showValidationErrorResponse('BANK_DETAILS_IS_REQUIRED'));
            }

            let message = '';
            let flag = false;

            for (let index = 0; index < data.bankFields.length; index++) {
                let value = data.bankFields[index].value;
                if (!value) {
                    flag = true;
                    message = data.bankFields[index].label + ' is required';
                    break;
                }
            }

            if (flag) {
                return res.json(helper.showParamsErrorResponse(message));
            }

            User.updateAccountDetails(data, async (err, resdata) => {
                if (err || resdata == null) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    if (bankFields.length > 0 && resdata.bankFields && resdata.bankFields.length > 0) {

                        await Promise.all(bankFields.map(element => {

                            let value = '';

                            let getField = resdata.bankFields.filter(ele => {
                                return ele.key === element.key;
                            });

                            if (getField.length > 0) {
                                value = getField[0].value;
                            }

                            element['value'] = value;

                        }));
                    }

                    resdata.set("bankFields", bankFields, { strict: false });

                    res.json(helper.showSuccessResponse('ACCOUNT_UPDATE_SUCCESS', resdata));
                }
            });
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getEarning: async (req, res) => {
        try {
            let user = req.user;
            let userId = user._id;

            let today = {};
            let week = {};
            let currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            let last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);
            last7Days.setHours(0, 0, 0, 0);

            let getTransaction = await paymentLedger.aggregate([
                { $match: { payment_to: ObjectId(userId) } },
                { $sort: { date_created_utc: -1 } }
            ]);

            //console.log("getTransaction", getTransaction);

            let getTodayEarned = await paymentLedger.aggregate([
                { $match: { payment_to: ObjectId(userId), type: 'credit', date_created_utc: { $gte: new Date(currentDate) } } },
                { $sort: { date_created_utc: -1 } },
                { $group: { _id: '$payment_to', earned: { $sum: "$amount" } } }
            ]);

            if (getTodayEarned.length > 0) {
                today.earned = helper.roundNumber(getTodayEarned[0].earned);
            } else {
                today.earned = 0;
            }

            //console.log("getTodayEarned", getTodayEarned);

            let getlast7DaysEarned = await paymentLedger.aggregate([
                { $match: { payment_to: ObjectId(userId), type: 'credit', date_created_utc: { $gte: new Date(last7Days), $lt: new Date(currentDate) } } },
                { $sort: { date_created_utc: -1 } },
                { $group: { _id: '$payment_to', earned: { $sum: "$amount" } } }
            ]);

            if (getlast7DaysEarned.length > 0) {
                week.earned = helper.roundNumber(getlast7DaysEarned[0].earned);
            } else {
                week.earned = 0;
            }

            //console.log("getlast7DaysEarned", getlast7DaysEarned);

            let getTodayReports = await Report.aggregate([
                { $match: { user: ObjectId(userId), date_created_utc: { $gte: new Date(currentDate) } } },
                { $sort: { date_modified_utc: -1 } }
            ]);

            //console.log("getTodayReports", getTodayReports);

            if (getTodayReports.length > 0) {
                today.request = getTodayReports[0].request;
                today.accepted = getTodayReports[0].accepted;
                today.rejected = getTodayReports[0].rejected;
                today.completed = getTodayReports[0].completed;
            } else {
                today.request = 0;
                today.accepted = 0;
                today.rejected = 0;
                today.completed = 0;
            }

            let getLast7DaysReports = await Report.aggregate([
                { $match: { user: ObjectId(userId), date_created_utc: { $gte: new Date(last7Days), $lt: new Date(currentDate) } } },
                { $sort: { date_modified_utc: -1 } },
                { $group: { _id: '$user', request: { $sum: "$request" }, accepted: { $sum: "$accepted" }, rejected: { $sum: "$rejected" }, completed: { $sum: "$completed" } } }
            ]);

            //console.log("getLast7DaysReports", getLast7DaysReports);

            if (getLast7DaysReports.length > 0) {
                week.request = getLast7DaysReports[0].request;
                week.accepted = getLast7DaysReports[0].accepted;
                week.rejected = getLast7DaysReports[0].rejected;
                week.completed = getLast7DaysReports[0].completed;
            } else {
                week.request = 0;
                week.accepted = 0;
                week.rejected = 0;
                week.completed = 0;
            }

            const resdata = { title: 'Earning', today: today, week: week, transaction: getTransaction, userId: userId }

            res.json(helper.showSuccessResponse('EARNING_SUCCESS', resdata));
        } catch (err) {
            console.log(err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getEarningWeb: async (req, res) => {
        try {
            let userId = req.params._id;
            let today = {};
            let week = {};
            let currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            let last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);
            last7Days.setHours(0, 0, 0, 0);

            let getTransaction = await paymentLedger.aggregate([
                { $match: { payment_to: ObjectId(userId) } },
                { $sort: { date_created_utc: -1 } }
            ]);

            //console.log("getTransaction", getTransaction);

            let getTodayEarned = await paymentLedger.aggregate([
                { $match: { payment_to: ObjectId(userId), type: 'credit', date_created_utc: { $gte: new Date(currentDate) } } },
                { $sort: { date_created_utc: -1 } },
                { $group: { _id: '$payment_to', earned: { $sum: "$amount" } } }
            ]);

            if (getTodayEarned.length > 0) {
                today.earned = helper.roundNumber(getTodayEarned[0].earned);
            } else {
                today.earned = 0;
            }

            //console.log("getTodayEarned", getTodayEarned);

            let getlast7DaysEarned = await paymentLedger.aggregate([
                { $match: { payment_to: ObjectId(userId), type: 'credit', date_created_utc: { $gte: new Date(last7Days), $lt: new Date(currentDate) } } },
                { $sort: { date_created_utc: -1 } },
                { $group: { _id: '$payment_to', earned: { $sum: "$amount" } } }
            ]);

            if (getlast7DaysEarned.length > 0) {
                week.earned = helper.roundNumber(getlast7DaysEarned[0].earned);
            } else {
                week.earned = 0;
            }

            //console.log("getlast7DaysEarned", getlast7DaysEarned);

            let getTodayReports = await Report.aggregate([
                { $match: { user: ObjectId(userId), date_created_utc: { $gte: new Date(currentDate) } } },
                { $sort: { date_modified_utc: -1 } }
            ]);

            //console.log("getTodayReports", getTodayReports);

            if (getTodayReports.length > 0) {
                today.request = getTodayReports[0].request;
                today.accepted = getTodayReports[0].accepted;
                today.rejected = getTodayReports[0].rejected;
                today.completed = getTodayReports[0].completed;
            } else {
                today.request = 0;
                today.accepted = 0;
                today.rejected = 0;
                today.completed = 0;
            }

            let getLast7DaysReports = await Report.aggregate([
                { $match: { user: ObjectId(userId), date_created_utc: { $gte: new Date(last7Days), $lt: new Date(currentDate) } } },
                { $sort: { date_modified_utc: -1 } },
                { $group: { _id: '$user', request: { $sum: "$request" }, accepted: { $sum: "$accepted" }, rejected: { $sum: "$rejected" }, completed: { $sum: "$completed" } } }
            ]);

            //console.log("getLast7DaysReports", getLast7DaysReports);

            if (getLast7DaysReports.length > 0) {
                week.request = getLast7DaysReports[0].request;
                week.accepted = getLast7DaysReports[0].accepted;
                week.rejected = getLast7DaysReports[0].rejected;
                week.completed = getLast7DaysReports[0].completed;
            } else {
                week.request = 0;
                week.accepted = 0;
                week.rejected = 0;
                week.completed = 0;
            }

            res.render('earning', { title: 'Earning', today: today, week: week, transaction: getTransaction, userId: userId });
        } catch (error) {
            res.render('earning', { title: 'Earning', today: null, week: null, transaction: [] });
        }
    },

    getWalletBalance: async (req, res) => {
        try {
            let user = req.user;

            let getBalance = await paymentLedger
                .find({ payment_to: user._id })
                .sort({ date_created_utc: -1 })
                .limit(1);

            let balance = 0;

            if (getBalance.length > 0) {
                balance = getBalance[0].balance;
            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', { wallet: balance }));

        } catch (error) {
            console.log(err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}