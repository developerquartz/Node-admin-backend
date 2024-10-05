const mongoose = require('mongoose');
let vendorSchema = new mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    profileImage: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    name: { type: String },
    email: { type: String, lowercase: true, trim: true },
    mobileNumber: { type: String },
    countryCode: { type: String },
    address: { type: String },
    userLocation: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    date_created: { type: Date },
    date_created_utc: { type: Date },
    date_modified: { type: Date },
    date_modified_utc: { type: Date }
},
    {
        versionKey: false
    });

const VendorTable = module.exports = mongoose.model('Vendor', vendorSchema);

module.exports.addVendor = (data, callback) => {
    VendorTable.create(data, callback);
};
module.exports.updateVendor = (data, callback) => {
    let query = { _id: data._id };
    return VendorTable.findOneAndUpdate(query, data, { new: true, lean: true }, callback);
};
module.exports.viewVendor = (_id, callback) => {
    return VendorTable.findOne({ _id }, callback)
        .populate("profileImage", "link")
};
module.exports.getVendor = (query, callback) => {
    return VendorTable.findOne(query, callback)
        .populate("profileImage", "link")
};
module.exports.updateStatus = (data, callback) => {
    let query = { _id: data._id };
    let update = { status: data.status };
    return VendorTable.findOneAndUpdate(query, update, { new: true, lean: true }, callback);
};
module.exports.updateOneWithCondition = (query, update, callback) => {
    return VendorTable.findOneAndUpdate(query, update, { new: true, lean: true }, callback);
};
module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    return VendorTable.updateMany(query, update, { "new": true }, callback);
};
module.exports.removeVendor = (query, callback) => {
    return VendorTable.updateOne(query, { status: "archived" }, callback);
};
module.exports.getVendorWithFilter = (query, sortByField, sortOrder, paged, pageSize, callback) => {
    return VendorTable.find(query, callback)
        .populate("profileImage", "link")
        .sort({ [sortByField]: parseInt(sortOrder) })
        .skip((paged - 1) * pageSize)
        .limit(parseInt(pageSize))
}

