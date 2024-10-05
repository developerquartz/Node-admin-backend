const User = require('../../../models/userTable.js');
const Store = require('../../../models/storeTable');
const storeType = require('../../../models/storeTypeTable');
const Role = require('../../../models/rolesTable');
const Config = require('../../../config/constants.json');
const jwt = require('jsonwebtoken');

module.exports = {

    isApp: async (req, res, next) => {

        if (!req.get('apikey')) {
            return res.json(helper.showUnathorizedAppErrorResponse('STORE_API_KEY_IS_REQUIRED'));
        }

        const api_key = req.get('apikey');
        let lang = req.get('Accept-Language');
        let host = req.get('hostname');

        const getApp = await Store.findOne({ api_key: api_key, status: { $in: ["active", 'gracePeriod'] } })
            .populate({ path: 'storeType', select: '_id' })
            .populate('plan.billingPlan')
            .populate({
                path: "logo"
            })
            .exec();

        if (getApp == null) {
            return res.json(helper.showUnathorizedAppErrorResponse('STORE_IS_NOT_ACTIVE'));
        }

        if (lang) {
            req.setLocale(lang);
        } else {
            if (getApp.language) {
                if (getApp.language.code) {
                    req.setLocale(getApp.language.code);
                }
            }
        }

        let isSingleVendor = false;

        if (getApp.plan && getApp.plan.billingPlan && getApp.plan.billingPlan.type && getApp.plan.billingPlan.type === "basic") {
            isSingleVendor = true;
        }

        req.isApp = true;
        req.apiKey = api_key;

        req.store = {
            storeId: getApp._id,
            storeName: getApp.storeName,
            supportEmail: getApp.email,
            distanceUnit: getApp.distanceUnit,
            storeTypes: getApp.storeType,
            paymentSettings: getApp.paymentSettings,
            loyaltyPoints: getApp.loyaltyPoints,
            orderAutoApproval: getApp.orderAutoApproval,
            domain: getApp.domain,
            plan: getApp.plan,
            logo: getApp.logo,
            isSingleVendor: isSingleVendor,
            timezone: getApp.timezone,
            googleMapKey: getApp.googleMapKey,
            currency: getApp.currency
        }

        next();
    },

    isStoreType: async (req, res, next) => {
        let data = req.body;

        data.storeTypeId = req.method === 'GET' ? req.params.storeTypeId : data.storeTypeId;

        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }

        const getStoreType = await storeType.findById(data.storeTypeId, 'deliveryAreaDriver noOfDriversPerRequest taxAmount scheduled');

        if (getStoreType === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
        }

        req.storeTypeDetails = getStoreType;

        next();
    },

    authUser: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ status: "active", _id: decoded._id, role: "USER", "tokens.token": token }, 'name role status firebaseToken firebaseTokens tokens mobileNumber email password store wallet loyaltyPoints profileImage')
                .populate({ path: "store", select: 'timezone googleMapKey loyaltyPoints status storeName twilioKey apiKey', match: { status: { $ne: 'archived' } } })
                .populate({ path: "profileImage", select: 'link' })
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

            req.user = user;
            req.token = token;

            next();

        } catch (error) {
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
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
                .populate({ path: "store", select: 'status apiKey', match: { status: { $ne: 'archived' } } })
                .populate({ path: "profileImage", select: 'link' })
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
                storeId: user.store._id,
                apiKey: user.store.apiKey
            }

            next();

        } catch (error) {
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
        }
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
                console.log("checkAccessLevel:", checkAccessLevel);

                if (checkAccessLevel) {
                    next();
                } else {
                    return res.json(helper.showUnathorizedErrorResponseAccess('ACCESS_DENIED'));
                }

            } else {
                return res.json(helper.showUnathorizedErrorResponseAccess('ACCESS_DENIED'));
            }
        } else {
            return res.json(helper.showUnathorizedErrorResponseAccess('ACCESS_DENIED'));
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
        }
    },
    authAdmin: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ status: { $ne: 'archived' }, _id: decoded._id, role: "ADMIN", "tokens.token": token })
                .populate({ path: "store", select: "status timezone", match: { status: { $ne: 'archived' } } })
                .populate({ path: "profileImage", select: 'link' })
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
        }
    }

}
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
    // console.log("getAccess:==>", getAccess)
    // console.log("accessLevel:===>", accessLevel)

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

