const mongoose = require('mongoose');

let compaignTemplateSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ["sms", "email", "push"] },
    name: { type: String },
    subject: { type: String },
    body: { type: String },
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

const compaignTemplateTable = module.exports = mongoose.model('compaignTemplate', compaignTemplateSchema);

//add compaignTemplate
module.exports.addCompaignTemplate = function (data, callback) {
    data.date_created_utc = new Date();
    compaignTemplateTable.create(data, callback);
}

//update compaignTemplate
module.exports.updateCompaignTemplate = function (data, callback) {
    var query = { _id: data._id };
    compaignTemplateTable.findOneAndUpdate(query, data, { new: true }, callback);
}
//get compaignTemplates async
module.exports.getCompaignTemplatesAsync = function (callback) {
    return compaignTemplateTable.find(callback);
}

//get compaignTemplate by id
module.exports.getCompaignTemplateById = (id, callback) => {
    compaignTemplateTable.findById(id, callback);
}

//remove compaignTemplate
module.exports.removeCompaignTemplate = (id, callback) => {
    let query = { _id: id };
    compaignTemplateTable.remove(query, callback);
}

module.exports.getCompaignTemplatesWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    compaignTemplateTable.aggregate([{ $match: obj },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    { $project: { name: 1, type: 1, subject: 1, date_created_utc: 1, status: 1 } }
    ], callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    compaignTemplateTable.updateMany(query, update, { "new": true }, callback);
}