const stripeHandler = require('../paymentGateway/stripeHandler');
const Braintree = require('../paymentGateway/braintree');
const Card = require('../models/cardTable');
const orangeMoney = require("../paymentGateway/orangeMoney");
const razorpay = require('../paymentGateway/razorpay');
const Square = require('../paymentGateway/square');
const Paystack = require('../paymentGateway/paystack')
const PaystckWebView = require("../paymentGateway/paystackwebview")
const Pay360 = require('../paymentGateway/pay360')
const moncash = require("../paymentGateway/moncash");
const Dpo = require("../paymentGateway/dpo");
const flutterwave = require("../paymentGateway/flutterwave");
//============================== razoePay middleware start =======================================
module.exports.razorPayCreateOrder = async (data, responseCallback) => {
    data.amount = parseInt(data.amount * 100)
    razorpay.createOrder(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: err.error.description, code: err.statusCode });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}

module.exports.razorPayCapture = async (data, responseCallback) => {
    data.amount = parseInt(data.amount * 100)
    razorpay.capturePayment(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: err.error.description, code: err.statusCode });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}

module.exports.razorPayFetchPayment = async (data, responseCallback) => {

    razorpay.fetchPayment(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: err.error.description, code: err.statusCode });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}

module.exports.razorPayrefundPayment = async (data, responseCallback) => {
    data.amount = parseInt(data.amount * 100)

    razorpay.refundPayment(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: err.error.description, code: err.statusCode });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}
//============================== razoePay middleware end =======================================

//============================== stripe middleware start =======================================
module.exports.stripeCreateCustomer = async (data, responseCallback) => {

    stripeHandler.createStripeCustomer(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}

module.exports.stripeCreateAccount = async (data, responseCallback) => {

    stripeHandler.createStripeAccount(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, response: response });
        }
    });
}

module.exports.createLoginLinkStripeExpress = (data) => {
    return stripeHandler.createLoginLinkStripeAccount(data);
}

module.exports.stripeDeleteAccount = async (data, responseCallback) => {

    stripeHandler.deleteStripeAccount(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, response: response });
        }
    });
}

module.exports.stripeCreateAccountLink = async (data, responseCallback) => {

    stripeHandler.createStripeAccountLink(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, response: response });
        }
    });
}

module.exports.paymentByStripe = async (data, responseCallback) => {
    let stripeCost = data.cost * 100;
    let finalcost = parseInt(stripeCost);
    const getCard = await Card.getCardByIdAsync(data.paymentSourceRef);
    let chargeData = {
        stripeCustomerId: getCard.token,
        cost: finalcost,
        secretKey: data.secretKey,
        currency: data.currency
    }
    stripeHandler.paymenthandler(chargeData, (err, presponse) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, response: presponse });
        }
    });
}

module.exports.paymentByDirectStripe = async (data, responseCallback) => {

    let stripeCost = data.cost * 100;
    let finalcost = parseInt(stripeCost);

    let chargeData = {
        stripeCustomerId: data.token,
        cost: finalcost,
        secretKey: data.secretKey,
        currency: data.currency
    }

    stripeHandler.paymenthandler(chargeData, (err, presponse) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, response: presponse });
        }
    });
}

module.exports.paymentByStripeSource = async (data, responseCallback) => {

    let stripeCost = data.cost * 100;
    let finalcost = parseInt(stripeCost);

    let chargeData = {
        stripeToken: data.token,
        cost: finalcost,
        currency: data.currency
    }

    //console.log("chargeData", chargeData);

    stripeHandler.paymenthandlerCharge(chargeData, (err, presponse) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, chargeId: presponse.id, transaction: presponse });
        }
    });
}

module.exports.subscribeStripePlan = async (data, responseCallback) => {

    stripeHandler.createSubscription(data, (err, presponse) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, data: presponse });
        }
    });
}

module.exports.processStripeRefund = (data, responseCallback) => {

    let stripeCost = data.amount * 100;
    let finalcost = parseInt(stripeCost);
    data.amount = finalcost;

    stripeHandler.refundAmount(data, (err, presponse) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, data: presponse });
        }
    });
}

module.exports.processStripeConnectAuth = (data, responseCallback) => {

    stripeHandler.stripeAuth(data, (err, presponse, body) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, body: body });
        }
    });
}

module.exports.createStripePaymentIntents = async (data, responseCallback) => {

    const getCard = await Card.getCardByIdAsync(data.paymentSourceRef);

    let stripeCost = data.cost * 100;
    let finalcost = parseInt(stripeCost);
    let chargeData = {
        stripeCustomerId: getCard.token,
        cost: finalcost,
        secretKey: data.secretKey,
        currency: data.currency
    }
    stripeHandler.paymentIntent(chargeData, (err, paymentIntent) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, paymentIntent: paymentIntent });
        }
    });
}
module.exports.confirmStripePaymentIntents = (data, responseCallback) => {
    stripeHandler.confirmPaymentIntent(data, (err, paymentIntent) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, paymentIntent: paymentIntent });
        }
    });
}
module.exports.cancelStripePaymentIntents = (data, responseCallback) => {
    stripeHandler.cancelPaymentIntent(data, (err, paymentIntent) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, paymentIntent: paymentIntent });
        }
    });
}

module.exports.transferStripeFund = (data, responseCallback) => {

    let stripeCost = data.amount * 100;
    data.amount = parseInt(stripeCost);

    stripeHandler.paymentTransfer(data, (err, presponse) => {
        if (err) {
            responseCallback({ status: false, message: err.message, code: err.code });
        } else {
            responseCallback({ status: true, response: presponse });
        }
    });
}

module.exports.getRetrieveStripePaymentIntent = (intent_id) => {
    return stripeHandler.stripeRetrievePayment(intent_id);
}
//============================== stripe middleware end =======================================

//============================== braintree middleware end =======================================
module.exports.generateClientTokenByBraintree = (data, responseCallback) => {
    try {
        Braintree.sendClientTokenToClient(data, (err, result) => {
            if (result.success) {
                responseCallback({ status: true, response: result });
            } else {
                let deepErrors = result.errors.deepErrors();
                let code = deepErrors[0].code;
                let message = deepErrors[0].message;
                responseCallback({ status: false, message: message, code: code });
            }
        });
    } catch (error) {
        console.log("paypal ct", error);
    }
}

module.exports.createCustomerByBraintree = async (data, responseCallback) => {

    Braintree.braintreeCreateCustomer(data, (err, result) => {
        if (result.success) {
            responseCallback({ status: true, response: result });
        } else {
            let deepErrors = result.errors.deepErrors();
            let code = deepErrors[0].code;
            let message = deepErrors[0].message;
            responseCallback({ status: false, message: message, code: code });
        }
    });
}

module.exports.updateCustomerByBraintree = async (data, responseCallback) => {

    Braintree.updateCustomer(data, (err, result) => {
        if (result.success) {
            responseCallback({ status: true, response: result });
        } else {
            let deepErrors = result.errors.deepErrors();
            let code = deepErrors[0].code;
            let message = deepErrors[0].message;
            responseCallback({ status: false, message: message, code: code });
        }
    });
}

module.exports.paymentByBraintreeByCustomer = async (data, responseCallback) => {

    const getCard = await Card.getCardByIdAsync(data.paymentSourceRef);
    data.customerId = getCard.token;

    Braintree.braintreeCreateTransactionByCustomerId(data, (err, result) => {
        if (result.success) {
            responseCallback({ status: true, response: result });
        } else {
            let deepErrors = result.errors.deepErrors();
            let code = deepErrors[0].code;
            let message = deepErrors[0].message;
            responseCallback({ status: false, message: message, code: code });
        }
    });
}

module.exports.processRefundByBraintree = async (data, responseCallback) => {

    Braintree.refundTransaction(data, (err, result) => {
        if (result.success) {
            responseCallback({ status: true, response: result });
        } else {
            let deepErrors = result.errors.deepErrors();
            let code = deepErrors[0].code;
            let message = deepErrors[0].message;
            responseCallback({ status: false, message: message, code: code });
        }
    });
}

module.exports.authByorangeMoney = async (data, responseCallback) => {

    orangeMoney.getAccessToken(data, (err, result) => {
        if (err) {
            responseCallback({ status: false, response: result });
        } else {
            responseCallback({ status: true, response: result });
        }
    });
}

module.exports.paymentByorangeMoney = async (data, responseCallback) => {

    // let stripeCost = data.orderTotal * 100;
    // let finalcost = parseInt(stripeCost);
    // data.orderTotal = finalcost;

    orangeMoney.paymentRequest(data, (err, result) => {
        if (err) {
            responseCallback({ status: false, response: result });
        } else {
            responseCallback({ status: true, response: result });
        }
    });
}
//============================== braintree middleware end =======================================

//============================== square middleware start ========================================

module.exports.createCustomerBySquare = async (data, responseCallback) => {
    console.log("data :", data);

    var sqaureData = {
        email: data.email,
        secretKey: data.secretKey
    }

    Square.createCustomer(sqaureData, (presponse) => {
        console.log("presponse :", presponse);

        if (presponse.status) {
            responseCallback({ status: true, response: presponse.response });
        } else {
            responseCallback({ status: false, message: presponse.response });
        }
    });
}
module.exports.createCustomerCardBySquare = async (data, responseCallback) => {
    console.log("data :", data);

    var sqaureData = {
        card_nonce: data.card_nonce,
        squareCustomerId: data.squareCustomerId,
        secretKey: data.secretKey
    }

    Square.createCustomerCard(sqaureData, (presponse) => {
        if (presponse.status) {
            responseCallback({ status: true, response: presponse.response });
        } else {
            responseCallback({ status: false, message: presponse.response });
        }
    });
}
module.exports.disableCustomerCardBySquare = async (data, responseCallback) => {
    // var getCard = await Card.getCardByIdAsync(data.paymentSourceRefNo);

    var sqaureData = {
        // cardId: getCard.detials.id,
        cardId: data.cardId,
        secretKey: data.secretKey

    }

    Square.disableCustomerCard(sqaureData, (presponse) => {
        if (presponse.status) {
            responseCallback({ status: true, response: presponse.response });
        } else {
            responseCallback({ status: false, message: presponse.response });
        }
    });
}
module.exports.paymentBySquare = async (data, responseCallback) => {

    var getCard = await Card.getCardByIdAsync(data.paymentSourceRef);
    let cost = data.cost * 100;
    let finalcost = parseInt(cost);
    var chargeData = {
        // customerId: getCard.details.customer_id,
        squareCustomerId: getCard.details.squareCustomerId,
        cost: finalcost,
        token: getCard.detials.id,
        // token: data.cardId,
        currency: data.currency,
        secretKey: data.secretKey

    }

    console.log("chargeData", chargeData);
    Square.chargeCustomer(chargeData, (presponse) => {
        console.log("presponse", presponse);

        if (presponse.status) {
            responseCallback({ status: true, response: presponse.response });
        } else {
            responseCallback({ status: false, message: presponse.response });
        }
    });
}
module.exports.refundAmountBySquare = async (data, responseCallback) => {

    let cost = data.cost * 100;
    let finalcost = parseInt(cost);

    var refundData = {
        paymentId: data.paymentId,
        cost: finalcost,
        currency: data.currency,
        secretKey: data.secretKey

    }

    Square.refundAmount(refundData, (presponse) => {
        if (presponse.status) {
            responseCallback({ status: true, response: presponse.response });
        } else {
            responseCallback({ status: false, message: presponse.response });
        }
    });
}

//============================== square middleware end ==========================================


//============================== paystack middleware start ======================================


module.exports.paymentChargebyPaystack = async (data, responseCallback) => {
    ;
    let cost = data.cost * 100;
    let finalcost = parseInt(cost);
    const getCard = await Card.getCardByIdAsync(data.paymentSourceRef);
    let chargeData = {
        email: getCard.details.email,
        amount: finalcost,
        currency: data.currency,
        authorization_code: getCard.token,
        secretKey: data.secretKey
    }
    Paystack.paymenthandlerCharge(chargeData, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, response: response_data.body.data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.CustomerCardRemove = async (data, responseCallback) => {
    let cardData = {
        authorization_code: data.cardId,
        secretKey: data.secretKey
    }
    Paystack.deleteCustomerCard(cardData, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, message: response_data.body.message });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.refundAmountByPaystack = async (data, responseCallback) => {
    let cost = data.cost;
    let finalcost = Number(cost);
    let refundData = {
        transaction: data.chargeId,
        secretKey: data.secretKey,
        cost: finalcost,
        currency: data.currency
    }
    Paystack.refundAmount(refundData, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, message: response_data.body.message });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    })
}

module.exports.RetrievePaymentbyPaystack = async (data, responseCallback) => {
    let obj = {
        secretKey: data.secretKey,
        id: data.transactionId
    }
    Paystack.paystackRetrievePayment(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data.body });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.verifyTransactionPaystack = async (data, responseCallback) => {
    let obj = {
        secretKey: data.secretKey,
        reference: data.token
    }
    Paystack.paystackValidatePayemnt(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data.body });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

//============================== paystack middleware end ======================================




//============================= paystackwebView middleware start =================================


module.exports.webviewTransactionPaystack = async (data, responseCallback) => {
    let cost = data.amount * 100;
    let obj = {
        "amount": cost,
        "email": data.email,
        "secretKey": data.secretKey,
        "callback_url": data.return_url
    }
    PaystckWebView.paystackTransaction(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

//============================ paystackwebView middleware end ================================


//============================= pay360 middleware start ========================================





module.exports.cardaddby360 = async (data, responseCallback) => {
    let obj = { userId: data.userId }
    Pay360.add360card(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.cardverifyby360 = async (data, responseCallback) => {
    let obj = {
        JWT: data.JWT,
        ISV_ID: data.ISV_ID,
        merchantId: data.merchantId,
        pay360BaseUrl: data.pay360BaseUrl,
        requestId: data.requestId
    }
    console.log("objjj", obj)
    Pay360.verifyCard(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.transaction360 = async (data, responseCallback) => {
    const getCard = await Card.getCardByIdAsync(data.paymentSourceRef);
    let obj = {
        return_url: data.return_url,
        cancel_url: data.cancel_url,
        currency: data.currency,
        amount: data.amount,
        JWT: data.JWT,
        ISV_ID: data.ISV_ID,
        merchantId: data.merchantId,
        last4digit: getCard.last4digit,
        token: getCard.token,
        pay360BaseUrl: data.pay360BaseUrl
    }
    Pay360.maketransaction360(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.addSupplier360 = async (data, responseCallback) => {
    let obj = {
        API_KEY: data.API_KEY,
        isvName: data.isvName,
        isvId: data.isvId,
        legalName: data.legalName,
        gatewayUrl: data.gatewayUrl,
        type: data.type,
        businessClassification: data.businessClassification
    }
    Pay360.suppliercreate(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}
module.exports.inavaite360 = async (data, responseCallback) => {
    let obj = {
        API_KEY: data.API_KEY,
        email: data.email,
        isvId: data.isvId,
        name: data.name,
        merchantId: data.merchantId,
        gatewayUrl: data.gatewayUrl
    }
    Pay360.invaiteuser(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}
module.exports.varify360 = async (data, responseCallback) => {
    let obj = {
        API_KEY: data.API_KEY,
        merchantId: data.merchantId,
        gatewayUrl: data.gatewayUrl
    }
    Pay360.verifymerchant(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}
module.exports.addbank360 = async (data, responseCallback) => {
    let obj = {
        API_KEY: data.API_KEY,
        merchantId: data.merchantId,
        merchantOwned: data.merchantOwned,
        displayName: data.displayName,
        accountHolder: data.accountHolder,
        sortCode: data.sortCode,
        accountNumber: data.accountNumber,
        gatewayUrl: data.gatewayUrl
    }
    if (data.id) {
        obj['id'] = data.id
    }
    if (data.lastStatusChangeAt) {
        obj['lastStatusChangeAt'] = data.lastStatusChangeAt
    }
    if (data.usages) {
        obj['usages'] = data.usages
    }
    Pay360.addbankaccount(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}
module.exports.sendrequest360 = async (data, responseCallback) => {
    return new Promise((resolve, reject) => {
        let obj = {
            API_KEY: data.API_KEY,
            merchantId: data.merchantId,
            "firstName": data.firstName,
            "middleName": data.middleName,
            "lastName": data.lastName,
            "type": data.type,
            "subtype": data.subtype,
            "emailAddress": data.emailAddress,
            "phone": data.phone,
            gatewayUrl: data.gatewayUrl
        }
        if (data.ownershipPercentage) {
            obj['ownershipPercentage'] = data.ownershipPercentage
        }
        Pay360.individualrequest(obj, (status, response_data) => {
            if (status) {
                //responseCallback({ status: true, chargeId: response_data });
                resolve({ status: true, chargeId: response_data })
            }
            else {
                resolve({ status: false, message: response_data.message })
                //responseCallback({ status: false, message: response_data.message });
            }
        });
    })
}

module.exports.createapplication360 = async (data, responseCallback) => {
    let obj = {
        API_KEY: data.API_KEY,
        merchantId: data.merchantId,
        type: data.type,
        gatewayUrl: data.gatewayUrl
    }
    if (data.newStatus) {
        obj['newStatus'] = data.newStatus
    }
    if (data.agreementAcceptance) {
        obj['agreementAcceptance'] = data.agreementAcceptance
    }
    Pay360.createapplication(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.splittransaction360 = async (data, responseCallback) => {
    const getCard = await Card.getCardByIdAsync(data.paymentSourceRef);
    data.amount = Math.ceil(data.amount)
    let obj = {
        return_url: data.return_url,
        cancel_url: data.cancel_url,
        currency: data.currency,
        amount: data.amount,
        JWT: data.JWT,
        ISV_ID: data.ISV_ID,
        merchantId: data.merchantId,
        last4digit: getCard.last4digit,
        token: getCard.token,
        pay360BaseUrl: data.pay360BaseUrl,
        admin: data.admin,
        adminaccount: data.adminaccount,
        splitamount: data.amount / 2,
        merchant: data.merchant,
        merchantaccount: data.merchantaccount
    }
    console.log("charge data---", obj)
    Pay360.makesplittransaction360(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.getbank360 = async (data, responseCallback) => {
    let obj = {
        API_KEY: data.API_KEY,
        merchantId: parseInt(data.merchantId),
        gatewayUrl: data.gatewayUrl
    }
    console.log("bank data send----", obj)
    Pay360.getbankaccount(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.genratecard = async (data, responseCallback) => {
    let obj = {
        return_url: data.return_url,
        cancel_url: data.cancel_url,
        JWT: data.JWT,
        ISV_ID: data.ISV_ID,
        merchantId: data.merchantId,
        pay360BaseUrl: data.pay360BaseUrl
    }
    Pay360.cardGenrate(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.refundPay360 = async (data, responseCallback) => {
    let obj = {
        amount: data.amount,
        JWT: data.JWT,
        ISV_ID: data.ISV_ID,
        transactionId: data.transactionId,
        pay360BaseUrl: data.pay360BaseUrl
    }
    console.log("refund---obj", obj)
    Pay360.make360refund(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, chargeId: response_data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}


//============================== pay360 middleware end ======================================

/*--------------------------------->Moncash middleware start<-----------------------------------*/
module.exports.moncashCreateOrder = async (data, responseCallback) => {
    data.amount = Number(data.amount)
    moncash.createPayment(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: response.message, code: response.status });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}

module.exports.moncashCapturePayment = async (data, responseCallback) => {
    moncash.capturePayment(data, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: response.message, code: response.status });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}
/*----------------------------------------->Moncash middleware end<-------------------------------------*/

/*----------------------------------------->DPO middleware start<-----------------------------------------*/

module.exports.dpoCreatePayment = async (data, responseCallback) => {
    let obj = {
        companytoken: data.companytoken,
        currency: data.currency,
        request: "createToken",
        amount: data.amount,
        endpoint: data.endpoint,
        ptl: 1,
        servicetype: data.servicetype,
        servicedescription: data.servicedescription,
        servicedate: data.servicedate
    }
    Dpo.createPayment(obj, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: response.message, code: response.status });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}

module.exports.dpoVerifyPayment = async (data, responseCallback) => {
    let obj = {
        companytoken: data.companytoken,
        request: "verifyToken",
        endpoint: data.endpoint,
        transactiontoken: data.transactiontoken
    }
    console.log("obj--verify", obj)
    Dpo.verifyPayment(obj, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: response.message, code: response.status });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}

module.exports.dpoRefundPayment = async (data, responseCallback) => {
    let obj = {
        companytoken: data.companytoken,
        request: "refundToken",
        endpoint: data.endpoint,
        transactiontoken: data.transactiontoken,
        amount: data.amount,
        refundDetails: data.refundDetails
    }
    Dpo.refundPayment(obj, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: response.message, code: response.status });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}

module.exports.dpoCancelPayment = async (data, responseCallback) => {
    let obj = {
        companytoken: data.companytoken,
        request: "cancelToken",
        endpoint: data.endpoint,
        transactiontoken: data.transactiontoken
    }
    Dpo.cancelPayment(obj, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: response.message, code: response.status });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}
module.exports.paymentforsavecard = async (data, responseCallback) => {
    let obj = {
        companytoken: data.companytoken,
        return_url: data.return_url,
        cancel_url: data.cancel_url,
        currency: data.currency,
        request: "createToken",
        amount: data.amount,
        endpoint: data.endpoint,
        email: data.email,
        phone: data.phone,
        countrycode: data.countrycode,
        customerCountry: data.countrycode,
        servicetype: data.servicetype,
        servicedescription: data.servicedescription,
        servicedate: data.servicedate
    }
    console.log("payment for save card---", obj)
    Dpo.createPaymentforCard(obj, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: response.message, code: response.status });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}
module.exports.getcardtoken = async (data, responseCallback) => {
    // if (!data.countrycode) {
    //     responseCallback({ status: false, message: "country code not found", code: 400 });
    //     console.log("cuuntry code required---")
    //     return
    // }
    let obj = {
        companytoken: data.companytoken,
        request: "getSubscriptionToken",
        endpoint: data.endpoint,
        phone: data.phone,
        email: data.email
    }
    Dpo.getSubscriptionTokenbyphone(obj, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: response.message, code: response.status });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}
module.exports.chargebycard = async (data, responseCallback) => {
    const getCard = await Card.getCardByIdAsync(data.paymentSourceRef);
    if (!getCard || !getCard.token) {
        responseCallback({ status: false, message: "Dpo invalid card", code: 400 });
        return
    }
    let obj = {
        companytoken: data.companytoken,
        request: "chargeTokenRecurrent",
        endpoint: data.endpoint,
        transactiontoken: data.transactiontoken
    }
    obj['subscriptiontoken'] = getCard.token
    Dpo.chargebytoken(obj, (err, response) => {
        if (err) {
            responseCallback({ status: false, message: response.message, code: response.status });
        } else {
            responseCallback({ status: true, data: response });
        }
    });
}

/*----------------------------------------->DPO middleware end<-----------------------------------------*/


//============================== flutterwave middleware start ======================================


module.exports.paymentChargebyFlutterwave = async (data, responseCallback) => {
    let cost = data.cost;
    // let finalcost = parseInt(cost);
    let finalcost = (cost);
    const getCard = await Card.getCardByIdAsync(data.paymentSourceRef);
    let chargeData = {
        email: getCard.details.email,
        amount: finalcost,
        currency: data.currency,
        authorization_code: getCard.token,
        secretKey: data.secretKey,
        pubKey: data.pubKey,
        enckey: data.enckey
    }
    flutterwave.paymenthandlerCharge(chargeData, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, response: response_data.data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

module.exports.refundAmountByFlutterwave = async (data, responseCallback) => {
    let cost = data.cost;
    let finalcost = Number(cost);
    let refundData = {
        transaction: data.transactionId,
        cost: finalcost,
        secretKey: data.secretKey,
        pubKey: data.pubKey
    }
    flutterwave.refundAmount(refundData, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, message: response_data.message });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    })
}

module.exports.verifyTransactionFlutterwave = async (data, responseCallback) => {
    let obj = {
        transaction: data.transactionId,
        secretKey: data.secretKey,
        pubKey: data.pubKey,
        enckey: data.enckey
    }
    flutterwave.verifyPayemnt(obj, (status, response_data) => {
        if (status) {
            responseCallback({ status: true, data: response_data.data });
        }
        else {
            responseCallback({ status: false, message: response_data.message });
        }
    });
}

//============================== flutterwave middleware end ======================================

