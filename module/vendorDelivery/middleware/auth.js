const User = require('../../../models/userTable.js');
const Store = require('../../../models/storeTable');
const storeType = require('../../../models/storeTypeTable');
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
            paymentMode: getApp.paymentMode,
            paymentSettings: getApp.paymentSettings,
            loyaltyPoints: getApp.loyaltyPoints,
            orderAutoApproval: getApp.orderAutoApproval,
            domain: getApp.domain,
            plan: getApp.plan,
            isSingleVendor: isSingleVendor,
            timezone: getApp.timezone,
            firebase: getApp.firebase,
            currency: getApp.currency
        }

        next();
    },
    authVendor: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showUnathorizedErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ $or: [{ status: "approved", status: "active" }], $or: [{ _id: decoded._id, role: "VENDOR", "tokens.token": token }, { _id: decoded._id, role: "ADMIN", "tokens.token": token }] })
                .populate({ path: "store", select: 'status api_key', match: { status: { $ne: 'archived' } } })
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
            req.apiKey = user.store.api_key;
            req.token = token;
            req.store = {
                storeId: user.store._id
            }

            next();

        } catch (error) {
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
        }
    },

    isStoreType: async (req, res, next) => {
        let data = req.body;

        data.storeTypeId = req.method === 'GET' ? req.params.storeTypeId : data.storeTypeId;

        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }

        const getStoreType = await storeType.findById(data.storeTypeId, 'vehicleType deliveryAreaDriver noOfDriversPerRequest taxAmount storeType');

        if (getStoreType === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
        }

        req.storeTypeDetails = getStoreType;

        next();
    },

    authDriver: async (req, res, next) => {
        if (!req.get('Authorization')) {
            return res.json(helper.showUnathorizedErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');
        let store = req.store;

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ store: store.storeId, _id: decoded._id, status: "approved", role: "DRIVER", "tokens.token": token })
                .populate({ path: "store", select: 'status', match: { status: { $ne: 'archived' } } })
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

            req.user = user;
            req.token = token;

            next();

        } catch (error) {
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
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

    authUser: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ status: "active", _id: decoded._id, role: "USER", "tokens.token": token }, 'name role status firebaseToken firebaseTokens tokens mobileNumber email password store wallet loyaltyPoints')
                .populate({ path: "store", select: 'timezone googleMapKey loyaltyPoints status', match: { status: { $ne: 'archived' } } })
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

    authAdmin: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ status: { $ne: 'archived' }, _id: decoded._id, role: "ADMIN", "tokens.token": token })
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
        }
    }
}