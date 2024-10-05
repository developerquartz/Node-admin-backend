const dispute = require('../model/dispute');
const ObjectId = require('objectid');

let addDispute = (data, callback) => {
    //dispute.create(data, callback);
    var query = { orderId: ObjectId(data.orderId) };
    dispute.findOneAndUpdate(query, data, { upsert: true, new: true })
        .populate('attachment', "link _id")
        .exec(callback);
}

let addDisputeReplay = (data, callback) => {
    var query = { _id: data.disputeId };
    var reply = data.reply;
    dispute.findOneAndUpdate(query, {
        $addToSet: {
            reply: reply
        }
    }, { upsert: true, new: true }, callback)
}
let getPastDispute = (obj, sortByField, sortOrder, paged, pageSize, callback) => {
    //dispute.getDisputeWithFilter(obj, sortByField, sortOrder, paged, pageSize,callback);
    dispute.aggregate([{ $match: obj },
    { $lookup: { from: 'storetypes', localField: 'storeType', foreignField: '_id', as: 'storeTypeDetails' } },
    { $unwind: { path: "$storeTypeDetails", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'orders', localField: 'orderId', foreignField: '_id', as: 'orderDetails' } },
    { $unwind: { path: "$orderDetails" } },
    { $sort: { [sortByField]: parseInt(sortOrder) } },
    { $project: { _id: 1, store: 1, storeType: 1, user: 1, orderId: 1, disputeWith: 1, status: 1, reason: 1, description: 1, reply: 1, date_created: 1, time_created: 1, date_created_utc: 1, date_modified_utc: 1, storeTypeDetails: { storeType: 1 }, orderDetails: { customOrderId: 1 } } },
    { $skip: (paged - 1) * pageSize },
    { $limit: parseInt(pageSize) },
    ], callback);
}
let countdata = async (obj) => {
    let count = []
    count = await dispute.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
    return count
}
let getDisputeById = async (id, callback) => {
    dispute.findById(id)
        .populate({ path: 'storeType', select: "storeType" })
        .populate({ path: 'orderId', select: "customOrderId" })
        .populate({ path: 'user', select: "name email countryCode mobileNumber" })
        .populate('attachment', "link _id")
        .sort({ "reply.date_created_utc": 1 })
        .exec(callback);
}
let addDisputeReply = async (data, callback) => {
    var query = { _id: data._id };
    if (data.replyId) {
        query['reply._id'] = ObjectId(data.replyId)
    }
    dispute.findOneAndUpdate(query, data, { new: true })
        .populate({ path: 'reply.user', select: 'profileImage -_id', populate: { path: "profileImage", select: "link -_id" } })
        .exec(callback);
}
let updateDisputeById = async (data, callback) => {
    var query = { _id: data._id };
    dispute.findOneAndUpdate(query, data, { new: true }, callback)
}
let removedispute = (id, callback) => {
    var query = { _id: id }
    dispute.remove(query, callback)
}
module.exports = {
    addDisputeReplay,
    addDispute,
    getPastDispute,
    countdata,
    getDisputeById,
    updateDisputeById,
    addDisputeReply,
    removedispute
}