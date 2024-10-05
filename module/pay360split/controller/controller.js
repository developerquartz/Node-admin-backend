const ObjectId = require('objectid');
const paymentMiddleware = require('../../../middleware/payments');
const User = require('../../../models/userTable.js');
const settingService = require('../../../helper/settingService');
const Store = require('../../../models/storeTable');
module.exports = {
    createMerchant: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store

            let data = req.body;
            if (!data.firstName) {
                return res.json(helper.showValidationErrorResponse('firstname requried'));
            }
            if (!data.lastName) {
                return res.json(helper.showValidationErrorResponse('lastName requried'));
            }
            if (!data.emailAddress) {
                return res.json(helper.showValidationErrorResponse('emailAddress requried'));
            }
            if (!data.phone) {
                return res.json(helper.showValidationErrorResponse('phone requried'));
            }
            if (!data.businessClassification) {
                return res.json(helper.showValidationErrorResponse('businessClassification requried'));
            }
            data.legalName = data.firstName + " " + data.lastName
            data.isvName = "Tap N Dine"
            let getStore = await settingService.chekStoreSetting(store.storeId, "pay360");
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.secretKey;
                data.isv_id = getStore.paymentSettings.isvId;
                data.merchantId = getStore.paymentSettings.merchantId;
                data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.apikey
                data.gatewayUrl = getStore.paymentSettings.gatewayUrl
            } else {

                data.secretKey = getStore.paymentSettings.livesecretKey;
                data.isv_id = getStore.paymentSettings.liveisvId;
                data.merchantId = getStore.paymentSettings.livemerchantId;
                data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.liveapikey
                data.gatewayUrl = getStore.paymentSettings.livegatewayUrl
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SecretKey key is missing'));
            }
            if (!data.isv_id) {
                return res.json(helper.showValidationErrorResponse('IsvId key is missing'));
            }
            if (!data.pay360BaseUrl) {
                return res.json(helper.showValidationErrorResponse('Base Url is missing'));
            }
            let chargeData = {
                API_KEY: data.apikey,
                isvName: data.isvName,
                isvId: data.isv_id,
                legalName: data.legalName,
                type: "SUPPLIER",
                gatewayUrl: data.gatewayUrl,
                businessClassification: data.businessClassification
            }
            //  console.log("add data---", chargeData)
            paymentMiddleware.addSupplier360(chargeData, async (response) => {
                if (!response.status) {
                    return res.json(helper.showValidationErrorResponse(response.message));
                }
                else {

                    //res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                    data["userMerchant"] = data.merchantId
                    data.merchantId = response.chargeId.id
                    module.exports.invdualreques(data, store, getStore, user)
                    module.exports.createApplicationforsupplier(data)
                    if (!data.userMerchant) {
                        res.json(helper.showSuccessResponse("Mail has been sent,please check your mail"))
                    }
                    else {
                        res.json(helper.showSuccessResponse("RESPONSE_SUCCESS", response))
                    }


                }
            });
        } catch (error) {
            console.log("add supplier error----------", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    invdualreques: async (data, store, getStore, user) => {
        let sbtype = ['UBO', 'APPLICATION', 'BILLING', 'SUPPORT']
        let err = false
        for (let i of sbtype) {
            let sendobj = {
                API_KEY: data.apikey,
                merchantId: data.merchantId,
                "firstName": data.firstName,
                "middleName": data.middleName || "",
                "lastName": data.lastName,
                "emailAddress": data.emailAddress,
                "phone": data.phone,
                gatewayUrl: data.gatewayUrl
            }
            if (i == 'UBO') {
                sendobj['type'] = 'KEY_INDIVIDUAL'
                sendobj['subtype'] = i
                sendobj['ownershipPercentage'] = "50"
            }
            else {
                sendobj['type'] = 'CONTACT'
                sendobj['subtype'] = i
            }
            let data1 = await paymentMiddleware.sendrequest360(sendobj)
            if (!data1.status) {
                err = true
                // if (!data.userMerchant) {
                //     if (getStore.paymentMode === 'sandbox') {
                //         await Store.updateOne({ _id: ObjectId(store.storeId), "paymentSettings.payment_method": "pay360" }, { $set: { "paymentSettings.$.merchantId": null } })
                //     }
                //     else {
                //         await Store.updateOne({ _id: ObjectId(store.storeId), "paymentSettings.payment_method": "pay360" }, { $set: { "paymentSettings.$.livemerchantId": null } })
                //     }
                // }
                console.log(data1.message)
                break;
            }
        }
        if (!err) {
            if (!data.userMerchant) {
                let chargeData = {
                    API_KEY: data.apikey,
                    isvName: data.isvName,
                    isvId: data.isv_id,
                    legalName: data.legalName,
                    type: "GENERIC",
                    gatewayUrl: data.gatewayUrl,
                    businessClassification: data.businessClassification
                }
                paymentMiddleware.addSupplier360(chargeData, async (response1) => {
                    if (!response1.status) {
                        console.log(response1.message)
                        //return res.json(helper.showValidationErrorResponse(response1.message));
                    }
                    else {
                        let invaitedata = {
                            API_KEY: data.apikey,
                            email: data.emailAddress,
                            isvId: data.isv_id,
                            name: user.name,
                            merchantId: response1.chargeId.id,
                            gatewayUrl: data.gatewayUrl
                        }
                        paymentMiddleware.inavaite360(invaitedata, async (invite) => {
                            if (!invite.status) {
                                console.log(invite.message)
                                //return res.json(helper.showValidationErrorResponse(invite.message));
                            }
                            else {
                                invaitedata['apikey'] = invaitedata.API_KEY
                                module.exports.createApplication(invaitedata)
                                if (getStore.paymentMode === 'sandbox') {
                                    await Store.updateOne({ _id: ObjectId(store.storeId), "paymentSettings.payment_method": "pay360" }, { $set: { "paymentSettings.$.merchantId": response1.chargeId.id, "paymentSettings.$.supplierId": data.merchantId } })
                                }
                                else {
                                    await Store.updateOne({ _id: ObjectId(store.storeId), "paymentSettings.payment_method": "pay360" }, { $set: { "paymentSettings.$.livemerchantId": response1.chargeId.id, "paymentSettings.$.livesupplierId": data.merchantId } })
                                }
                            }
                        })


                    }
                });
            }
            else {
                if (getStore.paymentMode === 'sandbox') {
                    await Store.updateOne({ _id: ObjectId(store.storeId), "paymentSettings.payment_method": "pay360" }, { $set: { "paymentSettings.$.supplierId": data.merchantId } })
                }
                else {
                    await Store.updateOne({ _id: ObjectId(store.storeId), "paymentSettings.payment_method": "pay360" }, { $set: { "paymentSettings.$.livesupplierId": data.merchantId } })
                }
            }
        }

    },
    createApplication: async (data) => {
        let appobj = {
            API_KEY: data.apikey,
            merchantId: data.merchantId,
            type: "ONBOARDING",
            gatewayUrl: data.gatewayUrl
        }
        paymentMiddleware.createapplication360(appobj, async (response) => {
            if (!response.status) {
                console.log("Create Application err----", response)
            }
        })
    },
    createApplicationforsupplier: async (data) => {
        let appobj = {
            API_KEY: data.apikey,
            merchantId: data.merchantId,
            type: "ONBOARDING",
            newStatus: "SUBMITTED",
            agreementAcceptance: "BY_MERCHANT",
            gatewayUrl: data.gatewayUrl
        }
        paymentMiddleware.createapplication360(appobj, async (response) => {
            if (!response.status) {
                console.log("Create Application err----", response)
            }
        })
    },
    addbankaccount: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store
            let data = req.body
            if (!data.displayName) {
                return res.json(helper.showValidationErrorResponse('displayName requried'));
            }
            if (!data.accountHolder) {
                return res.json(helper.showValidationErrorResponse('accountHolder requried'));
            }
            if (!data.sortCode) {
                return res.json(helper.showValidationErrorResponse('sortCode requried'));
            }
            if (!data.accountNumber) {
                return res.json(helper.showValidationErrorResponse('accountNumber requried'));
            }
            if (!data.supplierId) {
                return res.json(helper.showValidationErrorResponse('merchantId requried'));
            }
            let getStore = await settingService.chekStoreSetting(store.storeId, "pay360");
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.secretKey;
                data.isv_id = getStore.paymentSettings.isvId;
                data.merchantId = getStore.paymentSettings.merchantId;
                data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.apikey
                data.gatewayUrl = getStore.paymentSettings.gatewayUrl
            } else {

                data.secretKey = getStore.paymentSettings.livesecretKey;
                data.isv_id = getStore.paymentSettings.liveisvId;
                data.merchantId = getStore.paymentSettings.livemerchantId;
                data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.liveapikey
                data.gatewayUrl = getStore.paymentSettings.livegatewayUrl
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SecretKey key is missing'));
            }
            if (!data.isv_id) {
                return res.json(helper.showValidationErrorResponse('IsvId key is missing'));
            }
            if (!data.gatewayUrl) {
                return res.json(helper.showValidationErrorResponse('Base Url is missing'));
            }
            let checkdata = {
                API_KEY: data.apikey,
                gatewayUrl: data.gatewayUrl,
                merchantId: data.supplierId
            }
            paymentMiddleware.varify360(checkdata, async (resdata) => {
                if (!resdata.status) {
                    return res.json(helper.showValidationErrorResponse(resdata.message));
                }
                else {
                    if (resdata.chargeId.type == 'SUPPLIER') {
                        let bankdata = {
                            API_KEY: data.apikey,
                            isvId: data.isv_id,
                            email: data.emailAddress,
                            name: user.name,
                            gatewayUrl: data.gatewayUrl,
                            merchantOwned: true,
                            displayName: data.displayName,
                            accountHolder: data.accountHolder,
                            sortCode: data.sortCode,
                            accountNumber: data.accountNumber,
                            merchantId: data.supplierId
                        }
                        // paymentMiddleware.inavaite360(invaitedata, async (invite) => {
                        //     if (!invite.status) {
                        //         return res.json(helper.showValidationErrorResponse(invite.message));
                        //     }
                        //     else {
                        //         return res.json(helper.showValidationErrorResponse("Mail has been sent,please check your mail"));
                        //     }
                        // })
                        paymentMiddleware.addbank360(bankdata, async (invite) => {
                            console.log("invite", invite)
                            if (!invite.status) {
                                return res.json(helper.showValidationErrorResponse(invite.message));
                            }
                            else {
                                return res.json(helper.showSuccessResponse("RESPONSE_SUCCESS", invite));
                            }
                        })
                    }
                    else {
                        return res.json(helper.showValidationErrorResponse("Supplier not valid"));
                    }
                }
            })

        } catch (error) {
            console.log("add supplier error----------", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getSupplier: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store
            let data = {}
            let getStore = await settingService.chekStoreSetting(store.storeId, "pay360");
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.secretKey;
                data.isv_id = getStore.paymentSettings.isvId;
                data.merchantId = getStore.paymentSettings.merchantId;
                data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.apikey
                data.gatewayUrl = getStore.paymentSettings.gatewayUrl
            } else {

                data.secretKey = getStore.paymentSettings.livesecretKey;
                data.isv_id = getStore.paymentSettings.liveisvId;
                data.merchantId = getStore.paymentSettings.livemerchantId;
                data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.liveapikey
                data.gatewayUrl = getStore.paymentSettings.livegatewayUrl
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SecretKey key is missing'));
            }
            if (!data.isv_id) {
                return res.json(helper.showValidationErrorResponse('IsvId key is missing'));
            }
            if (!data.gatewayUrl) {
                return res.json(helper.showValidationErrorResponse('Base Url is missing'));
            }
            let checkdata = {
                API_KEY: data.apikey,
                gatewayUrl: data.gatewayUrl,
                merchantId: ""
            }
            paymentMiddleware.varify360(checkdata, async (resdata) => {
                if (!resdata.status) {
                    return res.json(helper.showValidationErrorResponse(resdata.message));
                }
                else {
                    if (resdata.chargeId.length) {
                        let data1 = resdata.chargeId.filter(ele => {
                            return ele.type == 'SUPPLIER'

                        })
                        return res.json(helper.showSuccessResponse("RESPONSE_SUCCESS", data1))
                    }
                    else {
                        return res.json(helper.showSuccessResponse("RESPONSE_SUCCESS", resdata))
                    }
                }
            })
        } catch (error) {
            console.log("add supplier error----------", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getAccount: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store
            let data = {}
            let getStore = await settingService.chekStoreSetting(store.storeId, "pay360");
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.secretKey;
                data.isv_id = getStore.paymentSettings.isvId;
                data.merchantId = getStore.paymentSettings.supplierId;
                data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.apikey
                data.gatewayUrl = getStore.paymentSettings.gatewayUrl
            } else {

                data.secretKey = getStore.paymentSettings.livesecretKey;
                data.isv_id = getStore.paymentSettings.liveisvId;
                data.merchantId = getStore.paymentSettings.livesupplierId;
                data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.liveapikey
                data.gatewayUrl = getStore.paymentSettings.livegatewayUrl
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SecretKey key is missing'));
            }
            if (!data.isv_id) {
                return res.json(helper.showValidationErrorResponse('IsvId key is missing'));
            }
            if (!data.gatewayUrl) {
                return res.json(helper.showValidationErrorResponse('Base Url is missing'));
            }
            if (!data.merchantId) {
                return res.json(helper.showValidationErrorResponse('merchantId is missing'));
            }
            let checkdata = {
                API_KEY: data.apikey,
                gatewayUrl: data.gatewayUrl,
                merchantId: data.merchantId
            }
            paymentMiddleware.getbank360(checkdata, async (resdata) => {
                if (!resdata.status) {
                    return res.json(helper.showValidationErrorResponse(resdata.message));
                }
                else {
                    res.json(helper.showSuccessResponse("RESPONSE_SUCCESS", resdata))
                }
            })
        } catch (error) {
            console.log("add supplier error----------", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    createMerchantUser: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store

            let data = req.body;
            if (user.role != 'VENDOR') {
                return res.json(helper.showValidationErrorResponse('Invalid Vendor'));
            }
            if (!data.firstName) {
                return res.json(helper.showValidationErrorResponse('firstname requried'));
            }
            if (!data.lastName) {
                return res.json(helper.showValidationErrorResponse('lastName requried'));
            }
            if (!data.emailAddress) {
                return res.json(helper.showValidationErrorResponse('emailAddress requried'));
            }
            if (!data.phone) {
                return res.json(helper.showValidationErrorResponse('phone requried'));
            }
            if (!data.businessClassification) {
                return res.json(helper.showValidationErrorResponse('businessClassification requried'));
            }
            data.legalName = data.firstName + " " + data.lastName
            data.isvName = "Tap N Dine"
            let getStore = await settingService.chekStoreSetting(store.storeId, "pay360");
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.secretKey;
                data.isv_id = getStore.paymentSettings.isvId;
                data.merchantId = getStore.paymentSettings.supplierId;
                data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.apikey
                data.gatewayUrl = getStore.paymentSettings.gatewayUrl
            } else {

                data.secretKey = getStore.paymentSettings.livesecretKey;
                data.isv_id = getStore.paymentSettings.liveisvId;
                data.merchantId = getStore.paymentSettings.livesupplierId;
                data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.liveapikey
                data.gatewayUrl = getStore.paymentSettings.livegatewayUrl
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SecretKey key is missing'));
            }
            if (!data.isv_id) {
                return res.json(helper.showValidationErrorResponse('IsvId key is missing'));
            }
            if (!data.gatewayUrl) {
                return res.json(helper.showValidationErrorResponse('gateway Url is missing'));
            }
            if (!data.merchantId) {
                return res.json(helper.showValidationErrorResponse('merchantId is missing'));
            }
            let chargeData = {
                API_KEY: data.apikey,
                isvName: data.isvName,
                isvId: data.isv_id,
                legalName: data.legalName,
                type: "GENERIC",
                gatewayUrl: data.gatewayUrl,
                businessClassification: data.businessClassification
            }
            //  console.log("add data---", chargeData)
            paymentMiddleware.addSupplier360(chargeData, async (response) => {
                if (!response.status) {
                    return res.json(helper.showValidationErrorResponse(response.message));
                }
                else {

                    //res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                    //module.exports.invdualreques(data, store, getStore, user)
                    let checkdata = {
                        API_KEY: data.apikey,
                        gatewayUrl: data.gatewayUrl,
                        merchantId: data.merchantId
                    }
                    paymentMiddleware.getbank360(checkdata, async (resdata) => {
                        if (!resdata.status) {
                            return res.json(helper.showValidationErrorResponse(resdata.message));
                        }
                        else {
                            if (!resdata.chargeId || !resdata.chargeId.length) {
                                return res.json(helper.showValidationErrorResponse('admin account is missing'));
                            }
                            let bankaccount = resdata.chargeId[0]
                            // let bankdata = {
                            //     API_KEY: data.apikey,
                            //     id: bankaccount.id,
                            //     isvId: data.isv_id,
                            //     gatewayUrl: data.gatewayUrl,
                            //     merchantOwned: false,
                            //     displayName: bankaccount.displayName,
                            //     accountHolder: bankaccount.accountHolder,
                            //     sortCode: bankaccount.sortCode,
                            //     accountNumber: bankaccount.accountNumber,
                            //     merchantId: response.chargeId.id,
                            //     lastStatusChangeAt: bankaccount.lastStatusChangeAt
                            // }
                            bankaccount['status'] = "VERIFIED"
                            bankaccount['API_KEY'] = data.apikey
                            bankaccount['isvId'] = data.isv_id
                            bankaccount['gatewayUrl'] = data.gatewayUrl
                            bankaccount.merchantOwned = false
                            bankaccount.merchantId = response.chargeId.id
                            paymentMiddleware.addbank360(bankaccount, async (invite) => {
                                if (!invite.status) {
                                    return res.json(helper.showValidationErrorResponse(invite.message));
                                }
                                else {
                                    let invaitedata = {
                                        API_KEY: data.apikey,
                                        email: data.emailAddress,
                                        isvId: data.isv_id,
                                        name: user.name,
                                        merchantId: response.chargeId.id,
                                        gatewayUrl: data.gatewayUrl
                                    }
                                    paymentMiddleware.inavaite360(invaitedata, async (invite) => {
                                        if (!invite.status) {
                                            //console.log(invite.message)
                                            return res.json(helper.showValidationErrorResponse(invite.message));
                                        }
                                        else {
                                            invaitedata['apikey'] = invaitedata.API_KEY
                                            module.exports.createApplication(invaitedata)
                                            await User.updateOne({ _id: user._id }, { pay360Split: { status: true, accountId: null, merchantId: response.chargeId.id } })
                                            return res.json(helper.showSuccessResponse("Mail has been sent,please check your mail"));
                                        }
                                    })
                                }
                            })
                        }
                    })


                }
            });
        } catch (error) {
            console.log("add supplier error----------", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getmerchnatAccount: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store
            let data = {}
            let dataparam = req.query
            console.log("query data---", dataparam)
            if (dataparam && dataparam.id) {
                console.log("found")
                user = await User.findOne({ _id: ObjectId(req.query.id), status: { $nin: ['archived', 'temp'] }, role: "VENDOR" })
                if (!user) {
                    return res.json(helper.showValidationErrorResponse('Invalid Vendor'));
                }
            }
            if (user.role != 'VENDOR') {
                return res.json(helper.showValidationErrorResponse('Invalid Vendor'));
            }
            let getStore = await settingService.chekStoreSetting(store.storeId, "pay360");
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.secretKey;
                data.isv_id = getStore.paymentSettings.isvId;
                data.merchantId = getStore.paymentSettings.supplierId;
                data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.apikey
                data.gatewayUrl = getStore.paymentSettings.gatewayUrl
            } else {

                data.secretKey = getStore.paymentSettings.livesecretKey;
                data.isv_id = getStore.paymentSettings.liveisvId;
                data.merchantId = getStore.paymentSettings.livesupplierId;
                data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.liveapikey
                data.gatewayUrl = getStore.paymentSettings.livegatewayUrl
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SecretKey key is missing'));
            }
            if (!data.isv_id) {
                return res.json(helper.showValidationErrorResponse('IsvId key is missing'));
            }
            if (!data.gatewayUrl) {
                return res.json(helper.showValidationErrorResponse('gateway Url is missing'));
            }
            let userdata = await User.findOne({ _id: user._id }, "pay360Split")
            if (!userdata) {
                return res.json(helper.showValidationErrorResponse('Invalid Vendor'));
            }
            if (!userdata.pay360Split) {
                return res.json(helper.showValidationErrorResponse('Setting Not found'));
            }
            if (userdata.pay360Split) {
                let splitdata = userdata.pay360Split
                if (!splitdata.merchantId) {
                    return res.json(helper.showValidationErrorResponse('first create merchant'));
                }
                let checkdata = {
                    API_KEY: data.apikey,
                    gatewayUrl: data.gatewayUrl,
                    merchantId: splitdata.merchantId
                }
                paymentMiddleware.getbank360(checkdata, async (resdata) => {
                    if (!resdata.status) {
                        return res.json(helper.showValidationErrorResponse(resdata.message));
                    }
                    else {
                        let checkthirdprtyaccount = resdata.chargeId.filter(elemnet => {
                            return elemnet.merchantOwned == false
                        })
                        if (!checkthirdprtyaccount.length) {
                            await User.updateOne({ _id: user._id }, { pay360Split: { status: true, accountId: "", merchantId: checkdata.merchantId } })
                            return res.json(helper.showValidationErrorResponse('Setting Not found'));
                        }
                        checkthirdprtyaccount = checkthirdprtyaccount[0]
                        if (!checkthirdprtyaccount.thirdPartyBankAccount || checkthirdprtyaccount.thirdPartyBankAccount.merchantId != data.merchantId) {
                            await User.updateOne({ _id: user._id }, { pay360Split: { status: true, accountId: "", merchantId: checkdata.merchantId } })
                            return res.json(helper.showValidationErrorResponse('Setting Not found'));
                        }
                        let filterdata = resdata.chargeId.filter(elemnet => {
                            return elemnet.merchantOwned == true && elemnet.merchantId == checkdata.merchantId
                        })
                        if (!filterdata.length) {
                            return res.json(helper.showValidationErrorResponse('Account not found, please check your mail for add account'));
                        }
                        else {
                            let checkverfiedaccount = filterdata.filter(elemnet => {
                                return elemnet.status == "VERIFIED"
                            })
                            if (!checkverfiedaccount.length) {
                                return res.json(helper.showValidationErrorResponse('Your account not verified yet. please contact to pay360 adminstrator'));
                            }
                            let bnkaccount = checkverfiedaccount[0]
                            await User.updateOne({ _id: user._id }, { pay360Split: { status: true, accountId: bnkaccount.accountNumber, merchantId: checkdata.merchantId } })
                        }
                        res.json(helper.showSuccessResponse("RESPONSE_SUCCESS"))
                    }
                })
            }
        } catch (error) {
            console.log("add supplier error----------", error);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getmerchnat: async (userData, storedata) => {
        try {
            let user = userData;
            let store = storedata
            let data = {}
            if (user.role != 'VENDOR') {
                console.log('Invalid Vendor')
                return "Invalid Vendor"
            }
            let getStore = await settingService.chekStoreSetting(store.storeId, "pay360");
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.secretKey;
                data.isv_id = getStore.paymentSettings.isvId;
                data.merchantId = getStore.paymentSettings.supplierId;
                data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.apikey
                data.gatewayUrl = getStore.paymentSettings.gatewayUrl
            } else {

                data.secretKey = getStore.paymentSettings.livesecretKey;
                data.isv_id = getStore.paymentSettings.liveisvId;
                data.merchantId = getStore.paymentSettings.livesupplierId;
                data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.liveapikey
                data.gatewayUrl = getStore.paymentSettings.livegatewayUrl
            }

            if (!data.secretKey) {
                console.log('SecretKey key is missing')
                return "SecretKey key is missing"
            }
            if (!data.isv_id) {
                console.log('IsvId key is missing')
                return "IsvId key is missing"
            }
            if (!data.gatewayUrl) {
                console.log('gateway Url is missing')
                return 'gateway Url is missing'
            }
            let userdata = await User.findOne({ _id: user._id }, "pay360Split")
            if (!userdata) {
                console.log('Invalid Vendor')
                return "Invalid Vendor"
            }
            if (!userdata.pay360Split) {
                console.log('Setting Not found')
                return 'Setting Not found'
            }
            if (userdata.pay360Split) {
                let splitdata = userdata.pay360Split
                if (!splitdata.merchantId) {
                    console.log('first create merchant')
                    return 'first create merchant'
                }
                let checkdata = {
                    API_KEY: data.apikey,
                    gatewayUrl: data.gatewayUrl,
                    merchantId: splitdata.merchantId
                }
                return new Promise((resolve, reject) => {
                    paymentMiddleware.varify360(checkdata, async (resdata) => {
                        if (!resdata.status) {
                            console.log(resdata.message)
                            resolve(resdata.message)
                        }
                        else {
                            resolve(resdata.chargeId)
                        }
                    })
                })

            }
        } catch (error) {
            console.log("get supplier error----------", error);
            return error.message
        }
    },
    createMerchantUserbysignup: async (storedata, userdata) => {
        try {
            let user = userdata;
            let store = storedata
            let data = { firstName: user.name, lastName: "", emailAddress: user.email, businessClassification: store.name };
            if (user.role != 'VENDOR') {
                console.log('Invalid Vendor')
                return
                //return res.json(helper.showValidationErrorResponse('Invalid Vendor'));
            }
            // if (!data.firstName) {
            //     return res.json(helper.showValidationErrorResponse('firstname requried'));
            // }
            // if (!data.lastName) {
            //     return res.json(helper.showValidationErrorResponse('lastName requried'));
            // }
            // if (!data.emailAddress) {
            //     return res.json(helper.showValidationErrorResponse('emailAddress requried'));
            // }
            // if (!data.phone) {
            //     return res.json(helper.showValidationErrorResponse('phone requried'));
            // }
            // if (!data.businessClassification) {
            //     return res.json(helper.showValidationErrorResponse('businessClassification requried'));
            // }
            data.legalName = data.firstName + " " + data.lastName
            data.isvName = "Tap N Dine"
            let getStore = await settingService.chekStoreSetting(store.storeId, "pay360");
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.secretKey;
                data.isv_id = getStore.paymentSettings.isvId;
                data.merchantId = getStore.paymentSettings.supplierId;
                data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.apikey
                data.gatewayUrl = getStore.paymentSettings.gatewayUrl
            } else {

                data.secretKey = getStore.paymentSettings.livesecretKey;
                data.isv_id = getStore.paymentSettings.liveisvId;
                data.merchantId = getStore.paymentSettings.livesupplierId;
                data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;
                data.apikey = getStore.paymentSettings.liveapikey
                data.gatewayUrl = getStore.paymentSettings.livegatewayUrl
            }

            if (!data.secretKey) {
                console.log('SecretKey key is missing')
                return
                //return res.json(helper.showValidationErrorResponse('SecretKey key is missing'));
            }
            if (!data.isv_id) {
                console.log('IsvId key is missing')
                return
                // return res.json(helper.showValidationErrorResponse('IsvId key is missing'));
            }
            if (!data.gatewayUrl) {
                console.log('gateway Url is missing')
                return
                //return res.json(helper.showValidationErrorResponse('gateway Url is missing'));
            }
            if (!data.merchantId) {
                console.log('merchantId is missing')
                return
                // return res.json(helper.showValidationErrorResponse('merchantId is missing'));
            }
            let chargeData = {
                API_KEY: data.apikey,
                isvName: data.isvName,
                isvId: data.isv_id,
                legalName: data.legalName,
                type: "GENERIC",
                gatewayUrl: data.gatewayUrl,
                businessClassification: data.businessClassification
            }
            //  console.log("add data---", chargeData)
            paymentMiddleware.addSupplier360(chargeData, async (response) => {
                if (!response.status) {
                    console.log(response.message)
                    return
                    //return res.json(helper.showValidationErrorResponse(response.message));
                }
                else {

                    //res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                    //module.exports.invdualreques(data, store, getStore, user)
                    let checkdata = {
                        API_KEY: data.apikey,
                        gatewayUrl: data.gatewayUrl,
                        merchantId: data.merchantId
                    }
                    paymentMiddleware.getbank360(checkdata, async (resdata) => {
                        if (!resdata.status) {
                            console.log(resdata.message)
                            return
                            //return res.json(helper.showValidationErrorResponse(resdata.message));
                        }
                        else {
                            if (!resdata.chargeId || !resdata.chargeId.length) {
                                console.log("admin account is missing")
                                return
                                //return res.json(helper.showValidationErrorResponse('admin account is missing'));
                            }
                            let bankaccount = resdata.chargeId[0]
                            // let bankdata = {
                            //     API_KEY: data.apikey,
                            //     id: bankaccount.id,
                            //     isvId: data.isv_id,
                            //     gatewayUrl: data.gatewayUrl,
                            //     merchantOwned: false,
                            //     displayName: bankaccount.displayName,
                            //     accountHolder: bankaccount.accountHolder,
                            //     sortCode: bankaccount.sortCode,
                            //     accountNumber: bankaccount.accountNumber,
                            //     merchantId: response.chargeId.id,
                            //     lastStatusChangeAt: bankaccount.lastStatusChangeAt
                            // }
                            bankaccount['status'] = "VERIFIED"
                            bankaccount['API_KEY'] = data.apikey
                            bankaccount['isvId'] = data.isv_id
                            bankaccount['gatewayUrl'] = data.gatewayUrl
                            bankaccount.merchantOwned = false
                            bankaccount.merchantId = response.chargeId.id
                            paymentMiddleware.addbank360(bankaccount, async (invite) => {
                                if (!invite.status) {
                                    console.log(invite.message)
                                    //return res.json(helper.showValidationErrorResponse(invite.message));
                                }
                                else {
                                    let invaitedata = {
                                        API_KEY: data.apikey,
                                        email: data.emailAddress,
                                        isvId: data.isv_id,
                                        name: user.name,
                                        merchantId: response.chargeId.id,
                                        gatewayUrl: data.gatewayUrl
                                    }
                                    paymentMiddleware.inavaite360(invaitedata, async (invite1) => {
                                        if (!invite1.status) {
                                            console.log(invite1.message)
                                            //return res.json(helper.showValidationErrorResponse(invite.message));
                                        }
                                        else {
                                            invaitedata['apikey'] = invaitedata.API_KEY
                                            module.exports.createApplication(invaitedata)
                                            await User.updateOne({ _id: user._id }, { pay360Split: { status: true, accountId: null, merchantId: response.chargeId.id } })
                                            console.log("Mail has been sent,please check your mail")
                                            return
                                            //return res.json(helper.showSuccessResponse("Mail has been sent,please check your mail"));
                                        }
                                    })
                                }
                            })
                        }
                    })


                }
            });
        } catch (error) {
            console.log("add supplier error----------", error);
            return //res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}