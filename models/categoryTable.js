const mongoose = require('mongoose');
let slug = require('mongoose-slug-updater');
let { transliterate } = require('transliteration');
mongoose.plugin(slug);

let categorySchema = mongoose.Schema({
    storeType: { type: mongoose.Schema.Types.ObjectId, ref: 'storeType' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    catName: { type: String, required: true },
    slug: { type: String, slug: "catName", unique: true, lowercase: true, transform: v => transliterate(v) },
    catDesc: { type: String },
    catImage: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    isFeatured: { type: Boolean },
    parent: { type: String, default: "none" },
    subcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    sortOrder: { type: Number, default: 1 },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    date_created: { type: Date, default: new Date() },
    date_created_utc: { type: Date, default: new Date() },
    date_modified: { type: Date, default: new Date() },
    date_modified_utc: { type: Date, default: new Date() },
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

const categoryTable = module.exports = mongoose.model('Category', categorySchema);

module.exports.getCategories = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    categoryTable.aggregate([
        { $match: obj },
        { $lookup: { from: 'categories', localField: 'subcategories', foreignField: '_id', as: 'subcategories' } },
        { $lookup: { from: 'files', localField: 'catImage', foreignField: '_id', as: 'catImage' } },
        {
            $unwind: { path: "$catImage", preserveNullAndEmptyArrays: true },
        },
        { $sort: { [sortByField]: parseInt(sortOrder) } }, { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
    ], callback);
}

//add category
module.exports.addCategory = function (data, callback) {
    data.date_created_utc = new Date();
    categoryTable.create(data, callback);
}

//update category
module.exports.updateCategory = function (data, callback) {
    var query = { _id: data._id }
    categoryTable.findOneAndUpdate(query, data, { new: true }, callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    categoryTable.updateMany(query, update, { "new": true }, callback);
}

module.exports.AddRefToCategory = (data) => {
    var query = { _id: data._id };
    var ref = data.ref;
    categoryTable.findOneAndUpdate(query, {
        $push: {
            items: ref
        }
    }, { upsert: true, new: true }, function (err, data) {
        if (err) {
            console.log(err);
        }
    });
}

module.exports.AddRefToCategoryParent = (data) => {
    var query = { _id: data.parent };
    var ref = data.ref;
    categoryTable.findOneAndUpdate(query, {
        $addToSet: {
            subcategories: ref
        }
    }, { new: true }, function (err, data) {
        if (err) {
            console.log(err);
        } else {
            console.log("saa", data);
        }
    });
}

module.exports.removeRefToCategory = (data) => {
    var query = { _id: data.categoryId };
    var ref = data.ref;
    categoryTable.findOneAndUpdate(query, {
        $pull: {
            subcategories: ref
        }
    }, { upsert: true, new: true }, function (err, data) {
        if (err) {
            console.log(err);
        }
    });
}

module.exports.removeRefToCategoryByParent = (data) => {
    var query = { parent: data.parent };
    var ref = data.ref;
    categoryTable.findOneAndUpdate(query, {
        $pull: {
            subcategories: ref
        }
    }, { upsert: true, new: true }, function (err, data) {
        if (err) {
            console.log(err);
        }
    });
}

module.exports.getCategoryById = (id, callback) => {
    categoryTable.findById(id)
        .populate('catImage')
        .exec(callback);
}

module.exports.getCategoryByStoreType = (data, callback) => {
    return categoryTable.find({ storeType: data.storeType, vendor: data._id, status: 'active' }, 'catName', { sort: { sortOrder: 1 } }, callback);
}

module.exports.getVendorCategory = (data, callback) => {
    return categoryTable.find({ storeType: data.storeType, parent: "none", vendor: data._id, status: 'active' }, 'catName catImage subcategories')
        .populate({ path: 'catImage', select: "link" })
        .populate({ path: 'subcategories', select: 'catName status catImage subcategories' })
        .exec(callback);
}
module.exports.getCategoriesbydetails = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    categoryTable.aggregate([
        { $match: obj },
        {
            $lookup:
            {
                from: "categories",
                let: { subcategory: "$subcategories" },
                pipeline: [
                    {
                        $match:
                        {
                            $expr: { $and: [{ $in: ["$_id", "$$subcategory"] }, { $eq: ["$status", "active"] }] }
                        }
                    },
                    {
                        $lookup: {
                            from: "files",
                            localField: "catImage",
                            foreignField: "_id",
                            as: "catImage"
                        }
                    },
                    {
                        $lookup: {
                            from: "storetypes",
                            localField: "storeType",
                            foreignField: "_id",
                            as: "storeType"
                        }
                    },
                    { $unwind: "$storeType" },
                    { $unwind: { path: "$catImage", preserveNullAndEmptyArrays: true } },
                    { $project: { _id: 1, parent: 1, sortOrder: 1, status: 1, date_created: 1, date_created_utc: 1, date_modified: 1, date_modified_utc: 1, catName: 1, catDesc: 1, isFeatured: 1, slug: 1, catImage: 1, storeType: { _id: 1, storeType: 1, store: 1 } } }
                ],
                as: "subcategories"
            }
        },
        { $lookup: { from: 'files', localField: 'catImage', foreignField: '_id', as: 'catImage' } },
        { $lookup: { from: 'storetypes', localField: 'storeType', foreignField: '_id', as: 'storeType' } },
        { $unwind: "$storeType" },
        { $unwind: { path: "$catImage", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, parent: 1, sortOrder: 1, status: 1, date_created: 1, date_created_utc: 1, date_modified: 1, date_modified_utc: 1, catName: 1, catDesc: 1, isFeatured: 1, slug: 1, subcategories: 1, catImage: 1, storeType: { _id: 1, storeType: 1, store: 1 } } },
        { $sort: { [sortByField]: parseInt(sortOrder) } }
    ], callback);
}
//remove category
module.exports.removeCategory = (id, callback) => {
    var query = { _id: id };
    categoryTable.remove(query, callback);
}