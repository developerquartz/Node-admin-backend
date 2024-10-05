const validator = require('validator');
const Order = require("../../models/ordersTable");
const ObjectId = require('objectid');
const socketHelper = require('../../helper/socketHelper');
module.exports = {

    driverSignupCheckBefore: async (req, res, next) => {
        let data = req.body;

        if (!req.store) {
            return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
        }

        let store = req.store;
        data.store = store.storeId;

        if (!data.email) {
            return res.json(helper.showValidationErrorResponse('EMAIL_IS_REQUIRED'));
        }

        if (!validator.isEmail(data.email)) {
            return res.json(helper.showValidationErrorResponse('INVALID_EMAIL'));
        }

        if (data.status) {
            req.body.status = data.status;
        } else {
            req.body.status = "created";
        }

        next();
    },

    driverSignupCheck: async (req, res, next) => {
        let data = req.body;

        if (!req.store) {
            return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
        }

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

        if (!data.address) {
            return res.json(helper.showValidationErrorResponse('ADDRESS_IS_REQUIRED'));
        }

        if (data.status) {
            req.body.status = data.status;
        } else {
            req.body.status = "created";
        }

        next();
    },

    driverSignup: async (req, res, next) => {
        let data = req.body;

        if (!req.store) {
            return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
        }
        let langugeCode = ['en', 'fr', 'ht', 'zh'];

        let store = req.store;
        req.body.store = store.storeId;

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


        if (data.language) {
            let getLangugeCode = langugeCode.filter(i => {
                return i === data.language.code;
            });
            if (!getLangugeCode.length) {
                return res.json(helper.showValidationErrorResponse('INVALID_LANGUAGE_CODE'));
            }

        }

        // if (!data.address) {
        //     return res.json(helper.showValidationErrorResponse('ADDRESS_IS_REQUIRED'));
        // }

        if (data.status) {
            req.body.status = data.status;
        } else {
            req.body.status = "created";
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

    updateDriver: async (req, res, next) => {
        let data = req.body;

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

        if (!data.status) {
            return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
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

    storeSetting: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        next();
    },

    paymentSetting: async (req, res, next) => {
        let data = req.body;

        if (!data.paymentMode) {
            return res.json(helper.showValidationErrorResponse('PAYMENT_MODE_IS_REQUIRED'));
        }

        if (!data.paymentSettings) {
            return res.json(helper.showValidationErrorResponse('PAYMENT_SETTINGS_IS_REQUIRED'));
        }

        next();
    },

    taxSetting: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (!data.taxAmount) {
            return res.json(helper.showValidationErrorResponse('TAX_AMOUNT_IS_REQUIRED'));
        }

        next();
    },

    deliverySetting: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (!data.deliveryType) {
            return res.json(helper.showValidationErrorResponse('DELIVERY_TYPE_IS_REQUIRED'));
        }

        next();
    },

    commissionSetting: async (req, res, next) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (!data.deliveryType) {
            return res.json(helper.showValidationErrorResponse('DELIVERY_TYPE_IS_REQUIRED'));
        }

        next();
    },

    cancellationSetting: async (req, res) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (data.cancellationsetting.length === 0) {
            return res.json(helper.showValidationErrorResponse('CANCELLATION_POLICY_SETTING_IS_REQUIRED'));
        }

        next();
    },

    timeSlotSetting: async (req, res) => {
        let data = req.body;

        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        if (data.timeSlot.length === 0) {
            return res.json(helper.showValidationErrorResponse('TIME_SLOT_SETTING_IS_REQUIRED'));
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
    requestAcceptance: async (req, res, next) => {
        let user = req.user;
        let data = req.body;
        if (!data._id) {
            return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
        }

        const getOrder = await Order.findById(data._id, 'vehicleType noOfSeats requestStatus rideType isDriverAssign orderStatus isScheduleOrderAssign')
        //console.log("getOrder:", getOrder)
        if (getOrder === null) {
            return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
        }

        if (getOrder.isDriverAssign && !getOrder.isScheduleOrderAssign) {
            return res.json(helper.showValidationErrorResponse('ALREADY_ASSIGNED'));
        }

        if (getOrder.orderStatus === "cancelled" || getOrder.orderStatus === "archived") {
            return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
        }
        if (getOrder.rideType != "pool" && user.onlineStatus != "online" && getOrder.isScheduleOrderAssign == false) {
            return res.json(helper.showValidationErrorResponse('UNABLE_TO_ACCEPT'));
        }

        if (getOrder.rideType == "pool") {
            let isAvailableSeat = await module.exports.validateDriverPoolTripSeat(user, getOrder);
            if (!isAvailableSeat) {
                return res.json(helper.showValidationErrorResponse('NO_MORE_SEAT_AVAILABLE'));
            }
            if (getOrder.requestStatus == 'process') {
                // return res.json(helper.showValidationErrorResponse('Please wait, the request acceptance is processing.'));
                return res.json(helper.showValidationErrorResponse('ALREADY_ASSIGNED'));
            }
            getOrder.requestStatus = 'process';
            await getOrder.save();

        }
        next();

    },
    validateDriverPoolTripSeat: async (user, getOrder) => {
        return new Promise(async (resolve, reject) => {
            let getPoolTrips = await Order.getDriverPoolTrips(ObjectId(user._id));
            if (getPoolTrips && getPoolTrips.length) {
                let availableSeats = getOrder.vehicleType.maxPersons - getPoolTrips[0].bookedSeat;
                if (getOrder.noOfSeats <= availableSeats) {
                    return resolve(true);
                } else {
                    return resolve(false)
                }
            }
            return resolve(true);
        });

    }
}