const mongoose = require('mongoose');
let packageSchema = new mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    vehicleType: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType' },
    image: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    name: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    features: { type: Array },
    description: { type: String },
    duration: { type: Number },
    price: { type: Number },
    date_created: { type: Date },
    date_created_utc: { type: Date },
    date_modified: { type: Date },
    date_modified_utc: { type: Date }
},
    {
        versionKey: false
    });

// const PackageTable = module.exports = mongoose.model('Package', packageSchema);


packageSchema.static({
    addPackage: function (data, callback) {
        return this.create(data, callback);
    },
    updatePackage: function (data, callback) {
        let query = { _id: data._id };
        return this.findOneAndUpdate(query, data, { new: true, lean: true }, callback);
    },
    viewPackage: function (_id, callback) {
        return this.findOne({ _id }, callback)
            .populate("image", "link")
            .populate("vendor", "name mobileNumber email address userLocation")
    },
    updateStatus: function (data, callback) {
        let query = { _id: data._id };
        let update = { status: data.status };
        return this.findOneAndUpdate(query, update, { new: true, lean: true }, callback);
    },
    updateOneWithCondition: function (query, update, callback) {
        return this.findOneAndUpdate(query, update, { new: true, lean: true }, callback);
    },
    updateStatusByIds: function (data, update, callback) {
        let query = { _id: { $in: data._id } }
        return this.updateMany(query, update, { "new": true }, callback);
    },
    removePackage: function (query, callback) {
        return this.updateOne(query, { status: "archived" }, callback);
    },
    getPackageWithFilter: function (query, sortByField, sortOrder, paged, pageSize, callback) {
        return this.find(query, callback)
            .populate("image", "link")
            .populate("vendor", "name mobileNumber email address userLocation")
            .populate({
                path: "vehicleType", select: "name vehicle status",
                populate: {
                    path: "image", select: "link"
                }
            })
            .sort({ [sortByField]: parseInt(sortOrder) })
            .skip((paged - 1) * pageSize)
            .limit(parseInt(pageSize))
    }
});

module.exports = mongoose.model('Package', packageSchema);
