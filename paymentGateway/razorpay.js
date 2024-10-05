const nanoid = require('nanoid')
var instance = "";

async function initializeRazorPay(data) {

    const Razorpay = require('razorpay')

    instance = new Razorpay({
        key_id: data.KEY_ID,
        key_secret: data.KEY_SECRET,
      });
}

async function createOrder(data, callback) {
   await  initializeRazorPay(data);

    var options = {
        amount: data.amount,  // amount in the smallest currency unit
        currency: data.currency,
        receipt: data.orderId
      };
      instance.orders.create(options,callback);
}

async function capturePayment(data, callback) {
    await  initializeRazorPay(data);
    instance.payments.capture(data.payment_id,data.amount,data.currency,callback) //The amount to be capture (in paise)

}
async function fetchPayment(data, callback) {
    await  initializeRazorPay(data);
    instance.payments.fetch(data.payment_id,callback)
}
async function refundPayment(data, callback) { 
    await  initializeRazorPay(data);
    instance.payments.refund(data.payment_id, {amount:data.amount},callback) //The amount to be refunded (in paise)


}

module.exports = {
    createOrder,
    capturePayment,
    fetchPayment,
    refundPayment
}
