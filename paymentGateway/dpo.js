const fetch = require('node-fetch');
var convert = require('xml-js');
let config = {}
async function createPayment(dpodata, callback) {
    let url = dpodata.endpoint + '/API/v6/'  //'https://secure.3gdirectpay.com/API/v6/'

    const content = {
        "API3G": {
            "CompanyToken": dpodata.companytoken,
            "Request": dpodata.request,
            "Transaction": {
                "PaymentAmount": dpodata.amount,
                "PaymentCurrency": dpodata.currency,
                "PTL": dpodata.ptl
            },
            "Services": {
                "Service": {
                    "ServiceType": dpodata.servicetype,
                    "ServiceDescription": dpodata.servicedescription,
                    "ServiceDate": dpodata.servicedate
                }
            }
        }
    };
    config = { compact: true, ignoreComment: true, spaces: 4 };
    let data_obj = convert.js2xml(content, config);
    let request = await fetch(url, {
        method: 'post',
        body: data_obj,
        headers: { 'Content-Type': 'text/xml' }
    });
    let data = await request.text();
    let messageobj = {}
    if (data.includes('xml')) {
        config = { compact: true, spaces: 4, ignoreDeclaration: true, textKey: "d" };
        let newdata = convert.xml2js(data, config);
        //console.log("createPayment", newdata.API3G)
        if (newdata.API3G.Result.d != 000) {
            messageobj.status = Number(newdata.API3G.Result.d)
            messageobj.message = newdata.API3G.ResultExplanation.d
            callback(true, messageobj)
        }
        else {
            messageobj = {
                status: 200,//newdata.API3G.Result.d,
                ResultExplanation: newdata.API3G.ResultExplanation.d,
                TransToken: newdata.API3G.TransToken.d,
                TransRef: newdata.API3G.TransRef.d
            }

            callback(false, messageobj)
        }
    }
    else {
        messageobj.status = 429
        messageobj.message = "Too Many Requests"
        callback(true, messageobj)
    }
}
async function createPaymentforCard(dpodata, callback) {
    let url = dpodata.endpoint + '/API/v6/'  //'https://secure.3gdirectpay.com/API/v6/'

    const content = {
        "API3G": {
            "CompanyToken": dpodata.companytoken,
            "Request": dpodata.request,
            "Transaction": {
                "PaymentAmount": dpodata.amount,
                "customerEmail": dpodata.email,
                "customerPhone": dpodata.phone,
                "customerDialCode": dpodata.countrycode,
                "customerCountry": dpodata.countrycode,
                "PaymentCurrency": dpodata.currency,
                "RedirectURL": dpodata.return_url,
                "BackURL": dpodata.cancel_url,
                "PTL": 1,
                "AllowRecurrent": 1
            },
            "Services": {
                "Service": {
                    "ServiceType": dpodata.servicetype,
                    "ServiceDescription": dpodata.servicedescription,
                    "ServiceDate": dpodata.servicedate
                }
            }
        }
    };
    config = { compact: true, ignoreComment: true, spaces: 4 };
    let data_obj = convert.js2xml(content, config);
    let request = await fetch(url, {
        method: 'post',
        body: data_obj,
        headers: { 'Content-Type': 'text/xml' }
    });
    let data = await request.text();
    let messageobj = {}
    if (data.includes('xml')) {
        config = { compact: true, spaces: 4, ignoreDeclaration: true, textKey: "d" };
        let newdata = convert.xml2js(data, config);
        console.log("createPayment for card", newdata.API3G)
        if (newdata.API3G.Result.d != 000) {
            messageobj.status = Number(newdata.API3G.Result.d)
            messageobj.message = newdata.API3G.ResultExplanation.d
            callback(true, messageobj)
        }
        else {
            messageobj = {
                status: 200,//newdata.API3G.Result.d,
                ResultExplanation: newdata.API3G.ResultExplanation.d,
                TransToken: newdata.API3G.TransToken.d,
                TransRef: newdata.API3G.TransRef.d
            }

            callback(false, messageobj)
        }
    }
    else {
        messageobj.status = 429
        messageobj.message = "Too Many Requests"
        callback(true, messageobj)
    }
}
async function verifyPayment(dpodata, callback) {
    let url = dpodata.endpoint + '/API/v7/'//'https://secure.3gdirectpay.com/API/v6/'
    const content = {
        "API3G": {
            "CompanyToken": dpodata.companytoken,
            "Request": dpodata.request,
            "TransactionToken": dpodata.transactiontoken
        }
    };
    config = { compact: true, ignoreComment: true, spaces: 4 };
    let data_obj = convert.js2xml(content, config);
    let request = await fetch(url, {
        method: 'post',
        body: data_obj,
        headers: { 'Content-Type': 'text/xml' }
    });
    let data = await request.text();
    let messageobj = {}
    if (data.includes('xml')) {
        config = { compact: true, spaces: 4, ignoreDeclaration: true, textKey: "d" };
        let newdata = convert.xml2js(data, config);
        console.log("verifyPayment", newdata.API3G)
        if (newdata.API3G.Result.d != 000) {
            messageobj.status = Number(newdata.API3G.Result.d)
            messageobj.message = newdata.API3G.ResultExplanation.d
            callback(true, messageobj)
        }
        else {
            messageobj = {
                status: 200,//newdata.API3G.Result.d,
                ResultExplanation: newdata.API3G.ResultExplanation.d,
                CustomerCredit: newdata.API3G.CardLastFour.d,
                CustomerCreditType: newdata.API3G.CardType.d,
                TransactionCurrency: newdata.API3G.TransactionCurrency.d,
                TransactionAmount: newdata.API3G.TransactionAmount.d,
                FraudAlert: newdata.API3G.TransactionFraudAlert.d,
                FraudExplnation: newdata.API3G.TransactionFraudExplanation.d,
                TransactionRef: newdata.API3G.TransactionRef.d,
                TransactionRollingReserveDate: newdata.API3G.TransactionRollingReserveDate.d,
                TransactionSettlementDate: newdata.API3G.TransactionSettlementDate.d,
                TransactionFinalCurrency: newdata.API3G.TransactionFinalCurrency.d,
                TransactionFinalAmount: newdata.API3G.TransactionFinalAmount.d,
                CustomerPhone: newdata.API3G.CustomerPhone.d,
                CustomerEmail: newdata.API3G.CustomerEmail.d,
                CustomerCountry: newdata.API3G.CustomerCountry.d
            }

            callback(false, messageobj)
        }
    }
    else {
        messageobj.status = 429
        messageobj.message = "Too Many Requests"
        callback(true, messageobj)
    }
}
async function refundPayment(dpodata, callback) {
    let url = dpodata.endpoint + '/API/v6/'//'https://secure.3gdirectpay.com/API/v6/'
    const content = {
        "API3G": {
            "Request": dpodata.request,
            "CompanyToken": dpodata.companytoken,
            "TransactionToken": dpodata.transactiontoken,
            "refundAmount": dpodata.amount,
            "refundDetails": dpodata.refundDetails
        }
    };
    config = { compact: true, ignoreComment: true, spaces: 4 };
    let data_obj = convert.js2xml(content, config);
    let request = await fetch(url, {
        method: 'post',
        body: data_obj,
        headers: { 'Content-Type': 'text/xml' }
    });
    let data = await request.text();
    let messageobj = {}
    if (data.includes('xml')) {
        config = { compact: true, spaces: 4, ignoreDeclaration: true, textKey: "d" };
        let newdata = convert.xml2js(data, config);
        console.log("refundPayment", newdata.API3G)
        if (newdata.API3G.Result.d != 000) {
            messageobj.status = Number(newdata.API3G.Result.d)
            messageobj.message = newdata.API3G.ResultExplanation.d
            callback(true, messageobj)
        }
        else {
            messageobj = {
                status: 200,//newdata.API3G.Result.d,
                message: newdata.API3G.ResultExplanation.d
            }

            callback(false, messageobj)
        }
    }
    else {
        messageobj.status = 429
        messageobj.message = "Too Many Requests"
        callback(true, messageobj)
    }
}
async function cancelPayment(dpodata, callback) {
    let url = dpodata.endpoint + '/API/v6/'//'https://secure.3gdirectpay.com/API/v6/'
    const content = {
        "API3G": {
            "CompanyToken": dpodata.companytoken,
            "Request": dpodata.request,
            "TransactionToken": dpodata.transactiontoken
        }
    };
    config = { compact: true, ignoreComment: true, spaces: 4 };
    let data_obj = convert.js2xml(content, config);
    let request = await fetch(url, {
        method: 'post',
        body: data_obj,
        headers: { 'Content-Type': 'text/xml' }
    });
    let data = await request.text();
    let messageobj = {}
    if (data.includes('xml')) {
        config = { compact: true, spaces: 4, ignoreDeclaration: true, textKey: "d" };
        let newdata = convert.xml2js(data, config);
        //console.log("cancelPayment", newdata.API3G)
        if (newdata.API3G.Result.d != 000) {
            messageobj.status = Number(newdata.API3G.Result.d)
            messageobj.message = newdata.API3G.ResultExplanation.d
            callback(true, messageobj)
        }
        else {
            messageobj = {
                status: 200,//newdata.API3G.Result.d,
                message: newdata.API3G.ResultExplanation.d
            }

            callback(false, messageobj)
        }
    }
    else {
        messageobj.status = 429
        messageobj.message = "Too Many Requests"
        callback(true, messageobj)
    }
}
async function getSubscriptionTokenbyphone(dpodata, callback) {
    let url = dpodata.endpoint + '/API/v6/'//'https://secure.3gdirectpay.com/API/v6/'
    const content = {
        "API3G": {
            "CompanyToken": dpodata.companytoken,
            "Request": dpodata.request, //"getSubscriptionToken",
            "SearchCriteria": 1,
            "SearchCriteriaValue": dpodata.email//9675071260
        }
    };
    config = { compact: true, ignoreComment: true, spaces: 4 };
    let data_obj = convert.js2xml(content, config);
    let request = await fetch(url, {
        method: 'post',
        body: data_obj,
        headers: { 'Content-Type': 'text/xml' }
    });
    let data = await request.text();
    let messageobj = {}
    if (data.includes('xml')) {
        config = { compact: true, spaces: 4, ignoreDeclaration: true, textKey: "d" };
        let newdata = convert.xml2js(data, config);
        console.log("check subscription token", newdata.API3G)
        if (newdata.API3G.Result.d != 000) {
            messageobj.status = Number(newdata.API3G.Result.d)
            messageobj.message = newdata.API3G.ResultExplanation.d
            callback(true, messageobj)
        }
        else {
            messageobj = {
                status: 200,//newdata.API3G.Result.d,
                ResultExplanation: newdata.API3G.ResultExplanation.d,
                SubscriptionToken: newdata.API3G.SubscriptionToken.d,
                CustomerToken: newdata.API3G.CustomerToken.d,
            }
            callback(false, messageobj)
        }
    }

    else {
        messageobj.status = 429
        messageobj.message = "Too Many Requests"
        callback(true, messageobj)
    }
}
async function chargebytoken(dpodata, callback) {
    let url = dpodata.endpoint + '/API/v6/'//'https://secure.3gdirectpay.com/API/v6/'
    const content = {
        "API3G": {
            "CompanyToken": dpodata.companytoken,
            "Request": dpodata.request,//"chargeTokenRecurrent",
            "TransactionToken": dpodata.transactiontoken,//"8F056419-07B7-408B-B57A-0B4C09E2975A",
            "subscriptionToken": dpodata.subscriptiontoken//"AFD5928F-3F32-4AD1-A119-CEA53AEC1042"
        }
    };
    config = { compact: true, ignoreComment: true, spaces: 4 };
    let data_obj = convert.js2xml(content, config);
    let request = await fetch(url, {
        method: 'post',
        body: data_obj,
        headers: { 'Content-Type': 'text/xml' }
    });
    let data = await request.text();
    let messageobj = {}
    if (data.includes('xml')) {
        config = { compact: true, spaces: 4, ignoreDeclaration: true, textKey: "d" };
        let newdata = convert.xml2js(data, config);
        console.log("charge by token", newdata.API3G)
        if (newdata.API3G.Result.d != 000) {
            messageobj.status = Number(newdata.API3G.Result.d)
            messageobj.message = newdata.API3G.ResultExplanation.d
            callback(true, messageobj)
        }
        else {
            messageobj = {
                status: 200,//newdata.API3G.Result.d,
                message: newdata.API3G.ResultExplanation.d
            }

            callback(false, messageobj)
        }
    }
    else {
        messageobj.status = 429
        messageobj.message = "Too Many Requests"
        callback(true, messageobj)
    }
}
module.exports = {
    createPayment,
    verifyPayment,
    refundPayment,
    cancelPayment,
    createPaymentforCard,
    getSubscriptionTokenbyphone,
    chargebytoken
}