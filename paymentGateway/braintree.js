const braintree = require('braintree');

module.exports.braintreeCreateCustomer = (data, callback) => {

    let environment = braintree.Environment.Production;

    if (data.paymentMode === 'sandbox') {
        environment = braintree.Environment.Sandbox;
    }

    const gateway = new braintree.BraintreeGateway({
        environment: environment,
        merchantId: data.merchantId,
        publicKey: data.publicKey,
        privateKey: data.privateKey
    });

    gateway.customer.create({
        firstName: data.name,
        email: data.email,
        paymentMethodNonce: data.token
    }, callback);
}

module.exports.braintreeCreateTransactionByCustomerId = (data, callback) => {

    let environment = braintree.Environment.Production;

    if (data.paymentMode === 'sandbox') {
        environment = braintree.Environment.Sandbox;
    }

    const gateway = new braintree.BraintreeGateway({
        environment: environment,
        merchantId: data.merchantId,
        publicKey: data.publicKey,
        privateKey: data.privateKey
    });

    gateway.transaction.sale({
        customerId: data.customerId, //theCustomerId
        amount: data.cost.toString(),
        options: {
            submitForSettlement: true
        }
    }, callback);
}

module.exports.braintreeCreateTransactionByToken = (data, callback) => {

    let environment = braintree.Environment.Production;

    if (data.paymentMode === 'sandbox') {
        environment = braintree.Environment.Sandbox;
    }

    const gateway = new braintree.BraintreeGateway({
        environment: environment,
        merchantId: data.merchantId,
        publicKey: data.publicKey,
        privateKey: data.privateKey
    });

    gateway.transaction.sale({
        amount: data.cost.toString(),
        paymentMethodNonce: data.paymentMethodNonce,
        options: {
            submitForSettlement: true
        }
    }, callback);
}

module.exports.sendClientTokenToClient = (data, callback) => {

    let environment = braintree.Environment.Production;

    if (data.paymentMode === 'sandbox') {
        environment = braintree.Environment.Sandbox;
    }

    const gateway = new braintree.BraintreeGateway({
        environment: environment,
        merchantId: data.merchantId,
        publicKey: data.publicKey,
        privateKey: data.privateKey
    });

    gateway.clientToken.generate({}, callback);
}

module.exports.findCustomerById = (data, callback) => {

    let environment = braintree.Environment.Production;

    if (data.paymentMode === 'sandbox') {
        environment = braintree.Environment.Sandbox;
    }

    const gateway = new braintree.BraintreeGateway({
        environment: environment,
        merchantId: data.merchantId,
        publicKey: data.publicKey,
        privateKey: data.privateKey
    });

    return gateway.customer.find(data.user.toString(), callback);
}

module.exports.updateCustomer = (data, callback) => {

    let environment = braintree.Environment.Production;

    if (data.paymentMode === 'sandbox') {
        environment = braintree.Environment.Sandbox;
    }

    const gateway = new braintree.BraintreeGateway({
        environment: environment,
        merchantId: data.merchantId,
        publicKey: data.publicKey,
        privateKey: data.privateKey
    });

    gateway.customer.update(data.customerId, {
        firstName: data.name,
        email: data.email,
        paymentMethodNonce: data.token
    }, callback);
}

module.exports.refundTransaction = (data, callback) => {

    let environment = braintree.Environment.Production;

    if (data.paymentMode === 'sandbox') {
        environment = braintree.Environment.Sandbox;
    }

    const gateway = new braintree.BraintreeGateway({
        environment: environment,
        merchantId: data.merchantId,
        publicKey: data.publicKey,
        privateKey: data.privateKey
    });

    gateway.transaction.refund(data.transactionId, callback);
}