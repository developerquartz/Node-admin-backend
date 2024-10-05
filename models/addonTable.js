const mongoose = require('mongoose');

let AddonSchema = mongoose.Schema({
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    type: { type: String, enum: ["SINGLESELECT", "MULTISELECT"], default: "SINGLESELECT" },
    minLimit: { type: Number, default: 0 },
    maxLimit: { type: Number, default: 0 },
    required: { type: Boolean, default: false },
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'File'},
    options: [
        {
            name: { type: String },
            price: { type: Number },
            image: { type: mongoose.Schema.Types.ObjectId, ref: 'File'},
            default: { type: Boolean, default: false }
        }
    ],
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

const AddonTable = module.exports = mongoose.model('Addon', AddonSchema);

//add Addon
module.exports.addAddon = function (data, callback) {
    var query = { storeType: data.storeType, name: data.name };
    data.date_created_utc = new Date();
    AddonTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

//update Addon
module.exports.updateAddon = function (data, callback) {
    var query = { _id: data._id };
    AddonTable.findOneAndUpdate(query, data, { new: true }, callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    AddonTable.updateMany(query, update, { "new": true }, callback);
}

//get Addon by id
module.exports.getAddonById = (id, callback) => {
    AddonTable.findById(id).populate('options.image image').exec(callback);
}

//remove Addon
module.exports.removeAddon = (id, callback) => {
    let query = { _id: id };
    AddonTable.remove(query, callback);
}

module.exports.geAddonsWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    AddonTable.find(obj).populate("image options.image")
        .sort({ [sortByField]: parseInt(sortOrder) })
        .skip((paged - 1) * pageSize)
        .limit(parseInt(pageSize))
        .exec(callback)

    /* AddonTable.aggregate([{ $match: obj },
     { $lookup: { from: 'files', localField: 'image', foreignField: '_id', as: 'featureImage' } },
     { $lookup: { from: 'files', localField: 'options.image', foreignField: '_id', as: 'image' } },
     { $sort: { [sortByField]: parseInt(sortOrder) } },
     { $skip: (paged - 1) * pageSize },
     { $limit: parseInt(pageSize) },
     ], callback);*/
}