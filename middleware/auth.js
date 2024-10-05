const User = require('../models/userTable.js');
const Store = require('../models/storeTable');
const Content = require('../models/contentPagesTable');
const Role = require('../models/rolesTable');
const jwt = require('jsonwebtoken');
const Config = require('../config/constants.json');
const storeType = require('../models/storeTypeTable');
const ObjectId = require('objectid');

function getActionAndType(path, method, storeTypeName) {

    let getAccessType = Config.ACCESS_TYPE;

    let getAccess = [];

    if (storeTypeName) {
        getAccess = getAccessType.filter(access => {
            return access.apiUrl === path && access.method === method && access.storeType === storeTypeName;
        });

        if (Config.SERVICES.includes(storeTypeName) && getAccess.length <= 0) {
            getAccessType = Config.ACCESS_TYPE_DEFAULT_STORE;

            getAccess = getAccessType.filter(access => {
                const apiUrl = access.apiUrl.replace(":storeTypeName", storeTypeName.toLowerCase())
                access.storeType = storeTypeName;
                // console.log("apiUrl ", apiUrl, path)
                return apiUrl === path && access.method === method;
            });
        }

    } else {
        getAccess = getAccessType.filter(access => {
            return access.apiUrl === path && access.method === method;
        });
    }

    return getAccess;
}

function checkAccessLevelForStaff(getAccess, accessLevel) {

    let type = getAccess[0].type;
    let action = getAccess[0].action;

    if (type === 'storetypes') {

        let getAccesslevel = accessLevel.filter(access => {
            return access.type === type;
        });

        if (getAccesslevel.length === 0) {
            return false;
        }

        let storeTypes = getAccesslevel[0].storeTypes;

        if (storeTypes.length === 0) {
            return false;
        }

        let getStoreType = storeTypes.filter(storeType => {
            return storeType.storeType === getAccess[0].storeType;
        });

        if (getStoreType.length === 0) {
            return false;
        }

        let getStoreTypeNav = getStoreType[0].navigation;

        let getStoreTypeChild = getStoreTypeNav.filter(storeTypeChild => {
            return storeTypeChild.type === getAccess[0].typeChild;
        });

        if (getStoreTypeChild.length === 0) {
            return false;
        }

        //check permission
        let permissions = getStoreTypeChild[0].permissions;
        let getPermission = permissions.filter(permission => {
            return permission.label === action && permission.value === true;
        });
        if (getPermission.length === 0) {
            return false;
        } else {
            return true;
        }
    }

    let getAccesslevel = accessLevel.filter(access => {
        return access.type === type;
    });

    if (getAccesslevel.length === 0) {
        return false;
    }

    //check permission
    let permissions = getAccesslevel[0].permissions;
    let getPermission
    if (action == "DELETE") {
        getPermission = permissions.filter(permission => {
            return ((permission.label === 'DELETE' || permission.label === 'BLOCK') && permission.value === true);
        });
    }
    else {
        getPermission = permissions.filter(permission => {
            return permission.label === action && permission.value === true;
        });
    }
    // let getPermission = permissions.filter(permission => {
    //     return permission.label === action && permission.value === true;
    // });
    if (getPermission.length === 0) {
        return false;
    } else {
        return true;
    }
}

module.exports = {

    isStoreType: async (req, res, next) => {
        let data = req.body;

        data.storeTypeId = req.method === 'GET' ? req.params.storeTypeId : data.storeTypeId;

        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }

        const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);

        if (getStoreType === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
        }


        if (String(getStoreType.store._id) != String(req.store.storeId)) {
            return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
        }

        req.body.storeType = getStoreType._id;
        req.body.storeTypeName = getStoreType.storeType;
        req.body.deliveryType = getStoreType.deliveryType;
        req.body.storeVendorType = getStoreType.storeVendorType;

        next();
    },
    authVerifyUser: async (req) => {

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ _id: decoded._id, status: "active", role: "USER", "tokens.token": token });

            if (!user) {
                return null;
            }

            return user;

        } catch (error) {
            var myuser = null
            return myuser;
        }
    },
    isUserExists: async (req, res, next) => {
        let data = req.body;

        data.email = data.email.toLowerCase().trim();

        const getUser = await User.findOne({ role: { $in: ["ADMIN", "STAFF", "VENDOR"] }, email: data.email, status: { $nin: ["archived", 'temp'] } })
            .populate({ path: 'store', match: { status: { $ne: "archived" } } })
            .exec();

        if (getUser != null) {

            if (getUser.role === "VENDOR" || getUser.role === "STAFF") {
                return res.json(helper.showValidationErrorResponse('USER_EXISTS'));
            }

            if (getUser.store) {
                return res.json(helper.showValidationErrorResponse('USER_EXISTS'));
            }
        }

        next();
    },

    authUser: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }
        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);
            const user = await User.findOne({ status: "active", _id: decoded._id, role: "USER", "tokens.token": token }, 'name role status firebaseToken firebaseTokens tokens mobileNumber email password store wallet loyaltyPoints userLocation language')
                .populate({ path: "store", select: 'storeLanguage distanceUnit timezone googleMapKey loyaltyPoints status storeType', match: { status: { $ne: 'archived' } }, populate: { path: "storeType", select: "storeType" } })
                .exec();

            if (!user) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (!user.store) {
                return res.json(helper.showUnathorizedErrorResponse('INVALID_STORE'));
            }

            if (user.store.status === "inactive") {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }
            if (user.language && user.store.storeLanguage) {
                let langcode = user.store.storeLanguage.find(i => i.code == user.language.code);
                if (langcode) {
                    req.setLocale(langcode.code);
                };
            }
            req.user = user;
            req.token = token;
            next();

        } catch (error) {
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
        }
    },

    authSuperAdmin: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ _id: decoded._id, role: "SUPERADMIN", "tokens.token": token });
            if (!user) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            req.user = user;
            req.token = token;
            req.store = {
                storeId: user.store
            }

            next();

        } catch (error) {
            console.log("error", error);
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;

            res.json(resdata);
        }
    },

    authAdmin: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ status: { $nin: ['archived', 'temp'] }, _id: decoded._id, role: "ADMIN", "tokens.token": token })
                .populate({ path: "store", select: "status timezone", match: { status: { $ne: 'archived' } } })
                .exec();

            if (!user) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (!user.store) {
                const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
                resdata.isInvalidToken = true;
                return res.json(resdata);
            }

            if (user.store.status === 'inactive') {
                const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
                resdata.storeStatus = 'inactive';
                return res.json(resdata);
            }

            req.user = user;
            req.token = token;
            req.store = {
                storeId: user.store._id,
                timezone: user.store.timezone
            }

            next();

        } catch (error) {
            console.log("error", error);
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
            removeExpiredTokens(error, token)
        }
    },

    authAdminAndStaff: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ status: { $nin: ['archived', 'temp'] }, $or: [{ role: "ADMIN" }, { role: "STAFF" }], _id: decoded._id, "tokens.token": token })
                .populate({
                    path: "store", select: "storeName plan domain currency timezone googleMapKey bankFields email distanceUnit paymentSettings loyaltyPoints orderAutoApproval status hideThings", match: { status: { $ne: 'archived' } },
                    populate: { path: "plan.billingPlan" }
                })
                .exec();

            if (!user) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (user.status === "inactive" || user.status === "blocked" || user.status === "rejected") {
                const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
                resdata.isInvalidToken = true;
                return res.json(resdata);
            }

            if (!user.store) {
                const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
                resdata.isInvalidToken = true;
                return res.json(resdata);
            }

            if (user.store.status === 'inactive') {
                const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
                resdata.storeStatus = 'inactive';
                return res.json(resdata);
            }

            req.user = user;
            req.token = token;

            let getApp = user.store;

            req.store = {
                storeId: getApp._id,
                storeName: getApp.storeName,
                supportEmail: getApp.email,
                distanceUnit: getApp.distanceUnit,
                paymentSettings: getApp.paymentSettings,
                loyaltyPoints: getApp.loyaltyPoints,
                orderAutoApproval: getApp.orderAutoApproval,
                domain: getApp.domain,
                timezone: getApp.timezone,
                googleMapKey: getApp.googleMapKey,
                currency: getApp.currency,
                bankFields: getApp.bankFields,
                hideThings: getApp.hideThings,
                plan: getApp.plan ? getApp.plan.billingPlan : {}
            }

            next();

        } catch (error) {
            console.log("error", error);
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
            removeExpiredTokens(error, token)
        }
    },

    authAdminAndStaffAndVendor: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        let lang = req.get('Accept-Language');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ status: { $nin: ['archived', 'temp'] }, $or: [{ _id: decoded._id, role: "ADMIN", "tokens.token": token }, { _id: decoded._id, role: "VENDOR", "tokens.token": token }, { _id: decoded._id, role: "STAFF", "tokens.token": token }] })
                .populate({ path: "store", select: "status timezone storeVersion hideThings paymentSettings", match: { status: { $ne: 'archived' } }, populate: { path: "plan.billingPlan" } })

                .exec();

            if (!user) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (user.status === "inactive" || user.status === "blocked" || user.status === "rejected") {
                const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
                resdata.isInvalidToken = true;
                return res.json(resdata);
            }

            if (!user.store) {
                const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
                resdata.isInvalidToken = true;
                return res.json(resdata);
            }

            if (user.store.status === 'inactive') {
                const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
                resdata.storeStatus = 'inactive';
                return res.json(resdata);
            }

            req.user = user;
            req.token = token;
            req.store = {
                storeId: user.store._id,
                storeVersion: user.store.storeVersion,
                status: user.store.status,
                hideThings: user.store.hideThings,
                timezone: user.store.timezone,
                paymentSettings: user.store.paymentSettings
            }

            next();

        } catch (error) {
            console.log("error", error);
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
            removeExpiredTokens(error, token)
        }
    },

    authVendor: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showUnathorizedErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ $or: [{ status: "approved", status: "active" }], $or: [{ _id: decoded._id, role: "VENDOR", "tokens.token": token }, { _id: decoded._id, role: "ADMIN", "tokens.token": token }] })
                .populate({ path: "store", select: 'status', match: { status: { $ne: 'archived' } } })
                .exec();

            if (!user) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (!user.store) {
                return res.json(helper.showUnathorizedErrorResponse('INVALID_TOKEN'));
            }

            if (user.store.status === 'inactive') {
                const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
                resdata.storeStatus = 'inactive';
                return res.json(resdata);
            }

            req.user = user;
            req.token = token;
            req.store = {
                storeId: user.store._id
            }

            next();

        } catch (error) {
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
            removeExpiredTokens(error, token)
        }
    },

    authDriver: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showUnathorizedErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');
        let store = req.store;

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ store: store.storeId, _id: decoded._id, status: { $nin: ['archived', 'temp'] }, role: "DRIVER", "tokens.token": token })
                .populate({ path: "store", select: 'status', match: { status: { $nin: ['archived', 'temp'] } } })
                .populate(
                    {
                        path: "vehicle",
                        populate: {
                            path: "vehicleType",
                            populate: {
                                path: 'image',
                                select: 'link'
                            }
                        }
                    }
                )
                .exec();

            if (!user) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (!user.store) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (user.store.status === "inactive") {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (user.status === 'blocked') {
                return res.json(helper.showUnathorizedAppErrorWithErrorCode('USER_BLOCKED', '5013'));
            }

            if (user.status === 'rejected') {
                return res.json(helper.showUnathorizedAppErrorWithErrorCode('USER_REJECTED', '5014'));
            }

            if (user.status === 'inactive') {
                return res.json(helper.showUnathorizedErrorResponse('USER_INACTIVE', '5015'));
            }

            req.user = user;
            req.token = token;

            next();

        } catch (error) {
            const resdata = helper.showUnathorizedAppErrorWithErrorCode('INVALID_TOKEN', '5012');
            resdata.isInvalidToken = true;
            res.json(resdata);
        }
    },

    authVerify: async (req) => {

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ _id: decoded._id, status: "approved", role: "DRIVER", "tokens.token": token });

            if (!user) {
                return null;
            }

            return user;

        } catch (error) {
            var myuser = null
            return myuser;
        }
    },

    isUniversalApp: async (req, res, next) => {
        try {
            const api_key = req.get('apikey');
            let lang = req.get('Accept-Language');
            const data = req.body || {};
            // if (api_key || data.storeId) {
            //     isStore = true;
            // }

            // if (!isStore) {
            //     return res.json(helper.showUnathorizedAppErrorResponse('STORE_API_KEY_OR_STOREID_IS_REQUIRED'));
            // }

            let getApp;

            if (api_key) {
                getApp = await Store.findOne({ api_key: api_key, status: { $in: ["active", 'gracePeriod'] } })
                    .populate({ path: 'storeType', select: '_id' })
                    .populate('plan.billingPlan')
                    .exec();

                if (!getApp) {
                    return res.json(helper.showUnathorizedAppErrorResponse('STORE_IS_NOT_ACTIVE'));
                }
            }

            if (data.storeId) {

                getApp = await Store.findOne({ slug: data.storeId, status: { $in: ["active", 'gracePeriod'] } })
                    .populate({ path: 'storeType', select: '_id' })
                    .populate('plan.billingPlan')
                    .exec();

                if (!getApp) {
                    return res.json(helper.showUnathorizedAppErrorResponse('STORE_IS_NOT_ACTIVE'));
                }
            }

            if (lang) {
                req.setLocale(lang);
            }

            req.isApp = true;

            if (!lang) {
                if (getApp && getApp.language) {
                    if (getApp.language.code) {
                        req.setLocale(getApp.language.code);
                    }
                }
            }

            if (getApp) {
                req.store = {
                    storeId: getApp._id,
                    storeName: getApp.storeName,
                    supportEmail: getApp.email,
                    distanceUnit: getApp.distanceUnit,
                    loyaltyPoints: getApp.loyaltyPoints,
                    language: getApp.language,
                    hideThings: getApp.hideThings,
                    storeLanguage: getApp.storeLanguage
                }
            }
            next();
        } catch (error) {
            console.log("isUniversalApp err", error);
        }
    },

    isApp: async (req, res, next) => {

        if (!req.get('apikey')) {

            return res.json(helper.showUnathorizedAppErrorResponse('STORE_API_KEY_IS_REQUIRED'));
        }

        const api_key = req.get('apikey');
        let lang = req.get('Accept-Language');
        let host = req.get('hostname');

        const getApp = await Store.findOne({ api_key: api_key, status: { $in: ["active", 'gracePeriod'] } })
            .populate({ path: 'storeType', select: '_id storeType status bidSettings' })
            .populate('plan.billingPlan')
            .exec();
        if (getApp == null) {
            return res.json(helper.showUnathorizedAppErrorResponse('STORE_IS_NOT_ACTIVE'));

        }

        if (getApp.language) {
            if (getApp.language.code) {
                req.setLocale(getApp.language.code);
            }
        }
        if (lang && getApp.storeLanguage) {
            let langcode = getApp.storeLanguage.find(i => i.code == lang);
            if (langcode) {
                req.setLocale(langcode.code);
            };
        }
        let isSingleVendor = false;

        if (getApp.plan && getApp.plan.billingPlan && getApp.plan.billingPlan.type && getApp.plan.billingPlan.type === "basic") {
            isSingleVendor = true;
        }

        req.isApp = true

        req.store = {
            storeId: getApp._id,
            storeName: getApp.storeName,
            tipType: getApp.tipType,
            supportEmail: getApp.email,
            distanceUnit: getApp.distanceUnit,
            storeTypes: getApp.storeType,
            paymentMode: getApp.paymentMode,
            paymentSettings: getApp.paymentSettings,
            loyaltyPoints: getApp.loyaltyPoints,
            orderAutoApproval: getApp.orderAutoApproval,
            domain: getApp.domain,
            plan: getApp.plan,
            currency: getApp.currency,
            storeVersion: getApp.storeVersion,
            isSingleVendor: isSingleVendor,
            timezone: getApp.timezone,
            hideThings: getApp.hideThings,
            language: getApp.language,
            otpbypass: getApp.otpbypass,
            orderAutoCancel: getApp.orderAutoCancel,
            referredUserCommission: getApp.referredUserCommission,
            activePaymentMethodForAddCard: getApp.activePaymentMethodForAddCard,
            googleMapKey: getApp.googleMapKey,
            tokenExpiresIn: getApp.tokenExpiresIn,
            userRefereeSetting: getApp.userRefereeSetting,
            storeLanguage: getApp.storeLanguage,
            avoidFraudSetting: getApp.avoidFraudSetting

        }

        next();
    },
    isAppDefault: async (req, res, next) => {

        let lang = req.get('Accept-Language');
        let host = req.get('hostname');
        const getApp = await Store.findOne({ status: { $in: ["active", 'gracePeriod'] } })
            .populate({ path: 'storeType', select: '_id storeType status bidSettings' })
            .populate('plan.billingPlan')
            .exec();
        if (getApp == null) {
            return res.json(helper.showUnathorizedAppErrorResponse('STORE_IS_NOT_ACTIVE'));

        }

        if (getApp.language) {
            if (getApp.language.code) {
                req.setLocale(getApp.language.code);
            }
        }
        if (lang && getApp.storeLanguage) {
            let langcode = getApp.storeLanguage.find(i => i.code == lang);
            if (langcode) {
                req.setLocale(langcode.code);
            };
        }
        let isSingleVendor = false;

        if (getApp.plan && getApp.plan.billingPlan && getApp.plan.billingPlan.type && getApp.plan.billingPlan.type === "basic") {
            isSingleVendor = true;
        }

        req.isApp = true

        req.store = {
            storeId: getApp._id,
            storeName: getApp.storeName,
            tipType: getApp.tipType,
            supportEmail: getApp.email,
            distanceUnit: getApp.distanceUnit,
            storeTypes: getApp.storeType,
            paymentMode: getApp.paymentMode,
            paymentSettings: getApp.paymentSettings,
            loyaltyPoints: getApp.loyaltyPoints,
            orderAutoApproval: getApp.orderAutoApproval,
            domain: getApp.domain,
            plan: getApp.plan,
            currency: getApp.currency,
            storeVersion: getApp.storeVersion,
            isSingleVendor: isSingleVendor,
            timezone: getApp.timezone,
            hideThings: getApp.hideThings,
            language: getApp.language,
            otpbypass: getApp.otpbypass,
            orderAutoCancel: getApp.orderAutoCancel,
            referredUserCommission: getApp.referredUserCommission,
            activePaymentMethodForAddCard: getApp.activePaymentMethodForAddCard,
            googleMapKey: getApp.googleMapKey,
            tokenExpiresIn: getApp.tokenExpiresIn,
            userRefereeSetting: getApp.userRefereeSetting,
            storeLanguage: getApp.storeLanguage,
            avoidFraudSetting: getApp.avoidFraudSetting

        }

        next();
    },
    verifyapikey: async (req, res, next) => {

        if (!req.params.apikey) {
            //return res.json(helper.showUnathorizedAppErrorResponse('STORE_API_KEY_IS_REQUIRED'));
            return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Api key is required", url: "" });
        }

        const api_key = req.params.apikey;

        const getApp = await Store.findOne({ api_key: api_key, status: { $in: ["active", 'gracePeriod'] } })
            .populate({ path: 'storeType', select: '_id storeType status bidSettings' })
            .exec();
        if (getApp == null) {
            //return res.json(helper.showUnathorizedAppErrorResponse('STORE_IS_NOT_ACTIVE'));
            //deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Store is not active", url: "" });

        }
        req.store = {
            storeId: getApp._id,
            storeName: getApp.storeName,
            paymentMode: getApp.paymentMode,
            paymentSettings: getApp.paymentSettings,
            hideThings: getApp.hideThings,
            language: getApp.language

        }

        next();
    },


    isValidStoreTypes: async (req, res, next) => {
        let data = req.body;
        data.storeTypeId = req.params.storeTypeId ? req.params.storeTypeId : data.storeTypeId;
        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }
        if (!ObjectId.isValid(req.store.storeId)) {
            return res.json(helper.showUnathorizedAppErrorResponse('STORE_IS_NOT_VALID'));

        }

        const getStoreType = await storeType.findOne({ store: ObjectId(req.store.storeId), _id: ObjectId(data.storeTypeId) });

        if (getStoreType == null) {
            return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
        }

        next();
    },

    checkAccessLevel: async (req, res, next) => {
        let user = req.user;
        let role = user.role;
        let data = req.body;
        let storeTypeName = data.storeTypeName;

        if (req.params && req.params.storeTypeName) {
            storeTypeName = req.params.storeTypeName.toUpperCase();
        }

        let path = req.originalUrl;
        let method = req.method;

        if (method === 'GET' && req.params._id) {
            path = path.replace('/' + req.params._id, '');
        }

        if (method === 'GET' && req.params.storeTypeId) {
            path = path.replace('/' + req.params.storeTypeId, '');
        }
        let getAccess = getActionAndType(path, method, storeTypeName);
        if (getAccess.length === 0) {
            return res.json(helper.showUnathorizedErrorResponseAccess('ACCESS_DENIED'));
        }
        req.body.action = getAccess[0].action.toLowerCase();
        req.body.method = getAccess[0].method.toLowerCase();

        if (role === 'ADMIN' || role === 'VENDOR') {
            next();
        } else if (role === 'STAFF') {
            if (user.accessLevel) {

                let getAccessP = await Role.findById(user.accessLevel);
                if (getAccessP == null) {
                    return res.json(helper.showUnathorizedErrorResponseAccess('ACCESS_DENIED'));
                }

                let checkAccessLevel = checkAccessLevelForStaff(getAccess, getAccessP.permissions);
                if (checkAccessLevel) {
                    next();
                } else {
                    console.log("checkAccessLevel-2:")
                    return res.json(helper.showUnathorizedErrorResponseAccess('ACCESS_DENIED'));
                }

            } else {
                return res.json(helper.showUnathorizedErrorResponseAccess('ACCESS_DENIED'));
            }
        } else {
            return res.json(helper.showUnathorizedErrorResponseAccess('ACCESS_DENIED'));
        }
    },

    storeGrantAccess: (action) => {
        return async (req, res, next) => {
            try {
                // Do something
                let storeId = req.store.storeId;
                let id = req.params._id;
                let getData = null;

                if (action === "contentView") {
                    getData = await Content.findOne({ store: storeId, _id: id });
                }

                if (getData == null) {
                    return res.json(helper.showUnathorizedErrorResponseAccess('PERMISSION_DENIED'));
                }

                next();
            }
            catch (error) {
                next(error);
            }
        }
    },
    authDriverAndUser: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showUnathorizedErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');
        let store = req.store;

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ store: store.storeId, _id: decoded._id, status: { $nin: ['archived', 'temp'] }, role: { $in: ["DRIVER", "USER"] }, "tokens.token": token })
                .populate({ path: "store", select: 'status', match: { status: { $nin: ['archived', 'temp'] } } })

                .exec();

            if (!user) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (!user.store) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (user.store.status === "inactive") {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (user.status === 'blocked') {
                return res.json(helper.showUnathorizedAppErrorWithErrorCode('USER_BLOCKED', '5013'));
            }

            if (user.status === 'rejected') {
                return res.json(helper.showUnathorizedAppErrorWithErrorCode('USER_REJECTED', '5014'));
            }

            if (user.status === 'inactive') {
                return res.json(helper.showUnathorizedErrorResponse('USER_INACTIVE', '5015'));
            }
            if (user.language && user.store.storeLanguage) {
                let langcode = user.store.storeLanguage.find(i => i.code == user.language.code);
                if (langcode) {
                    req.setLocale(langcode.code);
                };
            }
            req.user = user;
            req.token = token;

            next();

        } catch (error) {
            const resdata = helper.showUnathorizedAppErrorWithErrorCode('INVALID_TOKEN', '5012');
            resdata.isInvalidToken = true;
            res.json(resdata);
        }
    },
    getAccessForHideInfo: async (req, res, next) => {
        let user = req.user;
        let role = user.role;
        if (role === 'STAFF' && user.accessLevel) {
            let getAccessP = await Role.findById(user.accessLevel);
            if (getAccessP && getAccessP.permissions && getAccessP.permissions.length) {
                let checkAccessLevel = getAccessP.permissions.find(i => i.type === "hideDetails");
                if (checkAccessLevel && checkAccessLevel.permissions) {
                    let getAccess = checkAccessLevel.permissions.filter(i => i.value).map(i => i["label"]);
                    // console.log("getAccess:=>", getAccess)
                    req.hideContactInfo = getAccess;
                }

            }



        }
        next();
    },
    checkReferralCode: async (req, res, next) => {
        let data = req.body;
        let store = req.store;
        if (data.referralCode) {
            let getUser = await User.findOne({ referralCode: data.referralCode, store: store.storeId, status: { $in: ["active", "approved"] }, role: { $in: ["USER", "DRIVER"] } });
            if (getUser) {
                req.body.referredBy = getUser._id;
                if (store.userRefereeSetting && store.userRefereeSetting.status) {
                    req.body.isPendingSignupProcess = true;
                }
                next();
            }
            else
                return res.json(helper.showValidationErrorResponse('REFERRAL_CODE_IS_INVALID'));
        } else
            next();
    },
    isAuthUser: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return next();
        }
        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);
            const user = await User.findOne({ status: "active", _id: decoded._id, role: "USER", "tokens.token": token }, 'name role status firebaseToken firebaseTokens tokens mobileNumber email password store wallet loyaltyPoints userLocation language')
                .populate({ path: "store", select: 'storeLanguage distanceUnit timezone googleMapKey loyaltyPoints status storeType', match: { status: { $ne: 'archived' } }, populate: { path: "storeType", select: "storeType" } })
                .exec();

            if (!user) {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }

            if (!user.store) {
                return res.json(helper.showUnathorizedErrorResponse('INVALID_STORE'));
            }

            if (user.store.status === "inactive") {
                return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
            }
            if (user.language && user.store.storeLanguage) {
                let langcode = user.store.storeLanguage.find(i => i.code == user.language.code);
                if (langcode) {
                    req.setLocale(langcode.code);
                };
            }
            req.user = user;
            req.token = token;
            next();

        } catch (error) {
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
        }
    },

}
async function removeExpiredTokens(error, token) {
    if (error != "TokenExpiredError: jwt expired") return;
    let query = { "tokens.token": token };
    let update = {
        $pull: {
            "tokens": { token: token }
        }
    };
    await User.updateOne(query, update);
}