const menuItemTable = require('../model/menuItemsTable')

//add MenuItems
let addMenuItems = function (data, callback) {
    data.date_created_utc = new Date();
    menuItemTable.create(data, callback);
}

//update MenuItems
let updateMenuItems = function (data, callback) {
    var query = { _id: data._id };
    menuItemTable.findOneAndUpdate(query, data, { new: true }, callback);
}

//update MenuItems
let updateOneAsync = async function (query, update) {
   return await menuItemTable.findOneAndUpdate(query, update, { new: true });
}

let updateStatusByIds = (data, callback) => {    
    let query = { _id: { $in: data._id } }
    let update = { status: data.status }
    menuItemTable.updateMany(query, update, { "new": true }, callback);
}

//get MenuItems async
let getMenuItemsAsync = function (query,cb) {
    menuItemTable.find(query,cb);
}

//get MenuItems by id
let getMenuItemsById = (id, callback) => {
    menuItemTable.findById(id, callback);
}
//insert many
let insertManyAsync = async function (data) {
    return await menuItemTable.insertMany(data);
 }

//remove MenuItems
let removeMenuItems = (id, callback) => {
    let query = { _id: id };
    menuItemTable.remove(query, callback);
}

let getMenuItemsWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    menuItemTable.aggregate([{ $match: obj },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}
let findByIdAsync = async (id) => {
    return menuItemTable.findById(id);
}
let AddRefToMenuItemParent = (data) => {
    var query = { _id: data.parent };
    var ref = data.ref;
    menuItemTable.findOneAndUpdate(query, {
        $addToSet: {
            child: ref
        }
    }, { new: true }, function (err, data) {
        if (err) {
            console.log(err);
        } else {
            console.log("saa", data);
        }
    });
}

//aggregate Menu Item
let aggregateResult = async (query) => {
    return await menuItemTable.aggregate(query)

}
let getMenuItems = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    menuItemTable.aggregate([
        { $match: obj },
        { $lookup: { from: 'menuitems', localField: 'child', foreignField: '_id', as: 'child' } },
        { $sort: { [sortByField]: parseInt(sortOrder) } }, { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
    ], callback);
}
let removeRefToMenuItemByParent = (data) => {
    var query = { parent: data.parent };
    var ref = data.ref;
    menuItemTable.findOneAndUpdate(query, {
        $pull: {
            child: ref
        }
    }, { new: true }, function (err, data) {
        if (err) {
            console.log(err);
        }
    });
}

module.exports = {
    addMenuItems,
    updateMenuItems,
    updateStatusByIds,
    getMenuItemsAsync,
    getMenuItemsById,
    removeMenuItems,
    getMenuItemsWithFilter,
    findByIdAsync,
    updateOneAsync,
    AddRefToMenuItemParent,
    aggregateResult,
    getMenuItems,
    removeRefToMenuItemByParent,
    insertManyAsync

}