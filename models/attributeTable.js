const mongoose = require('mongoose');
let slug = require('mongoose-slug-updater');
let { transliterate } = require('transliteration');
mongoose.plugin(slug);

let attributeSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    name: { type: String, required: true },
    slug: { type: String, slug: "name", lowercase: true, transform: v => transliterate(v) },
    terms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AttributeTerm' }],
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

const attributeTable = module.exports = mongoose.model('Attribute', attributeSchema);

//add Attribute
module.exports.addAttribute = function (data, callback) {
    var query = { slug: data.slug };
    attributeTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

//update attribuite
module.exports.updateAttribute = function (data, callback) {
    var query = { _id: data._id };
    attributeTable.findOneAndUpdate(query, data, { new: true }, callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    attributeTable.updateMany(query, update, { "new": true }, callback);
}

//get attributes async
module.exports.getAttributesAsync = function (callback) {
    return attributeTable.find(callback);
}

//get attribute by id
module.exports.getAttributeById = (id, callback) => {
    attributeTable.findById(id)
        .populate({ path: 'terms', select: 'name' })
        .exec(callback);
}

module.exports.AddRefToTerms = (data) => {
    var query = { _id: data.attributeId };
    var ref = data.ref;
    attributeTable.findOneAndUpdate(query, {
        $addToSet: {
            terms: ref
        }
    }, { new: true }, function (err, data) {
        if (err) {
            console.log(err);
        }
    });
}

//remove attribute
module.exports.removeAttribute = (id, callback) => {
    let query = { _id: id };
    attributeTable.remove(query, callback);
}

module.exports.getAttributes = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    attributeTable.aggregate([
        { $match: obj },
        { $lookup: { from: 'attributeterms', localField: 'terms', foreignField: '_id', as: 'terms' } },
        { $sort: { [sortByField]: parseInt(sortOrder) } }, { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
    ], callback);
}