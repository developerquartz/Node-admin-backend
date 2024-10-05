const User = require('../models/userTable');
const Store = require('../models/storeTable');
const Order = require('../models/ordersTable');
const Product = require('../models/productsTable');
const Category = require('../models/categoryTable');
const storeType = require('../models/storeTypeTable');
const Utils = require('../helper/utils');
const ApiRequest = require('../helper/request')
const storeInitial = require('../initial/storeInitial');
const Config = require('../config/constants.json');
const mailgunSendEmail = require('../lib/mailgunSendEmail');
const ObjectId = require('objectid');
const Address = require('../models/addressTable');
const paymentLedger = require('../models/paymentLedgerTable');
const Transaction = require('../helper/transaction');
const Push = require('../helper/pushNotification');
const Notification = require('../models/notificationTable');
const Review = require('../models/reviewTable');
const paymentMiddleware = require('../middleware/payments');
const Refund = require('../models/refundTable');
const Domain = require('../models/domainsTable');
const request = require('request');
const emailService = require("../helper/emailService");
const Plans = require('../models/billingPlansTable');
const Addon = require('../models/addonTable.js');
const Cuisine = require('../models/cuisinesTable.js');
const Attribute = require('../models/attributeTable.js')
const validator = require('validator');
const moment = require('moment');
const agenda = require('../cron/agenda');
const Payment = require('../middleware/payments');
const cardTable = require('../models/cardTable');
const settingService = require('../helper/settingService');
//const csv = require('csv-express')
const { Parser } = require('json2csv');
const fileTable = require("../models/fileTable");
const google = require("../helper/googleMap")
const logTable = require('../models/logTable');
const publicIp = require('public-ip');
const spltipay360data = require('../module/pay360split/controller/controller')
const DocumentTemplate = require('../models/documentTemplate');
const Vehicle = require('../module/delivery/models/vehicelTypesTable');
const driverVehicle = require('../module/delivery/models/driverVehicleTable');
const notifyUser = require("../helper/adjustPayment");
const ProductReview = require('../models/productReviewTable');
const helper = require('../helper/helper');
const vendorCloneProcess = require("../helper/vendorClone");
//var html_to_pdf = require('html-pdf-node');
var pdf = require('html-pdf');
var randomstring = require("randomstring");
module.exports = {
    updateLinkInFile: async (req, res) => {
        try {
            let fileId = req.body.id
            let Link = req.body.link
            if (!fileId)
                return res.json(helper.showValidationErrorResponse("FILE_ID_IS_REQUIRED"));
            if (!Link)
                return res.json(helper.showValidationErrorResponse("FILE_LINK_IS_REQUIRED"));

            let updateFile = await fileTable.findByIdAndUpdate(fileId, { $set: { link: Link } }, { new: true });

            if (updateFile) {
                res.json(helper.showSuccessResponse('DATA_SUCCESS', updateFile));
            } else {
                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));
            }
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    updateVendorTakeawayAllStoreTypeScript: async (req, res) => {
        try {

            let updateAllStoreTypeScript = await storeInitial.updateVendorTakeawayAllStoreTypeScript();

            if (updateAllStoreTypeScript) {
                res.json(helper.showSuccessResponse('DATA_SUCCESS', updateAllStoreTypeScript));
            } else {
                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));
            }
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateKeysInAllStoreScript: async (req, res) => {
        try {
            let data = {}
            if (env.mailgun)
                data.mailgun = env.mailgun
            if (env.twilio)
                data.twilio = env.twilio
            if (env.firebase)
                data.firebase = env.firebase

            let updateAllStoreScript = await Store.updateMany({}, { $set: data });

            if (updateAllStoreScript) {
                res.json(helper.showSuccessResponse('DATA_SUCCESS', updateAllStoreScript));
            } else {
                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));
            }
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addContentScript: async (req, res) => {
        try {
            Store.getStores((err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.length === 0) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', []));
                    } else {
                        resdata.map(async (doc) => {
                            if (doc.plan.billingPlan.type === "basic" && doc._id && doc.owner) {
                                let processContentPagess = await storeInitial.processContentPagesByScript(doc._id, doc.owner);
                                await Promise.all(processContentPagess.map(async (item) => {
                                    if (!["HOMEPAGE", "ABOUT_US", "PRIVACY_POLICY", "REFUND_POLICY", "TERMS_CONDITIONS", "APP_BANNER"].includes(item.type))
                                        return;

                                    let objArr = []
                                    let categoryArr = []
                                    objArr = await storeInitial.addContentPageDefaultData(item, plan, storeTypeId, categoryArr)

                                    await Section.insertMany(objArr, async (err, result) => {
                                        let ids = []
                                        result.map((item2) => {
                                            ids.push(item2._id)
                                        })
                                        let refData = {
                                            contentSection: item._id,
                                            ref: ids
                                        }
                                        Content.AddRefToFields(refData);
                                    });
                                }));
                            }
                        })

                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoresList: async (req, res) => {
        try {
            Store.getStores((err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.length === 0) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', []));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        }
        catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    isUserExists: async (req, res) => {
        let data = req.body;
        data.role = 'ADMIN';
        data.status = 'temp';
        data.date_created_utc = new Date();
        if (data.storeType) {
            delete data.storeType;
        }
        if (data.password.length < 5) {
            return res.json(helper.showValidationErrorResponse('Please Enter the password at least five length'));
        }
        if (data.password) {
            const getHash = await Utils.hashPassword(data.password);
            data.password = getHash.hashedPassword;
            data.salt = getHash.salt;
        }
        let user = await User.findOneAndUpdate({ email: data.email, role: data.role }, data, { "fields": { password: 0, salt: 0, tokens: 0, firebaseToken: 0 }, upsert: true, "new": true });
        let ip = helper.getIp(req);
        if (ip != env.publicIp) {
            let obj = {};
            obj.full_name = user.name
            obj.email = user.email
            obj.mobile_number = user.mobileNumber
            obj.message = ''
            obj.utm_source = ''
            obj.utm_medium = ''
            obj.utm_campaign = ''
            obj.utm_term = ''
            obj.lead_type = 'hlc'
            obj.captcha_render = 'false'
            let query_string = Object.keys(obj).map(key => key + '=' + obj[key]).join('&')
            ApiRequest.createLeadInHubspot(query_string);
        }
        res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS'));
    },

    createUser: async (req, res) => {
        try {
            let data = req.body;
            if (!data.timezone) {
                return res.json(helper.showValidationErrorResponse('TIME ZONE REQUIRED'));
            }
            if (!Object.keys(data.currency).length) {
                return res.json(helper.showValidationErrorResponse('CURRENCY REQUIRED'));
            }
            let defaultData = storeInitial.getDefaultData(data.country);
            data = { ...data, ...defaultData };
            let planObj = {};
            planObj.isAddon = false;
            planObj.productType = data.plan.productType;
            if (data.plan.productType == "store") {
                data.plan['planType'] = "basic"
            }
            else {
                data.plan['planType'] = "ultimate"
            }
            let planDetails = data.plan;
            console.log("data.plan.planType.-----", data.plan.planType)
            const getBillingPlan = await Plans.findOne({ type: data.plan.planType.toString().trim(), status: "active" })

            if (getBillingPlan) {
                data.projectstatus = "live"
            }

            planObj.billingPlan = getBillingPlan._id;

            // if (data.plan && data.plan.planType === "basic") {

            if (!data.address) {
                return res.json(helper.showValidationErrorResponse('ADDRESS_IS_REQUIRED'));
            }

            if (!data.lng) {
                return res.json(helper.showValidationErrorResponse('LNG_IS_REQUIRED'));
            }

            if (!data.lat) {
                return res.json(helper.showValidationErrorResponse('LAT_IS_REQUIRED'));
            }

            const location = { type: "Point", coordinates: [Number(data.lng), Number(data.lat)] };

            data.userLocation = location;
            //}


            data.plan = planObj;
            planObj.isTrial = false;
            Store.addStore(data, async (err, store) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    data.store = store._id;
                    //create storetype
                    let processSt = await storeInitial.processStoreTypes(data.storeTypes, data.store);
                    data.storeType = processSt;
                    const getHash = await Utils.hashPassword(data.password);
                    data.password = getHash.hashedPassword;
                    data.salt = getHash.salt;
                    data.role = "ADMIN";
                    data.status = "active";

                    User.addUserAdminByEmail(data, async (err, resdata) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            console.log("<----------------afterStoreSignupSuccess---------------->")
                            let prodessData = await storeInitial.afterStoreSignupSuccess(store, data.storeType, resdata, planDetails);
                            const token = Utils.generateToken(resdata);
                            resdata.tokens = [{ token }];
                            //emailService.storeRegisterEmail(resdata);

                            User.updateToken(resdata, async (err, mytoken) => {
                                if (err) {
                                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                } else {
                                    let resData = helper.showSuccessResponse('USER_REGISTER_SUCCESS', mytoken);
                                    resData.token = token;
                                    res.json(resData);
                                    //run script
                                    // let runSetupTime = 'in 1 minutes';
                                    // agenda.schedule(runSetupTime, 'check setup store', { storeId: data.store });
                                }
                            });
                        }
                    });
                }
            });
        } catch (error) {
            console.log("store signup", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userLogin: async (req, res) => {
        try {
            let data = req.body;

            const getUser = await User.findOne({ $or: [{ role: "ADMIN", email: data.email }, { role: "VENDOR", email: data.email }, { role: "STAFF", email: data.email }], status: { $nin: ["archived", "temp"] } })
                .populate({ path: "storeType", select: "storeType storeVendorType" })
                .populate({ path: "store", select: "status language", match: { status: { $ne: 'archived' } } })
                .exec();

            if (getUser == null) {
                return res.json(helper.showValidationErrorResponse('EMAIL_NOT_EXISTS'));
            }

            if (!getUser.store) {
                const resdata = helper.showValidationErrorResponse('INVALID_STORE');
                return res.json(resdata);
            }
            req.setLocale(getUser.store.language.code);

            if (getUser.store.projectstatus === 'suspended') {
                const resdata = helper.showValidationErrorResponse('SUSPENDED_STORE');
                resdata.storeStatus = 'suspended';
                return res.json(resdata);
            }

            if (getUser.store.status === 'inactive') {
                const resdata = helper.showValidationErrorResponse('SUSPENDED_STORE');
                resdata.storeStatus = 'inactive';
                return res.json(resdata);
            }

            if (getUser.role === "VENDOR" && getUser.storeType && getUser.storeType.length <= 0) {
                return res.json(helper.showValidationErrorResponse('EMAIL_NOT_EXISTS'));
            }

            if (getUser.role === "VENDOR" && getUser.storeType[0].storeVendorType === "SINGLE") {
                return res.json(helper.showValidationErrorResponse('EMAIL_NOT_EXISTS'));
            }

            if (getUser.status === 'blocked') {
                return res.json(helper.showValidationErrorResponse('USER_BLOCKED'));
            }

            if (getUser.status === 'rejected') {
                return res.json(helper.showValidationErrorResponse('USER_REJECTED'));
            }

            if (getUser.status === 'inactive') {
                return res.json(helper.showValidationErrorResponse('USER_INACTIVE'));
            }

            if (getUser.role === "ADMIN" || getUser.role === "VENDOR" || getUser.role === "DRIVER") {

                if (getUser.status === 'created') {
                    return res.json(helper.showValidationErrorResponse('USER_NOT_APPROVED'));
                }
            }

            const validPassword = await Utils.verifyPassword(getUser.password, data.password);

            if (validPassword) {
                // Stop Staff and Vendor login if admin plan expired
                if (getUser.role === "STAFF" || getUser.role === "VENDOR") {
                    const getStore = await Store.findOne({ _id: ObjectId(getUser.store._id) });

                    // console.log("getStore ", getStore)

                    if (getStore == null) {
                        return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
                    }

                    //let isExpired = false;

                    // if (!getStore.plan.endDate) {
                    //     isExpired = true;
                    // } else {
                    //     let today = new Date();
                    //     today.setHours(0, 0, 0, 0);
                    //     if (new Date(today).getTime() < new Date(getStore.plan.endDate).getTime() || ["active", "gracePeriod"].includes(getStore.status)) {
                    //         isExpired = false;
                    //     } else {
                    //         isExpired = true;
                    //     }
                    // }

                    // if (isExpired) {
                    //     return res.json(helper.showValidationErrorResponse('STORE_PLAN_EXPIRED'))
                    // }
                }

                const token = Utils.generateToken(getUser);

                if (getUser.tokens == null) {
                    getUser.tokens = token;
                } else {
                    getUser.tokens = getUser.tokens.concat({ token });

                    User.updateToken(getUser, (err, mytoken) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            const getstoreType = mytoken.storeType.filter(storeType => {
                                return storeType.status === 'active';
                            });
                            mytoken.set("storeTypeEnabled", getstoreType, { strict: false });
                            let resdata = helper.showSuccessResponse('LOGIN_SUCCESS', mytoken);
                            resdata.token = token;
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

            let getUser = await User.findOne({ status: { $ne: "archived" }, $or: [{ email: data.email, role: "ADMIN" }, { email: data.email, role: "VENDOR" }, { email: data.email, role: "STAFF" }] });

            if (getUser != null) {
                data._id = getUser._id;
                let exptime = new Date();
                exptime.setHours(exptime.getHours() + 1);
                data.OTPexp = exptime;
                let OTP = Utils.generateOTP(4);
                data.OTP = OTP;
                getUser.OTP = OTP;
                // const sTemplate = await Template.findOne({ store: getUser.store, constant: 'USER_OTP_FORGOT_PASSWORD' });

                // if (sTemplate == null || sTemplate == undefined) {
                //     data.msg = OTP;
                //     data.subject = "Forgot Password OTP";
                // } else {
                //     data.msg = sTemplate.body.replace('[OTP]', OTP);
                //     data.subject = sTemplate.subject;
                // }

                // const senemail = await mailgunSendEmail.sendEmail(data.email, data.subject, data.msg);
                emailService.vendorForgotPasswordEmail(getUser);

                User.updateOTP(data, (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let result = helper.showSuccessResponse('OTP_SUCCESS', {});
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

            data.email = data.email.trim().toLowerCase();
            const passmain = data.password;
            const getUser = await User.findOne({ status: { $ne: "archived" }, $or: [{ email: data.email, role: "ADMIN" }, { email: data.email, role: "VENDOR" }, { email: data.email, role: "STAFF" }] })
                .populate({ path: "store", select: 'status hideThings', match: { status: { $ne: 'archived' } } })
                .exec();;

            if (getUser != null) {
                let store = getUser.store;
                let hideThings = store.hideThings
                let demo = hideThings.filter(element => element.type == "isDemo")
                let is_demo = demo.length ? demo[0]['value'] : false
                if (is_demo) {
                    return res.json(helper.showValidationErrorResponse('DEMO_TYPE'));
                }
                data._id = getUser._id;
                let cDate = new Date();
                let exptime = new Date(getUser.OTPexp);
                if (cDate.getTime() >= exptime.getTime()) {
                    return res.json(helper.showValidationErrorResponse('OTP_EXPIRED'));
                }

                if (getUser.OTP == data.otp) {
                    const getHash = await Utils.hashPassword(data.password);
                    data.password = getHash.hashedPassword;
                    data.salt = getHash.salt;
                    const upass = await User.updatePassword(data);

                    /* const mTemplate = await Template.findOne({ store: getUser.store, constant: 'USER_RESET_PASSWORD' });

                    if (mTemplate == null || mTemplate == undefined) {
                        var msg = __('PASSWORD_RESET_MSG', passmain);
                        var sub = __('%s Reset Password', '');
                        var senemail = await mailgunSendEmail.sendEmail(upass.email, sub, msg);
                    } else {
                        var msg = mTemplate.body.replace('[password]', passmain);
                        var senemail = await mailgunSendEmail.sendEmail(upass.email, mTemplate.subject, msg);
                    } */

                    res.json(helper.showSuccessResponse('PASSWORD_RESET_SUCCESS', {}));

                    emailService.userResetPasswordEmail(getUser)
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
            const validPassword = await Utils.verifyPassword(getUser.password, data.currentPassword);

            if (validPassword) {
                const token = Utils.generateToken(getUser);

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

                            emailService.userChangePasswordEmail(upass)
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

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

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
            let store = req.store
            let hideThings = store.hideThings
            let demo = hideThings.filter(element => element.type == "isDemo")
            let is_demo = demo.length ? demo[0]['value'] : false
            if (user.email) {

                if (data.email.toString() != user.email.toString()) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_EMAIL'));
                    }
                    const getUser = await User.findOne({ email: data.email, role: { $in: ["ADMIN", "VENDOR", "STAFF"] }, status: { $nin: ["archived", "temp"] } });

                    if (getUser != null) {
                        return res.json(helper.showValidationErrorResponse('EMAIL_ALREADY_EXISTS'));
                    }
                }

            }
            if (user.mobileNumber) {
                if (data.mobileNumber.toString() != user.mobileNumber.toString()) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_PHONE'));
                    }
                }
            }
            else {
                if (data.mobileNumber) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_PHONE'));
                    }
                }
            }

            User.updateUserProfile(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    const getstoreType = resdata.storeType.filter(storeType => {
                        return storeType.status === 'active';
                    });

                    resdata.set("storeTypeEnabled", getstoreType, { strict: false });
                    res.json(helper.showSuccessResponse('PROFILE_UPDATE_SUCCESS', resdata));

                    try {
                        if (user.store.plan && user.store.plan.billingPlan && user.store.plan.billingPlan.type === "basic")
                            await User.findOneAndUpdate({ email: user.email, role: "VENDOR", store: user.store._id }, { email: data.email }, { new: true })
                    } catch (error) {

                    }


                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserProfileById: async (req, res) => {
        try {
            let user = req.user;

            User.getUserByIdForStore(user._id, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    resdata.password = '';
                    resdata.salt = '';
                    resdata.tokens = [];

                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
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
            if (req.user.role === "VENDOR") {
                req.user.firebaseTokens = req.user.firebaseTokens.filter((token) => {
                    return token.token !== req.body.firebaseToken
                })
            }

            const user = await User.findByIdAndUpdate(req.user._id, { tokens: req.user.tokens, firebaseTokens: req.user.firebaseTokens });

            res.json(helper.showSuccessResponse('LOGOUT_SUCCESS', user));

        } catch (error) {
            console.log("error", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    importUserViaCSV: async (req, res) => {
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

            let file = req.file
            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));

            res.json(helper.showSuccessResponse('CUSTOMER_CSV_IMPORTED'));


            let filePath = req.file.path
            let csvData = await helper.csvToJson(filePath)
            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i
            }
            const csvDataCopy = csvData
            let csvDataCopy2 = []

            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local
            csvData = [...new Map(csvData.map(item => [item["mobileNumber"], item])).values()]

            let getMobile = csvData.map(a => a["mobileNumber"])// ;

            const getUserMobile = await User.distinct('mobileNumber', { mobileNumber: { $in: getMobile }, store: ObjectId(data.store), role: "USER", status: { $eq: "active" } });

            let errMsg = ""
            if (getUserMobile.length > 0)
                errMsg = getUserMobile.toString() + " already exist,"

            csvData.map(async function (itm) {
                let validationData = await helper.importObjectValidation(errMsg, itm, getUserMobile, 'User', 'mobileNumber')
                errMsg = validationData.errMsg

                csvDataCopy2.push(validationData.itm)
            })

            var result = csvData.filter(function (itm) {
                return (getUserMobile.includes(itm.mobileNumber) == false
                    && itm.mobileNumber
                    && validator.isMobilePhone(itm.mobileNumber) && itm.name
                    && itm.countryCode && itm.email && validator.isEmail(itm.email) && itm.password
                )
            });

            let obj = {
                type: "CUSTOMER_IMPORT",
                id: data.store,
                idType: "stores",
                message: "Import customer",
                notes: errMsg,
                status: 'error',
                meta_data: [{ key: "storeName", value: storeData.storeName }, { key: "slug", value: storeData.slug }]
            }
            await logTable.remove({ type: "CUSTOMER_IMPORT", id: data.store, idType: "stores" })
            logTable.addLog(obj, (err, data) => { });
            let finalArray = []
            for (let index = 0; index < result.length; index++) {
                let element = result[index];
                element.store = data.store

                element.role = "USER";
                let getHash = await Utils.hashPassword(element.password);
                element.countryCode = element.countryCode.trim()
                element.countryCode = (element.countryCode.includes("+") ? element.countryCode : "+" + element.countryCode);
                element.password = getHash.hashedPassword;
                element.salt = getHash.salt;
                element.status = "active";
                element.date_created_utc = new Date();
                element.isLoginFromSocial = false;
                finalArray.push(element)
            }
            let getSNO = csvDataCopy2.map(a => a["SNO"])// ;
            for (let j = 0; j < csvDataCopy.length; j++) {
                let element = csvDataCopy[j];
                if (!getSNO.includes(element.SNO)) {
                    element.rowStatus = 'failure'
                    element.reason = 'Duplicate mobile number.'
                    csvDataCopy2.push(element)
                }

            }
            User.insertMany(finalArray, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (csvDataCopy2.length > 0) {
                        //storeData.email
                        let to = storeData.email
                        let sub = "Import customer CSV"
                        let msg = "Import customer csv data."
                        csvDataCopy2 = csvDataCopy2.sort((a, b) => (a.SNO > b.SNO) ? 1 : -1)

                        let csvEmailData = await helper.json2csv(csvDataCopy2, Object.keys(csvDataCopy2[0]))

                        if (csvEmailData.status)
                            await mailgunSendEmail.sendEmailWithAttachment(mailgunKey, to, sub, msg, csvEmailData.csv, "importCustomerCSV_" + new Date().getTime() + ".csv")
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addUserByAdmin: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;

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

            // if (!data.role) {
            //     return res.json(helper.showValidationErrorResponse('ROLE_IS_REQUIRED'));
            // }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            if (req.user.role === "ADMIN") {
                data.role = data.role ? data.role : "USER";

                if (!["USER", "STAFF"].includes(data.role)) {
                    console.log("Admin tried to create user with different role!")
                    return res.json(helper.showValidationErrorResponse('INVALID_ROLE'));
                }
            } else {
                data.role = "USER";
            }

            let getUser = null;
            if (data.role === 'USER') {

                let charAt = data.mobileNumber.charAt(0);

                let obj = {
                    store: data.store,
                    role: "USER",
                    status: { $ne: "archived" }
                };

                if (charAt === '0') {
                    obj['$or'] = [{ mobileNumber: data.mobileNumber }, { mobileNumber: data.mobileNumber.substring(1) }];
                } else {
                    obj['$or'] = [{ mobileNumber: data.mobileNumber }, { mobileNumber: '0' + data.mobileNumber }];
                }

                //console.log("obj", obj);
                data.referralCode = data.name.charAt(0).toUpperCase() + data.name.charAt(1).toUpperCase() + randomstring.generate(10).toUpperCase();

                getUser = await User.findOne(obj);

                if (getUser != null) {
                    return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_ALREADY_EXISTS'));
                }

                getUser = await User.findOne({ role: "USER", store: ObjectId(data.store), $or: [{ mobileNumber: data.mobileNumber }, { email: data.email }], status: { $ne: "archived" } });

                //console.log("getUser", getUser);

            } else {
                getUser = await User.findOne({ email: data.email, status: { $ne: "archived" } });
            }

            if (getUser != null) {
                return res.json(helper.showValidationErrorResponse('EMAIL_OR_MOBILE_NUMBER_ALREADY_EXISTS'));
            }

            const getHash = await Utils.hashPassword(data.password);
            data.password = getHash.hashedPassword;
            data.salt = getHash.salt;

            let func = "addUserByMobile";

            if (data.role === "STAFF") {
                func = "addStaffByEmail"
            }

            User[func](data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    resdata.password = '';
                    resdata.salt = '';
                    if (data.role === 'USER') {
                        emailService.userRegisterEmail(resdata);
                    }
                    res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("error ", error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateUserByAdmin: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store
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

            if (!validator.isMobilePhone(data.mobileNumber)) {
                return res.json(helper.showValidationErrorResponse('INVALID_MOBILE_NUMBER'));
            }

            if (!data.email) {
                return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
            }

            data.email = data.email.toLowerCase().trim();

            if (!validator.isEmail(data.email)) {
                return res.json(helper.showValidationErrorResponse('INVALID_EMAIL'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            data.role = data.role ? data.role : "USER";

            if (!["USER", "STAFF"].includes(data.role)) {
                return res.json(helper.showValidationErrorResponse('INVALID_ROLE'));
            }

            let getUser = await User.findById(data._id, 'email mobileNumber store');

            if (getUser == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_USER_ID'));
            }
            if (data.email.includes("*")) {
                delete data['email']
            }
            if (data.mobileNumber.includes("*")) {
                delete data['mobileNumber']
            }
            if (data.email && data.email.trim().toString() != getUser.email) {
                if (is_demo) {
                    return res.json(helper.showValidationErrorResponse('DEMO_EMAIL'));
                }

                if (data.role === "USER") {

                    let emailCheck = await User.findOne({ store: ObjectId(getUser.store), email: data.email, role: "USER", status: { $ne: "archived" } });

                    if (emailCheck != null) {
                        return res.json(helper.showValidationErrorResponse('EMAIL_ALREADY_EXISTS'));
                    }
                }

                if (data.role === "STAFF") {

                    let emailCheck = await User.findOne({ email: data.email, role: { $in: ["ADMIN", "VENDOR", "STAFF"] }, status: { $nin: ["archived", "temp"] } });

                    if (emailCheck != null) {
                        return res.json(helper.showValidationErrorResponse('EMAIL_ALREADY_EXISTS'));
                    }
                }

            }

            if (data.role === "USER") {
                if (is_demo) {
                    return res.json(helper.showValidationErrorResponse('DEMO_PHONE'));
                }
                if (data.mobileNumber && data.mobileNumber.trim().toString() != getUser.mobileNumber) {
                    let mCheck = await User.findOne({ store: ObjectId(getUser.store), mobileNumber: data.mobileNumber, role: "USER", status: { $ne: "archived" } });

                    if (mCheck != null) {
                        return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_ALREADY_EXISTS'));
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
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUsersByStoreAdmin: async (req, res) => {
        try {
            const data = req.body;
            const store = req.store;
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            const fields = data.fields;
            let hideContactInfo = req.hideContactInfo;
            let obj = {};
            let user = req.user;
            let is_demo = false;
            obj.store = ObjectId(store.storeId);
            if (user.role == 'STAFF' && helper.isValidHidethings(store, "customerlistdispatcher")
                && user.customerassign && user.customerassign.length) {
                obj["_id"] = { $in: user.customerassign };
            }
            if (helper.isValidHidethings(store, "isDemo") || helper.validateHideContactInfo(hideContactInfo, "USER")) {
                is_demo = true;
            };
            if (fields && fields.length > 0) {
                //console.log("fields", fields);
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (!obj.hasOwnProperty("status")) {
                obj.status = { $ne: "archived" };
            }

            if (data.search) {
                obj['$or'] = [];
                obj['$or'].push({ name: { $regex: data.search || '', $options: 'i' } })
                obj['$or'].push({ email: { $regex: data.search || '', $options: 'i' } })
                obj['$or'].push({ mobileNumber: { $regex: data.search || '', $options: 'i' } })
            }

            //console.log("obj", obj);
            let count = await User.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let totalcount = count.length > 0 ? count[0].count : 0;
            User.getUsersWithFilter(obj, sortByField, sortOrder, paged, pageSize, is_demo, (err, resdata) => {
                if (err) {
                    console.log("errrrr-------")
                    console.log(err)
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount));
                }
            });
        } catch (err) {
            console.log("err", err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserDetailsById: async (req, res) => {
        try {
            let id = req.params._id;
            let store = req.store;
            let hideThings = store.hideThings
            let hideContactInfo = req.hideContactInfo;
            let is_demo = false
            if (helper.isValidHidethings(store, "isDemo") || helper.validateHideContactInfo(hideContactInfo, "USER")) {
                is_demo = true;
            };
            let user_obj = { _id: ObjectId(id), store: store.storeId, $or: [{ role: "USER" }, { role: "STAFF" }] }
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
                        let [getAddress, latestOrders, totalOrders, orderAvgValue] = await Promise.all([
                            Address.getUserAddressAsyncLimit({ user: ObjectId(resdata._id) }),
                            Order.aggregate([{ $match: { user: ObjectId(resdata._id), orderStatus: { $ne: "archived" } } }, { $lookup: { from: 'users', localField: 'vendor', foreignField: '_id', as: 'vendorDetails' } }, { $lookup: { from: 'storetypes', localField: 'storeType', foreignField: '_id', as: 'storeType' } }, { $unwind: { path: "$vendorDetails", preserveNullAndEmptyArrays: true } }, { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } }, { $project: { customOrderId: 1, billingDetails: 1, shippingDetails: 1, line_items: 1, vendor: 1, user: 1, isDriverAssign: 1, isDriverArrivedAtPickup: 1, isOrderMarkReady: 1, subTotal: 1, tax: 1, taxAmount: 1, tip: 1, tipAmount: 1, discountTotal: 1, deliveryFee: 1, orderTotal: 1, orderStatus: 1, date_created_utc: 1, vendorDetails: { name: 1, address: 1, profileImage: 1 }, customerDetails: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1 }, vendorDetails: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1 }, "storeType.storeType": 1 } }, { $sort: { date_created_utc: -1 } }, { $limit: 10 }]),
                            Order.aggregate([{ $match: { user: ObjectId(resdata._id), orderStatus: "completed" } }]),
                            Order.aggregate([{ $match: { user: ObjectId(resdata._id), orderStatus: "completed" } }, { $group: { _id: null, orderAvg: { $avg: "$orderTotal" }, orderSpent: { $sum: "$orderTotal" } } }])
                        ]);
                        resdata.set("addresses", getAddress, { strict: false });
                        resdata.set("latestOrders", latestOrders, { strict: false });
                        resdata.set("totalOrders", totalOrders.length, { strict: false });
                        resdata.set("orderSpent", orderAvgValue.length > 0 ? orderAvgValue[0].orderSpent : 0, { strict: false });
                        resdata.set("orderAvgValue", orderAvgValue.length > 0 ? orderAvgValue[0].orderAvg : 0, { strict: false });
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

    getRestaurantDetailsById: async (req, res) => {
        try {
            let id = req.params._id;
            let user_data = req.user
            let storeTypeDeliveryType = req.body.deliveryType;
            let store = req.store;
            let hideContactInfo = req.hideContactInfo;
            let getBankFields = await Store.findById(store.storeId, 'bankFields orderAutoApproval orderAutoCancel commissionTransfer');
            let storeOrderAutoApproval = false;
            let storeOrderAutoCancel = getBankFields.orderAutoCancel || false;
            storeOrderAutoApproval = getBankFields.orderAutoApproval;
            let commissionTransfer = getBankFields.commissionTransfer.status;
            let is_demo = false;
            if (helper.isValidHidethings(store, "isDemo") || helper.validateHideContactInfo(hideContactInfo, "VENDOR")) {
                is_demo = true;
            };
            let bankFields = [];
            let getpwyment_method = store.paymentSettings.filter(element => {
                return element.payment_method == "pay360" && element.status == true
            })

            if (getBankFields != null) {

                if (getBankFields.bankFields && getBankFields.bankFields.length > 0) {
                    bankFields = getBankFields.bankFields;
                }
            }
            let user_obj = { _id: ObjectId(id), store: store.storeId, role: "VENDOR" }

            User.getUserByStoreIdForRestaurant(user_obj, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata) {
                        resdata.password = '';
                        resdata.salt = '';
                        resdata.tokens = [];
                        if (user_data.role != 'VENDOR') {
                            if (is_demo) {
                                resdata.email = resdata.email ? resdata.email.replace(/.(?=.{10})/g, '*') : resdata.email
                                resdata.mobileNumber = resdata.mobileNumber ? resdata.mobileNumber.replace(/.(?=.{2})/g, '*') : resdata.mobileNumber
                            }
                        }

                        let [latestOrders, totalOrders, orderAvgValue, vendorEarning, productCount, categoryCount, addonCount, attributeCount, productReview] = await Promise.all([
                            Order.aggregate([{ $match: { vendor: ObjectId(resdata._id), orderStatus: { $ne: "archived" } } }, { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customerDetails' } }, { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } }, { $project: { customOrderId: 1, billingDetails: 1, shippingDetails: 1, line_items: 1, vendor: 1, user: 1, isDriverAssign: 1, isDriverArrivedAtPickup: 1, isOrderMarkReady: 1, subTotal: 1, tax: 1, taxAmount: 1, tip: 1, tipAmount: 1, discountTotal: 1, deliveryFee: 1, orderTotal: 1, vendorEarning: 1, orderStatus: 1, date_created_utc: 1, vendorDetails: { name: 1, address: 1, profileImage: 1 }, customerDetails: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1 } } }, { $sort: { date_created_utc: -1 } }, { $limit: 10 }]),
                            Order.aggregate([{ $match: { vendor: ObjectId(resdata._id), orderStatus: "completed" } }]),
                            Order.aggregate([{ $match: { vendor: ObjectId(resdata._id) } }, { $group: { _id: null, orderAvg: { $avg: "$orderTotal" } } }]),
                            Order.aggregate([{ $match: { vendor: ObjectId(resdata._id), orderStatus: "completed" } }, { $group: { _id: null, vendorEarning: { $sum: "$vendorEarning" } } }]),
                            Product.aggregate([{ $match: { vendor: ObjectId(resdata._id), status: 'active' } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                            Category.aggregate([{ $match: { vendor: ObjectId(resdata._id), status: 'active' } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                            Addon.aggregate([{ $match: { vendor: ObjectId(resdata._id), status: 'active' } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                            Attribute.aggregate([{ $match: { storeType: ObjectId(req.params.storeTypeId), status: { $ne: "archived" } } }, { $group: { _id: null, count: { $sum: 1 } } }]),
                            ProductReview.aggregate([
                                {
                                    $addFields: {
                                        id: { $toObjectId: "$product_id" }
                                    }
                                },
                                {
                                    $lookup:
                                    {
                                        from: "products",
                                        localField: "id",
                                        foreignField: "_id",
                                        as: "products"
                                    }
                                },
                                {
                                    $unwind: "$products"
                                },
                                {
                                    $match: { "products.vendor": ObjectId(resdata._id), "products.status": { $ne: "archived" } }
                                },
                                {
                                    $sort: { createdAt: -1 }
                                },
                                {
                                    $limit: 10,

                                }])
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
                        resdata.set("orderAvgValue", orderAvgValue.length > 0 ? helper.roundNumber(orderAvgValue[0].orderAvg) : 0, { strict: false });
                        resdata.set("vendorEarning", vendorEarning.length > 0 ? helper.roundNumber(vendorEarning[0].vendorEarning) : 0, { strict: false });
                        resdata.set("productCount", productCount.length > 0 ? productCount[0].count : 0, { strict: false });
                        resdata.set("categoryCount", categoryCount.length > 0 ? categoryCount[0].count : 0, { strict: false });
                        resdata.set("addonCount", addonCount.length > 0 ? addonCount[0].count : 0, { strict: false });
                        resdata.set("attributeCount", attributeCount.length > 0 ? attributeCount[0].count : 0, { strict: false });
                        resdata.set("storeTypeDeliveryType", storeTypeDeliveryType, { strict: false });
                        resdata.set("storeOrderAutoApproval", storeOrderAutoApproval, { strict: false });
                        resdata.set("storeOrderAutoCancel", storeOrderAutoCancel, { strict: false });
                        resdata.set("commissionTransfer", commissionTransfer, { strict: false });
                        resdata.set("productReview", productReview, { strict: false });
                        if (getpwyment_method.length) {
                            let paymetdata = await spltipay360data.getmerchnat(resdata, store)
                            if (paymetdata.status) {
                                resdata.set("pay360Split.accountStatus", paymetdata.status, { strict: false })
                            }
                            else {
                                resdata.set("pay360Split.accountStatus", "Not Found", { strict: false })
                            }


                        }
                        return res.json(helper.showSuccessResponse('USER_DETAIL', resdata));
                    }
                    else {
                        return res.json(helper.showSuccessResponse('USER_DETAIL', {}));
                    }
                }
            });
        }
        catch (err) {
            console.log("err:", err)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removeUserByAdmin: async (req, res) => {
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

    updateAllUserByAdmin: async (req, res) => {
        try {
            let data = req.body;

            if (data._id.length === 0) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            let ids = [];
            data._id.forEach(element => {
                ids.push(ObjectId(element));
            });

            data._id = ids;
            let update = {};

            if (["offline", "online"].includes(data.status)) {
                update.onlineStatus = data.status;
            }
            else if (data.status == "avoidFraud") {
                update.isFoundFraud = false;
            }
            else {
                update.status = data.status;
            }
            User.updateUserProfileByIds(data, update, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (data._id.length === 1) {
                        let getUser;
                        if (data.status === "approved" || data.status === "rejected") {
                            getUser = await User.findOne({ _id: ObjectId(data._id[0]) })
                        }

                        if (!getUser) {
                            console.log(data.status + " No user for email!")
                        } else {
                            if (data.status === "approved") {
                                if (getUser.role === "DRIVER") {
                                    emailService.adminApproveDriverEmail(getUser)
                                } else if (getUser.role === "VENDOR") {
                                    emailService.adminApproveVendorEmail(getUser)
                                }

                            } else if (data.status === "rejected") {
                                if (getUser.role === "DRIVER") {
                                    emailService.adminRejectDriverEmail(getUser)
                                } else if (getUser.role === "VENDOR") {
                                    emailService.adminRejectVendorEmail(getUser)
                                }
                            }
                        }
                    }

                    if (data.status == "active") {
                        return res.json(helper.showSuccessResponse('ACTIVE_SUCCESsFULL', resdata));
                    } else if (data.status == "inactive") {
                        return res.json(helper.showSuccessResponse('INACTIVE_SUCCESsFULL', resdata));
                    } else if (data.status == "archived") {
                        return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                    } else {
                        return res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    importRestaurantsViaCSV: async (req, res) => {
        try {
            let data = req.body;

            let store = req.store;
            data.store = store.storeId;
            let storeData = await Store.findById(ObjectId(data.store), 'mailgun email storeName slug googleMapKey')
            if (!storeData)
                return res.json(helper.showValidationErrorResponse('STORE_NOT_EXIST'));

            let mailgunKey = {}
            if (storeData && storeData.mailgun)
                mailgunKey = storeData.mailgun

            let googleMapKey = storeData.googleMapKey ? storeData.googleMapKey.server : ''
            if (!googleMapKey) {
                return res.json(helper.showValidationErrorResponse('GOOGLEMAP_KEY_NOT_SETUP'));
            }
            let file = req.file
            if (!file)
                return res.json(helper.showValidationErrorResponse("FILE_IS_REQUIRED"));

            //res.json(helper.showSuccessResponse('VENDOR_CSV_IMPORTED', resdata));
            res.json(helper.showSuccessResponse('VENDOR_CSV_IMPORTED'));

            let filePath = req.file.path

            let csvData = await helper.csvToJson(filePath)
            var csvDataCopy = [store]
            for (let i = 0; i < csvData.length; i++) {
                csvData[i].SNO = i
                csvDataCopy.push(csvData[i])
            }

            // const csvDataCopy = csvData

            let csvDataCopy2 = []

            if (csvData)
                helper.unlinkLocalFile(filePath) //delete the file from local
            csvData = [...new Map(csvData.map(item => [item["email"], item])).values()]
            let getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);
            let storeTypeName = getStoreType.storeType;
            let deliveryType = getStoreType.deliveryType ? getStoreType.deliveryType : [];
            let storeVendorType = getStoreType.storeVendorType;
            let getEmail = csvData.map(a => a["email"])// ;

            const getUserEmail = await User.distinct('email', { email: { $in: getEmail }, store: ObjectId(data.store), role: "VENDOR", status: { $eq: "approved" } });

            let errMsg = ""
            if (getUserEmail.length > 0)
                errMsg = getUserEmail.toString() + " already exist ,"
            csvData.map(async function (itm) {
                let validationData = await helper.importObjectValidation(errMsg, itm, getUserEmail, 'Vendor', 'email')
                errMsg = validationData.errMsg

                csvDataCopy2.push(validationData.itm)
            })
            var result = csvData.filter(function (itm) {

                return (
                    itm.email && validator.isEmail(itm.email)
                    && !getUserEmail.includes(itm.email) && itm.mobileNumber
                    && validator.isMobilePhone(itm.mobileNumber) && itm.name && itm.countryCode
                    && itm.password
                    && itm.address
                )
            });
            let obj = {
                type: "VENDOR_IMPORT",
                id: data.store,
                idType: "stores",
                message: "Import vendor",
                notes: errMsg,
                status: 'error',
                meta_data: [{ key: "storeName", value: storeData.storeName }, { key: "slug", value: storeData.slug }]
            }
            await logTable.remove({ type: "VENDOR_IMPORT", id: data.store, idType: "stores" })
            logTable.addLog(obj, (err, data) => { });

            let finalArray = []
            for (let index = 0; index < result.length; index++) {
                let element = result[index];
                element.store = data.store

                element.role = "VENDOR";
                element.countryCode = element.countryCode.trim()
                element.countryCode = (element.countryCode.includes("+") ? element.countryCode : "+" + element.countryCode);

                let getHash = await Utils.hashPassword(element.password);
                element.password = getHash.hashedPassword;
                element.salt = getHash.salt;

                element.status = "approved";
                element.date_created_utc = new Date();
                element.isLoginFromSocial = false;

                element.storeType = data.storeTypeId
                // element.storeTypeName = storeTypeName;
                let deliveryTypeData = [];
                let checkData = true;
                if (element.deliveryType) {
                    deliveryTypeData = element.deliveryType.toUpperCase().split(',')
                    if (deliveryTypeData.length > 2)
                        deliveryTypeData.length = 2
                    deliveryTypeData.forEach((item) => {
                        if (!["TAKEAWAY", "DELIVERY"].includes(item))
                            checkData = false
                    })

                }
                element.deliveryType = (deliveryTypeData.length > 0 && checkData) ? deliveryTypeData : deliveryType;
                // element.storeVendorType = storeVendorType;
                let geoCodeData = await google.getLatLngFromAddress(googleMapKey, element.address)
                if (geoCodeData.lat && geoCodeData.lng) {
                    let location = { type: "Point", coordinates: [Number(geoCodeData.lng), Number(geoCodeData.lat)] };
                    element.userLocation = location;
                }
                element.onlineStatus = "online";
                let defaultData = await storeInitial.getVendorDefaultData(element, data.storeTypeId);

                defaultData.pricePerPerson = element.pricePerPerson ? element.pricePerPerson : defaultData.pricePerPerson
                defaultData.minOrderAmont = element.minOrderAmount ? element.minOrderAmount : defaultData.minOrderAmont
                defaultData.taxAmount = element.taxAmount ? element.taxAmount : defaultData.taxAmount
                defaultData.orderPreparationTime = element.orderPreparationTime ? element.orderPreparationTime : defaultData.orderPreparationTime

                if (element.pricePerPerson) delete element.pricePerPerson;
                if (element.minOrderAmount) delete element.minOrderAmount
                if (element.taxAmount) delete element.taxAmount
                if (element.orderPreparationTime) delete element.orderPreparationTime


                element = { ...element, ...defaultData };
                if (element.userLocation)
                    finalArray.push(element)
                else {
                    csvDataCopy2.map((item, i) => {
                        if (item.SNO === element.SNO) {
                            csvDataCopy2[i]['rowStatus'] = 'failure'
                            csvDataCopy2[i]['reason'] = 'Address is not valid.'
                        }

                    })
                }
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

            // res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', {finalArray,csvDataCopy2}));

            User.insertMany(finalArray, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (csvDataCopy2.length > 0) {
                        //storeData.email
                        let to = storeData.email;
                        let sub = "Import vendor CSV"
                        let msg = "Import vendor csv data."
                        csvDataCopy2 = csvDataCopy2.sort((a, b) => (a.SNO > b.SNO) ? 1 : -1)


                        let csvEmailData = await helper.json2csv(csvDataCopy2, Object.keys(csvDataCopy2[0]))

                        if (csvEmailData.status)
                            await mailgunSendEmail.sendEmailWithAttachment(mailgunKey, to, sub, msg, csvEmailData.csv, "importVendorCSV_" + new Date().getTime() + ".csv")
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addRestaurantByAdmin: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            data.store = store.storeId;

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

            if (data.storeVendorType === "SINGLE") {
                const getStoreOwner = await Store.findOne({ _id: data.store }).populate({ path: "owner", select: "email password salt" })
                data.password = getStoreOwner && getStoreOwner.owner ? getStoreOwner.owner.password : '';
                data.salt = getStoreOwner && getStoreOwner.owner ? getStoreOwner.owner.salt : '';
            } else {
                if (!data.password) {
                    return res.json(helper.showValidationErrorResponse('PASSWORD_IS_REQUIRED'));
                }
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

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            data.role = "VENDOR";
            data.avgRating = 0
            data.reviewCount = 0
            let getUser = null;
            if (data.role === 'USER') {
                getUser = await User.findOne({ mobileNumber: data.mobileNumber, status: "active" });
            } else {
                getUser = await User.findOne({ store: data.store, email: data.email, role: { $in: ["ADMIN", "STAFF", "VENDOR"] }, status: { $nin: ["archived", "temp"] } });
            }

            if (getUser != null) {
                return res.json(helper.showValidationErrorResponse('USER_EXISTS'));
            }

            const location = { type: "Point", coordinates: [Number(data.lng), Number(data.lat)] };

            data.userLocation = location;

            if (data.storeVendorType !== "SINGLE") {
                const getHash = await Utils.hashPassword(data.password);
                data.password = getHash.hashedPassword;
                data.salt = getHash.salt;
            }


            data.deliveryType = data.deliveryType ? data.deliveryType : [];
            let defaultData = await storeInitial.getVendorDefaultData(data, data.storeType);
            data = { ...data, ...defaultData };
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
                                console.log("else1---")
                                return res.json(helper.showValidationErrorResponse("Supplier Bank account not found"))

                            }
                            else {
                                User.addUserByEmail(data, (err, resdata) => {
                                    if (err) {
                                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                    } else {
                                        emailService.vendorRegisterEmail(resdata)
                                        res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', resdata));
                                        spltipay360data.createMerchantUserbysignup(store, resdata)
                                    }
                                });
                            }
                        }
                    })
                }

            }
            else {
                User.addUserByEmail(data, (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        res.json(helper.showSuccessResponse('USER_REGISTER_SUCCESS', resdata));
                        emailService.vendorRegisterEmail(resdata)

                    }
                });
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateRestaurantByAdmin: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

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

            if (!data.lng) {
                return res.json(helper.showValidationErrorResponse('LNG_IS_REQUIRED'));
            }

            if (!data.lat) {
                return res.json(helper.showValidationErrorResponse('LAT_IS_REQUIRED'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            const location = { type: "Point", coordinates: [Number(data.lng), Number(data.lat)] };

            data.userLocation = location;

            if (data.hasOwnProperty("password")) {
                delete data.password;
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

    getRestaurantsByStoreAdmin: async (req, res) => {
        try {
            const data = req.body;
            const store = req.store;
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let hideContactInfo = req.hideContactInfo;
            let user = req.user;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            let is_demo = false;
            if (helper.isValidHidethings(store, "isDemo") || helper.validateHideContactInfo(hideContactInfo, "VENDOR")) {
                is_demo = true;
            };
            if (user.role == 'STAFF' && helper.isValidHidethings(store, "vendorlistdispatcher")
                && user.vendorassign && user.vendorassign.length) {
                obj["_id"] = { $in: user.vendorassign };
            }
            if (!data.storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }

            obj.storeType = { $in: [ObjectId(data.storeTypeId)] };
            obj.role = "VENDOR";

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

    getOrdersByStoreAdmin: async (req, res) => {
        try {
            const data = req.body;
            //console.log("data", data);
            const store = req.store;
            let user = req.user;
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const fields = data.fields;
            const paged = data.page || 1;
            let obj = {};
            data.vendor = req.query.vendor ? req.query.vendor : null;
            if (!data.storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }

            if (data.storeTypeId) {
                obj.storeType = ObjectId(data.storeTypeId);
            }

            let query = await Utils.generateGetOrdersQuery(req, data);
            if (query) {
                obj = { ...obj, ...query }
            }

            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (!obj.hasOwnProperty("orderStatus")) {
                obj.orderStatus = { $ne: "archived" };
            }

            if (data.search) {
                obj['$or'] = [];
                obj['$or'].push({ customOrderId: { $regex: data.search || '', $options: 'i' } })
            }

            let count = await Order.countDocuments(obj);


            if (req.user.role != "VENDOR") {
                Order.getNewOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                    if (err) {
                        console.log("err", err);
                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, count));
                    }
                });
            } else {
                Order.getOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                    if (err) {
                        console.log("err", err);
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, count));
                    }
                });
            }

        } catch (err) {
            console.log("err", err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getOrderspdf: async (req, res) => {
        try {
            let data = req.params
            //let user = req.user;
            console.log("dta---", data)
            if (!data || !data._id) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_REQUIRED'));
            }
            //const store = req.store;
            let obj = {};
            obj._id = ObjectId(data._id);
            let { action } = req.query;
            //obj.store = ObjectId(store.storeId);
            if (!obj.hasOwnProperty("orderStatus")) {
                obj.orderStatus = { $ne: "archived" };
            }
            Order.getOrderforpdf(obj, async (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let get_htmldata = await emailService.htmlslipdata(resdata.user, resdata)
                    //console.log("get_htmldata---", get_htmldata)
                    let options = { format: 'A4' };

                    let html = get_htmldata;//"<h1>Welcome to html-pdf-node</h1>"
                    pdf.create(html, [options]).toBuffer(function (err, pdfBuffer) {
                        if (err) {
                            console.log("pdf convert err--", err);
                            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
                        };
                        //console.log(pdfBuffer);
                        // res.setHeader('Content-disposition', 'attachment; filename=orderslip.pdf');
                        // res.set('Content-Type', 'application/pdf');

                        //res.setHeader('Content-Type', 'application/pdf')
                        // res.setHeader('Content-Disposition', 'attachment; filename=orderslip.pdf')
                        if (action && action == "print") {
                            res.setHeader('Content-Type', 'application/pdf');
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        }
                        else {
                            res.setHeader('Content-Disposition', 'attachment; filename=orderslip.pdf')
                        }
                        //res.setHeader('Content-Length', pdfBuffer.length)
                        res.send(pdfBuffer)
                    });
                    //res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (err) {
            console.log("err", err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getOrderDetailsById: async (req, res) => {
        try {
            let id = req.params._id;
            let store = req.store
            let user = req.user;
            let hideContactInfo = req.hideContactInfo;
            let is_demo = false;
            if (helper.isValidHidethings(store, "isDemo")) {
                is_demo = true;
            };

            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }
            let order_obj = { _id: ObjectId(id), store: store.storeId }


            Order.getOrderByStoreId(order_obj, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata == null) {
                        return res.json(helper.showValidationErrorResponse('INVALID_ORDER'));
                    }
                    if (is_demo) {
                        await helper.hideContactInfoForDemo(is_demo, resdata);
                    };
                    if (hideContactInfo && hideContactInfo.length) {
                        await helper.hideContactInfoForStaff(hideContactInfo, resdata);
                    };

                    //rating
                    let reviews = {
                        customerToVendor: null,
                        customerToDriver: null,
                        driverToCustomer: null
                    };

                    let Rating = await Review.aggregate([
                        { $match: { order: ObjectId(resdata._id) } },
                        { $group: { _id: '$order', reviews: { $push: "$$ROOT" } } }
                    ]);

                    if (Rating.length > 0) {
                        if (Rating[0].reviews.length > 0) {

                            let getReviews = Rating[0].reviews;
                            let customerToVendor = []
                            if (resdata.vendor) {
                                customerToVendor = getReviews.filter(element => {
                                    return element.reviewed_by.toString() === resdata.user._id.toString() && element.reviewed_to.toString() === resdata.vendor._id.toString()
                                });
                            }

                            if (customerToVendor.length > 0) {
                                reviews.customerToVendor = customerToVendor[0];
                            }

                            if (resdata.driver) {
                                let customerToDriver = getReviews.filter(element => {
                                    return element.reviewed_by.toString() === resdata.user._id.toString() && element.reviewed_to.toString() === resdata.driver._id.toString()
                                });

                                if (customerToDriver.length > 0) {
                                    reviews.customerToDriver = customerToDriver[0];
                                }

                                let driverToCustomer = getReviews.filter(element => {
                                    return element.reviewed_by.toString() === resdata.driver._id.toString() && element.reviewed_to.toString() === resdata.user._id.toString()
                                });

                                if (driverToCustomer.length > 0) {
                                    reviews.driverToCustomer = driverToCustomer[0];
                                }
                            }
                        }
                    }

                    resdata.set("reviews", reviews, { strict: false });

                    res.json(helper.showSuccessResponse('ORDER_DETAIL', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getTransaction: async (req, res) => {
        try {
            let { orderBy, order, page, limit, userType, user, startDate, endDate, type } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            let obj = {};
            let store = req.store;
            let storeId = store.storeId;

            if (startDate) {
                startDate = new Date(new Date(new Date(startDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                startDate = new Date(startDate);
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
            }

            if (endDate) {
                endDate = new Date(new Date(new Date(endDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                endDate = new Date(endDate);
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            } else {
                endDate = new Date();
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            }

            obj.date_created_utc = { $gte: new Date(startDate), $lt: new Date(endDate) };

            if (!userType) {
                return res.json(helper.showValidationErrorResponse('USER_TYPE_IS_REQUIRED'));
            }

            if (user) {
                obj.payment_to = ObjectId(user);
            } else {
                obj.store = ObjectId(storeId);

                if (type) {
                    obj.type = type;
                    obj.isPay = true;
                } else {
                    obj.type = { $ne: "charge" };
                }

                uT = [];
                if (userType.length > 0) {

                    userType.forEach(element => {
                        uT.push({ userType: element })
                    });

                    obj['$and'] = [
                        { $or: uT }
                    ]
                }
            }
            let count = await paymentLedger.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            paymentLedger.getTransaction(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    payToUser: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;

            data.store = store.storeId;

            if (!data.userType) {
                return res.json(helper.showValidationErrorResponse('USER_TYPE_IS_REQUIRED'));
            }

            if (data.userType != 'DRIVER') {

                if (!data.storeTypeId) {
                    return res.json(helper.showValidationErrorResponse('STORE_TYPE_IS_REQUIRED'));
                }
            } else {
                data.storeTypeId = null;
            }

            if (!data.payment_to) {
                return res.json(helper.showValidationErrorResponse('USER_ID_IS_REQUIRED'));
            }

            let getUser = await User.findById(data.payment_to, 'name email store bankFields');

            if (getUser == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_USER'));
            }

            if (!data.amount || data.amount == 0) {
                return res.json(helper.showValidationErrorResponse('AMOUNT_IS_REQUIRED'));
            }

            let Balance = await Transaction.getBalance(ObjectId(data.payment_to));

            if (data.amount > Balance) {
                return res.json(helper.showValidationErrorResponse('AMOUNT_MUST_BE_LESS_THAN_BALANCE'));
            }

            data.type = "debit";
            if (getUser.bankFields) {
                let bankFields = [];
                getUser.bankFields.forEach(element => {
                    if (element.value) {
                        bankFields.push(element.value);
                    }
                });
                let account = bankFields.join(',');
                data.description = 'Withdrawl with Ref: Account. ' + account;
            } else {
                data.description = 'Withdrawl with Ref: Account No. XXXXXX';
            }

            let addedTransaction = await Transaction.addTransaction(null, data.storeTypeId, data.userType, data.store, data.payment_to, data.amount, data.type, data.description, null, null, null, true);

            if (data.userType === "DRIVER") {
                emailService.adminPayDriverEmail(getUser, data);
            } else if (data.userType === "VENDOR") {
                emailService.adminPayVendorEmail(getUser, data);
            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', addedTransaction));

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    refundToUser: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let byAdmin = false;
            let byDriver = false;
            let byVendor = false;
            let afterrefundVenderEarning
            let afterrefundAdminEarning
            let afterrefundDriverEarning
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsync(data._id);
            let getCurrentTime = helper.getCurrentDateAndTimeInCityTimezoneFromUTC(req.store.timezone);
            let getOrderCreatedTime = helper.getDateAndTimeInCityTimezone(getOrder.date_created_utc, req.store.timezone);

            console.log("getCurrentTime:==>", getCurrentTime);
            console.log("getOrderCreatedTime:==>", getOrderCreatedTime);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            if (getOrder.paymentMethod === "cod") {
                return res.json(helper.showValidationErrorResponse('COD_ORDER_REFUND_NOT_POSSIBLE'));
            }
            if (getOrder.orderStatus === "refunded") {
                return res.json(helper.showValidationErrorResponse('REFUND_PROCEED'));
            }
            if (getOrder.paymentStatus != "success") {
                return res.json(helper.showValidationErrorResponse('PAYMENT_NOT_COMPLETED'));
            }
            /*  if (getOrder.storeType.storeType === "TAXI" && getOrder.orderStatus != "completed") {
  
              }
              */
            if (getOrder.paymentMethod === "flutterwave" && (helper.getTimeDifferenceInMinute(getCurrentTime, getOrderCreatedTime) < 10)) {
                return res.json(helper.showValidationErrorResponse('REFUND_PROCEED_TIME'));
            };

            let payment_method = getOrder.paymentMethod;
            data.payment_method = getOrder.paymentMethod;

            if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
                payment_method = 'braintree';
            }

            let getStore = await settingService.chekStoreSetting(getOrder.store, payment_method);

            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }

            if (!data.reason) {
                return res.json(helper.showValidationErrorResponse('REASON_IS_REQUIRED'));
            }

            data.vendorAmount = data.vendorAmount ? data.vendorAmount : 0;
            data.driverAmount = data.driverAmount ? data.driverAmount : 0;
            data.adminAmount = data.adminAmount ? data.adminAmount : 0;

            data.amount = helper.roundNumber(parseFloat(data.vendorAmount) + parseFloat(data.adminAmount) + parseFloat(data.driverAmount));

            if (!data.amount) {
                return res.json(helper.showValidationErrorResponse('AMOUNT_IS_REQUIRED'));
            }

            if (data.vendorAmount > 0) {

                if (data.vendorAmount > getOrder.vendorEarning) {
                    return res.json(helper.showValidationErrorResponse('VENDOR_AMOUNT_MUST_BE_LESS_THAN_BALANCE'));
                }
                afterrefundVenderEarning = Math.ceil(getOrder.vendorEarning) - Math.ceil(data.vendorAmount)

                byVendor = true;
            }

            if (data.driverAmount > 0) {

                if (data.driverAmount > getOrder.deliveryBoyEarning) {
                    return res.json(helper.showValidationErrorResponse('DRIVER_AMOUNT_MUST_BE_LESS_THAN_BALANCE'));
                }

                if (getOrder.driver) {
                    byDriver = true;
                    afterrefundDriverEarning = Math.ceil(getOrder.deliveryBoyEarning) - Math.ceil(data.driverAmount)
                }
            }

            if (data.adminAmount > 0) {

                if (data.adminAmount > getOrder.adminEarning) {
                    return res.json(helper.showValidationErrorResponse('ADMIN_MUST_BE_LESS_THAN_BALANCE'));
                }

                byAdmin = true;
                afterrefundAdminEarning = Math.ceil(getOrder.adminEarning) - Math.ceil(data.adminAmount)
            }
            if (data.payment_method === "stripe") {

                if (!getOrder.transactionDetails) {
                    return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                }

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let refundData = {
                    chargeId: getOrder.transactionDetails.id,
                    amount: data.amount,
                    secretKey: data.secretKey
                }

                paymentMiddleware.processStripeRefund(refundData, async (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {

                        data.type = "debit";
                        data.description = `Refund with Ref: ${getOrder.customOrderId}`;
                        res.json(helper.showSuccessResponse('REFUND_SUCCESS', data));

                        let refund = [];

                        if (byVendor) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "VENDOR", getOrder.store._id, getOrder.vendor._id, data.vendorAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.vendorAmount,
                                reason: data.reason,
                                refunded_by: getOrder.vendor._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { vendorEarning: afterrefundVenderEarning });
                        }

                        if (byDriver) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "DRIVER", getOrder.store._id, getOrder.driver, data.driverAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.driverAmount,
                                reason: data.reason,
                                refunded_by: getOrder.driver,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { deliveryBoyEarning: afterrefundDriverEarning });
                        }

                        if (byAdmin) {

                            let addedTransaction = await Transaction.addAdminTransaction(getOrder._id, getOrder.storeType._id, getOrder.store._id, data.adminAmount, 0, 0, data.type, data.description);

                            let refundObj = {
                                order: data._id,
                                amount: data.adminAmount,
                                reason: data.reason,
                                refunded_by: user._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { adminEarning: afterrefundAdminEarning });
                        }

                        let orderData = {};
                        if (refund.length > 0) {
                            let rIds = [];
                            let rd = await Refund.insertMany(refund);
                            //console.log("rd", rd);
                            rd.forEach(element => {
                                rIds.push(element._id);
                            });

                            if (getOrder.refundDetails.length > 0) {
                                rIds = rIds.concat(getOrder.refundDetails);
                            }

                            orderData.refundDetails = rIds;
                            orderData.orderStatus = "refunded";
                            await Order.findOneAndUpdate({ _id: data._id }, orderData);
                        }

                        emailService.userOrderRefundEmail(getOrder);

                    }
                });

            }
            if (data.payment_method === "paystack") {
                if (!getOrder.transactionDetails) {
                    return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                }

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                let refundObj = {
                    chargeId: getOrder.transactionDetails.id,
                    secretKey: data.secretKey,
                    cost: data.amount,
                    currency: getStore.currency.code
                }
                paymentMiddleware.refundAmountByPaystack(refundObj, async (response) => {
                    if (response.status) {

                        data.type = "debit";
                        data.description = `Refund with Ref: ${getOrder.customOrderId}`;

                        let refund = [];

                        if (byVendor) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "VENDOR", getOrder.store._id, getOrder.vendor._id, data.vendorAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.vendorAmount,
                                reason: data.reason,
                                refunded_by: getOrder.vendor._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { vendorEarning: afterrefundVenderEarning });
                        }

                        if (byDriver) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "DRIVER", getOrder.store._id, getOrder.driver, data.driverAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.driverAmount,
                                reason: data.reason,
                                refunded_by: getOrder.driver,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { deliveryBoyEarning: afterrefundDriverEarning });
                        }

                        if (byAdmin) {

                            let addedTransaction = await Transaction.addAdminTransaction(getOrder._id, getOrder.storeType._id, getOrder.store._id, data.adminAmount, 0, 0, data.type, data.description);

                            let refundObj = {
                                order: data._id,
                                amount: data.adminAmount,
                                reason: data.reason,
                                refunded_by: user._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { adminEarning: afterrefundAdminEarning });
                        }

                        let orderData = {};
                        if (refund.length > 0) {
                            let rIds = [];
                            let rd = await Refund.insertMany(refund);
                            //console.log("rd", rd);
                            rd.forEach(element => {
                                rIds.push(element._id);
                            });

                            if (getOrder.refundDetails.length > 0) {
                                rIds = rIds.concat(getOrder.refundDetails);
                            }

                            orderData.refundDetails = rIds;
                            orderData.orderStatus = "refunded";
                            await Order.findOneAndUpdate({ _id: data._id }, orderData);
                        }

                        emailService.userOrderRefundEmail(getOrder);
                        return res.json(helper.showSuccessResponse('REFUND_SUCCESS', data));
                    }
                    else {
                        console.log("Error In Refund!")
                        console.log(response.message);
                        return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                    }
                });
            }
            if (data.payment_method === "square") {

                if (!getOrder.transactionDetails) {
                    return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                }

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let refundData = {
                    paymentId: getOrder.transactionDetails.id,
                    amount: data.amount,
                    secretKey: data.secretKey
                }

                paymentMiddleware.refundAmountBySquare(refundData, async (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {

                        data.type = "debit";
                        data.description = `Refund with Ref: ${getOrder.customOrderId}`;
                        res.json(helper.showSuccessResponse('REFUND_SUCCESS', data));

                        let refund = [];

                        if (byVendor) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "VENDOR", getOrder.store._id, getOrder.vendor._id, data.vendorAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.vendorAmount,
                                reason: data.reason,
                                refunded_by: getOrder.vendor._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            orderData.orderStatus = "refunded";
                            await Order.updateOne({ _id: ObjectId(data._id) }, { vendorEarning: afterrefundVenderEarning });
                        }

                        if (byDriver) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "DRIVER", getOrder.store._id, getOrder.driver, data.driverAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.driverAmount,
                                reason: data.reason,
                                refunded_by: getOrder.driver,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { deliveryBoyEarning: afterrefundDriverEarning });
                        }

                        if (byAdmin) {

                            let addedTransaction = await Transaction.addAdminTransaction(getOrder._id, getOrder.storeType._id, getOrder.store._id, data.adminAmount, 0, 0, data.type, data.description);

                            let refundObj = {
                                order: data._id,
                                amount: data.adminAmount,
                                reason: data.reason,
                                refunded_by: user._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { adminEarning: afterrefundAdminEarning });
                        }

                        let orderData = {};
                        if (refund.length > 0) {
                            let rIds = [];
                            let rd = await Refund.insertMany(refund);
                            //console.log("rd", rd);
                            rd.forEach(element => {
                                rIds.push(element._id);
                            });

                            if (getOrder.refundDetails.length > 0) {
                                rIds = rIds.concat(getOrder.refundDetails);
                            }

                            orderData.refundDetails = rIds;
                            await Order.findOneAndUpdate({ _id: data._id }, orderData);
                        }

                        emailService.userOrderRefundEmail(getOrder);

                    }
                });

            }
            if (data.payment_method === "pay360") {

                if (!getOrder.transactionDetails) {
                    return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                }

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.secretKey;
                    data.isv_id = getStore.paymentSettings.isvId;
                    data.merchantId = getStore.paymentSettings.merchantId;
                    data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                } else {

                    data.secretKey = getStore.paymentSettings.livesecretKey;
                    data.isv_id = getStore.paymentSettings.liveisvId;
                    data.merchantId = getStore.paymentSettings.livemerchantId;
                    data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;

                }
                // data.secretKey = getStore.paymentSettings.secretKey;
                // data.isv_id = getStore.paymentSettings.isvId;
                // data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.isv_id) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let refundData = {
                    amount: data.amount,
                    JWT: data.secretKey,
                    ISV_ID: data.isv_id,
                    transactionId: getOrder.transactionDetails.transactionId,
                    pay360BaseUrl: data.pay360BaseUrl
                }

                paymentMiddleware.refundPay360(refundData, async (response) => {
                    if (!response.status) {
                        res.json(helper.showPay360ErrorResponse(response.message));
                    } else {

                        data.type = "debit";
                        data.description = `Refund with Ref: ${getOrder.customOrderId}`;
                        res.json(helper.showSuccessResponse('REFUND_SUCCESS', data));

                        let refund = [];

                        if (byVendor) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "VENDOR", getOrder.store._id, getOrder.vendor._id, data.vendorAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.vendorAmount,
                                reason: data.reason,
                                refunded_by: getOrder.vendor._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { vendorEarning: afterrefundVenderEarning });
                        }

                        if (byDriver) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "DRIVER", getOrder.store._id, getOrder.driver, data.driverAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.driverAmount,
                                reason: data.reason,
                                refunded_by: getOrder.driver,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { deliveryBoyEarning: afterrefundDriverEarning });
                        }

                        if (byAdmin) {

                            let addedTransaction = await Transaction.addAdminTransaction(getOrder._id, getOrder.storeType._id, getOrder.store._id, data.adminAmount, 0, 0, data.type, data.description);

                            let refundObj = {
                                order: data._id,
                                amount: data.adminAmount,
                                reason: data.reason,
                                refunded_by: user._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { adminEarning: afterrefundAdminEarning });
                        }

                        let orderData = {};
                        if (refund.length > 0) {
                            let rIds = [];
                            let rd = await Refund.insertMany(refund);
                            //console.log("rd", rd);
                            rd.forEach(element => {
                                rIds.push(element._id);
                            });

                            if (getOrder.refundDetails.length > 0) {
                                rIds = rIds.concat(getOrder.refundDetails);
                            }

                            orderData.refundDetails = rIds;
                            orderData.orderStatus = "refunded";
                            await Order.findOneAndUpdate({ _id: data._id }, orderData);
                        }

                        emailService.userOrderRefundEmail(getOrder);

                    }
                });

            }
            if (data.payment_method === "dpo") {

                if (!getOrder.transactionDetails) {
                    return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                }

                if (getStore.paymentMode === 'sandbox') {
                    data.companytoken = getStore.paymentSettings.companytoken;
                    data.endpoint = getStore.paymentSettings.endpoint;
                    data.servicetype = getStore.paymentSettings.servicenumber;
                } else {
                    data.companytoken = getStore.paymentSettings.livecompanytoken;
                    data.endpoint = getStore.paymentSettings.liveendpoint;
                    data.servicetype = getStore.paymentSettings.liveservicenumber;
                }
                if (!data.companytoken) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.endpoint) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.servicetype) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let refundData = {
                    amount: data.amount,
                    companytoken: data.companytoken,
                    endpoint: data.endpoint,
                    transactiontoken: getOrder.transactionDetails.transactionId,
                    refundDetails: getOrder.transactionDetails.refundDetails
                }

                paymentMiddleware.dpoRefundPayment(refundData, async (response) => {
                    if (!response.status) {
                        res.json(helper.showDpoErrorResponse(response.message));
                    } else {

                        data.type = "debit";
                        data.description = `Refund with Ref: ${getOrder.customOrderId}`;
                        res.json(helper.showSuccessResponse('REFUND_SUCCESS'));

                        let refund = [];

                        if (byVendor) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "VENDOR", getOrder.store._id, getOrder.vendor._id, data.vendorAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.vendorAmount,
                                reason: data.reason,
                                refunded_by: getOrder.vendor._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { vendorEarning: afterrefundVenderEarning });
                        }

                        if (byDriver) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "DRIVER", getOrder.store._id, getOrder.driver, data.driverAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.driverAmount,
                                reason: data.reason,
                                refunded_by: getOrder.driver,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { deliveryBoyEarning: afterrefundDriverEarning });
                        }

                        if (byAdmin) {

                            let addedTransaction = await Transaction.addAdminTransaction(getOrder._id, getOrder.storeType._id, getOrder.store._id, data.adminAmount, 0, 0, data.type, data.description);

                            let refundObj = {
                                order: data._id,
                                amount: data.adminAmount,
                                reason: data.reason,
                                refunded_by: user._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { adminEarning: afterrefundAdminEarning });
                        }

                        let orderData = {};
                        if (refund.length > 0) {
                            let rIds = [];
                            let rd = await Refund.insertMany(refund);
                            //console.log("rd", rd);
                            rd.forEach(element => {
                                rIds.push(element._id);
                            });

                            if (getOrder.refundDetails.length > 0) {
                                rIds = rIds.concat(getOrder.refundDetails);
                            }

                            orderData.refundDetails = rIds;
                            orderData.orderStatus = "refunded";
                            await Order.findOneAndUpdate({ _id: data._id }, orderData);
                        }

                        emailService.userOrderRefundEmail(getOrder);

                    }
                });

            }
            if (data.payment_method === "flutterwave") {
                if (!getOrder.transactionDetails) {
                    return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                }

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                    data.pubKey = getStore.paymentSettings.sandboxPublishabelKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                    data.pubKey = getStore.paymentSettings.livePublishabelKey;
                };
                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                let refundObj = {
                    transactionId: getOrder.transactionDetails.id,
                    secretKey: data.secretKey,
                    pubKey: data.pubKey,
                    cost: data.amount
                }
                paymentMiddleware.refundAmountByFlutterwave(refundObj, async (response) => {
                    if (response.status) {

                        data.type = "debit";
                        data.description = `Refund with Ref: ${getOrder.customOrderId}`;

                        let refund = [];

                        if (byVendor) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "VENDOR", getOrder.store._id, getOrder.vendor._id, data.vendorAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.vendorAmount,
                                reason: data.reason,
                                refunded_by: getOrder.vendor._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { vendorEarning: afterrefundVenderEarning });
                        }

                        if (byDriver) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "DRIVER", getOrder.store._id, getOrder.driver, data.driverAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.driverAmount,
                                reason: data.reason,
                                refunded_by: getOrder.driver,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { deliveryBoyEarning: afterrefundDriverEarning });
                        }

                        if (byAdmin) {

                            let addedTransaction = await Transaction.addAdminTransaction(getOrder._id, getOrder.storeType._id, getOrder.store._id, data.adminAmount, 0, 0, data.type, data.description);

                            let refundObj = {
                                order: data._id,
                                amount: data.adminAmount,
                                reason: data.reason,
                                refunded_by: user._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { adminEarning: afterrefundAdminEarning });
                        }

                        let orderData = {};
                        if (refund.length > 0) {
                            let rIds = [];
                            let rd = await Refund.insertMany(refund);
                            //console.log("rd", rd);
                            rd.forEach(element => {
                                rIds.push(element._id);
                            });

                            if (getOrder.refundDetails.length > 0) {
                                rIds = rIds.concat(getOrder.refundDetails);
                            }

                            orderData.refundDetails = rIds;
                            orderData.orderStatus = "refunded";
                            await Order.findOneAndUpdate({ _id: data._id }, orderData);
                        }

                        emailService.userOrderRefundEmail(getOrder);
                        return res.json(helper.showSuccessResponse('REFUND_SUCCESS', data));
                    }
                    else {
                        console.log("Error In Refund!")
                        console.log(response.message);
                        return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                    }
                });
            }
            if (data.payment_method === "razorpay") {

                if (!getOrder.transactionDetails) {
                    return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                }

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxKey_secret;
                    data.Key_id = getStore.paymentSettings.sandboxKey_id;
                } else {
                    data.secretKey = getStore.paymentSettings.liveKey_secret;
                    data.Key_id = getStore.paymentSettings.liveKey_id;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.Key_id) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let refundData = {
                    payment_id: getOrder.transactionDetails.id,
                    amount: data.amount,
                    KEY_SECRET: data.secretKey,
                    KEY_ID: data.Key_id
                }

                paymentMiddleware.razorPayrefundPayment(refundData, async (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {

                        data.type = "debit";
                        data.description = `Refund with Ref: ${getOrder.customOrderId}`;
                        res.json(helper.showSuccessResponse('REFUND_SUCCESS', data));

                        let refund = [];

                        if (byVendor) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "VENDOR", getOrder.store._id, getOrder.vendor._id, data.vendorAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.vendorAmount,
                                reason: data.reason,
                                refunded_by: getOrder.vendor._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { vendorEarning: afterrefundVenderEarning });
                        }

                        if (byDriver) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "DRIVER", getOrder.store._id, getOrder.driver, data.driverAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.driverAmount,
                                reason: data.reason,
                                refunded_by: getOrder.driver,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { deliveryBoyEarning: afterrefundDriverEarning });
                        }

                        if (byAdmin) {

                            let addedTransaction = await Transaction.addAdminTransaction(getOrder._id, getOrder.storeType._id, getOrder.store._id, data.adminAmount, 0, 0, data.type, data.description);

                            let refundObj = {
                                order: data._id,
                                amount: data.adminAmount,
                                reason: data.reason,
                                refunded_by: user._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { adminEarning: afterrefundAdminEarning });
                        }

                        let orderData = {};
                        if (refund.length > 0) {
                            let rIds = [];
                            let rd = await Refund.insertMany(refund);
                            //console.log("rd", rd);
                            rd.forEach(element => {
                                rIds.push(element._id);
                            });

                            if (getOrder.refundDetails.length > 0) {
                                rIds = rIds.concat(getOrder.refundDetails);
                            }

                            orderData.refundDetails = rIds;
                            orderData.orderStatus = "refunded";
                            await Order.findOneAndUpdate({ _id: data._id }, orderData);
                        }

                        emailService.userOrderRefundEmail(getOrder);

                    }
                });

            } else if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {

                if (!getOrder.transactionDetails) {
                    return res.json(helper.showValidationErrorResponse('DUMMY_ORDER_REFUND_NOT_POSSIBLE'));
                }

                if (getStore.paymentSettings.merchantId == null || getStore.paymentSettings.publicKey == null || getStore.paymentSettings.privateKey == null) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    amount: data.amount,
                    merchantId: getStore.paymentSettings.merchantId,
                    publicKey: getStore.paymentSettings.publicKey,
                    privateKey: getStore.paymentSettings.privateKey,
                    paymentMode: getStore.paymentMode,
                    transactionId: getOrder.transactionDetails.transaction.id
                }

                paymentMiddleware.processRefundByBraintree(chargeData, async (presponse) => {
                    if (!presponse.status) {
                        res.json(helper.showBraintreeErrorResponse(presponse.message, presponse.code));
                    } else {

                        data.type = "debit";
                        data.description = `Refund with Ref: ${getOrder.customOrderId}`;

                        res.json(helper.showSuccessResponse('REFUND_SUCCESS', data));

                        let refund = [];

                        if (byVendor) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "VENDOR", getOrder.store._id, getOrder.vendor._id, data.vendorAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.vendorAmount,
                                reason: data.reason,
                                refunded_by: getOrder.vendor._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { vendorEarning: afterrefundVenderEarning });
                        }

                        if (byDriver) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "DRIVER", getOrder.store._id, getOrder.driver, data.driverAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.driverAmount,
                                reason: data.reason,
                                refunded_by: getOrder.driver,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { deliveryBoyEarning: afterrefundDriverEarning });
                        }

                        if (byAdmin) {

                            let addedTransaction = await Transaction.addAdminTransaction(getOrder._id, getOrder.storeType._id, getOrder.store._id, data.adminAmount, 0, 0, data.type, data.description);

                            let refundObj = {
                                order: data._id,
                                amount: data.adminAmount,
                                reason: data.reason,
                                refunded_by: user._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { adminEarning: afterrefundAdminEarning });
                        }

                        let orderData = {};
                        if (refund.length > 0) {
                            let rIds = [];
                            let rd = await Refund.insertMany(refund);
                            //console.log("rd", rd);
                            rd.forEach(element => {
                                rIds.push(element._id);
                            });

                            if (getOrder.refundDetails.length > 0) {
                                rIds = rIds.concat(getOrder.refundDetails);
                            }

                            orderData.refundDetails = rIds;
                            orderData.orderStatus = "refunded";
                            await Order.findOneAndUpdate({ _id: data._id }, orderData);
                        }

                        emailService.userOrderRefundEmail(getOrder)

                    }
                });

            } else if (data.payment_method === "wallet" || data.payment_method === "moncash") {

                let wallet = helper.roundNumber(getOrder.user.wallet + data.amount);
                User.updateUserProfile({ _id: getOrder.user._id, wallet: wallet }, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        data.type = "debit";
                        data.description = `Refund with Ref: ${getOrder.customOrderId}`;
                        res.json(helper.showSuccessResponse('REFUND_SUCCESS', data));

                        let refund = [];
                        await Transaction.userTransaction(getOrder, getOrder.user, { storeId: getOrder.store._id }, data.amount, wallet, true);
                        if (byVendor) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "VENDOR", getOrder.store._id, getOrder.vendor._id, data.vendorAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.vendorAmount,
                                reason: data.reason,
                                refunded_by: getOrder.vendor._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { vendorEarning: afterrefundVenderEarning });
                        }

                        if (byDriver) {

                            let addedTransaction = await Transaction.addTransaction(getOrder._id, getOrder.storeType._id, "DRIVER", getOrder.store._id, getOrder.driver, data.driverAmount, data.type, data.description, null, null, null, false);

                            let refundObj = {
                                order: data._id,
                                amount: data.driverAmount,
                                reason: data.reason,
                                refunded_by: getOrder.driver,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { deliveryBoyEarning: afterrefundDriverEarning });
                        }

                        if (byAdmin) {

                            let addedTransaction = await Transaction.addAdminTransaction(getOrder._id, getOrder.storeType._id, getOrder.store._id, data.adminAmount, 0, 0, data.type, data.description);

                            let refundObj = {
                                order: data._id,
                                amount: data.adminAmount,
                                reason: data.reason,
                                refunded_by: user._id,
                                date_created_utc: new Date()
                            }

                            refund.push(refundObj);
                            await Order.updateOne({ _id: ObjectId(data._id) }, { adminEarning: afterrefundAdminEarning });
                        }

                        let orderData = {};
                        if (refund.length > 0) {
                            let rIds = [];
                            let rd = await Refund.insertMany(refund);
                            //console.log("rd", rd);
                            rd.forEach(element => {
                                rIds.push(element._id);
                            });

                            if (getOrder.refundDetails.length > 0) {
                                rIds = rIds.concat(getOrder.refundDetails);
                            }

                            orderData.refundDetails = rIds;
                            orderData.orderStatus = "refunded";
                            await Order.findOneAndUpdate({ _id: data._id }, orderData);
                        }

                        emailService.userOrderRefundEmail(getOrder)

                    }
                });
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreOrderAnalytics: async (req, res) => {
        try {
            let { groupBy, startDate, endDate } = req.body;
            let user = req.user;
            let store = req.store;
            let obj = {};

            if (user.role == 'VENDOR') {
                obj.vendor = ObjectId(user._id);
            } else {
                obj.store = ObjectId(store.storeId);
            }
            if (user.role == 'STAFF' && helper.isValidHidethings(store, "driverlistdispatcher")
                && user.driverassign && user.driverassign.length) {
                obj["driver"] = { $in: user.driverassign };
            }
            if (startDate) {
                startDate = new Date(new Date(new Date(startDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                startDate = new Date(startDate);
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 28);
                startDate.setHours(0, 0, 0, 0);
            }

            if (endDate) {
                endDate = new Date(new Date(new Date(endDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                endDate = new Date(endDate);
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            } else {
                endDate = new Date();
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            }

            if (groupBy) {
                groupBy = groupBy;
            } else {
                groupBy = 'day';
            }

            obj.date_created_utc = { $gte: new Date(startDate), $lt: new Date(endDate) };
            obj.status = { $ne: "archived" };

            let getOrders = [];

            if (groupBy === 'day') {

                const dummyArray = helper.getDates(startDate, endDate);
                //console.log("dummyArray", dummyArray);

                getOrders = await Order.aggregate([
                    { $match: obj },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } },
                            date: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } } },
                            revenue: {
                                $sum: {
                                    "$cond": [
                                        { "$eq": ["$orderStatus", "completed"] },
                                        user.role == 'VENDOR' ? "$vendorEarning" : "$orderTotal",
                                        0
                                    ]
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $project: {
                            _id: '$_id',
                            date: "$date",
                            count: "$count",
                            revenueTotal: { $round: ["$revenue", 2] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            stats: { $push: "$$ROOT" }
                        }
                    },
                    {
                        $project: {
                            stats: {
                                $map: {
                                    input: dummyArray,
                                    as: "date",
                                    in: {
                                        $let: {
                                            vars: { dateIndex: { "$indexOfArray": ["$stats._id", "$$date"] } },
                                            in: {
                                                $cond: {
                                                    if: { $ne: ["$$dateIndex", -1] },
                                                    then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                                                    else: { _id: "$$date", date: "$$date", count: 0, revenueTotal: 0 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$stats"
                    },
                    {
                        $replaceRoot: {
                            newRoot: "$stats"
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);

            } else if (groupBy === 'week') {

                const weekRange = helper.getWeekDates(startDate, endDate);
                //console.log("weekRange", weekRange);

                getOrders = await Order.aggregate([
                    { $match: obj },
                    {
                        "$project": {
                            week: { $isoWeek: "$date_created_utc" },
                            orderTotal: "$orderTotal",
                            vendorEarning: "$vendorEarning",

                            // [TRICK IS HERE] Timestamp - dayOfWeek * msInOneDay
                            weekStart: {
                                $dateToString: {
                                    format: "%Y-%m-%d", date: { // convert date
                                        $subtract: ["$date_created_utc", { $multiply: [{ $subtract: [{ $isoDayOfWeek: "$date_created_utc" }, 1] }, 86400000] }]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$week",
                            date: { $first: "$weekStart" },
                            revenue: {
                                $sum: {
                                    "$cond": [
                                        { "$eq": ["$orderStatus", "completed"] },
                                        user.role == 'VENDOR' ? "$vendorEarning" : "$orderTotal",
                                        0
                                    ]
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $project: {
                            _id: '$_id',
                            date: "$date",
                            count: "$count",
                            revenueTotal: { $round: ["$revenue", 2] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            stats: { $push: "$$ROOT" }
                        }
                    },
                    {
                        $project: {
                            stats: {
                                $map: {
                                    input: weekRange,
                                    as: "date",
                                    in: {
                                        $let: {
                                            vars: { dateIndex: { "$indexOfArray": ["$stats.date", "$$date"] } },
                                            in: {
                                                $cond: {
                                                    if: { $ne: ["$$dateIndex", -1] },
                                                    then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                                                    else: { _id: "$$date", date: "$$date", count: 0 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$stats"
                    },
                    {
                        $replaceRoot: {
                            newRoot: "$stats"
                        }
                    },
                    { $sort: { date: 1 } }
                ]);

            } else if (groupBy === 'month') {

                getOrders = await Order.aggregate([
                    { $match: obj },
                    {
                        $group: {
                            _id: { $month: "$date_created_utc" },
                            date: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } } },
                            revenue: {
                                $sum: {
                                    "$cond": [
                                        { "$eq": ["$orderStatus", "completed"] },
                                        user.role == 'VENDOR' ? "$vendorEarning" : "$orderTotal",
                                        0
                                    ]
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $project: {
                            _id: '$_id',
                            date: "$date",
                            count: "$count",
                            revenueTotal: { $round: ["$revenue", 2] }
                        }
                    },
                    {
                        $addFields: {
                            month: {
                                $let: {
                                    vars: {
                                        monthsInString: [, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
                                    },
                                    in: {
                                        $arrayElemAt: ['$$monthsInString', '$_id']
                                    }
                                }
                            }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);

            }

            let byOrderStatus = await Order.aggregate([
                { $match: obj },
                { $sort: { date_created_utc: -1 } },
                { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
            ]);

            //console.log("getOrders", getOrders);

            const resdata = {
                byOrder: getOrders,
                byOrderStatus: byOrderStatus
            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));

        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreDashboardAnalytics: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store;
            let obj = {};

            if (user.role == 'VENDOR') {
                obj.vendor = ObjectId(user._id);
            } else {
                obj.store = ObjectId(store.storeId);
            }
            let isAssignDriverEnable = store.hideThings.find(element => element.type == "driverlistdispatcher");
            if (user.role == 'STAFF' && isAssignDriverEnable && isAssignDriverEnable.value
                && user.driverassign && user.driverassign.length) {
                obj["driver"] = { $in: user.driverassign }
            }
            let startDate = new Date();
            startDate.setDate(startDate.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);

            let endDate = new Date();
            endDate.setDate(endDate.getDate() + 1);
            endDate.setHours(0, 0, 0, 0);

            const dummyArray = helper.getDates(startDate, endDate);

            obj.date_created_utc = { $gte: new Date(startDate), $lt: new Date(endDate) };
            obj.status = { $ne: "archived" };

            let getOrders = await Order.aggregate([
                { $match: obj },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } },
                        date: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } } },
                        revenue: {
                            $sum: {
                                "$cond": [
                                    { "$eq": ["$orderStatus", "completed"] },
                                    user.role == 'VENDOR' ? "$vendorEarning" : "$orderTotal",
                                    0
                                ]
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: '$_id',
                        date: "$date",
                        count: "$count",
                        revenueTotal: { $round: ["$revenue", 2] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        stats: { $push: "$$ROOT" }
                    }
                },
                {
                    $project: {
                        stats: {
                            $map: {
                                input: dummyArray,
                                as: "date",
                                in: {
                                    $let: {
                                        vars: { dateIndex: { "$indexOfArray": ["$stats._id", "$$date"] } },
                                        in: {
                                            $cond: {
                                                if: { $ne: ["$$dateIndex", -1] },
                                                then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                                                else: { _id: "$$date", date: "$$date", count: 0, revenueTotal: 0 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $unwind: "$stats"
                },
                {
                    $replaceRoot: {
                        newRoot: "$stats"
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            let totalOrders = 0;
            let totalRevenue = 0;

            if (getOrders.length > 0) {

                getOrders.forEach(element => {
                    totalOrders = totalOrders + element.count;
                });
            }

            let byOrderStatus = await Order.aggregate([
                { $match: obj },
                { $sort: { date_created_utc: -1 } },
                {
                    $group:
                    {
                        _id: '$orderStatus',
                        count: { $sum: 1 },
                        revenue: { $sum: user.role == 'VENDOR' ? "$vendorEarning" : "$orderTotal" }
                    }
                }
            ]);

            if (byOrderStatus.length > 0) {
                for (let index = 0; index < byOrderStatus.length; index++) {
                    const element = byOrderStatus[index];
                    if (element._id === "completed") {
                        totalRevenue = element.revenue;
                        break;
                    }
                }
            }

            //console.log("getOrders", getOrders);
            obj.role = 'USER';
            let getUsers = await User.aggregate([
                { $match: obj },
                { $sort: { date_created_utc: -1 } },
                { $limit: 10 },
                { $project: { _id: 1, name: 1, email: 1, countryCode: 1, mobileNumber: 1, status: 1, date_created_utc: 1 } }
            ]);

            var { date_created_utc, ...customersObj } = obj;

            let count = await User.aggregate([{ $match: customersObj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let countdata = count[0] ? count[0].count : 0;

            /*Fetch Drivers*/
            obj.role = 'DRIVER';
            if (obj.driver) {
                obj._id = { $in: user.driverassign };
                delete obj.driver;
            }

            let getDrivers = await User.aggregate([
                { $match: obj },
                { $sort: { date_created_utc: -1 } },
                { $limit: 10 },
                { $project: { _id: 1, name: 1, email: 1, countryCode: 1, mobileNumber: 1, status: 1, date_created_utc: 1 } }
            ]);

            var { date_created_utc, ...driverObj } = obj;
            let driverCountData = await User.countDocuments(driverObj);


            let resdata = {
                totalOrders: helper.roundNumber(totalOrders),
                totalRevenue: helper.roundNumber(totalRevenue),
                byOrder: getOrders,
                byOrderStatus: byOrderStatus,
                byUser: getUsers,
                totalCustomers: countdata
            }
            if (user.role == 'VENDOR') {
                resdata['wallet'] = user.wallet
            }
            if (user.role == 'STAFF' && isAssignDriverEnable && isAssignDriverEnable.value
                && user.driverassign && user.driverassign.length) {
                resdata["byDrivers"] = getDrivers;
                resdata["totalDrivers"] = driverCountData;
            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));

        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreUsersAnalytics: async (req, res) => {
        try {
            let { groupBy, startDate, endDate } = req.body;
            let store = req.store;
            let user = req.user;
            let obj = {};
            obj.store = ObjectId(store.storeId);

            if (startDate) {
                startDate = new Date(new Date(new Date(startDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                startDate = new Date(startDate);
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 28);
                startDate.setHours(0, 0, 0, 0);
            }

            if (endDate) {
                endDate = new Date(new Date(new Date(endDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                endDate = new Date(endDate);
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            } else {
                endDate = new Date();
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            }

            if (groupBy) {
                groupBy = groupBy;
            } else {
                groupBy = 'day';
            }

            obj.date_created_utc = { $gte: new Date(startDate), $lt: new Date(endDate) };
            obj.role = 'USER';
            obj.status = { $ne: "archived" };

            let getUsers = [];

            if (groupBy === 'day') {

                const dummyArray = helper.getDates(startDate, endDate);
                //console.log("dummyArray", dummyArray);

                getUsers = await User.aggregate([
                    { $match: obj },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } },
                            date: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } } },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            stats: { $push: "$$ROOT" }
                        }
                    },
                    {
                        $project: {
                            stats: {
                                $map: {
                                    input: dummyArray,
                                    as: "date",
                                    in: {
                                        $let: {
                                            vars: { dateIndex: { "$indexOfArray": ["$stats._id", "$$date"] } },
                                            in: {
                                                $cond: {
                                                    if: { $ne: ["$$dateIndex", -1] },
                                                    then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                                                    else: { _id: "$$date", date: "$$date", count: 0 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$stats"
                    },
                    {
                        $replaceRoot: {
                            newRoot: "$stats"
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);

            } else if (groupBy === 'week') {

                const weekRange = helper.getWeekDates(startDate, endDate);
                //console.log("weekRange", weekRange);

                getUsers = await User.aggregate([
                    { $match: obj },
                    {
                        "$project": {
                            week: { $isoWeek: "$date_created_utc" },
                            // [TRICK IS HERE] Timestamp - dayOfWeek * msInOneDay
                            weekStart: {
                                $dateToString: {
                                    format: "%Y-%m-%d", date: { // convert date
                                        $subtract: ["$date_created_utc", { $multiply: [{ $subtract: [{ $isoDayOfWeek: "$date_created_utc" }, 1] }, 86400000] }]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$week",
                            date: { $first: "$weekStart" },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            stats: { $push: "$$ROOT" }
                        }
                    },
                    {
                        $project: {
                            stats: {
                                $map: {
                                    input: weekRange,
                                    as: "date",
                                    in: {
                                        $let: {
                                            vars: { dateIndex: { "$indexOfArray": ["$stats.date", "$$date"] } },
                                            in: {
                                                $cond: {
                                                    if: { $ne: ["$$dateIndex", -1] },
                                                    then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                                                    else: { _id: "$$date", date: "$$date", count: 0 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$stats"
                    },
                    {
                        $replaceRoot: {
                            newRoot: "$stats"
                        }
                    },
                    { $sort: { date: 1 } }
                ]);

            } else if (groupBy === 'month') {

                getUsers = await User.aggregate([
                    { $match: obj },
                    {
                        $group: {
                            _id: { $month: "$date_created_utc" },
                            date: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } } },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $addFields: {
                            month: {
                                $let: {
                                    vars: {
                                        monthsInString: [, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
                                    },
                                    in: {
                                        $arrayElemAt: ['$$monthsInString', '$_id']
                                    }
                                }
                            }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);

            }

            let byUserStatus = await User.aggregate([
                { $match: obj },
                { $sort: { date_created_utc: -1 } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            const resdata = {
                byUser: getUsers,
                byUserStatus: byUserStatus
            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));

        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getStoreDriversAnalytics: async (req, res) => {
        try {
            let { groupBy, startDate, endDate } = req.body;
            let store = req.store;
            let user = req.user;
            let obj = {};
            obj.store = ObjectId(store.storeId);

            if (startDate) {
                startDate = new Date(new Date(new Date(startDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                startDate = new Date(startDate);
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 28);
                startDate.setHours(0, 0, 0, 0);
            }

            if (endDate) {
                endDate = new Date(new Date(new Date(endDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                endDate = new Date(endDate);
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            } else {
                endDate = new Date();
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            }

            if (groupBy) {
                groupBy = groupBy;
            } else {
                groupBy = 'day';
            }

            obj.date_created_utc = { $gte: new Date(startDate), $lt: new Date(endDate) };
            obj.role = 'DRIVER';
            obj.status = { $ne: "archived" };
            if (user.role == 'STAFF' && helper.isValidHidethings(store, "driverlistdispatcher")
                && user.driverassign && user.driverassign.length) {
                obj["_id"] = { $in: user.driverassign }
            }

            let getUsers = [];

            if (groupBy === 'day') {

                const dummyArray = helper.getDates(startDate, endDate);
                //console.log("dummyArray", dummyArray);

                getUsers = await User.aggregate([
                    { $match: obj },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } },
                            date: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } } },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            stats: { $push: "$$ROOT" }
                        }
                    },
                    {
                        $project: {
                            stats: {
                                $map: {
                                    input: dummyArray,
                                    as: "date",
                                    in: {
                                        $let: {
                                            vars: { dateIndex: { "$indexOfArray": ["$stats._id", "$$date"] } },
                                            in: {
                                                $cond: {
                                                    if: { $ne: ["$$dateIndex", -1] },
                                                    then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                                                    else: { _id: "$$date", date: "$$date", count: 0 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$stats"
                    },
                    {
                        $replaceRoot: {
                            newRoot: "$stats"
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);

            } else if (groupBy === 'week') {

                const weekRange = helper.getWeekDates(startDate, endDate);
                //console.log("weekRange", weekRange);

                getUsers = await User.aggregate([
                    { $match: obj },
                    {
                        "$project": {
                            week: { $isoWeek: "$date_created_utc" },
                            // [TRICK IS HERE] Timestamp - dayOfWeek * msInOneDay
                            weekStart: {
                                $dateToString: {
                                    format: "%Y-%m-%d", date: { // convert date
                                        $subtract: ["$date_created_utc", { $multiply: [{ $subtract: [{ $isoDayOfWeek: "$date_created_utc" }, 1] }, 86400000] }]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $group: {
                            _id: "$week",
                            date: { $first: "$weekStart" },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            stats: { $push: "$$ROOT" }
                        }
                    },
                    {
                        $project: {
                            stats: {
                                $map: {
                                    input: weekRange,
                                    as: "date",
                                    in: {
                                        $let: {
                                            vars: { dateIndex: { "$indexOfArray": ["$stats.date", "$$date"] } },
                                            in: {
                                                $cond: {
                                                    if: { $ne: ["$$dateIndex", -1] },
                                                    then: { $arrayElemAt: ["$stats", "$$dateIndex"] },
                                                    else: { _id: "$$date", date: "$$date", count: 0 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$stats"
                    },
                    {
                        $replaceRoot: {
                            newRoot: "$stats"
                        }
                    },
                    { $sort: { date: 1 } }
                ]);

            } else if (groupBy === 'month') {

                getUsers = await User.aggregate([
                    { $match: obj },
                    {
                        $group: {
                            _id: { $month: "$date_created_utc" },
                            date: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$date_created_utc" } } },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $addFields: {
                            month: {
                                $let: {
                                    vars: {
                                        monthsInString: [, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
                                    },
                                    in: {
                                        $arrayElemAt: ['$$monthsInString', '$_id']
                                    }
                                }
                            }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]);

            }

            let byUserStatus = await User.aggregate([
                { $match: obj },
                { $sort: { date_created_utc: -1 } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);

            const resdata = {
                byUser: getUsers,
                byUserStatus: byUserStatus
            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));

        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    sendPushNotification: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;

            let obj = {};

            obj.store = data.store;
            let keys = env.firebase;
            let getStore = await Store.findById(data.store, 'firebase');

            if (getStore != null) {
                keys = getStore.firebase;
            }

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            if (data.type === "VENDOR") {
                if (!data.storeTypeId) {
                    return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
                }

                const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);

                if (getStoreType === null) {
                    return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
                }

                data.storeType = getStoreType._id;

                obj.storeType = { $in: [ObjectId(data.storeType)] };
            }

            if (!data.title) {
                return res.json(helper.showValidationErrorResponse('TITLE_IS_REQUIRED'));
            }

            if (!data.body) {
                return res.json(helper.showValidationErrorResponse('BODY_IS_REQUIRED'));
            }

            obj.role = data.type;

            const getUsers = await User.find(obj, 'email firebaseToken firebaseTokens');

            //console.log("getUsers ", getUsers);

            if (getUsers.length > 0) {

                let messages = [];

                await Promise.all(getUsers.map(async element => {
                    let tokens = [];

                    if (element.firebaseTokens && element.firebaseTokens.length > 0) {

                        await Promise.all(element.firebaseTokens.map(nElement => {
                            if (nElement.token) {
                                //console.log("element ", element.email, nElement.token)
                                messages.push({
                                    notification: { title: data.title, body: data.body },
                                    token: nElement.token
                                });
                                tokens.push(nElement.token);
                            }
                        }));

                    }

                    if (element.firebaseToken) {
                        if (tokens.length == 0) {
                            messages.push({
                                notification: { title: data.title, body: data.body },
                                token: element.firebaseToken
                            });
                        } else if (tokens.length > 0 && !tokens.includes(element.firebaseToken)) {
                            messages.push({
                                notification: { title: data.title, body: data.body },
                                token: element.firebaseToken
                            });
                        }
                    }
                }));

                data.count = getUsers.length;

                if (messages.length > 0) {

                    Push.sendBatchNotification(messages, data.type, keys);

                    Notification.addNotification(data);

                    res.json(helper.showSuccessResponse('NOTIFICATION_SENT', {}));

                } else {
                    return res.json(helper.showValidationErrorResponse('NO_REGISTERED_DEVICE_FOUND'));
                }
            } else {
                return res.json(helper.showValidationErrorResponse('NO_USERS_FOUND'));
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getNotifications: async (req, res) => {
        try {
            const { orderBy, order, page, limit } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            const store = req.store;
            let obj = {};
            obj.store = store.storeId;

            //console.log("obj", obj);

            let count = await Notification.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Notification.geNotificationsWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    searchDomain: async (req, res) => {
        try {
            let data = req.body;

            if (!data.domain) {
                return res.json(helper.showValidationErrorResponse('DOMAIN_IS_REQUIRED'));
            }

            let url = env.godaddyApiKey.sandbox.apiUrl + data.domain;
            let keySecret = env.godaddyApiKey.sandbox.key;

            if (env.godaddyApiKey.mode === 'live') {
                url = env.godaddyApiKey.production.apiUrl + data.domain;
                keySecret = env.godaddyApiKey.production.key;
            }

            request.get({
                url: url,
                headers: { 'Authorization': 'sso-key ' + keySecret },
            }, (err, response) => {
                let resdata = JSON.parse(response.body);
                if (resdata.available) {
                    resdata.price = helper.roundNumber((resdata.price / 1000000) + 2);
                }
                res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata));
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    byDomain: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let getCard = await Store.findById(data.storeId, 'cardDetails').populate({ path: "cardDetails" });
            let cardDetails = null;
            if (getCard.cardDetails) {
                cardDetails = getCard.cardDetails;
            }

            if (cardDetails == null) {
                return res.json(helper.showValidationErrorResponse('PLEASE_ADD_YOUR_CARD_FIRST'));
            }

            if (!data.domain) {
                return res.json(helper.showValidationErrorResponse('DOMAIN_IS_REQUIRED'));
            }

            if (!data.price) {
                return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
            }

            if (Number(data.price) < 0) {
                return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
            }

            data.paymentSourceRef = cardDetails._id;

            if (env.superAdminStripe.paymentMode === 'sandbox') {
                data.secretKey = env.superAdminStripe.sandbox.Stripe_Secret_Key;
            } else {
                data.secretKey = env.superAdminStripe.live.Stripe_Secret_Key;
            }

            let chargeData = {
                cost: data.price,
                paymentSourceRef: data.paymentSourceRef,
                secretKey: data.secretKey
            }

            paymentMiddleware.paymentByStripe(chargeData, async (response) => {
                if (!response.status) {
                    res.json(helper.showStripeErrorResponse(response.message, response.code));
                } else {
                    data.transactionDetails = response.response;
                    data.date_created_utc = new Date();
                    data.date_payment_utc = new Date();

                    const resdata = await Domain.create(data);

                    //send email to superadmin
                    let to = env.superAdminEmail;
                    let subject = "Domain Purchased!";

                    let body = '';
                    body += '<p>Domain: ' + data.domain + '</p>';
                    body += '<p>Price: ' + data.price + '</p>';
                    body += '<p>Stripe Charge Id: ' + data.transactionDetails.id + '</p>';

                    var senemail = await mailgunSendEmail.sendEmailToSuperadmin(to, subject, body);

                    res.json(helper.showSuccessResponseCount('DOMAIN_BUY_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getBirdEyeViewResults: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let user = req.user;

            if (!data.location) {
                return res.json(helper.showValidationErrorResponse('LOCATION_IS_REQUIRED'));
            }

            if (!data.bounds) {
                return res.json(helper.showValidationErrorResponse('LOCATION_IS_REQUIRED'));
            }

            let sort = { avgRating: -1 };

            const location = { type: "Point", coordinates: [Number(data.location.lng), Number(data.location.lat)] }

            //console.log("location", location);

            let obj = {};
            let radius = 50000;

            obj.onlineStatus = "online";
            obj.status = "approved";
            obj.store = ObjectId(store.storeId);
            obj.role = "DRIVER";

            let fromLocation = [];
            let toLocation = [];

            if (data.bounds) {

                if (data.bounds.ne) {

                    if (data.bounds.ne.lat && data.bounds.ne.lng) {
                        fromLocation.push(data.bounds.ne.lat);
                        fromLocation.push(data.bounds.ne.lng);
                    }

                }

                if (data.bounds.sw) {

                    if (data.bounds.sw.lat && data.bounds.sw.lng) {
                        toLocation.push(data.bounds.sw.lat);
                        toLocation.push(data.bounds.sw.lng);
                    }
                }
            }
            if (user.role == 'STAFF' && helper.isValidHidethings(store, "driverlistdispatcher")
                && user.driverassign && user.driverassign.length) {
                obj["_id"] = { $in: user.driverassign }
            }
            // if (fromLocation.length > 0 && toLocation.length > 0) {
            //     let getDistance = helper.getDistanceFromTwoLocation(fromLocation, toLocation);
            //     radius = helper.kmToMeter(getDistance);
            //     //console.log("radius", radius);
            // }
            //console.log("obj", obj);

            let available = await User.aggregate(
                [
                    {
                        "$geoNear": {
                            "near": location,
                            "distanceField": "distance",
                            key: "userLocation",
                            "spherical": true,
                            "maxDistance": radius,
                            query: obj
                        }
                    },
                    //{ $lookup: { from: 'users', localField: 'cuisines', foreignField: '_id', as: 'cuisines' } },
                    { $lookup: { from: 'files', localField: 'profileImage', foreignField: '_id', as: 'profileImage' } },
                    { $sort: sort },
                    //{ $skip: pageOptions.page * pageOptions.limit },
                    //{ $limit: pageOptions.limit },
                    { $project: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1, onlineStatus: 1, currentOrderId: 1, userLocation: 1 } },
                    { $unwind: { path: "$profileImage", preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: '$onlineStatus',
                            drivers: { $push: "$$ROOT" }
                        },
                    }
                ]);

            let obj2 = {};
            obj2.onlineStatus = { $in: ['pickupInroute', 'pickupArrived', 'destinationInroute'] };
            obj2.status = "approved";
            obj2.store = ObjectId(store.storeId);
            obj2.role = "DRIVER";

            let busy = await User.aggregate(
                [
                    {
                        "$geoNear": {
                            "near": location,
                            "distanceField": "distance",
                            key: "userLocation",
                            "spherical": true,
                            "maxDistance": radius,
                            query: obj2
                        }
                    },
                    //{ $lookup: { from: 'users', localField: 'cuisines', foreignField: '_id', as: 'cuisines' } },
                    { $lookup: { from: 'files', localField: 'profileImage', foreignField: '_id', as: 'profileImage' } },
                    { $sort: sort },
                    //{ $skip: pageOptions.page * pageOptions.limit },
                    //{ $limit: pageOptions.limit },
                    { $project: { name: 1, profileImage: 1, onlineStatus: 1, currentOrderId: 1, userLocation: 1 } },
                    { $unwind: { path: "$profileImage", preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: '$onlineStatus',
                            drivers: { $push: "$$ROOT" }
                        },
                    }
                ]);

            let resdata = {
                available: available.length > 0 ? available[0].drivers : [],
                busy: busy.length > 0 ? busy[0].drivers : []
            }

            let response = helper.showSuccessResponse('DATA_SUCCESS', resdata);
            res.json(response);

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    checkStoreName: async (req, res) => {
        try {
            let data = req.body;

            if (!data.storeName) {
                return res.json(helper.showValidationErrorResponse('STORE_NAME_IS_REQUIRED'));
            }

            data.storeName = data.storeName;

            if (data.storeName.toLowerCase() == "main") {
                return res.json(helper.showValidationErrorResponse('STORE_NAME_EXISTS'));
            }

            const getStore = await Store.findOne({ $or: [{ storeName: data.storeName }, { slug: data.storeName.toLowerCase() }] });

            if (getStore != null) {
                return res.json(helper.showValidationErrorResponse('STORE_NAME_EXISTS'));
            }

            res.json(helper.showSuccessResponseCount('DATA_SUCCESS', {}));

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    currentplan: async (req, res) => {
        try {
            const getStore = await Store.findOne({ _id: ObjectId(req.store.storeId) }, "storeName status slug plan")
                .populate({ path: 'storeType', select: 'storeType storeVendorType status' })
                .populate({ path: 'plan.billingPlan', select: 'type interval' });

            if (getStore == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
            }

            const resdata = { planAmount: getStore.plan.planAmount, isTrial: getStore.plan.isTrial, billingPlan: getStore.plan.billingPlan, isAddon: getStore.plan.isAddon }

            let today = new Date();
            today.setHours(0, 0, 0, 0);
            if (new Date(today).getTime() < new Date(getStore.plan.endDate).getTime() || ["active", "gracePeriod"].includes(getStore.status)) {
                resdata.isExpired = false;
            } else {
                resdata.isExpired = true;
            }

            if (!resdata.isTrial) {
                resdata.endDate = moment(getStore.plan.endDate).add(1, 'days').format("DD MMM YYYY");
            }

            resdata.endDate = moment(getStore.plan.endDate).format("DD MMM YYYY");

            res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata));
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    enableVendorNotifications: async (req, res) => {
        try {
            let data = req.body;
            let getUser = req.user;

            if (data.firebaseToken) {
                getUser.firebaseToken = data.firebaseToken;
            }

            if (getUser.firebaseTokens == null) {
                getUser.firebaseTokens = data.firebaseToken;
            } else {
                const _firebaseTokens = getUser.firebaseTokens.map(({ token }) => token)

                if (!_firebaseTokens.includes(data.firebaseToken)) {
                    getUser.firebaseTokens = getUser.firebaseTokens.concat({ token: data.firebaseToken });

                    User.updateFirebaseToken(getUser, (err, mytoken) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            let resdata = helper.showSuccessResponse('DATA_SUCCESS', {});
                            res.json(resdata);
                        }
                    });
                } else {
                    let resdata = helper.showSuccessResponse('DATA_SUCCESS', {});
                    res.json(resdata);
                }
            }
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserExports: async (req, res) => {
        try {
            let store = req.store;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            obj.role = "USER";
            obj.status = { $ne: "archived" };

            User.find(obj, function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {

                        let fdata = {
                            "User Id": element._id,
                            "Name": element.name,
                            "Email": element.email,
                            "Country Code": element.countryCode,
                            "Mobile Number": element.mobileNumber,
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }
                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=customers.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getDriverExports: async (req, res) => {
        try {
            let store = req.store;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            obj.role = "DRIVER";
            obj.status = { $ne: "archived" };

            User.find(obj, function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {

                        let fdata = {
                            "userId": element._id,
                            "Name": element.name,
                            "Email": element.email,
                            "Country Code": element.countryCode,
                            "Mobile Number": element.mobileNumber,
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }
                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=drivers.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getVendorExports: async (req, res) => {
        try {
            let store = req.store;
            let storeTypeId = req.params.storeTypeId;
            let obj = {};
            obj.storeType = { $in: [ObjectId(storeTypeId)] };
            obj.role = "VENDOR";
            obj.status = { $ne: "archived" };

            User.find(obj, function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {

                        let fdata = {
                            "userId": element._id,
                            "Name": element.name,
                            "Email": element.email,
                            "Country Code": element.countryCode,
                            "Mobile Number": element.mobileNumber,
                            "Balance": element.wallet,
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }
                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=vendors.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getVendorProductsExports: async (req, res) => {
        try {
            let store = req.store;
            let id = req.params._id;
            let storeTypeId = req.params.storeTypeId;
            let hideThings = store.hideThings
            let allowexport = hideThings.filter(element => element.type == "productexport")
            let is_export = allowexport.length ? allowexport[0]['value'] : false
            let category = []
            let image = []
            let addondata = []
            let csv
            let json2csvParser
            let count = 1
            let obj = {};
            //obj.store = ObjectId(store.storeId);
            obj.vendor = ObjectId(id);
            obj.storeType = ObjectId(storeTypeId);
            obj.status = { $ne: "archived" };
            Product.find(obj)
                .populate({ path: "categories", options: { lean: true }, select: 'catName' })
                .populate({ path: "images", options: { lean: true }, select: "link" }).populate({ path: "featured_image", select: "link" })
                .populate({ path: "addons", select: "name options", options: { lean: true } })
                .populate({ path: "brand", match: { status: "active" } })
                .populate({ path: "variations" })
                .exec(async function (err, resdata) {
                    if (err) {
                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let result = [];
                        if (req.body.storeTypeName == "FOOD") {
                            if (is_export) {
                                result = await Utils.makearrdata(resdata)
                                json2csvParser = new Parser();
                                csv = json2csvParser.parse(result);
                            }
                            else {
                                resdata.forEach(element => {

                                    let fdata = {
                                        "ProductId": element._id,
                                        "Name": element.name,
                                        "SKU": element.sku,
                                        "Price": element.price,
                                        "Compare Price": element.compare_price,
                                        "Stock Status": element.stock_status,
                                        "Manage Stock": element.manage_stock,
                                        "Stock Quantity": element.stock_quantity,
                                        "Status": element.status,
                                        "Date": new Date(element.date_created_utc).toLocaleDateString()
                                    }
                                    result.push(fdata);
                                });
                                json2csvParser = new Parser();
                                csv = json2csvParser.parse(result);
                            }
                        }
                        else {
                            resdata.forEach(element => {
                                // old
                                // let fdata = {
                                //     "ProductId": element._id,
                                //     "Name": element.name,
                                //     "SKU": element.sku,
                                //     "Price": element.price,
                                //     "Compare Price": element.compare_price,
                                //     "Stock Status": element.stock_status,
                                //     "Manage Stock": element.manage_stock,
                                //     "Stock Quantity": element.stock_quantity,
                                //     "Status": element.status,
                                //     "Date": new Date(element.date_created_utc).toLocaleDateString()
                                // }
                                if (element.attributes && element.attributes.length &&
                                    element.variations && element.variations.length) {

                                    // element.attributes.map((currElement, index) => {
                                    //     fdata[`Variation:Name${index + 1}`] = currElement.name;
                                    //     variantions[`Variation:Value${index + 1}`] = helper.getFields(currElement.terms, "name");
                                    // }); we will look in features...

                                    let fdata = setProductVariationsField(element);
                                    fdata["Variation:Name1"] = element.attributes[0].name;
                                    fdata["Variation:Value1"] = element.variations[0].attributes[0].name;
                                    fdata["Variation:price"] = element.variations[0].price;
                                    fdata["Variation:stock_quantity"] = element.variations[0].stock_quantity;
                                    fdata["Variation:manage_stock"] = element.variations[0].manage_stock;
                                    fdata["Variation:stock_status"] = element.variations[0].stock_status;
                                    fdata["Variation:sku"] = element.variations[0].sku;
                                    element.variations.shift();
                                    result.push(fdata);
                                    element.variations.map(currElement => {
                                        currElement.variationValue = currElement.attributes[0].name;
                                        currElement.productSku = element.sku;
                                        result.push(setProductVariationsField(currElement, true))
                                    })

                                } else {
                                    result.push(setProductVariationsField(element))
                                }
                            });
                            json2csvParser = new Parser();
                            csv = json2csvParser.parse(result);
                        }
                        res.setHeader('Content-disposition', 'attachment; filename=products.csv');
                        res.set('Content-Type', 'text/csv');
                        res.send(csv)
                    }
                });
            // Product.find(obj, function (err, resdata) {
            //     if (err) {
            //         return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            //     } else {
            //         let result = [];

            //         resdata.forEach(element => {

            //             let fdata = {
            //                 "ProductId": element._id,
            //                 "Name": element.name,
            //                 "SKU": element.sku,
            //                 "Price": element.price,
            //                 "Compare Price": element.compare_price,
            //                 "Stock Status": element.stock_status,
            //                 "Manage Stock": element.manage_stock,
            //                 "Stock Quantity": element.stock_quantity,
            //                 "Status": element.status,
            //                 "Date": new Date(element.date_created_utc).toLocaleDateString()
            //             }
            //             result.push(fdata);
            //         });

            //         res.setHeader('Content-disposition', 'attachment; filename=products.csv');
            //         res.set('Content-Type', 'text/csv');
            //         res.csv(result, true, {
            //             "Access-Control-Allow-Origin": "*"
            //         }, 200);
            //     }
            // });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },


    getVendorCategoriesExports: async (req, res) => {
        try {
            let store = req.store;
            let id = req.params._id;
            let storeTypeId = req.params.storeTypeId;
            let obj = {};
            //obj.store = ObjectId(store.storeId);
            obj.vendor = ObjectId(id);
            obj.storeType = ObjectId(storeTypeId);
            obj.status = { $ne: "archived" };

            const getStoreType = await storeType.getStoreTypeByIdAsync(storeTypeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
            }

            let sortByField = "sortOrder";
            let sortOrder = 1;

            Category.aggregate([
                { $match: obj },
                { $sort: { [sortByField]: parseInt(sortOrder) } },
            ], function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {
                        let fdata = {
                            "CategoryId": element._id,
                            ...(["GROCERY"].includes(getStoreType.storeType) ? { "Parent": element.parent } : {}),
                            "catName": element.catName,
                            ...(["GROCERY"].includes(getStoreType.storeType) ? { "Description": element.catDesc } : {}),
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }

                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=products.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            })
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getVendorBrandsExports: async (req, res) => {
        try {
            let store = req.store;
            let storeTypeId = req.params.storeTypeId;
            let obj = {};
            //obj.store = ObjectId(store.storeId);
            obj.storeType = ObjectId(storeTypeId);
            obj.status = { $ne: "archived" };

            Cuisine.find(obj, function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {

                        let fdata = {
                            "Name": element.name,
                            "Status": element.status,
                            "Date": new Date(element.date_created_utc).toLocaleDateString()
                        }

                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=brands.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            })
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getTransactionsExports: async (req, res) => {
        try {
            const query = req.query;
            let user = req.user;
            let store = req.store;
            let id = req.params._id;
            let storeTypeId = req.params.storeTypeId;
            let obj = {};

            if (user.role == "VENDOR") {
                query.user = user._id;
            }

            console.log("query", query);

            let startDate = query.startDate;
            let endDate = query.endDate;

            if (startDate) {
                startDate = new Date(new Date(new Date(startDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                startDate = new Date(startDate);
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 28);
                startDate.setHours(0, 0, 0, 0);
            }

            if (endDate) {
                endDate = new Date(new Date(new Date(endDate).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();
                endDate = new Date(endDate);
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            } else {
                endDate = new Date();
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(0, 0, 0, 0);
            }

            obj.date_created_utc = { $gte: new Date(startDate), $lt: new Date(endDate) };

            if (query.user) {
                obj.payment_to = ObjectId(query.user);
            } else {
                obj.store = ObjectId(store.storeId);

                if (query.type) {
                    obj.type = query.type;
                    obj.isPay = true;
                    obj['$and'] = [
                        { $or: [{ userType: 'VENDOR' }, { userType: 'DRIVER' }] }
                    ];
                } else {
                    obj.type = { $ne: "charge" };
                    obj['$and'] = [
                        { $or: [{ userType: 'ADMIN' }] }
                    ];
                }
            }

            paymentLedger.aggregate([
                { $match: obj, },
                { $lookup: { from: 'stores', localField: 'store', foreignField: '_id', as: 'store' } },
                { $lookup: { from: 'users', localField: 'payment_to', foreignField: '_id', as: 'customerDetails' } },
                { $lookup: { from: 'users', localField: 'vendor', foreignField: '_id', as: 'vendorDetails' } },
                { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$vendorDetails", preserveNullAndEmptyArrays: true } },
                { $project: { store: { currency: 1 }, payment_to: 1, order: 1, payment_by: 1, type: 1, userType: 1, description: 1, amount: 1, adminVendorEarning: 1, adminDeliveryBoyEarning: 1, balance: 1, date_created_utc: 1, vendorDetails: { _id: 1, name: 1, address: 1 }, customerDetails: { _id: 1, name: 1, address: 1 }, storeType: { _id: 1, storeType: 1 } } },
                { $sort: { date_created_utc: -1 } }
            ], function (err, resdata) {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let result = [];

                    resdata.forEach(element => {
                        console.log("element", element);
                        let CurrentCityTime = helper.getDateAndTimeInCityTimezone(element.date_created_utc, store.timezone);
                        let fdata = {
                            "Time": CurrentCityTime.format('MM-DD-YYYY') + ' ,' + CurrentCityTime.format('LT'),
                            ...(query.type ? {
                                "Name": element.customerDetails && element.customerDetails.name || ""
                            } : query.user ? {
                                "Name": element.customerDetails && element.customerDetails.name || "",
                                "Balance": element.store.currency.sign + element.balance
                            } : {
                                "Earning": element.store.currency.sign + element.balance
                            }),
                            "Type": element.type.toUpperCase(),
                            "Amount": element.store.currency.sign + element.amount,
                            ...(element.vendorDetails ? {
                                "Vendor/Restaurant": element.vendorDetails.name,
                                "Address": element.vendorDetails.address
                            } : {
                                "Vendor/Restaurant": "NA",
                                "Address": element.customerDetails && element.customerDetails.address ? element.customerDetails.address : "NA"
                            }),
                            "Description": element.description
                        }

                        result.push(fdata);
                    });

                    res.setHeader('Content-disposition', 'attachment; filename=transactions.csv');
                    res.set('Content-Type', 'text/csv');
                    res.csv(result, true, {
                        "Access-Control-Allow-Origin": "*"
                    }, 200);
                }
            })
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreConfigs: async (req, res) => {
        try {
            let adminStripePublishableKey = env.superAdminStripe.sandbox.Stripe_Publishable_Key;

            if (process.env.NODE_ENV == "production") {
                adminStripePublishableKey = env.superAdminStripe.live.Stripe_Publishable_Key;
            }

            let resdata = {
                countries: Config.COUNTRIES,
                languages: Config.LANGUAGES,
                currencies: Config.CURRENCIES,
                timezones: Config.TIMEZONES,
                notificationSound: Config.NOTIFICATIONS_SOUND,
                contentSectionType: Config.CONTENT_SECTION_TYPE,
                appBannerSectionType: Config.APP_BANNER_SECTION_TYPE,
                contentDeviceType: Config.CONTENT_DEVICE_TYPE,
                driverStoreType: Config.DRIVER_STORE_TYPE,
                cancellationPolicyOrderStatus: Config.CANCELLATION_POLICY_ORDERSTATUS,
                cancellationPolicyRefundType: Config.CANCELLATION_POLICY_REFUND_TYPE,
                importCSV: env.import_csv_url,
                pricingType: Config.pricingType,
                adminStripePublishableKey: adminStripePublishableKey,
                vehicles: Config.VEHICLES,
                terminologyType: Config.TERMINOLOGY_TYPE,
                geofenceType: Config.GEOFENCE_TYPE,
                serviceUnit: Config.serviceUnit,
                directPaymentGetway: Config.DIRECTPAYMENTGATEWAY

            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));

        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreByDomain: async (req, res) => {
        try {
            let data = req.body;

            if (!data.domain) {
                return res.json(helper.showValidationErrorResponse('DOMAIN_IS_REQUIRED'));
            }

            if (process.env.NODE_ENV == "staging") {
                data.domain = 'main.hlc-staging.com';
            } else {
                data.domain = data.domain.replace('app.', '');
            }

            let getStore = await Store.findOne({ $or: [{ domain: data.domain.trim() }, { domain: 'www.' + data.domain.trim() }] }, "storeName logo themeSettings")
                .populate({ path: 'logo' })
                .populate({ path: 'favIcon' })
                .exec();

            res.json(helper.showSuccessResponse('DATA_SUCCESS', getStore));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    paymentadjustment: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;

            if (!data.payment_to) {
                return res.json(helper.showValidationErrorResponse('USER_IS_REQUIRED'));
            }

            if (!data.amount) {
                return res.json(helper.showValidationErrorResponse('AMOUNT_IS_REQUIRED'));
            }

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            if (!data.userType) {
                return res.json(helper.showValidationErrorResponse('USER_TYPE_IS_REQUIRED'));
            }

            if (!data.description) {
                return res.json(helper.showValidationErrorResponse('DESCRIPTION_IS_REQUIRED'));
            }

            let addedTransaction = await Transaction.addTransaction(null, null, data.userType, store.storeId, data.payment_to, data.amount, data.type, data.description, null, null, null, true);
            res.json(helper.showSuccessResponse('DATA_SUCCESS', addedTransaction));
            notifyUser.adjustmentPaymentNotify(data.payment_to, data.amount, data.type);
        } catch (error) {
            console.log("error", error)
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    EditDriverVehicle: async (req, res) => {
        try {
            let data = req.body;
            const store = req.store;
            data.type = "edit"
            // if (!data.type) {
            //     return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            // }
            let getVehicleTemplate = await DocumentTemplate.findOne({ store: store.storeId, status: "active", type: "vehicleInfo", role: "DRIVER" }).populate({ path: 'fields', match: { status: 'active' } }).exec();

            if (getVehicleTemplate == null) {
                return res.json(helper.showValidationErrorResponse('PLEASE_ADD_VEHICLE_TEMPLATE'));
            }

            if (getVehicleTemplate.fields.length === 0) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            if (data.type === "edit") {
                if (!data._id) {
                    return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
                }
                if (!data.driver) {
                    return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
                }
                getVehicleTemplate.set('vehicleId', data._id.toString(), { strict: false });

                let getDriverVehicle = await driverVehicle.findOne({ _id: data._id, user: ObjectId(data.driver) }, 'vehicleType values')
                    .populate(
                        {
                            path: 'vehicleType',
                            match: { status: "active" },
                            select: 'name image',
                            populate: {
                                path: 'image',
                                select: 'link'
                            }
                        }
                    )
                    .exec();

                if (getDriverVehicle == null) {
                    return res.json(helper.showValidationErrorResponse('INVALID_VEHICLE_ID'));
                }

                getVehicleTemplate.set('vehicleType', getDriverVehicle.vehicleType, { strict: false });

                await Promise.all(getVehicleTemplate.fields.map(element => {
                    let value = '';

                    let getDocData = getDriverVehicle.values.filter(ele => {
                        return ele.name === element.name;
                    });
                    if (getDocData.length > 0) {
                        value = getDocData[0].value;

                        if (element.type === 'checkbox') {
                            element['options'] = getDocData[0].options;
                        }
                    }

                    element.set('value', value, { strict: false });

                }));
            }
            res.json(helper.showSuccessResponse('SUCCESS', getVehicleTemplate));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    UpdateDriverVehicle: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            let getVehicle = null;
            let newVehicle = null;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            if (!data.driver) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }
            if (!data.vehicleType) {
                return res.json(helper.showValidationErrorResponse('PLEASE_SELECT_VEHICLE_TYPE'));
            }
            if (!data.vehicleId) {
                return res.json(helper.showValidationErrorResponse('VEHICLE_ID_IS_REQUIRED'));
            }
            let getDocTemplate = await DocumentTemplate.findById(data._id);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }
            if (data.isManualPrice) {
                if (!data.basePrice) {
                    return res.json(helper.showValidationErrorResponse('BASE_PRICE_IS_REQUIRED'));
                };
            }
            if (!data.fields || !data.fields.length) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            let fields = data.fields;

            let values = [];
            let message = '';
            let flag = false;

            for (let index2 = 0; index2 < fields.length; index2++) {
                let required = fields[index2].validation.required;
                let name = fields[index2].name;
                let value = fields[index2].value;
                let type = fields[index2].type;
                let label = fields[index2].label;
                let valueType = fields[index2].valueType

                if (required && type != 'checkbox') {
                    if (!value) {
                        flag = true;
                        message = fields[index2].label + ' is required';
                        break;
                    }
                }

                let obj = {
                    label: label,
                    name: name,
                    value: value,
                    type: type.$addFields,
                }
                if (valueType) {
                    obj.valueType = valueType
                }
                if (type === 'checkbox') {
                    let options = fields[index2].options;
                    obj.options = options;
                }

                values.push(obj);
            }

            if (flag) {
                return res.json(helper.showParamsErrorResponse(message));
            }

            let output = [];
            let completeO = [];
            let complete = [];
            complete.push({ template: data._id.toString(), isComplete: data.isComplete });

            let resMessage = 'UPDATE_SUCCESS';


            getVehicle = await driverVehicle.findById(data.vehicleId);

            if (getVehicle == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_VEHICLE'));
            }

            output = values.concat(
                getVehicle.values.filter(s =>
                    !values.find(t => t.name == s.name)
                )//end filter 
            );//end concat

            if (getVehicle.complete && getVehicle.complete.length > 0) {
                completeO = complete.concat(
                    getVehicle.complete.filter(s =>
                        !complete.find(t => t.template == s.template)
                    )//end filter 
                );//end concat
            } else {
                completeO = complete;
            }

            let vehicleObj = {
                template: data._id,
                vehicleType: data.vehicleType,
                values: output,
                complete: completeO,
                basePrice: data.basePrice || 0,
                pricePerUnitDistance: data.pricePerUnitDistance || 0,
                pricePerUnitTimeMinute: data.pricePerUnitTimeMinute || 0,
                isManualPrice: data.isManualPrice || false
            }

            newVehicle = await driverVehicle.findOneAndUpdate({ _id: ObjectId(data.vehicleId) }, vehicleObj, { new: true });
            let getDriver = User.findOne({ _id: data.driver, vehicle: data.vehicleId }).populate(
                {
                    path: "vehicle",
                    populate: {
                        path: "vehicleType",
                        select: "type"
                    }
                }
            ).exec();
            if (getDriver && getDriver.vehicle && getDriver.vehicle.vehicleType.toString() == data.vehicleType) {
                if (getDriver.vehicle.vehicleType.type == "pool")
                    getDriver.enabledRideShare = true;
                else
                    getDriver.enabledRideShare = false;

                await getDriver.save();
            }

            res.json(helper.showSuccessResponse(resMessage, newVehicle));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    defaultDriverVehiclebyadmin: async (req, res) => {
        try {
            let data = req.body;
            // let user = req.user;
            //data._id = user._id;

            if (!data.vehicleId) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            if (!data.driver) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }
            data._id = data.driver;

            data.vehicle = data.vehicleId;

            User.updateProfileDeliveryBoy(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    driverVehiclesListbyadmin: async (req, res) => {
        try {
            //let user = req.user;
            let data = req.body;
            let obj = {};
            if (!data.driver) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }
            obj.user = ObjectId(data.driver);

            driverVehicle.getDriverVehiclesList(obj, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        }
        catch (err) {
            console.log("err", err);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    deleteDriverVehiclebyadmin: async (req, res) => {
        try {
            let data = req.body;
            let obj = {};
            if (!data.vehicleId) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            if (!data.driver) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }
            obj._id = data.vehicleId
            obj.user = ObjectId(data.driver);
            driverVehicle.remove(obj, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addDriverVehiclebyadmin: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let getVehicle = null;
            let newVehicle = null;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            if (!data.driver) {
                return res.json(helper.showValidationErrorResponse('DRIVER_ID_IS_REQUIRED'));
            }
            if (!data.vehicleType) {
                return res.json(helper.showValidationErrorResponse('PLEASE_SELECT_VEHICLE_TYPE'));
            }
            let getDocTemplate = await DocumentTemplate.findById(data._id);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (!data.fields || !data.fields.length) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            let fields = data.fields;

            let values = [];
            let message = '';
            let flag = false;

            for (let index2 = 0; index2 < fields.length; index2++) {
                let required = fields[index2].validation.required;
                let name = fields[index2].name;
                let value = fields[index2].value;
                let type = fields[index2].type;
                let label = fields[index2].label;

                if (required && type != 'checkbox') {
                    if (!value) {
                        flag = true;
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

            if (flag) {
                return res.json(helper.showParamsErrorResponse(message));
            }

            let output = [];
            let completeO = [];
            let complete = [];
            complete.push({ template: data._id.toString(), isComplete: data.isComplete });

            let resMessage = 'DATA_ADDED_SUCCESS';

            output = values;
            completeO = complete;

            let vehicleObj = {
                user: ObjectId(data.driver),
                template: data._id,
                vehicleType: data.vehicleType,
                values: output,
                complete: completeO,
                date_created_utc: new Date()
            }

            newVehicle = await driverVehicle.create(vehicleObj);
            //newVehicle = await driverVehicle.findOneAndUpdate({ _id: ObjectId(data.vehicleId) }, vehicleObj, { new: true });


            //await User.findOneAndUpdate({ _id: data.driver }, { vehicle: newVehicle._id });

            res.json(helper.showSuccessResponse(resMessage, newVehicle));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    driverVehiclTypes: async (req, res) => {
        try {
            const { orderBy, order, page, limit } = req.body
            let pageSize = limit || 9999999;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let store = req.store;
            let obj = {};
            obj.store = store.storeId;
            obj.status = "active";

            Vehicle.geVehiclesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getsettelmentuser: async (req, res) => {
        try {
            const data = req.body;
            const store = req.store;
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            let hideThings = store.hideThings
            let demo = hideThings.filter(element => element.type == "isDemo")
            let is_demo = demo.length ? demo[0]['value'] : false
            obj.role = { $in: ["VENDOR", "DRIVER"] };
            obj.wallet = { $gt: 0 };

            if (data.fields && data.fields.length > 0) {
                data.fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = { $regex: element.fieldValue, $options: 'i' };
                    }
                });
            }
            else {
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
            User.getUsersWithFilterVendorDriver(obj, sortByField, sortOrder, paged, pageSize, is_demo, async (err, resdata) => {
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
    driverlistdispature: async (req, res) => {
        try {
            const data = req.body;
            const store = req.store;
            let pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            let hideContactInfo = req.hideContactInfo;
            let is_demo = false;
            if (helper.isValidHidethings(store, "isDemo") || helper.validateHideContactInfo(hideContactInfo, "VENDOR")) {
                is_demo = true;
            };
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
            pageSize = totalcount ? totalcount : pageSize;
            User.getUsersWithFilter(obj, sortByField, sortOrder, paged, pageSize, is_demo, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount));
                }
            });
        } catch (err) {
            console.log("err", err)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    customerlistdispature: async (req, res) => {
        try {
            const data = req.body;
            const store = req.store;
            let pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            let hideContactInfo = req.hideContactInfo;
            let is_demo = false;
            if (helper.isValidHidethings(store, "isDemo") || helper.validateHideContactInfo(hideContactInfo, "VENDOR")) {
                is_demo = true;
            };
            obj.role = "USER";

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
            pageSize = totalcount ? totalcount : pageSize;
            User.getUsersWithFilter(obj, sortByField, sortOrder, paged, pageSize, is_demo, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount));
                }
            });
        } catch (err) {
            console.log("err", err)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    vendorlistdispature: async (req, res) => {
        try {
            const data = req.body;
            const store = req.store;
            let obj = {};
            let activeStoreType = [];
            obj.store = ObjectId(store.storeId);
            let hideContactInfo = req.hideContactInfo;
            let is_demo = false;
            if (helper.isValidHidethings(store, "isDemo") || helper.validateHideContactInfo(hideContactInfo, "VENDOR")) {
                is_demo = true;
            };
            if (data.storeType && data.storeType.length) {
                activeStoreType = { "storeType.storeType": { $in: data.storeType } };
            }
            obj.role = "VENDOR";
            obj.status = "approved";
            User.getUsersList(obj, is_demo, activeStoreType, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata));
                }
            });
        } catch (err) {
            console.log("err", err)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    usersReviewsList: async (req, res) => {
        try {
            const data = req.body;
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let obj = {};

            if (req.query && req.query.vendor) {
                //return module.exports.vendorReviewsList(req, res);
                obj.reviewed_to = ObjectId(req.query.vendor);

            }
            if (req.query && req.query.driver) {
                obj.reviewed_to = ObjectId(req.query.driver);
            }
            if (req.query && req.query.customer) {
                obj.reviewed_to = ObjectId(req.query.customer);
            }

            // if (data.fieldName && data.fieldValue) {
            //     obj[data.fieldName] = { $regex: data.fieldValue || '', $options: 'i' };
            // }

            let totalcount = await Review.countDocuments(obj);
            Review.getReviewList(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount));
                }
            });
        } catch (err) {
            console.log("err", err)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    vendorReviewsList: async (req, res) => {
        try {
            const data = req.body;
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let obj = { "products.vendor": ObjectId(req.query.vendor), "products.status": { $ne: "archived" } };
            console.log("obj:==>", obj)
            let count = await ProductReview.aggregate([
                { $addFields: { id: { $toObjectId: "$product_id" } } },
                { $lookup: { from: "products", localField: "id", foreignField: "_id", as: "products" } },
                { $unwind: "$products" },
                {
                    $match: { "products.vendor": ObjectId(req.query.vendor), "products.status": { $ne: "archived" } }
                },
                { $group: { _id: null, count: { $sum: 1 } } }]);
            let totalcount = count.length > 0 ? count[0].count : 0;
            ProductReview.getReviewList(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount));
                }
            });

        } catch (err) {
            console.log("err", err)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getOrdersForCustomerAndDriver: async (req, res) => {
        try {
            const data = req.body;
            const store = req.store;
            let user = req.user;
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const fields = data.fields;
            const paged = data.page || 1;
            let obj = {};
            if (user.role == 'STAFF' && helper.isValidHidethings(store, "driverlistdispatcher")
                && user.driverassign && user.driverassign.length) {
                obj["driver"] = { $in: user.driverassign }
            };

            if (data.storeTypeId) {
                obj.storeType = ObjectId(data.storeTypeId);
            }

            if (req.query && req.query.driver) {
                obj.driver = ObjectId(req.query.driver);
            }
            if (req.query && req.query.customer) {
                obj.user = ObjectId(req.query.customer);
            }

            obj.store = ObjectId(store.storeId);

            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (!obj.hasOwnProperty("orderStatus")) {
                obj.orderStatus = { $ne: "archived" };
            }

            if (data.search) {
                obj['$or'] = [];
                obj['$or'].push({ customOrderId: { $regex: data.search || '', $options: 'i' } })
            }
            let count = await Order.countDocuments(obj);
            Order.getNewOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, count));
                }
            });
        } catch (err) {
            console.log("err", err);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    vendorClone: async (req, res) => {
        try {
            let { vendor } = req.body;
            if (!vendor) {
                return res.json(helper.showValidationErrorResponse("VENDOR_IS_REQUIRED"))
            }

            let getVendor = await User.getVendorInfo(vendor);
            if (!getVendor) {
                return res.json(helper.showValidationErrorResponse("INVALID_VENDOR_ID"))
            };

            let vendorClone = await vendorCloneProcess.buildVendorObj(getVendor);
            // res.json(helper.showSuccessResponse("DATA_ADDED_SUCCESS", vendorClone));

            // return;
            User.addVendorClone(vendorClone, (err, resdata) => {
                if (err) {
                    console.log(err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                };
                let resObj = { _id: resdata._id, name: resdata.name, email: resdata.email };
                res.json(helper.showSuccessResponse("DATA_ADDED_SUCCESS", resObj));
                vendorCloneProcess.vendorCloneIntialSetupProcess(resdata, getVendor);
            })


        } catch (error) {
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('somethingWentWrong'));
        }

    },
    addplan: async (req, res) => {
        let plan = req.body.plan
        if (!plan) {
            return res.json(helper.showValidationErrorResponse("paln requried"))
        }
        let productData = await planmodel.create(plan)
        return res.json(helper.showSuccessResponse("SUCCESS", productData))
    },
}
function setProductVariationsField(element, isVariations) {
    let fdata = {
        // "ProductId": element._id || "",
        "categories": element.categories ? helper.getFields(element.categories, "catName").join(',') : "",
        "name": element.name || "",
        "sku": element.sku || "",
        "type": element.type || "",
        "price": element.price || "",
        "compare_price": element.compare_price || "",
        "short_description": element.short_description || "",
        "description": element.description || "",
        "featured_image": element.featured_image && element.featured_image.link || "",
        "images": element.images ? helper.getFields(element.images, "link").join(',') : "",
        "status": element.status || "",
        "manage_stock": element.manage_stock || false,
        "stock_quantity": element.stock_quantity || "",
        "stock_status": element.stock_status || "",
        "brand": element.brand && element.brand.name || "",
        "Date": element.date_created_utc ? new Date(element.date_created_utc).toLocaleDateString() : ""
    }

    if (isVariations) {
        fdata = {
            "categories": "",
            "name": "",
            "sku": element.productSku,
            "type": "",
            "price": "",
            "compare_price": "",
            "short_description": "",
            "description": "",
            "featured_image": "",
            "images": "",
            "status": "",
            "manage_stock": "",
            "stock_quantity": "",
            "stock_status": "",
            "brand": "",
            "Date": ""
        }
        fdata["Variation:Name1"] = '';
        fdata["Variation:Value1"] = element.variationValue;
        fdata["Variation:sku"] = element.sku;
        fdata["Variation:price"] = element.price;
        fdata["Variation:stock_quantity"] = element.stock_quantity;
        fdata["Variation:manage_stock"] = element.manage_stock;
        fdata["Variation:stock_status"] = element.stock_status;
    }
    return fdata;
}