const mongoose = require('mongoose');

let addressSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    area: { type: String, default : "" },
    houseNo: { type: String, default : "" },
    landmark: { type: String, default : "" },
    address: { type: String, default : "" },
    addressLocation: {
        type: { type: String, enum: ['Point'], required: true, default: "Point" },
        coordinates: { type: [Number], required: true, default: [] }
    },
    addressType: { type: String, enum: ["home", "office", "other"], default: "home" },
    default: { type: Boolean, default: false },
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

addressSchema.index({ addressLocation: "2dsphere" });

const addressTable = module.exports = mongoose.model('Address', addressSchema);

//get all addresses
module.exports.getAddresses = function (callback, limit) {
    addressTable.find(callback).limit(limit);
}

//Get User Address
module.exports.getUserAddress = function (user, callback) {
    addressTable.find({ user: user }, callback).sort({ date_created_utc: -1 });
}

module.exports.getUserAddressAsync = function (data, callback) {
    return addressTable.find({ user: data.user }, callback).sort({ date_created_utc: -1 });
}

module.exports.getUserAddressAsyncLimit = function (data, callback) {
    return addressTable.find({ user: data.user }, callback).sort({ date_created_utc: -1 }).limit(5);
}

//get addresses async
module.exports.getAddressAsync = function (callback) {
    return addressTable.find(callback);
}

//add address
module.exports.addAddress = function (data, callback) {
    data.date_created_utc = new Date();
    addressTable.create(data, callback);
}

module.exports.updateAddress = function (data, callback) {
    var query = { _id: data._id }
    data.date_modified_utc = new Date();
    addressTable.findOneAndUpdate(query, data, { new: true }, callback);
}

module.exports.updateDefaultTrue = function (data, callback) {
    var query = { _id: data._id }
    data.date_modified_utc = new Date();
    data.default = true;
    return addressTable.findOneAndUpdate(query, data, { new: true }, callback);
}

module.exports.updateOthertAddressFalse = function (data, callback) {
    var query = { user: data.user }
    return addressTable.updateMany(query, { $set: { default: false } }, { new: true }, callback);
}

//get Address by id
module.exports.getAddressById = (id, callback) => {
    addressTable.findById(id, callback);
}

module.exports.getAddressByIdAsync = (id, callback) => {
    return addressTable.findById(id, callback);
}

//remove Address
module.exports.removeAddress = (id, callback) => {
    var query = { _id: id };
    addressTable.remove(query, callback);
}

module.exports.getAddressList = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    addressTable.aggregate([
        { $match: obj },
        { $sort: { [sortByField]: parseInt(sortOrder) } }, { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
    ], callback);
}