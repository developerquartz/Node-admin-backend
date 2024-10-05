const mongoose = require('mongoose');

let GeofenceSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["radius", "geofence"], required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    address: { type: String },
    moduleType: { type: String, enum: ['taxi', 'promocode', 'vendor'], required: true },
    vehicleType: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType' },
    isvehicle: { type: Boolean },
    basePrice: { type: Number },
    pricePerUnitDistance: { type: Number },
    pricePerUnitTimeMinute: { type: Number },
    hourly: {
        status: { type: Boolean },
        price: { type: Number }
    },
    center: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number] }
    },
    location: {
        type: { type: String, enum: ['Point', 'Polygon'] },
        coordinates: { type: [[[Number]]] }
    },
    radius: { type: Number }, //radius in km
    status: { type: String, enum: ["active", "inactive", "archived"], required: true, default: "active" },
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

GeofenceSchema.index({ location: "2dsphere" });
GeofenceSchema.index({ center: "2dsphere" })

const GeofenceTable = module.exports = mongoose.model('Geofence', GeofenceSchema);


module.exports.addGeofence = function (data, callback) {
    data.date_created_utc = new Date();
    GeofenceTable.create(data, callback);
}

module.exports.getGeofenceById = (id, callback) => {
    GeofenceTable.findOne(id).populate({ path: 'vehicleType', select: 'name' })
        .exec(callback);
}

module.exports.updateGeofenc = function (data, callback) {
    var query = { _id: data._id }
    if (data.vendor) {
        query = { _id: data._id, vendor: data.vendor };
    }
    GeofenceTable.findOneAndUpdate(query, data, { new: true }, callback);
}

module.exports.getGeofencWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    GeofenceTable.aggregate([{ $match: obj },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    if (data.vendor) {
        query = { _id: { $in: data._id }, vendor: data.vendor }
    }
    GeofenceTable.updateMany(query, update, { "new": true }, callback);
}

module.exports.checkbylocation = (data, callback) => {
    GeofenceTable.find({ store: mongoose.Types.ObjectId(data.store), moduleType: data.moduleType, type: data.type, location: { $geoIntersects: { $geometry: { type: "Point", coordinates: data.lctionArray } } } }).exec(callback);
}