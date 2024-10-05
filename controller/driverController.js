const User = require('../models/userTable');
const Utils = require('../helper/utils');
const Order = require('../models/ordersTable');
const vehicletable = require('../module/delivery/models/driverVehicleTable')
const ObjectId = require('objectid');
const paymentLedger = require('../models/paymentLedgerTable');
const Report = require('../models/reportTable');
const Document = require('../models/documentsTable')
const Store = require('../models/storeTable');
const emailService = require("../helper/emailService")
const storeInitial = require('../initial/storeInitial');
const validator = require('validator');
const logTable = require('../models/logTable')
const mailgunSendEmail = require('../lib/mailgunSendEmail');
const { freeRideAssignNotification } = require('../module/delivery/utility/freeRideNotification');
const { afterDeleteAccount } = require("../helper/referralCommission");

module.exports = {

    createUserCheck: async (req, res) => {
        try {
            let data = req.body;
            if (req.store) {
                let store = req.store;
                data.store = store.storeId;
            }

            const getUser = await User.findOne({ email: data.email, role: "DRIVER", email: data.email, status: { $ne: "archived" } });

            if (getUser != null) {
                return res.json(helper.showValidationErrorResponse('USER_EXISTS'));
            }

            res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', data));
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    importDriverViaCSV: async (req, res) => {
        try {
            let data = req.body;

            let store = req.store;
            data.store = store.storeId;

            let storeData = await Store.findById(ObjectId(data.store))
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            let storebankFields = storeData.bankFields


            let file = req.file

            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));


            res.json(helper.showSuccessResponse('DRIVER_CSV_IMPORTED', {}));

            let filePath = req.file.path
            let csvData = await helper.csvToJson(filePath)

            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i + 1
            }
            const csvDataCopy = csvData
            let csvDataCopy2 = []

            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local
            csvData = [...new Map(csvData.map(item => [item["email"], item])).values()]

            let getEmails = csvData.map(a => a["email"])// ;

            const getUserEmail = await User.distinct('email', { email: { $in: getEmails }, store: ObjectId(data.store), role: "DRIVER", status: { $ne: "archived" } });

            let errMsg = ""
            if (getUserEmail.length > 0)
                errMsg = getUserEmail.toString() + " already exist,"
            csvData.map(async function (itm) {
                let validationData = await helper.importObjectValidation(errMsg, itm, getUserEmail, 'Driver', 'email')
                errMsg = validationData.errMsg

                csvDataCopy2.push(validationData.itm)
            })
            var result = csvData.filter(function (itm) {
                return (
                    itm.email
                    && validator.isEmail(itm.email)
                    && !getUserEmail.includes(itm.email)
                    && itm.name && itm.countryCode
                    && itm.mobileNumber
                    && validator.isMobilePhone(itm.mobileNumber)
                    && itm.address && itm.password)
            });

            let obj = {
                type: "DRIVER_IMPORT",
                id: data.store,
                idType: "stores",
                message: "Import driver",
                notes: errMsg,
                status: 'error',
                meta_data: [{ key: "storeName", value: storeData.storeName }, { key: "slug", value: storeData.slug }]
            }
            await logTable.remove({ type: "DRIVER_IMPORT", id: data.store, idType: "stores" })
            logTable.addLog(obj, (err, data) => { });
            let finalArray = []
            for (let index = 0; index < result.length; index++) {
                let element = result[index];
                element.bankFields = storebankFields
                element.store = data.store

                if (element.account_number || element.account_name || element.bank_name || element.routing_number) {
                    element.bankFields.forEach((item, i) => {
                        if (item.label === "Account Number" && element.account_number)
                            element.bankFields[i].value = element.account_number
                        if (item.label === "Account Name" && element.account_name)
                            element.bankFields[i].value = element.account_name
                        if (item.label === "Bank Name" && element.bank_name)
                            element.bankFields[i].value = element.bank_name
                        if (item.label === "Routing Number" && element.routing_number)
                            element.bankFields[i].value = element.routing_number
                    })
                }
                element.countryCode = element.countryCode.trim()
                element.countryCode = (element.countryCode.includes("+") ? element.countryCode : "+" + element.countryCode);
                element.role = "DRIVER";
                element.status = "approved";
                element.onlineStatus = "offline";
                let getHash = await Utils.hashPassword(element.password);

                element.password = getHash.hashedPassword;
                element.salt = getHash.salt;
                let defaultData = storeInitial.getDriverDefaultData();

                element.date_created_utc = new Date();
                element.isBankFieldsAdded = false;
                element = { ...element, ...defaultData };
                finalArray.push(element)
            }

            let getSNO = csvDataCopy2.map(a => a["SNO"])// ;
            for (let j = 0; j < csvDataCopy.length; j++) {
                let element = csvDataCopy[j];
                if (!getSNO.includes(element.SNO)) {
                    element.rowStatus = 'failure'
                    element.reason = 'Duplicate email id.'
                    csvDataCopy2.push(element)
                }

            }


            User.insertMany(finalArray, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    await Promise.all(resdata.map((item) => {
                        emailService.driverRegisterEmail(item);
                    }))

                    if (csvDataCopy2.length > 0) {
                        //storeData.email
                        let to = storeData.email
                        let sub = "Import driver CSV"
                        let msg = "Import driver csv data."
                        csvDataCopy2 = csvDataCopy2.sort((a, b) => (a.SNO > b.SNO) ? 1 : -1)


                        let csvEmailData = await helper.json2csv(csvDataCopy2, Object.keys(csvDataCopy2[0]))

                        if (csvEmailData.status)
                            await mailgunSendEmail.sendEmailWithAttachment(mailgunKey, to, sub, msg, csvEmailData.csv, "importDriverCSV_" + new Date().getTime() + ".csv")
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    createUser: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;

            const getUser = await User.findOne({ store: data.store, email: data.email, role: "DRIVER", status: { $ne: "archived" } });

            if (getUser != null) {
                return res.json(helper.showValidationErrorResponse('USER_EXISTS'));
            }

            const getHash = await Utils.hashPassword(data.password);
            data.password = getHash.hashedPassword;
            data.salt = getHash.salt;
            data.role = "DRIVER";
            data.onlineStatus = "offline";
            data.commisionType = data.commisionType ? data.commisionType : "global";
            data.commission = data.commission ? data.commission : { vendor: 0, deliveryBoy: 90 };

            let defaultData = storeInitial.getDriverDefaultData();
            data = { ...data, ...defaultData };

            let values = [];
            let complete = [];


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

                //console.log("values doc", values);
            }

            User.addDriverByEmail(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (values.length > 0) {
                        let doc = await Document.create({ user: resdata._id, values: values, complete: complete, date_created_utc: new Date() });
                        //console.log("doc", doc);
                    }

                    emailService.driverRegisterEmail(resdata);

                    res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', resdata));
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
            let getUser = null;

            if (req.store) {
                getUser = await User.findOne({ store: store.storeId, email: data.email, role: "DRIVER", status: { $ne: "archived" } })
                    .populate({ path: 'store', select: 'status' })
                    .exec();
            } else {
                getUser = await User.findOne({ email: data.email, role: "DRIVER", status: { $ne: "archived" } })
                    .populate({ path: 'store', select: 'status' })
                    .exec();
            }

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
            if (validPassword) {
                let token = Utils.generateToken(getUser, store.tokenExpiresIn);

                getUser.tokens = [{ token }];

                User.updateToken(getUser, (err, mytoken) => {
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

            let getUser = await User.findOne({ store: store.storeId, email: data.email, role: "DRIVER", status: { $ne: "archived" } });

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
            console.log("userForgotPassword", err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    driverResendOTP: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
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
            data.store = store.storeId;
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

                    User.updateToken(getUser, async (err, mytoken) => {
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
        } catch (error) {
            console.log("changeUserPassword", error);
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

            User.getUserById(id, async (err, resdata) => {
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

            if (user.email) {

                if (data.email.toString() != user.email.toString()) {
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

    updateDriverByAdmin: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let hideThings = store.hideThings
            let demo = hideThings.filter(element => element.type == "isDemo")
            let is_demo = demo.length ? demo[0]['value'] : false


            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getVendor = await User.findById(data._id, 'email');

            if (getVendor.email) {
                if (data.email.includes("*")) {
                    delete data['email']
                }
                if (data.email && data.email.toString() != getVendor.email.toString()) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_EMAIL'));
                    }
                    const getUser = await User.findOne({ store: store.storeId, email: data.email, role: "DRIVER", status: { $ne: "archived" } });

                    if (getUser != null) {
                        return res.json(helper.showValidationErrorResponse('EMAIL_ALREADY_EXISTS'));
                    }
                }

            }
            if (data.mobileNumber.includes("*")) {
                delete data['mobileNumber']
            }
            if (getVendor.mobileNumber) {
                if (data.mobileNumber && data.mobileNumber.toString() != getVendor.mobileNumber.toString()) {
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
            if (data.hasOwnProperty("password")) {
                delete data.password;
            }

            User.updateUserProfile(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (is_demo) {
                        resdata.email = resdata.email ? resdata.email.replace(/.(?=.{10})/g, '*') : resdata.email
                        resdata.mobileNumber = resdata.mobileNumber ? resdata.mobileNumber.replace(/.(?=.{2})/g, '*') : resdata.mobileNumber
                    }
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                    if (data.freeRideSetting && data.freeRideSetting.status)
                        freeRideAssignNotification(resdata._id);
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
            let hideContactInfo = req.hideContactInfo;
            let is_demo = false;
            if (helper.isValidHidethings(store, "isDemo") || helper.validateHideContactInfo(hideContactInfo, "DRIVER")) {
                is_demo = true;
            };
            let getBankFields = await Store.findById(store.storeId, 'bankFields');
            let user_obj = { _id: ObjectId(id), store: store.storeId, role: "DRIVER" }
            let bankFields = [];

            if (getBankFields != null) {

                if (getBankFields.bankFields && getBankFields.bankFields.length > 0) {
                    bankFields = getBankFields.bankFields;
                }
            }

            User.getUserBystoreId(user_obj, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata) {
                        resdata.password = '';
                        resdata.salt = '';
                        resdata.tokens = [];
                        if (is_demo) {
                            resdata.email = resdata.email ? resdata.email.replace(/.(?=.{10})/g, '*') : resdata.email
                            resdata.mobileNumber = resdata.mobileNumber ? resdata.mobileNumber.replace(/.(?=.{2})/g, '*') : resdata.mobileNumber
                        }
                        let [latestOrders, totalOrders, orderAvgValue, driverEarning, vehicleList] = await Promise.all([
                            Order.aggregate([{ $match: { driver: ObjectId(resdata._id) } }, { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customerDetails' } }, { $lookup: { from: 'users', localField: 'vendor', foreignField: '_id', as: 'vendorDetails' } }, { $lookup: { from: 'storetypes', localField: 'storeType', foreignField: '_id', as: 'storeType' } }, { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } }, { $unwind: { path: "$vendorDetails", preserveNullAndEmptyArrays: true } }, { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } }, { $project: { customOrderId: 1, billingDetails: 1, shippingDetails: 1, line_items: 1, vendor: 1, user: 1, isDriverAssign: 1, isDriverArrivedAtPickup: 1, isOrderMarkReady: 1, subTotal: 1, tax: 1, taxAmount: 1, tip: 1, tipAmount: 1, discountTotal: 1, deliveryFee: 1, deliveryBoyEarning: 1, orderTotal: 1, orderStatus: 1, date_created_utc: 1, vendorDetails: { name: 1, address: 1, profileImage: 1 }, customerDetails: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1 }, vendorDetails: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1 }, "storeType.storeType": 1 } }, { $sort: { date_created_utc: -1 } }, { $limit: 10 }]),
                            Order.aggregate([{ $match: { driver: ObjectId(resdata._id), orderStatus: "completed" } }]),
                            Order.aggregate([{ $match: { driver: ObjectId(resdata._id), orderStatus: "completed" } }, { $group: { _id: null, orderAvg: { $avg: "$orderTotal" } } }]),
                            Order.aggregate([{ $match: { driver: ObjectId(resdata._id), orderStatus: "completed" } }, { $group: { _id: null, deliveryBoyEarning: { $sum: "$deliveryBoyEarning" } } }]),
                            vehicletable.aggregate([{ $match: { user: ObjectId(resdata._id) } }, { $lookup: { from: 'vehicletypes', localField: 'vehicleType', foreignField: '_id', as: 'vehicle' } }, { $unwind: { path: "$vehicle", preserveNullAndEmptyArrays: true } }, { $lookup: { from: 'files', localField: 'vehicle.image', foreignField: '_id', as: 'image' } }, { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } }, { $project: { _id: 1, values: 1, template: 1, vehicleType: { _id: "$vehicle._id", name: "$vehicle.name", image: { _id: "$image._id", link: "$image.link" } } } }])
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
                        resdata.set("vehicleList", vehicleList, { strict: false })
                        return res.json(helper.showSuccessResponse('USER_DETAIL', resdata));
                    }
                    else {
                        return res.json(helper.showSuccessResponse('USER_DETAIL', {}));
                    }
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
                    module.exports.removeDriverFromPreferList(resdata);
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });

        } catch (error) {
            console.log("error:", error)
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
            let user = req.user;
            let hideContactInfo = req.hideContactInfo;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            let is_demo = false;
            if (user.role == 'STAFF' && helper.isValidHidethings(store, "driverlistdispatcher")
                && user.driverassign && user.driverassign.length) {
                obj["_id"] = { $in: user.driverassign };
            }
            if (helper.isValidHidethings(store, "isDemo") || helper.validateHideContactInfo(hideContactInfo, "DRIVER")) {
                is_demo = true;
            };
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
            User.getUsersWithFilter(obj, sortByField, sortOrder, paged, pageSize, is_demo, async (err, resdata) => {
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
                { $match: { payment_to: ObjectId(userId), date_created_utc: { $gte: new Date(currentDate) } } },
                {
                    $addFields: {
                        amount: {
                            $cond: { if: { $eq: ["$type", "credit"] }, then: "$amount", else: { $multiply: ["$amount", -1] } }
                        }
                    }
                },
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
                { $match: { payment_to: ObjectId(userId), date_created_utc: { $gte: new Date(last7Days), $lt: new Date(currentDate) } } },
                {
                    $addFields: {
                        amount: {
                            $cond: { if: { $eq: ["$type", "credit"] }, then: "$amount", else: { $multiply: ["$amount", -1] } }
                        }
                    }
                },
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
    },
    archiveUserByItSelf: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            data._id = data._id ? data._id : user && user._id;

            let obj = {};
            obj.store = ObjectId(store.storeId);
            let hideThings = store.hideThings
            let demo = hideThings.filter(element => element.type == "isDemo")
            let is_demo = demo.length ? demo[0]['value'] : false

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            data.status = "archived";

            if (is_demo) {

                console.log("Can't delete this demo account")
                return res.json(helper.showValidationErrorResponse("Can't delete this demo account"));

            }


            User.updateUserProfile(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    module.exports.removeDriverFromPreferList(resdata);
                    afterDeleteAccount(resdata, store);
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });

        } catch (error) {
            console.log("error:", error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    removeDriverFromPreferList: async (data) => {
        try {
            let query = { preferredDriver: { $exists: true, $not: { $size: 0 } }, "preferredDriver.driver": data._id };
            let update = { $pull: { preferredDriver: { driver: ObjectId(data._id) } } };
            await User.updateMany(query, update);
        } catch (error) {
            console.log(error)
        }

    },
    driverUpdateDetailsByAdmin: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;

            let message = '';
            let flag = false;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }

            if (!data.bankFields || !data.bankFields) {
                return res.json(helper.showValidationErrorResponse('BANK_FIELDS_IS_REQUIRED'));
            }
            // else {
            //     for (let index = 0; index < data.bankFields.length; index++) {
            //         let value = data.bankFields[index].value;
            //         if (!value) {
            //             flag = true;
            //             message = data.bankFields[index].label + ' is required';
            //             break;
            //          }
            //     }
            //      data.isBankFieldsAdded = true;

            // }
            // if (flag) {
            //     return res.json(helper.showParamsErrorResponse(message));
            // }

            User.updateUserProfile(data, async (err, resdata) => {
                if (err || resdata == null) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.bankFields && resdata.bankFields.length) {
                        res.json(helper.showSuccessResponse('ACCOUNT_UPDATE_SUCCESS', resdata.bankFields));
                    }
                    else {
                        res.json(helper.showSuccessResponse('ACCOUNT_UPDATE_SUCCESS', []));
                    }
                }
            });
        }
        catch (err) {
            console.log(err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    drivereditDetailsByAdmin: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }
            let getBankFields = await Store.findById(store.storeId, 'bankFields');
            let user_obj = { _id: ObjectId(data._id), store: store.storeId, role: "DRIVER" }
            let bankFields = [];

            if (getBankFields != null) {

                if (getBankFields.bankFields && getBankFields.bankFields.length > 0) {
                    bankFields = getBankFields.bankFields;
                }
            }

            User.getUserBystoreId(user_obj, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata) {
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

                        //resdata.set("bankFields", bankFields, { strict: false });
                        return res.json(helper.showSuccessResponse('BANK_DETAIL', bankFields));
                    }
                    else {
                        return res.json(helper.showSuccessResponse('BANK_DETAIL', []));
                    }
                }
            });
        }
        catch (err) {
            console.log(err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }


}