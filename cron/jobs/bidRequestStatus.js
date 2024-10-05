const axios = require('axios');
const Order = require('../../models/ordersTable');
const User = require('../../models/userTable');
const ObjectId = require('objectid');
const Bid = require("../../models/bidTable");
const socketHelper = require('../../helper/socketHelper');

module.exports = (agenda) => {
    agenda.define('bid request status', { priority: 'high', concurrency: 10 }, async function (job, done) {
        done();
        let data = job.attrs.data;
        console.log("cron data bidRequest", data);
        try {
            let update = { status: "rejected" };
            let query = { _id: data.bidId, status: "pending" }
            Bid.findOneAndUpdate(query, update, { new: true }).populate("order").exec(async (err, resdata) => {
                if (err) {
                    console.log("socket bidRequest Error:", err)
                }
                //console.log("resssssss", resdata)
                if (resdata) {
                    await Order.updateOne({ _id: resdata.order._id }, { $pull: { nearByTempDrivers: resdata.driver } });
                    socketHelper.singleSocket(resdata.user, "Customer", { orderId: resdata.order._id, type: "bidRequestRejected" });
                    socketHelper.nearByDriverSocket(resdata.order.nearByTempDrivers, { type: "bidRequestRejected", orderId: resdata.order._id });
                }



            })
        } catch (error) {
            console.log("cron error", error);
        }
    });
};