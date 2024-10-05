const mongoose = require('mongoose');
let slug = require('mongoose-slug-updater');
mongoose.plugin(slug);

let vehicleSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'documentTemplate' },
    vehicleType: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleType' },
    complete: { type: Array, default: [] },
    values: { type: Array, default: [] },
    date_created: { type: Date },
    date_created_utc: { type: Date },
    date_modified: { type: Date },
    date_modified_utc: { type: Date },
    isManualPrice: { type: Boolean, default: false },
    basePrice: { type: Number },
    pricePerUnitDistance: { type: Number },
    pricePerUnitTimeMinute: { type: Number },
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

const vehicleTable = module.exports = mongoose.model('Vehicle', vehicleSchema);

//add Vehicle
module.exports.addVehicle = function (data, callback) {
    data.date_created_utc = new Date();
    vehicleTable.create(data, callback);
}


//update Vehicle
module.exports.updateVehicle = function (data, callback) {
    var query = { _id: data._id };
    vehicleTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}
//get Vehicles async
module.exports.getVehiclesAsync = function (callback) {
    return vehicleTable.find(callback);
}

//get Vehicle by id
module.exports.getVehicleById = (id, callback) => {
    vehicleTable.findById(id, callback);
}

//remove Vehicle
module.exports.removeVehicle = (id, callback) => {
    let query = { _id: id };
    vehicleTable.remove(query, callback);
}

module.exports.geVehiclesWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    vehicleTable.aggregate([{ $match: obj },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}

module.exports.getDriverVehiclesWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    vehicleTable.aggregate([{ $match: obj },
    { $lookup: { from: 'vehicletypes', localField: 'vehicleType', foreignField: '_id', as: 'vehicleType' } },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    { $project: { "vehicleType.name": 1, isComplete: 1 } }
    ], callback);
}

module.exports.getDriverVehiclesList = (obj, callback) => {
    return vehicleTable.aggregate([{ $match: obj },
    {
        $lookup: {
            from: "vehicletypes",
            let: { vehicleType: "$vehicleType" },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [{ $eq: ["$_id", "$$vehicleType"] }]
                        }
                    }
                },
                attachImage("image", "image"),
                attachImage("icon", "icon"),
                attachUnwind("image"),
                attachUnwind("icon"),
            ],
            as: "vehicleType"
        }
    },
    {
        $unwind: { path: "$vehicleType", preserveNullAndEmptyArrays: true }
    },
    { $match: { "vehicleType.status": "active" } },
    {
        $project: {
            vehicleType: { name: 1, image: 1, type: 1, icon: 1, vehicle: 1 },
            template: 1, values: 1,
        }
    }
    ], callback);

    /* vehicleTable.find({ user: obj.user }, 'template values vehicleType')
         .populate(
             {
                 path: 'vehicleType',
                 match: { status: "active" },
                 select: 'name image type',
                 populate: [
                     {
                         path: 'image',
                         select: 'link'
                     },
                     {
                         path: 'icon',
                         select: 'link'
                     }
                 ],
             }
         )
         .exec(callback);*/
}

function attachUnwind(key) {
    return {
        $unwind: { path: "$" + key, preserveNullAndEmptyArrays: true }
    }
}
function attachImage(outputKey, localField) {
    return { $lookup: { from: 'files', localField: localField, foreignField: '_id', as: outputKey } }
}