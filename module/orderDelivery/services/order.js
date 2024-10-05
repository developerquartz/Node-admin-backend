const storeType = require('../../../models/storeTypeTable')
const User = require('../../../models/userTable')
const terminologyTable = require('../../../models/terminologyTable')
const orderTable = require('../../../models/ordersTable')

let getStoreTypeByIdAsync = async (storeTypeId) => {
    return await storeType.getStoreTypeByIdAsync(storeTypeId);
}

let getUserByIdAsync = async (vendor) => {
    return await User.getUserByIdAsync(data.vendor);
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

let updateUserProfile = (data, cb) => {
    User.updateUserProfile(data, cb);
}

let addOrder = (data, callback) => {
    data.isScheduleProcess = false;
    data.isDriverAssign = false;
    data.isDriverArrivedAtPickup = false;
    data.isOrderMarkReady = false;
    data.date_modified_utc = new Date();
    orderTable.create(data, callback);
}

module.exports = {
    getStoreTypeByIdAsync,
    getUserByIdAsync,
    getTerminologyData,
    addOrder,
    updateUserProfile
}