const mongoose = require('mongoose');

let NotificationSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    title: { type: String },
    body: { type: String },
    type: { type: String, enum: ["USER", "DRIVER", "VENDOR"] },
    count: { type: Number },
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

const NotificationTable = module.exports = mongoose.model('Notification', NotificationSchema);

//add Notification
module.exports.addNotification = function (data, callback) {
    data.date_created_utc = new Date();
    NotificationTable.create(data, callback);
}

//update Notification
module.exports.updateNotification = function (data, callback) {
    var query = { _id: data._id };
    NotificationTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    NotificationTable.updateMany(query, update, { "new": true }, callback);
}

//get faqs async
module.exports.getNotificationsAsync = function (callback) {
    return NotificationTable.find(callback);
}

//get faq by id
module.exports.getNotificationById = (id, callback) => {
    NotificationTable.findById(id, callback);
}

//remove faq
module.exports.removeNotification = (id, callback) => {
    let query = { _id: id };
    NotificationTable.remove(query, callback);
}

module.exports.geNotificationsWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    NotificationTable.aggregate([{ $match: obj },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}