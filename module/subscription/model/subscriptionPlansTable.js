const mongoose = require('mongoose');

let PlansSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    name: { type: String },
    interval: { type: String, enum: ["month", "semiAnnual", "year"] },
    type: { type: String, enum: ["basic", "premium", "ultimate"] },
    price: { type: Number, required: true },
    currency: { type: String },
    description: { type: String },
    features: { type: Array },
    isActive: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    addon: { type: Number, default: 0 },
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

const PlansTable = module.exports = mongoose.model('SubscriptionPlan', PlansSchema);

//add Plans
module.exports.addPlans = function (data, callback) {
    data.date_created_utc = new Date();
    data.isActive = false;
    PlansTable.create(data, callback);
}

//update Plans
module.exports.updatePlans = function (data, callback) {
    var query = { _id: data._id };
    PlansTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}


//get Plans by id
module.exports.getPlansById = (query, callback) => {
    PlansTable.findOne(query, callback);
}

//remove Plans
module.exports.removePlans = (query, callback) => {
    let update = { status: "archived" };
    PlansTable.updateOne(query, update, callback);
}
module.exports.getPlansWithFilterforadmin = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    PlansTable.aggregate([
        { $match: obj },
        { $sort: { [sortByField]: parseInt(sortOrder) } }, { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
    ], callback);
}
module.exports.getPlansWithFilter = function (obj, isSub, sortByField, sortOrder, paged, pageSize, callback) {
    PlansTable.aggregate([
        { $match: obj },
        {
            $addFields: {
                isSubscriptionPlan: {
                    $cond: [{ $eq: ["$_id", isSub] }, true, false]
                }
            }
        },
        { $sort: { [sortByField]: parseInt(sortOrder) } }, { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
    ], callback);
}

module.exports.getStorePlanssWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    PlansTable.aggregate([
        { $match: obj },
        {
            $group: {
                _id: '$type',
                plans: { $push: { _id: "$_id", interval: "$interval", price: "$price", currency: "$currency", isActive: "$isActive", addon: "$addon" } },
                name: { $first: '$name' },
                description: { $first: '$description' },
                features: { $first: '$features' }
            }
        },
        { $sort: { _id: 1 } }
    ], callback);
}

module.exports.updateStatusByIds = (obj, update, callback) => {
    let query = { _id: { $in: obj._id } };
    PlansTable.updateMany(query, update, { "new": true }, callback);
}