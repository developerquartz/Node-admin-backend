const mongoose = require('mongoose');

let VehicleSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    vehicle: { type: String },
    type: { type: String, enum: ["normal", "pool"], default: "normal" },
    name: { type: String, required: true },
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    isHostVehicle: { type: Boolean, default: false },
    icon: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    weight: {
        maxWeight: { type: Number },
        minWeight: { type: Number }
    },
    maxPersons: { type: Number },
    basePrice: { type: Number },
    pricePerUnitDistance: { type: Number },
    pricePerUnitTimeMinute: { type: Number },
    driverPercentCharge: { type: Number },
    waitingTimeStartAfterMin: { type: Number },
    waitingTimePrice: { type: Number },
    features: { type: Array },
    info: { type: String },
    isSurgeTime: { type: Boolean, default: false },
    surgeTimeList: [
        {
            dayStatus: { type: Boolean, default: false },
            day: { type: Number },
            startTime: { type: String },
            endTime: { type: String },
            surgeMultiplier: { type: Number }
        }
    ],
    hourly: {
        status: { type: Boolean },
        price: { type: Number }
    },
    estimatedCost: { type: Number, default: 0 },
    estimatedTime: { type: Number, default: 0 },
    distance: { type: Number, default: 0 },
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

const VehicleTable = module.exports = mongoose.model('VehicleType', VehicleSchema);

//add Vehicle
module.exports.addVehicle = function (data, callback) {
    data.date_created_utc = new Date();
    VehicleTable.create(data, callback);
}

//update Vehicle
module.exports.updateVehicle = function (data, callback) {
    var query = { _id: data._id };
    VehicleTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    VehicleTable.updateMany(query, update, { "new": true }, callback);
}

//get Vehicle by id
module.exports.getVehicleById = (id, callback) => {
    return VehicleTable.findById(id).populate('image', "link").populate({
        path: 'icon',
        select: 'link',
        options: { lean: true }
    }).exec(callback);
}

module.exports.getVehicleByStoreId = (id, callback) => {
    return VehicleTable.findOne(id).populate('image', "link").populate('icon', "link").exec(callback);
}

//get active Vehicle
module.exports.getActiveVehicleTypes = (condition, callback) => {
    VehicleTable.find(condition).exec(callback);
}

//remove Vehicle
module.exports.removeVehicle = (id, callback) => {
    let query = { _id: id };
    VehicleTable.remove(query, callback);
}

module.exports.geVehiclesWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    VehicleTable.aggregate([{ $match: obj },
    {
        $lookup: {
            from: "files",
            localField: "image",
            foreignField: "_id",
            as: "image",
        },
    },
    { $unwind: { path: "$image", preserveNullAndEmptyArrays: true } },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}
module.exports.getVehicleTypesList = (condition, callback) => {
    return VehicleTable.find(condition).populate("image", "link").sort({ _id: -1 }).lean().exec(callback);
}

module.exports.getVehicleTypesList2 = async (condition) => {
    return await VehicleTable.find(condition).populate("image", "link").sort({ _id: -1 });
}