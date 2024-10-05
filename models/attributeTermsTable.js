const mongoose = require('mongoose');
let slug = require('mongoose-slug-updater');
let { transliterate } = require('transliteration');
mongoose.plugin(slug);

let AttributeTerm = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attribute: { type: mongoose.Schema.Types.ObjectId, ref: 'Attribute' },
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    name: { type: String, required: true },
    slug: { type: String, slug: "name", lowercase: true, transform: v => transliterate(v) },
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

const attributeTermTable = module.exports = mongoose.model('AttributeTerm', AttributeTerm);

//add Attribute Term
module.exports.addAttributeTerm = function (data, callback) {
    var query = { name: data.name };
    attributeTermTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

//update attribuite Term
module.exports.updateAttributeTerm = function (data, callback) {
    var query = { _id: data._id };
    attributeTermTable.findOneAndUpdate(query, data, { new: true }, callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    attributeTermTable.updateMany(query, update, { "new": true }, callback);
}

//get attributes Term async
module.exports.getAttributesAsync = function (callback) {
    return attributeTermTable.find(callback);
}

//get attribute Term by id
module.exports.getAttributeTermById = (id, callback) => {
    attributeTermTable.findById(id, callback);
}

//remove attribute Term
module.exports.removeAttributeTerm = (id, callback) => {
    let query = { _id: id };
    attributeTermTable.remove(query, callback);
}


module.exports.getAttributeTerms = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    attributeTermTable.aggregate([
        { $match: obj },
        { $sort: { [sortByField]: parseInt(sortOrder) } }, { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
    ], callback);
}