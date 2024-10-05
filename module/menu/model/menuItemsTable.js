const mongoose = require('mongoose');

let MenuItemsSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required : true },
    menuId: { type: mongoose.Schema.Types.ObjectId, ref: 'menu'},
    label: { type: String, required : true },

    linkType: { type: String, enum:["internal","external"], default:"internal" },
    target: { type: String, enum:["_blank","_self"], default:"_self" },
    link: { type: String },

    sortOrder: { type: Number, default: 1 },
    parent: { type: mongoose.Schema.Types.ObjectId,ref: 'menuItems', default: null },
    child: [{ type: mongoose.Schema.Types.ObjectId,ref: 'menuItems' }],
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    islogin: { type: Boolean },
    isSignUp: { type: Boolean },
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

const menuItemTable = module.exports = mongoose.model('menuItems', MenuItemsSchema);

//add MenuItems
module.exports.addMenuItems = function (data, callback) {
    data.date_created_utc = new Date();
    menuItemTable.create(data, callback);
}

//update MenuItems
module.exports.updateMenuItems = function (data, callback) {
    var query = { _id: data._id };
    menuItemTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

module.exports.updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    menuItemTable.updateMany(query, update, { "new": true }, callback);
}

//get MenuItems async
module.exports.getMenuItemsAsync = function (callback) {
    return menuItemTable.find(callback);
}

//get MenuItems by id
module.exports.getMenuItemsById = (id, callback) => {
    menuItemTable.findById(id, callback);
}

//remove MenuItems
module.exports.removeMenuItems = (id, callback) => {
    let query = { _id: id };
    menuItemTable.remove(query, callback);
}

module.exports.getMenuItemsWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    menuItemTable.aggregate([{ $match: obj },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}