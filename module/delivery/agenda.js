const Agenda = require('agenda');
const axios = require('axios');
const Order = require('../../models/ordersTable');
const ObjectId = require('objectid');

//****Database connection mongodb using mongoose */
const mongoConnectionString = env.mongoAtlasUri;
var agenda = new Agenda({ db: { address: mongoConnectionString, collection: 'agendaJobs', mongo: { useCreateIndex: true, useFindAndModify: false, useNewUrlParser: true, useUnifiedTopology: true } } });

// agenda.define('check order status driver', { priority: 'high', concurrency: 10 }, async function (job, done) {
//     done();
//     let data = job.attrs.data;
//     console.log("cron data driver", data);
//     try {
//         if (data.orderId) {
//             const getOrder = await Order.findById(data.orderId, 'orderStatus isDriverAssign store');
//             console.log("cron getOrder", getOrder);

//             if (getOrder != null) {

//                 if (getOrder.orderStatus === 'confirmed' && !getOrder.isDriverAssign) {

//                     const updateOrder = await Order.findOneAndUpdate({ _id: ObjectId(data.orderId) }, { orderStatus: "cancelled" });

//                     let socketUrl = env.socketUrlApi + '/request/driver/cancelled';
//                     let title = 'Order Cancelled';
//                     let body = await helper.getTerminologyData({ lang: "en", storeId: getOrder.store, constant: "ORDER_REFUND_CUSTOMER", type: "order" });

//                     // Send a POST request
//                     let request = await axios({
//                         method: 'post',
//                         url: socketUrl,
//                         data: {
//                             title: title,
//                             body: body,
//                             orderId: updateOrder._id
//                         }
//                     });
//                 }
//             }
//         }
//     } catch (error) {
//         console.log("cron error", error);
//     }
// });

module.exports = agenda