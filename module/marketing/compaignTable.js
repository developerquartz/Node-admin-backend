const mongoose = require('mongoose');
let slug = require('mongoose-slug-updater');
mongoose.plugin(slug);

let compaignSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    storeType: [{ type: mongoose.Schema.Types.ObjectId, ref: 'storeType' }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'compaignTemplate' },
    logId: { type: mongoose.Schema.Types.ObjectId, ref: 'Log' },
    slug: { type: String, slug: "name", unique: true, lowercase: true, slugOn: { findOneAndUpdate: false } },
    audianceType: { type: String, enum: ["DRIVER", "VENDOR", "USER"] },
    audianceFilter: { type: String, enum: ["registeredBefore", "registeredAfter", "orderBefore", "orderAfter", "all"], default: "all" },
    scheduledDate: { type: String },
    scheduled_utc: { type: Date },
    scheduledTime: { type: String },
    audianceFilterDate: { type: Date },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
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

const CompaignTable = module.exports = mongoose.model('compaign', compaignSchema);

//add Compaign
module.exports.addCompaign = function (data, callback) {
    data.date_created_utc = new Date();
    data.date_modified_utc = new Date();
    CompaignTable.create(data, callback);
}

//update Compaign
module.exports.updateCompaign = function (data, callback) {
    var query = { _id: data._id };
    data.date_modified_utc = new Date()
    CompaignTable.findOneAndUpdate(query, data, { new: true }, callback);
}
//get Compaigns async
module.exports.getCompaignsAsync = function (callback) {
    return CompaignTable.find(callback);
}

//get Compaign by id
module.exports.getCompaignById = (id, callback) => {
    CompaignTable.findById(id)
        .populate({ path: 'template' })
        .exec(callback);
}

module.exports.AddRefToFields = (data) => {
    var query = { _id: data.template };
    var ref = data.ref;
    CompaignTable.findOneAndUpdate(query, {
        $addToSet: {
            fields: ref
        }
    }, { new: true }, function (err, data) {
        if (err) {
            console.log(err);
        }
    });
}

module.exports.removeRefToFields = (data) => {
    var query = { _id: data.template };
    var ref = data.ref;
    CompaignTable.findOneAndUpdate(query, {
        $pull: {
            fields: ref
        }
    }, { new: true }, function (err, data) {
        if (err) {
            console.log(err);
        }
    });
}

//remove Compaign
module.exports.removeCompaign = (id, callback) => {
    let query = { _id: id };
    CompaignTable.remove(query, callback);
}

module.exports.geCompaignsWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    CompaignTable.aggregate([{ $match: obj },
    { $lookup: { from: 'compaigntemplates', localField: 'template', foreignField: '_id', as: 'template' } },
    { $lookup: { from: 'logs', localField: 'logId', foreignField: '_id', as: 'logId' } },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    { $unwind: { path: "$logId", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$template", preserveNullAndEmptyArrays: true } },
    { $project: { name: 1, logId :1, template: 1, audianceType: 1, audianceFilter: 1, scheduledDate: 1, scheduledTime: 1, date_created_utc: 1, status: 1 } }
    ], callback);
}

module.exports.getDriverCompaignsWithFilter = function (obj, callback) {
    CompaignTable.aggregate([{ $match: obj },
    { $lookup: { from: 'formfields', let: { template: "$_id" }, pipeline: [{ $match: { '$expr': { '$eq': ['$template', '$$template'] }, status: "active" } }, { $sort: { sortOrder: 1 } }], as: "fields" } },
    { $project: { name: 1, fields: { _id: 1, validation: 1, type: 1, label: 1, name: 1, options: 1 }, isComplete: 1 } }
    ], callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    CompaignTable.updateMany(query, update, { "new": true }, callback);
}