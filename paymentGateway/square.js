// var SquareConnect = require('square');
const { Client, Environment, ApiError } = require('square')
var client = "";

async function initilise(data) {
    if(data.paymentMode == "sandbox")
    client = new Client({
        environment: Environment.Sandbox,
        accessToken: data.secretKey || "EAAAEPIWjXJg4XAWxM_mh8vLU6vyZN-nHqWWekNDZ5w31O4SfeEKWPu4pnkTdJMy",
    })
    else
    client = new Client({
        environment: Environment.Production,
        accessToken: data.secretKey,
    })

}

async function createCustomer(data, callback) {
    await initilise(data)
    const customerApi = client.customersApi;
    const requestBody = {
        emailAddress: data.email
    };

    try {
        const response = await customerApi.createCustomer(requestBody);
        response.result = JSON.parse(JSON.stringify(response.result, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value // return everything else unchanged
        ));
        callback({ status: true, response: response.result.customer });

    } catch (error) {

        let errorResult = null;
        if (error instanceof ApiError) {
            errorResult = error.errors;
        } else {
            errorResult = error;
        }
        callback({ status: false, response: errorResult });
    }

}
async function createCustomerCard(data, callback) {
    try {
        await initilise(data)
        var apiInstance = client.cardsApi;

        var cardData = {
            idempotencyKey: new Date().getTime().toString(),// unique key
            sourceId: data.card_nonce, //'cnon:card-nonce-ok', card nonce id
            card: {
                cardholderName: data.name,
                customerId: data.squareCustomerId // square customer id 
            }
        }

        const response = await apiInstance.createCard(cardData);
        console.log("response.result :", response.result);
        response.result = JSON.parse(JSON.stringify(response.result, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value // return everything else unchanged
        ));
        callback({ status: true, response: response.result.card });


    } catch (error) {
        let errorResult = null;
        if (error instanceof ApiError) {
            errorResult = error.errors;
        } else {
            errorResult = error;
        }
        callback({ status: false, response: errorResult });
    }
}
async function chargeCustomer(data, callback) {
    try {
        await initilise(data)

        var chargeData = {
            "amountMoney": {
                "amount": data.cost,
                "currency": data.currency
            },
            "sourceId": data.token, //"ccof:customer-card-id-ok",
            "idempotencyKey": new Date().getTime().toString(),
            "customerId": data.squareCustomerId
        }

        var apiInstance = client.paymentsApi
        const response = await apiInstance.createPayment(chargeData);
        response.result = JSON.parse(JSON.stringify(response.result, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value // return everything else unchanged
        ));
        callback({ status: true, response: response.result.payment });
    } catch (error) {
        let errorResult = null;
        if (error instanceof ApiError) {
            errorResult = error.errors;
        } else {
            errorResult = error;
        }

        callback({ status: false, response: errorResult });
    }
}
async function disableCustomerCard(data, callback) {

    try {
        await initilise(data)

        var apiInstance = client.cardsApi

        var cardId = data.cardId; // String | The ID of the card on file to delete.
        const response = await apiInstance.disableCard(cardId);
        response.result = JSON.parse(JSON.stringify(response.result, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value // return everything else unchanged
        ));
        
        callback({ status: true, response: response.result.card });


    } catch (error) {
        let errorResult = null;
        if (error instanceof ApiError) {
            errorResult = error.errors;
        } else {
            errorResult = error;
        }

        callback({ status: false, response: errorResult });
    }

}
async function refundAmount(data, callback) {
    try {

        await initilise(data)

        var body = {
            idempotencyKey: new Date().getTime().toString(),
            amountMoney: {
                amount: data.cost,
                currency: data.currency
            },
            paymentId: data.paymentId,
            reason: 'Refund'
        }
        const apiInstance = client.refundsApi;
        const response = await apiInstance.refundPayment(body);
        response.result = JSON.parse(JSON.stringify(response.result, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value // return everything else unchanged
    ));
    
        callback({ status: true, response: response.result.refund });
    } catch (error) {
        let errorResult = null;
        if (error instanceof ApiError) {
            errorResult = error.errors;
        } else {
            errorResult = error;
        }

        callback({ status: false, response: errorResult });
    }



}

module.exports = { createCustomer, createCustomerCard, chargeCustomer, disableCustomerCard, refundAmount }