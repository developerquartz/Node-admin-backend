const Report = require('../models/reportTable');
const ObjectId = require('objectid');

let addRequestReport = async (user) => {
    let getRequest = await getTodayReport(user);
    let obj = {};
    obj.request = getRequest.request + 1;
    obj.date_modified_utc = new Date();

    if (getRequest._id) {
        return await Report.findOneAndUpdate({ _id: getRequest._id }, obj);
    } else {
        obj.user = user;
        obj.accepted = 0;
        obj.rejected = 0;
        obj.completed = 0;
        obj.date_created_utc = new Date();
        return await Report.create(obj);
    }
}

let addAcceptedReport = async (user) => {
    let getRequest = await getTodayReport(user);
    let obj = {};
    obj.accepted = getRequest.accepted + 1;
    obj.date_modified_utc = new Date();

    return await Report.findOneAndUpdate({ _id: getRequest._id }, obj);
}

let addRejectedReport = async (user) => {
    let getRequest = await getTodayReport(user);
    let obj = {};
    obj.rejected = getRequest.rejected + 1;
    obj.date_modified_utc = new Date();

    return await Report.findOneAndUpdate({ _id: getRequest._id }, obj);
}

let addCompletedReport = async (user) => {
    let getRequest = await getTodayReport(user);
    let obj = {};
    obj.completed = getRequest.completed + 1;
    obj.date_modified_utc = new Date();

    return await Report.findOneAndUpdate({ _id: getRequest._id }, obj);
}

let getTodayReport = async (user) => {
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    let getReport = await Report.find({ user: ObjectId(user), date_created_utc: { $gte: new Date(currentDate) } });
    let request = {};
    if (getReport.length > 0) {
        request = getReport[0];
    } else {
        request.request = 0;
        request.accepted = 0;
        request.rejected = 0;
        request.completed = 0;
    }

    return request;
}

module.exports = {
    addRequestReport,
    addAcceptedReport,
    addRejectedReport,
    addCompletedReport
}