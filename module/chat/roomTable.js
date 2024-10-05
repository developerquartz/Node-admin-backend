const mongoose = require('mongoose');

let messageSchema = mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    archive: { type: Boolean, enum: [0, 1], default: 0 },
    date_created: { type: Date },
    date_created_utc: { type: Date },
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

const messageTable = module.exports = mongoose.model('Room', messageSchema);

//add Room
module.exports.addRoom = function (data, callback) {
    var query = { slug: data.slug };
    messageTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

//update Room
module.exports.updateRoom = function (data, callback) {
    var query = { _id: data._id };
    messageTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

//get Room by id
module.exports.getRoomById = (id, callback) => {
    messageTable.findById(id, callback);
}

//remove Room
module.exports.removeRoom = (id, callback) => {
    let query = { _id: id };
    messageTable.remove(query, callback);
}

module.exports.geRoomWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    messageTable.aggregate([{ $match: obj },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}