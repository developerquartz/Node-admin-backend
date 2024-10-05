const mongoose = require('mongoose');

let messageSchema = mongoose.Schema({
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    msg: { type: String, required: true },
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

const messageTable = module.exports = mongoose.model('Message', messageSchema);

//add Message
module.exports.addMessage = function (data, callback) {
    var query = { slug: data.slug };
    messageTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

//update Message
module.exports.updateMessage = function (data, callback) {
    var query = { _id: data._id };
    messageTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

//get Message by id
module.exports.getMessageById = (id, callback) => {
    messageTable.findById(id, callback);
}

//remove Message
module.exports.removeMessage = (id, callback) => {
    let query = { _id: id };
    messageTable.remove(query, callback);
}

module.exports.geMessageWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    messageTable.aggregate([{ $match: obj },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}