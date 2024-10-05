const MenuTable = require('../model/menuTable')

//add Menu
let addMenu = function (data, callback) {
    data.date_created_utc = new Date();
    MenuTable.create(data, callback);
}

//insert many
let insertManyAsync = async function (data) {
   return await MenuTable.insertMany(data);
}
//update Menu
let updateMenu = function (data, callback) {
    var query = { _id: data._id };
    MenuTable.findOneAndUpdate(query, data, { upsert: true, new: true }, callback);
}

let updateStatusByIds = (data, update, callback) => {
    let query = { _id: { $in: data._id } }
    MenuTable.updateMany(query, update, { "new": true }, callback);
}

//get Menus async
let getMenuAsync = function (query,callback) {
    return MenuTable.find(query).populate({path:'items',match:{status:"active"},options: { sort: { sortOrder: 1 }},populate:{path:'child',match:{status:"active"},options: { sort: { sortOrder: 1 }}}}).exec(callback);
}


//get Menu by id
let getMenuById = (id, callback) => {
    MenuTable.findById(id).exec(callback);
}

//remove Menu
let removeMenu = (id, callback) => {
    let query = { _id: id };
    MenuTable.remove(query, callback);
}

let getMenuWithFilter = function (obj, sortByField, sortOrder, paged, pageSize, callback) {
    MenuTable.aggregate([{ $match: obj },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}

//aggregate Menu
let aggregateResult = async (query) => {
    return await MenuTable.aggregate(query)

}

//update Menu
let updateOneAsync = async function (query, update) {
    return await MenuTable.findOneAndUpdate(query, update, { new: true });
 }

 let findByIdAsync = async (id) => {
    return MenuTable.findById(id);
}

module.exports = {
    getMenuWithFilter,
    addMenu,
    insertManyAsync,
    updateMenu,
    updateStatusByIds,
    getMenuAsync,
    getMenuById,
    removeMenu,
    aggregateResult,
    updateOneAsync,
    findByIdAsync
}