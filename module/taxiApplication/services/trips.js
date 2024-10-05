const storeType = require('../../../models/storeTypeTable');
const vehicleTypes = require('../../delivery/models/vehicelTypesTable');
const terminologyTable = require('../../../models/terminologyTable');
const Order = require('../../../models/ordersTable');
const User = require('../../../models/userTable');

let getStoreTypeByIdAsync = async (storeTypeId) => {
    return await storeType.getStoreTypeByIdAsync(storeTypeId)
}

let getVehicleById = async (vehicleType) => {
    return await vehicleTypes.getVehicleById(vehicleType)
}

let getTerminologyData = async (data) => {

    let body = '';

    const logData = await terminologyTable.findOne({
        lang: data.lang, store: data.storeId, type: data.type
    }, { values: { $elemMatch: { constant: data.constant } } })

    if (logData != null && logData.values && logData.values.length > 0) {
        body = logData.values[0].value;
    } else {
        body = __(data.constant);
    }

    if (data.name) {
        body = body.replace('{name}', data.name);
    }

    return body;
}

let addOrder = async (data, cb) => {
    Order.addOrder(data, cb)
}

let userAggregate = async (data, cb) => {
    User.aggregate(data, cb)
}

let getActiveVehicleTypes = async (data, cb) => {
    vehicleTypes.getActiveVehicleTypes(data, cb)
}

let updateOrderStatus = async (data, cb) => {
    Order.updateOrderVendor(data, cb)
}

let updateTripOrder = async (condition, data) => {
    return await Order.updateTripOrder(condition, data)
}
let updateTripOrders = async (condition, data) => {
    return await Order.updateTripOrders(condition, data)
}
let getOrderByIdAsync = async (id) => {
    return await Order.getOrderByIdAsync(id)
}

let updateUser = async (condition, update, cb) => {
    User.findByIdAndUpdate(condition, update, { new: true }, cb)
}

let updateUserByCondition = (condition, update, cb) => {
    User.findOneAndUpdate(condition, update, { new: true }, cb)
}

let getUserDetail = async (id) => {
    return await User.findById(id)
}
let getUserPreferredDriverDetail = async (id) => {
    return await User.findOne({ _id: id, preferredDriver: { $exists: true, $not: { $size: 0 } } }, 'preferredDriver').populate(
        [
            {
                path: "preferredDriver.driver",
                match: { "status": "approved", "role": "DRIVER" },
                select: 'name vehicle onlineStatus role profileImage',
                populate: {
                    path: "vehicle profileImage"
                },
            },
            {
                path: "preferredDriver.storeType",
                match: { "status": "active" },
                select: 'storeType'
            }
        ]
    )

}

module.exports = {
    getStoreTypeByIdAsync,
    getVehicleById,
    getTerminologyData,
    addOrder,
    userAggregate,
    getActiveVehicleTypes,
    updateOrderStatus,
    getOrderByIdAsync,
    updateUser,
    getUserDetail,
    getUserPreferredDriverDetail,
    updateTripOrder,
    updateTripOrders,
    updateUserByCondition
}