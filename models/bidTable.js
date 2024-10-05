const mongoose = require('mongoose');

let bidSchema = mongoose.Schema({
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    status: { type: String, enum: ["accept", "pending", "reject"], default: "pending" },
    amount: { type: Number },
    ETA: { type: Number },
    EDA: { type: Number },
    pricePerUnitDistance: { type: Number },
    pricePerUnitTime: { type: Number },
    basePrice: { type: Number },
    date_created: { type: String },
    time_created: { type: String },
    date_created_utc: { type: Date },
    date_created_local: { type: Date },
},
    {
        versionKey: false // You should be aware of the outcome after set to false
    });

const bidTable = module.exports = mongoose.model('bid', bidSchema);

module.exports.bidCreate = (data, callback) => {
    // bidTable.create(data, callback);
    bidTable.findOneAndUpdate({ driver: data.driver, order: data.order }, data, { new: true, upsert: true })
        .populate({
            path: 'driver',
            select: 'name  profileImage vehicle userLocation avgRating reviewCount',
            populate: [
                {
                    path: 'profileImage',
                    select: 'link'
                },
                {
                    path: "vehicle",
                    populate: {
                        path: "vehicleType",
                        select: "image",
                        populate: {
                            path: 'image',
                            select: 'link'
                        }
                    }
                }
            ],
        }).exec(callback);
}
module.exports.updateStatus = (data, callback) => {
    let query = { _id: data.id };
    return bidTable.findOneAndUpdate(query, data, { new: true }).populate("order").exec(callback);
}
module.exports.getbid = (_id, callback) => {
    let query = { _id: _id, status: "pending" };
    return bidTable.findOne(query).populate("driver order").exec(callback);
}
module.exports.getBidDetails = (query, callback) => {
    return bidTable.find(query, callback).lean();
}
module.exports.getOrderDetails = (driver, callback) => {
    let query = {
        status: "pending",
        driver: driver
    }
    return bidTable.aggregate([
        { $match: query },
        {
            $lookup:
            {
                from: "orders",
                let: { orderId: "$order" },
                pipeline: [
                    {
                        $match:
                        {
                            $expr:
                            {
                                $and:
                                    [
                                        { $eq: ["$_id", "$$orderId"] },
                                        { $in: ["$nearByTempDrivers", [driver]] },
                                        { $in: ["$orderStatus", ['pending', 'confirmed']] },
                                        { $eq: ["$isDriverAssign", false] },

                                    ]
                            }
                        }
                    },
                    { $project: { bidAmount: 1, bidDetails: 1, scheduledType: 1, scheduledDate: 1, scheduledTime: 1, pickUp: 1, dropOff: 1, billingDetails: 1, customOrderId: 1, orderInstructions: 1, line_items: 1, orderStatus: 1, orderTotal: 1, user: 1, vendor: 1, storeType: 1, journeyType: 1, date_created_utc: 1, date_created: 1, time_created: 1 } },
                    {
                        $lookup:
                        {
                            from: "bids",
                            let: { bidId: "$bidDetails" },
                            pipeline: [
                                {
                                    "$match": {
                                        "$expr":
                                        {
                                            $and:
                                                [
                                                    { $in: ["$_id", "$$bidId"] },
                                                    { $eq: ["$status", "pending"] },
                                                    // ("$$bidId" ?
                                                    //     { $in: ["$_id", "$$bidId"] }
                                                    //     : []),

                                                ]
                                        }
                                    }
                                },
                            ],
                            as: "bidDetails"
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "user",
                        }
                    },
                    {
                        $lookup: {
                            from: "storeTypes",
                            localField: "storeType",
                            foreignField: "_id",
                            as: "storeType",
                        }
                    },
                ],
                as: "orderDetails"
            }
        },
        {
            $unwind: "$orderDetails"
        },
        {
            $replaceRoot: {
                newRoot: "$orderDetails"
            }
        },
    ], callback);

}