const axios = require('axios');
const Order = require('../../models/ordersTable');

module.exports = (agenda) => {
    agenda.define('order not accepted by driver', { priority: 'high', concurrency: 10 }, async function (job, done) {
        done();
        let data = job.attrs.data;
        console.log("Order not accepted------", data);
        try {
            if (data.orderId) {
                const getOrder = await Order.findById(data.orderId, 'orderStatus isDriverAssign store')
                    .populate({ path: "store", select: "api_key" })
                    .exec();

                if (getOrder != null) {

                    if (getOrder.orderStatus === 'pending' && !getOrder.isDriverAssign) {

                        let apiUrl = env.apiUrl + 'user/cancelorder';

                        // Send a POST request
                        let request = await axios({
                            method: 'post',
                            url: apiUrl,
                            headers: {
                                'cache-control': 'no-cache',
                                "Content-Type": "application/json",
                                "apikey": getOrder.store.api_key
                            },
                            data: {
                                _id: getOrder._id,
                                isAutoCancel: true
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.log("cron error", error);
        }
    });
};