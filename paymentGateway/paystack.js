const PayStack = require('paystack-node')

function paymenthandlerCharge(data, callback) {
    const paystack = new PayStack(data.secretKey);

    paystack.chargeAuthorization({ email: data.email, amount: data.amount, authorization_code: data.authorization_code, currency: data.currency }).then((res) => {
        callback(true, res)
    }).catch((error) => {
        callback(false, error)
    });

}

function deleteCustomerCard(data, callback) {

    const paystack = new PayStack(data.secretKey);

    paystack.deactivateAuthOnCustomer({ authorization_code: data.authorization_code }).then((res) => {
        callback(true, res)
    }).catch((error) => {
        callback(false, error)
    });

}

function refundAmount(data, callback) {
    const paystack = new PayStack(data.secretKey);
    console.log("data.to.refund---check paystack")
    console.log(data)
    paystack.createRefund({ transaction: data.transaction.toString(), amount: data.cost, currency: data.currency }).then((res) => {
        callback(true, res)
    }).catch((error) => {
        callback(false, error)
    });

}

async function paystackRetrievePayment(data, callback) {

    const paystack = new PayStack(data.secretKey);

    paystack.getTransaction({ id: data.id.toString() }).then((res) => {
        callback(true, res)
    }).catch((error) => {
        callback(false, error)
    });

}

async function paystackValidatePayemnt(data, callback) {
    const paystack = new PayStack(data.secretKey)
    paystack.verifyTransaction({
        reference: data.reference
    }).then((res) => {
        callback(true, res)
    }).catch((error) => {
        callback(false, error)
    })
}

module.exports = {
    paymenthandlerCharge,
    refundAmount,
    paystackRetrievePayment,
    deleteCustomerCard,
    paystackValidatePayemnt
}
