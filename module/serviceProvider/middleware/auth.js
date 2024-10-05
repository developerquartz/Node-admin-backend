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
            .populate({ path: 'storeType', select: '_id storeType' })
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
            paymentSettings: getApp.paymentSettings,
            loyaltyPoints: getApp.loyaltyPoints,
            orderAutoApproval: getApp.orderAutoApproval,
            domain: getApp.domain,
            plan: getApp.plan,
            isSingleVendor: isSingleVendor,
            timezone: getApp.timezone,
            googleMapKey: getApp.googleMapKey,
            currency: getApp.currency,
            codWalletLimit: getApp.codWalletLimit
        }

        next();
    },
    isFromPreferredBooking: async (req, res, next) => {
        if (req.body.isPreferredDriver && req.body.isPreferredDriver === "yes") {
            const getstoreType = req.store.storeTypes.filter(storeType => {
                return (storeType.status === 'active' && storeType.storeType === "TAXI")
            });

            if (getstoreType.length > 0) {
                req.body.storeTypeId = getstoreType._id;
            }
        }

        next();
    },

    isValidStoreType: async (req, res, next) => {
        let storeTypeDetails = req.storeTypeDetails;
        let store = req.store;
        if (String(store.storeId) != String(storeTypeDetails.store)) {
            return res.json(helper.showValidationErrorResponse("STORE IS INVALID FOR SELECTED SERVICE"));
        }
        next();
    },
    isValidUserAccess: async (req, res, next) => {
        let store = req.store;
        let user = req.user;
        let storeTypeDetails = req.storeTypeDetails;
        if (String(user.store._id) != String(storeTypeDetails.store) || String(store.storeId) != String(storeTypeDetails.store) || String(store.storeId) != String(user.store._id)) {
            return res.json(helper.showValidationErrorResponse("USER IS INVALID FOR SELECTED STORE"));
        }
        next();
    },
    isValidDriverAccess: async (req, res, next) => {
        let store = req.store;
        let user = req.user;
        if (String(store.storeId) != String(user.store._id)) {
            return res.json(helper.showValidationErrorResponse("DRIVER IS INVALID FOR SELECTED STORE"));
        }
        next();
    },
    isStoreType: async (req, res, next) => {
        let data = req.body;

        data.storeTypeId = req.method === 'GET' ? req.params.storeTypeId : data.storeTypeId;

        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }

        const getStoreType = await storeType.findById(data.storeTypeId, 'deliveryAreaDriver noOfDriversPerRequest taxAmount scheduled store');

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
    authUser: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');
        let store = req.store;
        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ store: store.storeId, status: "active", _id: decoded._id, role: "USER", "tokens.token": token }, 'name role status firebaseToken firebaseTokens tokens mobileNumber email password store wallet loyaltyPoints')
                .populate({ path: "store", select: 'timezone googleMapKey loyaltyPoints status storeName twilioKey paymentMode currency', match: { status: { $ne: 'archived' } } })
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
    authAdminAndStaffAndVendor: async (req, res, next) => {

        if (!req.get('Authorization')) {
            return res.json(helper.showValidationErrorResponse('AUTHORIZATION_TOKEN_IS_REQUIRED'));
        }

        let token = req.get('Authorization').replace('Bearer ', '');

        let lang = req.get('Accept-Language');

        try {

            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ status: { $nin: ['archived', 'temp'] }, $or: [{ _id: decoded._id, role: "ADMIN", "tokens.token": token }, { _id: decoded._id, role: "VENDOR", "tokens.token": token }, { _id: decoded._id, role: "STAFF", "tokens.token": token }] })
                .populate({ path: "store", select: "status timezone storeVersion", match: { status: { $ne: 'archived' } }, populate: { path: "plan.billingPlan" } })

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

