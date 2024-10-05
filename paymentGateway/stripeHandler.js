const request = require('request');

function paymenthandler(data, callback) {

    let currency = data.currency;

    const stripe = require("stripe")(data.secretKey);
    console.log("data------", data)
    stripe.charges.create({
        amount: data.cost,
        currency: currency,
        customer: data.stripeCustomerId
    }, callback);
}

function paymenthandlerCharge(data, callback) {

    const stripe = require("stripe")(data.secretKey);

    stripe.charges.create({
        amount: data.cost,
        currency: data.currency,
        source: data.stripeToken,
    }, callback);
}


function createStripeCustomer(data, callback) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);

    stripe.customers.create({
        source: data.token,
        email: data.email
    }, callback);
}

function createStripeAccount(data, callback) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);
    console.log("createStripeAccount:===>")
    stripe.accounts.create({
        type: data.type,
        "capabilities": {
            "card_payments": {
                "requested": true
            },
            "transfers": {
                "requested": true
            }
        }
    }, callback);
}

function deleteStripeAccount(data, callback) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);

    stripe.accounts.del(data.accountId, callback);
}

async function createLoginLinkStripeAccount(data, callback) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);

    return await stripe.accounts.createLoginLink(data.accountId, [], callback);
}

function createStripeAccountLink(data, callback) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);
    console.log("createStripeAccountLink:====>", { account: data.accountId });
    stripe.accountLinks.create({
        type: "account_onboarding",
        account: data.accountId,
        refresh_url: data.refresh_url,
        return_url: data.return_url,
    }, callback);
}

function createSubscription(data, callback) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);

    stripe.subscriptions.create({
        customer: data.stripeCustomerId,
        items: [
            {
                price: data.planId,
            },
        ],
        metadata: {
            customerName: data.customerName,
            email: data.email
        }
    }, callback);

}

function cancelSubscription(data) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);

    stripe.subscriptions.del(data, callback);
}

function refundAmount(data, callback) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);

    let obj = {};

    obj.charge = data.chargeId;

    if (data.amount) {
        obj.amount = data.amount;
    }

    stripe.refunds.create(obj, callback);
}

function paymentIntent(data, callback) {
    const stripe = require("stripe")(data.secretKey);
    stripe.paymentIntents.create({
        payment_method_types: ['card'],
        amount: data.cost,
        currency: data.currency,
        customer: data.stripeCustomerId
    }, callback)
}
function confirmPaymentIntent(data, callback) {

    let keySecret = data.secretKey;
    const stripe = require("stripe")(keySecret);
    stripe.paymentIntents.confirm(data.paymentIntentId, callback);
}
function cancelPaymentIntent(data, callback) {

    let keySecret = data.secretKey;
    const stripe = require("stripe")(keySecret);
    stripe.paymentIntents.cancel(data.paymentIntentId, callback);
}

function stripeAuth(data, callback) {

    let keySecret = data.secretKey;

    request.post({
        url: 'https://connect.stripe.com/oauth/token',
        formData: {
            client_secret: keySecret,
            code: data.code,
            grant_type: "authorization_code"
        },
        headers: { 'Authorization': 'Bearer ' + keySecret },
    }, callback);

}

function paymentTransfer(data, callback) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);
    stripe.transfers.create({
        amount: data.amount,
        currency: data.currency,
        destination: data.destination,
        source_transaction: data.source_transaction
    }, callback);

}

async function stripeRetrievePayment(data) {

    let keySecret = data.secretKey;

    const stripe = require("stripe")(keySecret);

    paymentIntent = await stripe.paymentIntents.retrieve(
        intent_id
    );

    return paymentIntent;
}

module.exports = {
    paymenthandler,
    createStripeCustomer,
    paymenthandlerCharge,
    createSubscription,
    cancelSubscription,
    refundAmount,
    stripeAuth,
    paymentIntent,
    confirmPaymentIntent,
    cancelPaymentIntent,
    paymentTransfer,
    stripeRetrievePayment,
    createStripeAccount,
    createStripeAccountLink,
    deleteStripeAccount,
    createLoginLinkStripeAccount
}
