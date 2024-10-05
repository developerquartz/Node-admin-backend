const mongoose = require('mongoose');

let CouponSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    geoFence: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Geofence' }],
    maxUse: { type: Number, default: 0 },
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    code: { type: String, required: true, trim: true, uppercase: true },
    amount: { type: Number },
    type: { type: String, enum: ["global", "vendor"], default: "vendor" },
    restrictArea: { type: String, enum: ["none", "radius"], default: "none" },
    discount_type: { type: String, enum: ["percent", "flat"], default: "percent" },
    description: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive", "archived", "expired"], default: "active" },
    start_date: { type: Date },
    date_expires: { type: Date },
    date_created: { type: Date },
    date_created_utc: { type: Date },
    date_modified: { type: Date },
    date_modified_utc: { type: Date },
    meta_data: [
        {
            key: { type: String },
            value: { type: String }
        }
    ]
},
    {
        versionKey: false // You should be aware of the outcome after set to false
    });


const CouponTable = module.exports = mongoose.model('Coupon', CouponSchema);


//get all coupon
module.exports.getCoupons = function (callback, limit) {
    CouponTable.find(callback).limit(limit);
}

module.exports.getUserCouponAsync = function (data, callback) {
    return CouponTable.find({ user: data.user }, callback).sort({ date_created_utc: -1 });
}

//get coupon async
module.exports.getCouponAsync = function (callback) {
    return CouponTable.find(callback);
}

//add coupon
module.exports.addCoupon = function (data, callback) {
    data.date_created_utc = new Date();
    CouponTable.create(data, callback);
}

module.exports.updateCoupon = function (data, callback) {
    var query = { _id: data._id }
    data.date_modified_utc = new Date();
    CouponTable.findOneAndUpdate(query, data, { new: true }, callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    CouponTable.updateMany(query, update, { "new": true }, callback);
}

module.exports.getCouponByCode = (code, callback) => {
    return CouponTable.findOne({ code: code }, callback);
}
module.exports.getCouponByCondition = (condition, callback) => {
    return CouponTable.findOne(condition, callback);
}

//get Coupon by id
module.exports.getCouponById = (id, callback) => {
    CouponTable.findById(id)
        .populate({ path: "geoFence" })
        .populate({ path: "storeType", select: 'storeType' })
        .exec(callback);
}
module.exports.getCouponByStoreId = (id, callback) => {
    CouponTable.findOne(id)
        .populate({ path: "geoFence" })
        .populate({ path: "storeType", select: 'storeType' })
        .exec(callback);
}

module.exports.getCouponByIdAsync = (id, callback) => {
    return CouponTable.findById(id, callback);
}

//remove coupon
module.exports.removeCoupon = (id, callback) => {
    var query = { _id: id };
    CouponTable.remove(query, callback);
}

module.exports.gePromocodesWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    CouponTable.aggregate([{ $match: obj },
    {
        $lookup: {
            from: "storetypes",
            localField: "storeType",
            foreignField: "_id",
            as: "storeType",
        },
    },
    { $unwind: { path: "$storeType", preserveNullAndEmptyArrays: true } },
    {
        $project: {
            amount: 1,
            code: 1,
            date_created_utc: 1,
            date_expires: 1,
            description: 1,
            discount_type: 1,
            geoFence: 1,
            maxUse: 1,
            meta_data: 1,
            restrictArea: 1,
            start_date: 1,
            status: 1,
            store: 1,
            storeType: { storeType: 1, label: 1 },
            type: 1,
            _id: 1
        }
    },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}