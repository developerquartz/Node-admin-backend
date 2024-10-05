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
            googleMapKey: getApp.googleMapKey,
            orderAutoApproval: getApp.orderAutoApproval,
            domain: getApp.domain,
            plan: getApp.plan,
            isSingleVendor: isSingleVendor,
            timezone: getApp.timezone,
            firebase: getApp.firebase,
            currency: getApp.currency,
            twilio: getApp.twilio,
            commissionTransfer: getApp.commissionTransfer,
            language: getApp.language
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

    isStoreType: async (req, res, next) => {
        let data = req.body;
        let store = req.store;

        data.storeTypeId = req.method === 'GET' ? req.params.storeTypeId : data.storeTypeId;

        if (!data.storeTypeId) {
            return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
        }

        const getStoreType = await storeType.findOne({ _id: data.storeTypeId, store: store.storeId }, 'isEnableCarPool vehicleType storeType geoFence multiDropsSettings bidSettings deliveryAreaDriver noOfDriversPerRequest taxAmount scheduled')
            .populate({ path: 'geoFence', match: { status: "active" } });

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
            const store = req.store.storeId;
            const decoded = jwt.verify(token, env.jwtSecret);

            const user = await User.findOne({ status: "active", _id: decoded._id, store: store, role: "USER", "tokens.token": token }, 'name role status firebaseToken firebaseTokens tokens countryCode mobileNumber email password store wallet loyaltyPoints')
                .populate({ path: "store", select: 'timezone googleMapKey loyaltyPoints status storeName twilio paymentMode currency', match: { status: { $ne: 'archived' } } })
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
            console.log(error)
            const resdata = helper.showUnathorizedErrorResponse('INVALID_TOKEN');
            resdata.isInvalidToken = true;
            res.json(resdata);
        }
    }
}

