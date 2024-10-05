const mongoose = require('mongoose');
let addressSchema = mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    dropOffDetails: {
        floorNo: { type: String },
        landmark: { type: String },
        mobileNumber: { type: String },
        name: { type: String },
    },
    address: { type: String },
    line_items: { type: Object },
    otp: { type: Number },
    returnType: { type: String },
    status: { type: String, enum: ["pending", "inroute", "completed", "cancelled"], default: "pending" },
    reason: { type: String },
    instructions: { type: String },
    date_driver_start_utc: { type: Date },
    date_driver_cancelled_utc: { type: Date },
    date_driver_delivered_utc: { type: Date },
    date_modified: { type: Date },
    location: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    }
},
    {
        versionKey: false, // You should be aware of the outcome after set to false
        timestamps: true
    });

addressSchema.index({ location: "2dsphere" });

const multilocation = module.exports = mongoose.model('MultiLocation', addressSchema);

//get all addresses
module.exports.getAddresses = function (callback, limit) {
    multilocation.find(callback).limit(limit);
}

//Get User Address
module.exports.getUserAddress = function (user, callback) {
    multilocation.find({ user: user }, callback).sort({ date_created_utc: -1 });
}

module.exports.getUserAddressAsync = function (data, callback) {
    return multilocation.find({ user: data.user }, callback).sort({ date_created_utc: -1 });
}

module.exports.getUserAddressAsyncLimit = function (data, callback) {
    return multilocation.find({ user: data.user }, callback).sort({ date_created_utc: -1 }).limit(5);
}

//get addresses async
module.exports.getAddressAsync = function (callback) {
    return multilocation.find(callback);
}

//add address
module.exports.addAddress = function (data, callback) {
    return multilocation.create(data, callback);
}

module.exports.updateDropOffLocation = function (query, update, callback) {
    multilocation.findOneAndUpdate(query, update, { new: true }, callback);
}

module.exports.updateDefaultTrue = function (data, callback) {
    var query = { _id: data._id }
    data.date_modified_utc = new Date();
    data.default = true;
    return multilocation.findOneAndUpdate(query, data, { new: true }, callback);
}


//get Address by id
module.exports.getAddressById = (id, callback) => {
    multilocation.findById(id, callback);
}

module.exports.getAddressList = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    multilocation.aggregate([
        { $match: obj },
        { $sort: { [sortByField]: parseInt(sortOrder) } }, { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
    ], callback);
}
module.exports.getPendingOrder = (data, callback) => {
    let query = { order: data.order, status: { $in: ["pending", "inroute"] } };
    return multilocation.findOne(query, callback);
};
module.exports.updateMultilocation = (query, update, callback) => {
    return multilocation.findOneAndUpdate(query, update, { new: true }, callback);
}