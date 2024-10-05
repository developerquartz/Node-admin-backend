const fetch = require('node-fetch');

async function add360card(body_data, callback) {

    let url = "https://secure.test.pay360evolve.com/api/v1/merchants/11006250/transactions/verify"
    let data_obj = {
        "processing": {
            "timeout": "120s"
        },
        "paymentMethod": {
            "provider": "SBS",
            "methodId": "CARD",
            "gateway": {
                "returnUrl": "https://staging-api.projectName.com/authenticationservice/api/v1/card/return/url/pay360?user=" + body_data.userId,
                "declineUrl": "https://staging-api.projectName.com/authenticationservice/api/v1/card/return/url/pay360",
                "cancelUrl": "https://staging-api.projectName.com/authenticationservice/api/v1/card/return/url/pay360",
                "errorUrl": "https://staging-api.projectName.com/authenticationservice/api/v1/card/return/url/pay360",
                "language": "en"
            },
            "saveMethod": "YES"
        }
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { jwt: "6349173732734094212.MYW9N2X8C1IK82SIKP5NI8311", 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    let obj = {}
    if (request.status == 200) {
        obj = {
            redirectUrl: data.merchantInstructions[0]['parameters']['redirectUrl'] ? data.merchantInstructions[0]['parameters']['redirectUrl'] : "",
            requestId: data.merchantInstructions[0]['parameters']['requestId'] ? data.merchantInstructions[0]['parameters']['requestId'] : ""
        }
        callback(true, obj)
    }
    else {
        obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 add card"
        callback(false, obj)
    }
    // console.log(data.merchantInstructions[0]['parameters']['redirectUrl'])
    // res.redirect(data.merchantInstructions[0]['parameters']['redirectUrl'])
}

async function maketransaction360(body_data, callback) {
    let url = body_data.pay360BaseUrl + body_data.ISV_ID.toString() + "/transactions/payments"
    let data_obj = {
        "processing": {
            "timeout": "120s"
        },
        "paymentMethod": {
            "provider": "SBS",
            "methodId": "GATEWAY",
            "gateway": {
                "returnUrl": body_data.return_url,
                "declineUrl": body_data.cancel_url,
                "cancelUrl": body_data.cancel_url,
                "errorUrl": body_data.cancel_url,
                "language": "en"
            },
            "storedMethod": {
                "token": body_data.token,
                "verification": body_data.last4digit
            }
        },
        "remittance": {

            "merchantId": body_data.merchantId.toString()

        },
        "transaction": {
            "amount": Number(body_data.amount) ? Number(body_data.amount) : 0,
            "submit": true,
            "description": "Catering Top-Up - £" + body_data.amount,
            "capture": true,
            "type": "PAYMENT",
            "currency": body_data.currency
        }
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { jwt: body_data.JWT, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    let obj = {}
    if (request.status == 200) {
        if (data.hasOwnProperty('merchantInstructions')) {


            obj = {
                redirectUrl: data.hasOwnProperty('merchantInstructions') ? data.merchantInstructions[0]['parameters']['redirectUrl'] ? data.merchantInstructions[0]['parameters']['redirectUrl'] : "" : "",
                requestId: data.merchantInstructions[0]['parameters']['requestId'] ? data.merchantInstructions[0]['parameters']['requestId'] : "",
                transactionId: data.transaction.transactionId
            }
            callback(true, obj)
        }
        else {
            obj.message = "Sometning went wrong in Pay360 transaction"
            callback(false, obj)
        }
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 transaction"
        }
        callback(false, obj)
    }
}
async function makesplittransaction360(body_data, callback) {
    let url = body_data.pay360BaseUrl + body_data.ISV_ID.toString() + "/transactions/payments"
    let data_obj = {
        "processing": {
            "timeout": "120s"
        },
        "paymentMethod": {
            "provider": "SBS",
            "methodId": "GATEWAY",
            "gateway": {
                "returnUrl": body_data.return_url,
                "declineUrl": body_data.cancel_url,
                "cancelUrl": body_data.cancel_url,
                "errorUrl": body_data.cancel_url,
                "language": "en"
            },
            "storedMethod": {
                "token": body_data.token,
                "verification": body_data.last4digit
            }
        },
        "purchases": [
            {
                "category": body_data.admin,
                "description": body_data.admin,
                "remittance": {
                    "merchantId": body_data.merchantId,
                    "bankAccountId": body_data.adminaccount
                },
                "totalAmount": body_data.splitamount
            },
            {
                "category": body_data.merchant,
                "description": body_data.merchant,
                "remittance": {
                    "merchantId": body_data.merchantId,
                    "bankAccountId": body_data.merchantaccount
                },
                "totalAmount": body_data.splitamount
            }
        ],
        "transaction": {
            "amount": Number(body_data.amount) ? Number(body_data.amount) : 0,
            "submit": true,
            "description": "Catering Top-Up - £" + body_data.amount,
            "capture": true,
            "type": "PAYMENT",
            "currency": body_data.currency
        }
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { jwt: body_data.JWT, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    let obj = {}
    if (request.status == 200) {
        if (data.hasOwnProperty('merchantInstructions')) {


            obj = {
                redirectUrl: data.hasOwnProperty('merchantInstructions') ? data.merchantInstructions[0]['parameters']['redirectUrl'] ? data.merchantInstructions[0]['parameters']['redirectUrl'] : "" : "",
                requestId: data.merchantInstructions[0]['parameters']['requestId'] ? data.merchantInstructions[0]['parameters']['requestId'] : "",
                transactionId: data.transaction.transactionId
            }
            callback(true, obj)
        }
        else {
            obj.message = "Sometning went wrong in Pay360 transaction"
            callback(false, obj)
        }
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 transaction"
        }
        callback(false, obj)
    }
}
async function cardGenrate(body_data, callback) {
    let url = body_data.pay360BaseUrl + body_data.ISV_ID.toString() + "/transactions/verify"
    let data_obj = {
        "processing": {
            "timeout": "120s"
        },
        "paymentMethod": {
            "provider": "SBS",
            "methodId": "GATEWAY",
            "gateway": {
                "returnUrl": body_data.return_url,
                "declineUrl": body_data.cancel_url,
                "cancelUrl": body_data.cancel_url,
                "errorUrl": body_data.cancel_url,
                "language": "en"
            },
            "saveMethod": "YES"
        }
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { jwt: body_data.JWT, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    let obj = {}
    if (request.status == 200) {
        if (data.hasOwnProperty('merchantInstructions')) {


            obj = {
                redirectUrl: data.hasOwnProperty('merchantInstructions') ? data.merchantInstructions[0]['parameters']['redirectUrl'] ? data.merchantInstructions[0]['parameters']['redirectUrl'] : "" : "",
                requestId: data.merchantInstructions[0]['parameters']['requestId'] ? data.merchantInstructions[0]['parameters']['requestId'] : ""
            }
            callback(true, obj)
        }
        else {
            obj.message = "Sometning went wrong in Pay360 Genrat Card"
            callback(false, obj)
        }
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 Genrat Card"
        }
        callback(false, obj)
    }
}
async function verifyCard(body_data, callback) {
    let url = body_data.pay360BaseUrl + body_data.ISV_ID.toString() + "/transactions/verify/" + body_data.requestId + "/query"
    let data_obj = {}
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { jwt: body_data.JWT, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    let obj = {}
    if (request.status == 200) {
        if (data.hasOwnProperty("paymentMethod")) {


            obj = {
                paymentMethod: data.paymentMethod
            }
            callback(true, obj)
        }
        else {
            obj.message = "Sometning went wrong in Pay360 verify Card"
            callback(false, obj)
        }
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 verify Card"
        }
        callback(false, obj)
    }
}
async function make360refund(body_data, callback) {

    let url = body_data.pay360BaseUrl + body_data.ISV_ID.toString() + "/transactions/payments/" + body_data.transactionId + "/refund"
    let data_obj = {
        "amount": Number(body_data.amount)
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { jwt: body_data.JWT, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    console.log("data---")
    console.log(data)
    let obj = {}
    if (request.status == 200) {
        obj = {
            message: "Refunded Successfully"
        }
        callback(true, obj)
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 refund"
        }
        callback(false, obj)
    }

}
async function getbankaccount(body_data, callback) {

    let url = body_data.gatewayUrl + "merchant/merchants/" + body_data.merchantId + "/bankAccounts"

    let request = await fetch(url, {
        method: 'get',
        headers: { API_KEY: body_data.API_KEY, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    console.log("getbankaccount---")
    console.log(data)
    let obj = {}
    if (request.status == 200) {
        callback(true, data)
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 get bank account"
        }
        callback(false, obj)
    }

}
async function suppliercreate(body_data, callback) {

    let url = body_data.gatewayUrl + "merchant/merchants"
    let data_obj = {
        "isvId": body_data.isvId,
        "isvName": body_data.isvName,
        "type": body_data.type,
        "organizationDetails": {
            "legalName": body_data.legalName,
            "businessClassification": body_data.businessClassification
        }
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { API_KEY: body_data.API_KEY, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    console.log("add supplier---")
    console.log(data)
    let obj = {}
    if (request.status == 200 || request.status == 201) {
        callback(true, data)
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 add supplier"
        }
        callback(false, obj)
    }

}
async function invaiteuser(body_data, callback) {
    let url = body_data.gatewayUrl + "user-account/user-account/userAccounts?invitation=true"
    let data_obj = {
        "email": body_data.email,
        "name": body_data.name,
        "authorities": [
            {
                "scope": body_data.isvId + "/" + body_data.merchantId,
                "roles": ["MERCHANT_ADMIN_PARTNER_INVITE"]
            }
        ],
        "idp": "Pay360"
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { API_KEY: body_data.API_KEY, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    console.log("invaiteuser---")
    console.log(data)
    let obj = {}
    if (request.status == 200 || request.status == 201) {
        obj.message = "Invataion send to your mail"
        callback(true, obj)
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 invaiteuser"
        }
        callback(false, obj)
    }
}
async function individualrequest(body_data, callback) {
    let url = body_data.gatewayUrl + "merchant/merchants/" + body_data.merchantId + "/individuals"
    let data_obj = {
        "merchantId": body_data.merchantId,
        "firstName": body_data.firstName,
        "middleName": body_data.middleName,
        "lastName": body_data.lastName,
        "type": body_data.type,
        "subtype": body_data.subtype,
        "emailAddress": body_data.emailAddress,
        "phone": body_data.phone
    }
    if (body_data.ownershipPercentage) {
        data_obj['ownershipPercentage'] = body_data.ownershipPercentage
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { API_KEY: body_data.API_KEY, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    console.log("individualrequest---")
    console.log(data)
    let obj = {}
    if (request.status == 200 || request.status == 201) {
        obj.message = "Request Send"
        callback(true, obj)
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 invaiteuser"
        }
        callback(false, obj)
    }
}
async function createapplication(body_data, callback) {
    let url = body_data.gatewayUrl + "merchant/merchants/" + body_data.merchantId + "/applications"
    let data_obj = {
        "merchantId": body_data.merchantId,
        "type": body_data.type
    }
    if (body_data.newStatus) {
        data_obj['newStatus'] = body_data.newStatus
    }
    if (body_data.agreementAcceptance) {
        data_obj['agreementAcceptance'] = body_data.agreementAcceptance
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { API_KEY: body_data.API_KEY, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    console.log("createapplication---")
    console.log(data)
    let obj = {}
    if (request.status == 200 || request.status == 201) {
        obj.message = "Request Send"
        callback(true, obj)
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 createapplication"
        }
        callback(false, obj)
    }
}
async function verifymerchant(body_data, callback) {
    let url = body_data.gatewayUrl + "merchant/merchants/" + body_data.merchantId
    let request = await fetch(url, {
        method: 'get',
        headers: { API_KEY: body_data.API_KEY, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    let obj = {}
    if (request.status == 200 || request.status == 201) {
        callback(true, data)
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 verifymerchant"
        }
        callback(false, obj)
    }
}
async function addbankaccount(body_data, callback) {
    let url = body_data.gatewayUrl + "merchant/merchants/" + body_data.merchantId + "/bankAccounts"
    let data_obj = {
        "merchantId": body_data.merchantId,
        "status": "VERIFIED",
        "usages": [
            "REMITTANCE"
        ],
        "merchantOwned": body_data.merchantOwned,
        "displayName": body_data.displayName,
        "accountHolder": body_data.accountHolder,
        "sortCode": body_data.sortCode,
        "accountNumber": body_data.accountNumber
    }
    if (body_data.id) {
        data_obj['id'] = body_data.id
    }
    if (body_data.usages) {
        data_obj['usages'] = body_data.usages
    }
    if (body_data.lastStatusChangeAt) {
        data_obj['lastStatusChangeAt'] = body_data.lastStatusChangeAt
    }
    let request = await fetch(url, {
        method: 'post',
        body: JSON.stringify(data_obj),
        headers: { API_KEY: body_data.API_KEY, 'Content-Type': 'application/json' }
    });
    let data = await request.json();
    console.log("addbankaccount---")
    console.log(data)
    let obj = {}
    if (request.status == 200 || request.status == 201) {
        obj.message = "Add Successfully"
        callback(true, obj)
    }
    else {
        if (data.violations && data.violations.length) {
            obj.message = JSON.stringify(data.violations)
        }
        else {
            obj.message = data.detail ? data.detail : "Sometning went wrong in Pay360 addbankaccount"
        }
        callback(false, obj)
    }

}
module.exports = {
    add360card,
    verifyCard,
    maketransaction360,
    make360refund,
    cardGenrate,
    makesplittransaction360,
    getbankaccount,
    suppliercreate,
    invaiteuser,
    individualrequest,
    createapplication,
    verifymerchant,
    addbankaccount
}