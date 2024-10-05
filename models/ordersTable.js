const mongoose = require('mongoose');
const Config = require('../config/constants.json');

let orderSchema = mongoose.Schema({
    customOrderId: {
        'type': String,
        'lowercase': true
    },
    disputeId: { type: mongoose.Schema.Types.ObjectId, ref: 'dispute' },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    oldDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isScheduleOrderAssign: { type: Boolean, default: false },
    isNewDriverAssign: { type: Boolean, default: false },
    billingDetails: { type: Object },
    shippingDetails: { type: Object },
    line_items: { type: Object },
    coupon: { type: String, default: null },
    couponType: { type: String },
    couponBy: { type: String, default: null },
    couponAmount: { type: Number },
    discountTotal: { type: Number, default: 0 },
    couponDiscount: { type: Number },
    deliveryFeeSettings: { type: Object },
    deliveryFee: { type: Number },
    taxAmount: { type: Number },
    bidAmount: { type: Number },
    isBidRequest: { type: Boolean, default: false },
    bidOfferAmount: { type: [Number] },
    tax: { type: Number },
    tip: { type: Number },
    tipType: { type: String, enum: ["flat", "percentage"] },
    otp: { type: Number },
    tipAmount: { type: Number },
    isLoyaltyPointsUsed: { type: Boolean },
    pointsToRedeem: { type: Number },
    redemptionValue: { type: Number },
    subTotal: { type: Number },
    orderTotal: { type: Number },
    bidDetails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'bid' }],
    duration: { type: Number },
    distance: { type: Number },
    surgeMultiplier: { type: Number },
    isSurgeTime: { type: String },
    deliveryType: { type: String },
    orderStatus: { type: String, enum: ["pending", "confirmed", "inroute", "completed", "refunded", "rejected", "cancelled", "archived"], default: "pending" },
    multiOrderstatus: { type: Boolean },
    isDriverAssign: { type: Boolean, default: false },
    isDriverArrivedAtPickup: { type: Boolean, default: false },
    isOrderMarkReady: { type: Boolean, default: false },
    paymentMethod: { type: String, enum: Config.PAYMENTGATEWAY, default: "stripe" },
    paymentSourceRef: { type: String },
    transactionId: { type: String },
    transactionDetails: { type: Object },
    refundDetails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Refund' }],
    paymentStatus: { type: String, enum: ["pending", "process", "success"], default: "pending" },
    commission: { type: Object },
    adminVendorEarning: { type: Number, default: 0 },
    adminDeliveryBoyEarning: { type: Number, default: 0 },
    adminEarning: { type: Number, default: 0 },
    vendorEarning: { type: Number, default: 0 },
    deliveryBoyEarning: { type: Number, default: 0 }, //earning calculation on delivery fee only
    orderInstructions: { type: String, default: null },
    nearByTempDrivers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    driverDeclineRequest: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDriverFound: { type: String, enum: ["yes", "no"], default: "no" },
    isDriverPreferred: { type: Boolean, default: false },
    preferredDriverId: { type: String },
    isPreferredDriver: { type: String, enum: ["yes", "no"], default: "no" }, // for preferred driver
    scheduledType: { type: String, enum: ["now", "scheduled"], default: "now" },
    isScheduleProcess: { type: Boolean, default: false },
    pickupTimezone: { type: String },
    scheduledDate: { type: String },
    scheduledTime: { type: String },
    scheduled_utc: { type: Date },
    pickUp: {
        address: { type: String },
        location: {
            type: { type: String, enum: ['Point'] },
            coordinates: { type: [Number] }
        },
        name: { type: String },
        mobileNumber: { type: String },
        floorNo: { type: String },
        landmark: { type: String }
    },//for taxi and pickup/drop
    dropOff: {
        address: { type: String },
        location: {
            type: { type: String, enum: ['Point'] },
            coordinates: { type: [Number] }
        },
        name: { type: String },
        mobileNumber: { type: String },
        floorNo: { type: String },
        landmark: { type: String }
    },//for taxi and pickup/drop
    dropMulti: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MultiLocation' }],
    driverVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }, // stores trip vehicle data
    vehicleType: { type: Object },
    angle: { type: Number }, //for taxi and pickup/drop,
    rideType: { type: String, enum: ["normal", "pool", "rideHailing", "hourly"] },
    journeyType: { type: String, enum: ["oneway", "twoway"], default: "oneway" },
    date_created: { type: String },
    time_created: { type: String },
    IST_date_created: { type: String },
    time24_created: { type: String },
    date_created_utc: { type: Date },
    date_user_rejected_utc: { type: Date },
    date_vendor_confirmed_utc: { type: Date },
    date_vendor_rejected_utc: { type: Date },
    date_vendor_cancel_utc: { type: Date },
    date_vendor_ready_utc: { type: Date },
    date_driver_request_utc: { type: Date },
    date_driver_confirmed_utc: { type: Date },
    date_customer_confirmed_utc: { type: Date },
    date_driver_rejected_utc: { type: Date },
    date_driver_cancelled_utc: { type: Date },
    date_driver_arrived_utc: { type: Date },
    date_driver_picked_utc: { type: Date },
    date_driver_delivered_utc: { type: Date },
    date_modified: { type: Date },
    date_modified_utc: { type: Date },
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    checkInDate: { type: Date },
    checkOutDate: { type: Date },
    checkInDate_utc: { type: Date },
    checkOutDate_utc: { type: Date },
    checkInTime: { type: String },
    checkOutTime: { type: String },
    noOfSeats: { type: Number, default: 0 },
    totalWeight: { type: Number },
    driverStatus: { type: String, enum: ['pickupInroute', 'pickupArrived', 'destinationInroute', "completed"] },//for only car-pool trips
    requestStatus: { type: String, enum: ['process', "accepted"] },
    multiStop: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MultiLocation' }],
    totalHours: { type: Number },
    isRemainStops: { type: Boolean, default: false },
    remainStopsCount: { type: Number },
    isMultiStopsStarted: { type: Boolean },
    multiStopStartAt: { type: Date },
    package: { type: mongoose.Schema.Types.Mixed },
    isPackageServiceTrip: { type: Boolean },
    itemTotal: { type: Number },//these are for drop off multi items....
    itemSubTotal: { type: Number },
    itemOrderTotal: { type: Number },
    instructions: { type: String },
    pricingTypeCount: { type: Number },
    isSetPriceSendRequest: { type: Boolean, default: false },
    meta_data: [
        {
            key: { type: String },
            value: { type: String }
        }
    ],
    tripFare: [{
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        amount: { type: Number },
        pricePerUnitDistance: { type: Number },
        basePrice: { type: Number },
        pricePerUnitTime: { type: Number }
    }]
},
    {
        versionKey: false // You should be aware of the outcome after set to false
    });
orderSchema.index({ "store": 1 });
orderSchema.index({ "storeType": 1 });
const orderTable = module.exports = mongoose.model('Order', orderSchema);

module.exports.addOrder = (data, callback) => {
    data.isScheduleProcess = false;
    data.isDriverAssign = false;
    data.isDriverArrivedAtPickup = false;
    data.isOrderMarkReady = false;
    data.date_modified_utc = new Date();
    orderTable.create(data, callback);
}

module.exports.updateOrderVendor = function (data, callback) {
    let query = { _id: data._id };
    data.date_modified_utc = new Date();
    orderTable.findOneAndUpdate(query, data, { new: true })
        .populate({ path: 'storeType' })
        .populate({ path: 'store' })
        .populate({ path: 'user', select: 'name fireBaseToken' })
        .exec(callback);
}

module.exports.updateOrderVendorNew = function (data, callback) {
    let query = { _id: data._id };
    data.date_modified_utc = new Date();
    orderTable.findOneAndUpdate(query, data, { new: true })
        .populate({ path: 'user', select: 'name firebaseTokens' })
        .populate({ path: 'vendor', select: 'name firebaseTokens userLocation orderAutoCancel' })
        .populate({ path: 'driver', select: 'name firebaseTokens userLocation' })
        .populate({ path: 'storeType', select: 'storeType driverWaitTime storeType' })
        .populate({ path: 'store', select: 'firebase commissionTransfer orderAutoCancel' })
        .exec(callback);
}

module.exports.updateTripOrder = async function (condition, data) {

    data.date_modified_utc = new Date();
    return await orderTable.updateMany(condition, data, { new: true })

}
module.exports.updateTripOrders = async function (condition, data) {

    data.date_modified_utc = new Date();
    return await orderTable.updateMany(condition, data, { new: true })

}
module.exports.updateOrder = function (data, callback) {
    let query = { _id: data._id };
    data.date_modified_utc = new Date();
    orderTable.findOneAndUpdate(query, data, { new: true })
        .populate({ path: 'storeType', select: 'storeType' })
        .populate({ path: 'store', select: 'language' })
        .populate({ path: 'user', select: 'name fireBaseToken wallet' })
        .populate(
            {
                path: 'bidDetails',
                match: { status: "pending" }
            })
        .exec(callback);
}

module.exports.updateOrderDriver = function (data, callback) {
    let query = { _id: data._id }
    data.date_modified_utc = new Date();
    orderTable.findOneAndUpdate(query, data, { new: true })
        .populate({ path: 'user', select: 'name fireBaseToken loyaltyPoints' })
        .populate({ path: 'vendor', select: 'name fireBaseToken address userLocation stripeConnect' })
        .populate({ path: 'driver', select: 'name fireBaseToken userLocation stripeConnect' })
        .populate({ path: 'store', select: 'loyaltyPoints commissionTransfer language' })
        .populate({ path: 'storeType', select: 'storeType' })
        .exec(callback);
}

module.exports.updateOrderDriverNew = function (data, callback) {
    let query = { _id: data._id }
    data.date_modified_utc = new Date();
    orderTable.findOneAndUpdate(query, data, { new: true })
        .populate({ path: 'user', select: 'name firebaseTokens loyaltyPoints language' })
        .populate({ path: 'vendor', select: 'name firebaseTokens address userLocation stripeConnect' })
        .populate({ path: 'driver', select: 'name firebaseTokens userLocation stripeConnect freeRideSetting' })
        .populate({ path: 'storeType', select: 'storeType' })
        .exec(callback);
}

module.exports.updateOrderCancelled = function (data, callback) {
    let query = { _id: data._id }
    data.date_modified_utc = new Date();
    orderTable.findOneAndUpdate(query, data, { new: true })
        .populate({ path: 'user', select: 'name firebaseTokens loyaltyPoints' })
        .populate({ path: 'vendor', select: 'name firebaseTokens address userLocation stripeConnect' })
        .populate({ path: 'driver', select: 'name firebaseTokens userLocation stripeConnect' })
        .populate({ path: 'storeType', select: 'storeType' })
        .populate({ path: 'store', select: 'firebase language avoidFraudSetting' })
        .exec(callback);
}

module.exports.getOrderByStoreId = (id, callback) => {
    orderTable.findOne(id)
        .populate(
            {
                path: 'user',
                select: 'name email countryCode mobileNumber',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate(
            {
                path: 'vendor',
                select: 'name email countryCode mobileNumber profileImage address userLocation avgRating',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate({ path: 'driverVehicle' })
        .populate({
            path: 'disputeId',
            populate: {
                path: 'attachment'
            }
        })
        .populate(
            {
                path: 'driver',
                select: 'name email countryCode mobileNumber profileImage userLocation avgRating',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate(
            {
                path: 'oldDriver',
                select: 'name email countryCode mobileNumber profileImage userLocation avgRating',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate(
            {
                path: 'storeType',
                select: 'storeType storeVendorType otpSettings',
            }
        )
        .populate(
            {
                path: 'refundDetails',
                populate: {
                    path: 'refunded_by',
                    select: 'name'
                }
            }
        )
        .populate(
            {
                path: 'store',
                select: 'hideThings'
            }
        )
        .exec(callback);
}

module.exports.getOrderById = (id, callback) => {
    orderTable.findById(id)
        .populate(
            {
                path: 'user',
                select: 'name email countryCode mobileNumber',
                populate: {
                    path: 'profileImage'
                }
            }
        )

        .populate(
            {
                path: 'vendor',
                select: 'name email countryCode mobileNumber profileImage address userLocation avgRating',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate({ path: 'driverVehicle' })
        .populate({
            path: 'disputeId',
            populate: {
                path: 'attachment'
            }
        })
        .populate(
            {
                path: 'driver',
                select: 'name email countryCode mobileNumber profileImage userLocation avgRating',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate(
            {
                path: 'storeType',
                select: 'storeType storeVendorType otpSettings bidSettings',
            }
        )
        .populate(
            {
                path: 'refundDetails',
                populate: {
                    path: 'refunded_by',
                    select: 'name'
                }
            }
        )
        .populate(
            {
                path: 'store',
                select: 'hideThings'
            }
        )
        .populate(
            {
                path: 'dropMulti'
            }
        )
        .populate({ path: 'multiStop' })
        .populate(
            {
                path: 'bidDetails',
                match: { status: "pending" },
                populate: [
                    {
                        path: 'driver',
                        select: 'name email profileImage countryCode mobileNumber vehicle userLocation avgRating',
                        populate: [
                            {
                                path: 'profileImage',
                                select: 'link'
                            },

                            {
                                path: "vehicle",
                                populate: {
                                    path: "vehicleType",
                                    select: "image",
                                    populate: {
                                        path: 'image',
                                        select: 'link'
                                    }
                                }
                            }
                        ],

                    }

                ]


            }

        )
        .exec(callback);
}

module.exports.getOrderByIdForDriver = (id, callback) => {
    orderTable.findById(id, 'paymentMethod paymentSourceRef instructions package isPackageServiceTrip remainStopsCount isRemainStops totalHours rideType scheduled_utc scheduledType scheduledTime scheduledDate user noOfSeats bidAmount multiOrderstatus driver vendor storeType isScheduleProcess discountTotal orderInstructions deliveryType customOrderId billingDetails line_items isDriverFound isDriverAssign isDriverArrivedAtPickup isOrderMarkReady paymentMethod orderStatus discountTotal tax deliveryFee subTotal orderTotal deliveryBoyEarning pickUp dropOff rideType journeyType date_created time_created date_created_utc tip isMultiStopsStarted multiStopStartAt')
        .populate(
            {
                path: 'user',
                select: '_id name email countryCode mobileNumber avgRating',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate(
            {
                path: 'vendor',
                select: 'name email countryCode mobileNumber profileImage address userLocation',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate(
            {
                path: 'storeType',
                select: 'bidSettings storeType storeVendorType otpSettings',
            }
        )
        .populate(
            {
                path: 'dropMulti'
            }
        )
        .populate(
            {
                path: 'bidDetails',
                match: { status: "pending" }
            }
        )
        .populate({ path: 'multiStop' })
        .populate({ path: 'dropMulti' })
        .exec(callback);
}

module.exports.getOrderByIdForCus = (id, callback) => {
    orderTable.findById(id, 'instructions user deliveryType driver isDriverPreferred isPreferredDriver vendor customOrderId billingDetails line_items isDriverFound isDriverAssign isDriverArrivedAtPickup isOrderMarkReady orderStatus discountTotal tax deliveryFee subTotal orderTotal deliveryBoyEarning journeyType')
        .populate(
            {
                path: 'vendor',
                select: 'name email countryCode mobileNumber profileImage address userLocation',
                populate: {
                    path: 'profileImage',
                    select: 'link'
                }
            }
        )
        .populate({ path: 'driverVehicle' })
        .populate(
            {
                path: 'driver',
                select: 'name email countryCode mobileNumber profileImage userLocation',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .exec(callback);
}

module.exports.getOrderByIdAsync = (id, callback) => {
    return orderTable.findById(id)
        .populate({ path: 'storeType' })
        .populate({ path: 'store', select: 'storeVersion currency' })
        .populate({ path: 'driverVehicle' })
        .populate(
            {
                path: 'driver',
                select: 'name email countryCode mobileNumber profileImage userLocation',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate({ path: 'user', select: 'wallet' })
        .populate({ path: 'vendor', select: 'userLocation name' })
        .exec(callback);
}
module.exports.getOrderByIdWithtripFare = (id, driver, callback) => {
    let query = {
        _id: id,
        tripFare: { $elemMatch: { driver: driver } },
    }
    let project = {
        "tripFare.$": 1,
    }
    return orderTable.findOne(query, project)
        .exec(callback);
}
module.exports.getOrderByIdAsyncForRes = (id, callback) => {
    return orderTable.findById(id)
        .populate({ path: 'store', select: 'distanceUnit codWalletLimit' })
        .populate({ path: 'storeType' })
        .populate({ path: 'vendor', select: 'userLocation' })
        .exec(callback);
}

module.exports.removeOrder = (id, callback) => {
    let query = { _id: id };
    orderTable.remove(query, callback);
}

module.exports.getCustomerUpcomingOrder = (data, callback) => {
    return orderTable
        .find({ user: data.user, orderStatus: { $in: ['pending', 'confirmed', 'picked'] } })
        .sort({ date_created_utc: -1 })
        .populate({ path: 'vendor', select: 'name mobileNumber profileImage address location avgRating jobsDone' })
        .exec(callback);
}

module.exports.getCustomerPastOrder = (data, callback) => {
    return orderTable
        .find({ user: data.user, orderStatus: { $in: ['completed', 'rejected', 'cancelled'] } })
        .sort({ orderCompletedAt: -1 })
        .populate({ path: 'vendor', select: 'name mobileNumber profileImage address location avgRating jobsDone' })
        .exec(callback);
}

module.exports.getNewOrdersWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    orderTable.aggregate([
        { $match: obj },
        { $lookup: { from: 'users', localField: 'vendor', foreignField: '_id', as: 'vendorDetails' } },
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customerDetails' } },
        { $lookup: { from: 'storetypes', localField: 'storeType', foreignField: '_id', as: 'storeType' } },
        { $sort: { [sortByField]: parseInt(sortOrder) } },
        { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
        { $unwind: { path: "$vendorDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                "storeType.storeType": 1, "storeType._id": 1, scheduledType: 1,
                line_items: 1, scheduled_utc: 1, customOrderId: 1, date_created: 1, time_created: 1, date_created_utc: 1,
                vendor: 1, user: 1, subTotal: 1, orderTotal: 1, orderStatus: 1, billingDetails: 1, isOrderMarkReady: 1,
                isDriverAssign: 1, isDriverArrivedAtPickup: 1, pickUp: 1, dropOff: 1, paymentMethod: 1,
                vendorDetails: { name: 1, email: 1, mobileNumber: 1 },
                customerDetails: { _id: 1, name: 1, address: 1, email: 1, mobileNumber: 1 },
            }
        }
    ], callback);
}
//nees to implement 
module.exports.getNewOrdersByAdmin = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    return orderTable.find(obj, "line_items isScheduleProcess checkInDate_utc checkOutDate_utc coupon isDriverArrivedAtPickup pickUp dropOff paymentMethod orderStatus scheduled_utc isDriverAssign billingDetails isOrderMarkReady customOrderId date_created time_created date_created_utc subTotal orderTotal")
        .sort({ [sortByField]: parseInt(sortOrder) })
        .skip((paged - 1) * pageSize)
        .limit(parseInt(pageSize))
        .populate("storeType")
        .populate("vendor", "name email mobileNumber address")
        .populate("user", "name email mobileNumber address")
        .populate("driver", "name email mobileNumber address")
        .exec(callback);
}

module.exports.getOrdersWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    orderTable.aggregate([
        { $match: obj },
        {
            $lookup:
            {
                from: "users",
                let: { vendor: "$vendor" },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$_id", "$$vendor"] }
                                    ]
                            }
                        }
                    },
                    {
                        $lookup:
                        {
                            from: "files",
                            let: { profileImage: "$profileImage" },
                            pipeline: [
                                {
                                    $match:
                                    {
                                        $expr:
                                        {
                                            $and:
                                                [
                                                    { $eq: ["$_id", "$$profileImage"] }
                                                ]
                                        }
                                    }
                                },
                                { $project: { link: 1 } }
                            ],
                            as: "profileImage"
                        }
                    }

                ],
                as: "vendorDetails"
            }
        },
        { $lookup: { from: 'storetypes', localField: 'storeType', foreignField: '_id', as: 'storeType' } },
        { $lookup: { from: 'multilocations', localField: 'dropMulti', foreignField: '_id', as: 'mutliDropDetails' } },
        {
            $lookup:
            {
                from: "users",
                let: { user: "$user" },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$_id", "$$user"] }
                                    ]
                            }
                        }
                    },
                    {
                        $lookup:
                        {
                            from: "files",
                            let: { profileImage: "$profileImage" },
                            pipeline: [
                                {
                                    $match:
                                    {
                                        $expr:
                                        {
                                            $and:
                                                [
                                                    { $eq: ["$_id", "$$profileImage"] }
                                                ]
                                        }
                                    }
                                },
                                { $project: { link: 1 } }
                            ],
                            as: "profileImage"
                        }
                    }
                ],
                as: "customerDetails"
            }
        },
        {
            $lookup:
            {
                from: "users",
                let: { driver: "$driver" },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$_id", "$$driver"] }
                                    ]
                            }
                        }
                    },
                    {
                        $lookup:
                        {
                            from: "files",
                            let: { profileImage: "$profileImage" },
                            pipeline: [
                                {
                                    $match:
                                    {
                                        $expr:
                                        {
                                            $and:
                                                [
                                                    { $eq: ["$_id", "$$profileImage"] }
                                                ]
                                        }
                                    }
                                },
                                { $project: { link: 1 } }
                            ],
                            as: "profileImage"
                        }
                    }
                ],
                as: "driverDetails"
            }
        },
        { $sort: { [sortByField]: parseInt(sortOrder) } },
        { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
        { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$vendorDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$driverDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                scheduledTime: 1, scheduledDate: 1, journeyType: 1, totalHours: 1, IST_date_created: 1, time24_created: 1,
                line_items: 1, checkInDate_utc: 1, dropMulti: "$mutliDropDetails", coupon: 1, checkOutDate_utc: 1,
                checkInTime: 1, scheduled_utc: 1, checkOutTime: 1, customOrderId: 1, otp: 1, paymentMethod: 1, duration: 1, rideType: 1,
                distance: 1, vehicleType: 1, pickUp: 1, dropOff: 1, date_created: 1, time_created: 1, orderInstructions: 1,
                deliveryType: 1, scheduledType: 1, isScheduleProcess: 1, billingDetails: 1, shippingDetails: 1, line_items: 1, vendor: 1,
                user: 1, isDriverAssign: 1, isDriverArrivedAtPickup: 1, isOrderMarkReady: 1, subTotal: 1, orderTotal: 1, tax: 1,
                taxAmount: 1, tip: 1, tipAmount: 1, discountTotal: 1, deliveryFee: 1, orderTotal: 1, vendorEarning: 1,
                deliveryBoyEarning: 1, orderStatus: 1, date_created_utc: 1, vendorDetails: { name: 1, address: 1, userLocation: 1, profileImage: 1 },
                customerDetails: {
                    _id: 1, name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1,
                    avgRating: { $cond: { if: "$customerDetails.avgRating", then: "$customerDetails.avgRating", else: 0 } }
                },
                driverDetails: { _id: 1, name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1 },
                storeType: { storeType: 1, _id: 1, otpSettings: 1 }
            }
        }
    ], callback);
}
module.exports.getOrderforpdf = function (obj, callback) {
    orderTable.findOne(obj)
        .populate({ path: "user", select: "name email countryCode mobileNumber store" })
        .exec(callback)
}
module.exports.getRequestWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    orderTable.aggregate([
        { $match: obj },
        { $lookup: { from: 'storetypes', localField: 'storeType', foreignField: '_id', as: 'storeType' } },
        { $lookup: { from: 'users', localField: 'vendor', foreignField: '_id', as: 'vendorDetails' } },
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'customerDetails' } },
        { $sort: { [sortByField]: parseInt(sortOrder) } },
        { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
        { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$vendorDetails", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$customerDetails", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                scheduled_utc: 1, scheduledTime: 1, scheduledDate: 1, checkInDate_utc: 1, checkOutDate_utc: 1, checkInTime: 1, checkOutTime: 1, customOrderId: 1, duration: 1,
                distance: 1, pickUp: 1, dropOff: 1, date_created: 1, time_created: 1, orderInstructions: 1, deliveryType: 1,
                scheduledType: 1, isScheduleProcess: 1, journeyType: 1, vendor: 1, user: 1, isDriverAssign: 1,
                isDriverArrivedAtPickup: 1, isOrderMarkReady: 1, subTotal: 1, orderTotal: 1, tax: 1, taxAmount: 1, tip: 1,
                tipAmount: 1, discountTotal: 1, deliveryFee: 1, orderTotal: 1, orderStatus: 1, date_created_utc: 1,
                vendorDetails: { name: 1, address: 1, userLocation: 1, profileImage: 1 },
                customerDetails: { name: 1, email: 1, countryCode: 1, mobileNumber: 1, profileImage: 1, avgRating: 1 },
                billingDetails: 1, storeType: { storeType: 1, label: 1, _id: 1 }
            }
        }
    ], callback);
}
module.exports.getDriverRequest = (user, callback) => {
    let query = {
        nearByTempDrivers: { $in: [user] },
        orderStatus: { $in: ['pending', 'confirmed'] },
        $or: [{ isDriverAssign: false }, { isNewDriverAssign: false, scheduledType: "scheduled", isScheduleOrderAssign: true }]
    }
    orderTable.find(query, 'bidOfferAmount bidAmount instructions isPackageServiceTrip package totalHours noOfSeats rideType bidAmount paymentMethod deliveryBoyEarning scheduled_utc scheduledType scheduledDate scheduledTime pickUp dropOff billingDetails customOrderId orderInstructions line_items orderStatus orderTotal user vendor storeType journeyType date_created_utc date_created time_created').lean()
        .populate(
            {
                path: 'user',
                select: 'name profileImage',
                populate: {
                    path: 'profileImage', select: "link"
                }
            }
        )
        .populate(
            {
                path: 'vendor',
                select: 'name profileImage address userLocation'
            })
        .populate(
            {
                path: 'storeType',
                select: 'storeType label bidSettings'
            })
        .populate(
            {
                path: 'dropMulti'
            })
        .populate(
            {
                path: 'multiStop'
            })
        .populate(
            {
                path: 'bidDetails', match: { driver: user, status: "pending" }
            }).lean()
        .exec(callback);
}
module.exports.getDriverRequestNew = (user, callback) => {
    let query = {
        nearByTempDrivers: { $in: [user] },
        tripFare: { $elemMatch: { driver: user } },
        orderStatus: { $in: ['pending', 'confirmed'] },
        $or: [{ isDriverAssign: false }, { isNewDriverAssign: false, scheduledType: "scheduled", isScheduleOrderAssign: true }]
    }
    let project = {
        "tripFare.$": 1,
        "bidOfferAmount": 1,
        "bidAmount": 1,
        "instructions": 1,
        "isPackageServiceTrip": 1,
        "package": 1,
        "totalHours": 1,
        "noOfSeats": 1,
        "rideType": 1,
        "bidAmount": 1,
        "paymentMethod": 1,
        "deliveryBoyEarning": 1,
        "scheduled_utc": 1,
        "scheduledType": 1,
        "scheduledDate": 1,
        "scheduledTime": 1,
        "pickUp": 1,
        "dropOff": 1,
        "billingDetails": 1,
        "customOrderId": 1,
        "orderInstructions": 1,
        "line_items": 1,
        "orderStatus": 1,
        "orderTotal": 1,
        "user": 1,
        "vendor": 1,
        "storeType": 1,
        "journeyType": 1,
        "date_created_utc": 1,
        "date_created": 1,
        "time_created": 1
    }
    orderTable.find(query, project).lean()
        .populate(
            {
                path: 'user',
                select: 'name profileImage',
                populate: {
                    path: 'profileImage', select: "link"
                }
            }
        )
        .populate(
            {
                path: 'vendor',
                select: 'name profileImage address userLocation'
            })
        .populate(
            {
                path: 'storeType',
                select: 'storeType label bidSettings'
            })
        .populate(
            {
                path: 'dropMulti'
            })
        .populate(
            {
                path: 'multiStop'
            })
        .populate(
            {
                path: 'bidDetails', match: { driver: user, status: "pending" }
            }).lean()
        .exec(callback);
}
module.exports.getCustomerRequest = (user, callback) => {
    let query = { user: user, orderStatus: 'pending', isDriverAssign: false, tempBidAmount: { $exists: true, $not: { $size: 0 } } }
    orderTable.findOne(query, 'tempBidAmount pickUp dropOff customOrderId orderStatus orderTotal user').sort({ _id: -1 })
        .exec(callback);
}
module.exports.OrderById = async (orderId) => {
    let getOrder = await orderTable.findById(orderId)
        .populate({ path: "store", select: "distanceUnit api_key language firebase" })
        .populate({ path: "storeType", select: "storeType vehicleType deliveryAreaDriver noOfDriversPerRequest requestType" })
        .populate({ path: "vendor", select: "userLocation" })
        .populate({ path: "driver", select: "name" })
        .exec();
    return getOrder
}
module.exports.OrderByIdNew = async (orderId, callback) => {
    let getOrder = await orderTable.findById(orderId)
        .populate({ path: "store", select: "distanceUnit api_key language firebase" })
        .populate({ path: "storeType", select: "storeType vehicleType deliveryAreaDriver noOfDriversPerRequest requestType" })
        .populate({ path: "vendor", select: "userLocation" })
        .populate({ path: "driver", select: "name" })
        .exec(callback);
}

module.exports.getAvailbityVendorListAirbnb = (data) => {
    return orderTable.aggregate(
        [
            { $match: { vandor: { $in: data.vendorsId } } },

            {
                "$group": {
                    "_id": null,
                    "_ids": {
                        "$addToSet": {
                            "$cond": [
                                {
                                    $and:
                                        [

                                            ...(data.checkIn && data.checkOut ?
                                                [
                                                    { $gte: ["$scheduled_utc", "$$checkIn"] },
                                                    { $lte: ["$scheduled_utc", "$$checkOut"] }
                                                ]

                                                : []),
                                        ]
                                },

                                "$vendor",
                                0
                            ]
                        }
                    },
                    // "_ids": {
                    //     "$addToSet": "$vendor"
                    // }
                }
            },
        ])
}

module.exports.getUnavailabilityProductsBycheckInCheckOut = (data) => {
    return orderTable.aggregate(
        [
            {
                $match: {
                    storeType: data.storeType,
                    orderStatus: { $nin: ["completed", "cancelled", "rejected", "archived"] },
                    $or: [
                        {

                            $and: [
                                { checkInDate_utc: { $gte: data.checkInDate_utc, $lte: data.checkOutDate_utc } },
                                { checkOutDate_utc: { $gte: data.checkInDate_utc, $gte: data.checkOutDate_utc } }
                            ]
                        },
                        {
                            $and: [
                                { checkInDate_utc: { $gte: data.checkInDate_utc, $lte: data.checkOutDate_utc } },
                                { checkOutDate_utc: { $gte: data.checkInDate_utc, $lte: data.checkOutDate_utc } }
                            ]
                        },
                        {
                            $and: [
                                { checkInDate_utc: { $lte: data.checkInDate_utc, $lte: data.checkOutDate_utc } },
                                { checkOutDate_utc: { $gte: data.checkInDate_utc, $gte: data.checkOutDate_utc } }
                            ]
                        },
                        {
                            $and: [
                                { checkInDate_utc: { $lte: data.checkInDate_utc, $lte: data.checkOutDate_utc } },
                                { checkOutDate_utc: { $gte: data.checkInDate_utc, $lte: data.checkOutDate_utc } }
                            ]
                        }
                    ]
                }
            },
            {
                "$group": {
                    "_id": null,
                    "_ids": { $addToSet: "$line_items._id" }
                },

            },
            {
                "$addFields": {
                    "_ids": {
                        "$reduce": {
                            "input": "$_ids",
                            "initialValue": [],
                            "in": { "$concatArrays": ["$$value", "$$this"] }
                        }
                    },


                }
            }

        ])
}

module.exports.getCheckAvailabilityService = (data, callback) => {
    return orderTable.find(
        {
            "line_items._id": data.items,
            orderStatus: { $nin: ["completed", "cancelled", "rejected", "archived"] },
            $or: [
                {
                    $and: [
                        { checkInDate_utc: { $gte: data.checkInDate_utc, $lte: data.checkOutDate_utc } },
                        { checkOutDate_utc: { $gte: data.checkInDate_utc, $gte: data.checkOutDate_utc } }
                    ]
                },
                {
                    $and: [
                        { checkInDate_utc: { $gte: data.checkInDate_utc, $lte: data.checkOutDate_utc } },
                        { checkOutDate_utc: { $gte: data.checkInDate_utc, $lte: data.checkOutDate_utc } }
                    ]
                },
                {
                    $and: [
                        { checkInDate_utc: { $lte: data.checkInDate_utc, $lte: data.checkOutDate_utc } },
                        { checkOutDate_utc: { $gte: data.checkInDate_utc, $gte: data.checkOutDate_utc } }
                    ]
                },
                {
                    $and: [
                        { checkInDate_utc: { $lte: data.checkInDate_utc, $lte: data.checkOutDate_utc } },
                        { checkOutDate_utc: { $gte: data.checkInDate_utc, $lte: data.checkOutDate_utc } }
                    ]
                }

            ]
        }


    ).exec(callback);
}
module.exports.updateBidId = (data, callback) => {
    return orderTable.findOneAndUpdate({ _id: data.order }, { $addToSet: { bidDetails: data._id } }, { new: true }).lean()
        .populate(
            {
                path: 'user',
                select: 'name email profileImage countryCode mobileNumber',
                populate: {
                    path: 'profileImage',
                    select: "link"
                }
            }
        )
        .populate(
            {
                path: 'storeType',
                select: 'storeType storeVendorType otpSettings bidSettings',
            }
        )
        .populate(
            {
                path: 'bidDetails',
                match: { status: "pending" },
                populate: [
                    {
                        path: 'driver',
                        select: 'name email profileImage countryCode mobileNumber vehicle userLocation avgRating',
                        populate: [
                            {
                                path: 'profileImage',
                                select: 'link'
                            },

                            {
                                path: "vehicle",
                                populate: {
                                    path: "vehicleType",
                                    select: "image",
                                    populate: {
                                        path: 'image',
                                        select: 'link'
                                    }
                                }
                            }
                        ],

                    }

                ]


            }

        ).exec(callback);
}
module.exports.getDriverPoolTrips = (_id, callback) => {
    let query = { driver: _id, rideType: "pool", orderStatus: { $in: ["confirmed", "inroute"] } };

    return orderTable.aggregate(
        [
            { $match: query },
            { $sort: { _id: -1 } },
            {
                $group: {
                    _id: null,
                    bookedSeat: { $sum: "$noOfSeats" },
                    isFirstPoolTrip: { "$first": "$isFirstPoolTrip" },
                    pickUp: { "$first": "$pickUp" },
                    dropOff: { "$first": "$dropOff" },

                }
            }
        ], callback)

}
/*
module.exports.getDriverCurrentPoolTrips = (_id, callback) => {
    let query = { driver: _id, rideType: "pool", orderStatus: { $in: ["confirmed", "inroute"] } };
    return orderTable.find(query, "pickUp dropOff noOfSeats rideType orderStatus driverStatus").populate(
        {
            path: 'user',
            select: 'name email countryCode mobileNumber profileImage',
            populate: {
                path: 'profileImage',
                select: "link"
            }
        }
    ).exec(callback);
}*/

module.exports.getDriverCurrentPoolTrips = (_id, callback) => {
    let query = { driver: _id, rideType: "pool", orderStatus: { $in: ["confirmed", "inroute"] } };
    // ['pickupInroute', 'pickupArrived', 'destinationInroute', "completed"] 
    return orderTable.aggregate(
        [
            { $match: query },
            {
                $lookup: {
                    from: "users",
                    let: { user: "$user" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ["$_id", "$$user"] }]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "files", let: { profileImage: "$profileImage" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [{ $eq: ["$_id", "$$profileImage"] }]
                                            }
                                        }
                                    },
                                    { $project: { link: 1 } }
                                ],
                                as: "profileImage"
                            }
                        },
                        { $unwind: { path: "$profileImage", preserveNullAndEmptyArrays: true } },
                    ],
                    as: "user"
                }
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    orderStatus: 1, pickUp: 1, dropOff: 1, noOfSeats: 1, rideType: 1, driverStatus: 1,
                    user: { _id: 1, name: 1, address: 1, email: 1, mobileNumber: 1, countryCode: 1, profileImage: { link: 1 } },
                    wayPoints: {
                        $cond: [{ $in: ["$driverStatus", ["pickupInroute", "pickupArrived"]] }, "$pickUp", "$dropOff"]
                    }
                }
            }

        ], callback)

}
module.exports.getDriverCurrentTrips = (driver, callback) => {
    return orderTable.find({ driver, orderStatus: { $in: ["confirmed", "inroute"] } }, callback);
}
module.exports.updateOrderbyCondition = function (condition, update, callback) {
    update.date_modified_utc = new Date();
    return orderTable.findOneAndUpdate(condition, update, { new: true, lean: true })
        .populate({ path: 'user', select: 'name firebaseTokens loyaltyPoints' })
        .populate({ path: 'vendor', select: 'name firebaseTokens address userLocation stripeConnect' })
        .populate({ path: 'driver', select: 'name firebaseTokens userLocation stripeConnect' })
        .populate({ path: 'storeType', select: 'storeType' })
        .exec(callback);
}
module.exports.getOrderByCondition = (query, callback) => {
    return orderTable.findOne(query)
        .populate({ path: 'storeType' })
        .populate({ path: 'store', select: 'firebase storeName storeVersion currency timezone' })
        .populate(
            {
                path: 'driver',
                select: 'name email countryCode mobileNumber profileImage userLocation firebaseTokens',
                populate: {
                    path: 'profileImage'
                }
            }
        )
        .populate({ path: 'user', select: 'name email firebaseTokens wallet' })
        .exec(callback);
}