const cardTable = require('../models/cardTable');
const Config = require("../config/constants.json")
const Order = require('../models/ordersTable');
const agenda = require('../cron/agenda');
const orderService = require('../helper/orderService');
const deliveryRequest = require('../helper/deliveryRequest');
const User = require('../models/userTable');
const Store = require('../models/storeTable');
const BillingPlan = require('../models/billingPlansTable');
const Transaction = require('../helper/transaction');
const settingService = require('../helper/settingService');
const ObjectId = require('objectid');
const paymentMiddleware = require('../middleware/payments');
const momentz = require('moment-timezone');
const moment = require('moment');
const storeType = require('../models/storeTypeTable');
module.exports = {

    generateBraintreeClientToken: async (req, res) => {
        try {
            const user = req.user;
            let data = req.body;
            data.user = user._id;
            data.email = user.email;
            data.name = user.name;
            let store = req.store;
            data.storeId = store.storeId;
            data.payment_method = 'braintree';

            let checkPayment = await settingService.chekPaymentSetting(data);

            if (!checkPayment.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (checkPayment.flag && !checkPayment.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }

            if (checkPayment.paymentSettings.merchantId == null || checkPayment.paymentSettings.publicKey == null || checkPayment.paymentSettings.privateKey == null) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            data = { ...data, ...checkPayment.paymentSettings };
            data.paymentMode = checkPayment.paymentMode;
            //console.log("data:===>", data)
            paymentMiddleware.generateClientTokenByBraintree(data, (response) => {
                // console.log("response:===>", response)
                if (!response.status) {
                    res.json(helper.showBraintreeErrorResponse(response.message, response.code));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', response.response));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserCardListWeb: async (req, res) => {
        try {
            let user = req.user;
            let wallet = user.wallet ? user.wallet : 0;
            let store = req.store;
            const paymentSettings = store.paymentSettings;
            let psL = [];
            let base_url = env.apiBaseUrl;
            let isPaypalActive = false;
            let isStripeActive = false;
            let isSquareActive = false;
            let isPay360Active = false;
            let isPaystackActive = false;
            let isFlutterwaveActive = false;
            let isDpoActive = false;
            let storeTypeId = req.query.storeTypeId;
            let activePaymentMethodForCard = store.activePaymentMethodForAddCard;
            if (paymentSettings.length > 0) {

                paymentSettings.forEach(element => {

                    if (element.payment_method === "orangeMoney" && element.status) {

                        let obj = {
                            payment_method: "orangeMoney",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Orange Money",
                            webViewUrl: env.apiUrl + "order/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "razorpay" && element.status) {

                        let obj = {
                            payment_method: "razorpay",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Cards, Wallet, UPI and Netbanking",
                            webViewUrl: env.apiUrl + "order/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }

                    if (element.payment_method === "pay360" && element.status) {
                        isPay360Active = true
                        let obj = {
                            payment_method: "pay360",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Add Card",
                            webViewUrl: env.apiUrl + "card/add/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=checkout&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "moncash" && element.status) {
                        let obj = {
                            payment_method: "moncash",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Pay with Moncash",
                            webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "dpo" && element.status) {
                        isDpoActive = true;
                        let obj = {
                            payment_method: "dpo",
                            logo: base_url + '/images/' + element.payment_method + '.jpeg',
                            label: "Add Card",
                            webViewUrl: env.apiUrl + "card/add/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=checkout&deviceType=web"
                            //webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "wallet" && element.status) {
                        let obj = {
                            payment_method: "wallet",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Wallet"
                        }

                        psL.push(obj);
                    }

                    if (element.payment_method === "cod" && element.status) {
                        let obj = {
                            payment_method: "cod",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Cash"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "cardOnDelivery" && element.status) {
                        let obj = {
                            payment_method: "cardOnDelivery",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: __('CARD_ON_DELIVERY')
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "braintree" && element.status) {
                        isPaypalActive = true;
                    }

                    if (element.payment_method === "stripe" && element.status) {
                        isStripeActive = true;
                    }

                    if (element.payment_method === "square" && element.status) {
                        isSquareActive = true;
                    }

                    if (element.payment_method === "paystack" && element.status) {
                        // let checkcard = element.cardenable;
                        // console.log(env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web")

                        let obj = {
                            payment_method: "paystack",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Paystack/Direct"
                            //webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                        isPaystackActive = true;
                    }
                    if (element.payment_method === "flutterwave" && element.status) {
                        let obj = {
                            payment_method: "flutterwave",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Flutterwave"
                        }

                        psL.push(obj);
                        isFlutterwaveActive = true;
                    }
                });
            }

            let cardsList = [];
            let paypalList = [];
            let isPaypalLink = false;

            if (isPaypalActive) {
                paypalList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "paypal" });
                if (paypalList.length > 0) {
                    isPaypalLink = true;
                }
            }

            if (isStripeActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "stripe" });
            } else if (isSquareActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "square" });
            } else if (isPaystackActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "paystack" });
            } else if (isPay360Active) {
                cardsList = await cardTable.getUserCardByPayment360({ user: user._id, payment_method: "pay360" });
                //let url = env.apiUrl + "card/webview?id=" + user._id + "&payment_method=pay360" + "&from=checkout&deviceType=web"
                //cardsList = await cardTable.getUserCardByPay360({ user: user._id, payment_method: "pay360" }, url);
            }
            else if (isFlutterwaveActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "flutterwave" });
            } else if (isDpoActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "dpo" });
            }

            let otherList = [...paypalList, ...psL];
            if (storeTypeId) {
                let getStoreType = await storeType.getStoreTypeByIdAsync(storeTypeId);
                if (getStoreType && ["TAXI", "PICKUPDROP"].includes(getStoreType.storeType)) {
                    otherList = otherList.filter(element => (element.payment_method === "wallet" || element.payment_method === "cod"))
                }
            }
            const resdata = {
                otherList: otherList,
                cardsList: cardsList,
                wallet: wallet,
                isPaypalActive: isPaypalActive,
                isPaypalLink: isPaypalLink,
                isStripeActive: isStripeActive,
                isSquareActive: isSquareActive,
                isPaystackActive: isPaystackActive,
                isPay360Active: isPay360Active,
                isDpoActive,
                isFlutterwaveActive
            }
            if (helper.isValidHidethings(store, "isEnableMultiplePaymentMethod")) {
                // Object.assign(resdata, { activePaymentMethodForCard });
                // Object.assign(resdata, { isEnableMultiplePaymentMethod: true });
                await module.exports.multiplePaymentMethod(resdata, activePaymentMethodForCard, user, null);

            } else {
                Object.assign(resdata, { isEnableMultiplePaymentMethod: false });
                activePaymentMethodForCard = helper.getActivePaymentMethodForSaveCard(resdata);
                Object.assign(resdata, { activePaymentMethodForCard });

            }
            let result = helper.showSuccessResponse('DATA_SUCCESS', resdata);
            res.json(result);
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserCardList: async (req, res) => {
        try {
            let user = req.user;

            cardTable.getUserCard(user._id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.length === 0) {
                        res.json(helper.showSuccessResponse('NO_DATA_FOUND', []));
                    } else {
                        res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserCardListForApp: async (req, res) => {
        try {
            let user = req.user;
            let store = req.store;
            const paymentSettings = store.paymentSettings;
            let psL = [];
            let base_url = env.apiBaseUrl;
            let isPay360Active = false;
            let isPaypalActive = false;
            let isStripeActive = false;
            if (paymentSettings.length > 0) {

                paymentSettings.forEach(element => {

                    if (element.payment_method === "orangeMoney" && element.status) {

                        let obj = {
                            payment_method: "orangeMoney",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Orange Money",
                            webViewUrl: env.apiUrl + "order/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=mobile"
                        }

                        psL.push(obj);
                    }

                    if (element.payment_method === "razorpay" && element.status) {

                        let obj = {
                            payment_method: "razorpay",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Cards, Wallet, UPI and Netbanking",
                            webViewUrl: env.apiUrl + "order/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=mobile"
                        }

                        psL.push(obj);
                    }

                    if (element.payment_method === "pay360" && element.status) {

                        // let obj = {
                        //     payment_method: "pay360",
                        //     logo: base_url + '/images/' + element.payment_method + '.png',
                        //     label: "Pay by Card",
                        //     webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=mobile"
                        // }

                        // psL.push(obj);
                        isPay360Active = true
                        let obj = {
                            payment_method: "pay360",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Add Card",
                            webViewUrl: env.apiUrl + "card/add/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "moncash" && element.status) {
                        let obj = {
                            payment_method: "moncash",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Pay with Moncash",
                            webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "braintree" && element.status) {
                        isPaypalActive = true;
                    }

                    if (element.payment_method === "stripe" && element.status) {
                        isStripeActive = true;
                    }
                });
            }

            let [paypal, cards, pay360] = await Promise.all([
                cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "paypal" }),
                cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "stripe" }),
                cardTable.getUserCardByPayment360({ user: user._id, payment_method: "pay360" })
            ]);

            let cardsList = [];
            let paypalList = [];

            if (isPaypalActive) {
                if (paypal.length > 0) {
                    paypalList = paypal;
                } else {

                    let obj = {
                        payment_method: "braintree",
                        logo: base_url + '/images/paypal.png',
                        label: "Paypal",
                        webViewUrl: "https://" + store.domain + '/manage-payments'
                    }

                    paypalList.push(obj);

                }
            }

            if (isStripeActive) {
                cardsList = cards;
            }

            if (isPay360Active) {
                cardsList = pay360;
            }

            let otherList = [...paypalList, ...psL];

            let resdata = [...otherList, ...cardsList];

            res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserPaymentsListForApp: async (req, res) => {
        try {
            let user = req.user;
            let wallet = user.wallet ? user.wallet : 0;
            let store = req.store;
            let type = req.query.type
            let storeTypeId = req.query.storeTypeId;
            const paymentSettings = store.paymentSettings;
            let psL = [];
            let base_url = env.apiBaseUrl;
            let isPaypalActive = false;
            let isStripeActive = false;
            let isSquareActive = false;
            let isPay360Active = false;
            let isMoncashActive = false;
            let isDpoActive = false;
            let pay360Url = ""
            let isPaystackActive = false;
            let isFlutterwaveActive = false;
            let dpoUrl = ""
            let activePaymentMethodForCard = store.activePaymentMethodForAddCard;

            if (paymentSettings.length > 0) {

                paymentSettings.forEach(element => {

                    if (element.payment_method === "orangeMoney" && element.status) {

                        let obj = {
                            payment_method: "orangeMoney",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Orange Money",
                            webViewUrl: env.apiUrl + "order/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }

                    if (element.payment_method === "razorpay" && element.status) {

                        let obj = {
                            payment_method: "razorpay",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Cards, Wallet, UPI and Netbanking",
                            webViewUrl: env.apiUrl + "order/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "pay360" && element.status) {

                        // let obj = {
                        //     payment_method: "pay360",
                        //     logo: base_url + '/images/' + element.payment_method + '.png',
                        //     label: "Pay with pay360",
                        //     webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        // }

                        // psL.push(obj);
                        isPay360Active = true
                        pay360Url = env.apiUrl + "card/add/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        // let obj = {
                        //     payment_method: "pay360",
                        //     logo: base_url + '/images/' + element.payment_method + '.png',
                        //     label: "Add Card",
                        //     webViewUrl: 
                        // }

                        // psL.push(obj);
                    }
                    if (element.payment_method === "moncash" && element.status) {
                        isMoncashActive = true;
                        let obj = {
                            payment_method: "moncash",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Pay with Moncash",
                            webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "dpo" && element.status) {
                        isDpoActive = true;
                        dpoUrl = env.apiUrl + "card/add/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        // let obj = {
                        //     payment_method: "dpo",
                        //     logo: base_url + '/images/' + element.payment_method + '.jpeg',
                        //     label: "Add Dpo Card",
                        //     webViewUrl: dpoUrl
                        // }

                        // psL.push(obj);
                    }
                    if (element.payment_method === "paystack" && element.status) {
                        let obj = {
                            payment_method: "paystack",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Paystack",
                            //webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                        isPaystackActive = true;
                    }
                    if (element.payment_method === "flutterwave" && element.status) {
                        let obj = {
                            payment_method: "flutterwave",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Flutterwave"
                        }

                        psL.push(obj);
                        isFlutterwaveActive = true;
                    }

                    if (!type) {

                        if (element.payment_method === "wallet" && element.status) {
                            let obj = {
                                payment_method: "wallet",
                                logo: base_url + '/images/' + element.payment_method + '.png',
                                label: __('WALLET')
                            }

                            psL.push(obj);
                        }

                        if (element.payment_method === "cod" && element.status) {
                            let obj = {
                                payment_method: "cod",
                                logo: base_url + '/images/' + element.payment_method + '.png',
                                label: __('CASH')
                            }

                            psL.push(obj);
                        }
                        if (element.payment_method === "cardOnDelivery" && element.status) {
                            let obj = {
                                payment_method: "cardOnDelivery",
                                logo: base_url + '/images/' + element.payment_method + '.png',
                                label: __('CARD_ON_DELIVERY')
                            }

                            psL.push(obj);
                        }
                    }

                    if (element.payment_method === "braintree" && element.status) {
                        isPaypalActive = true;
                    }

                    if (element.payment_method === "stripe" && element.status) {
                        isStripeActive = true;
                    }

                    if (element.payment_method === "square" && element.status) {
                        isSquareActive = true;
                    }

                    // if (element.payment_method === "paystack" && element.status) {
                    //     let obj = {
                    //         payment_method: "paystack",
                    //         logo: base_url + '/images/' + element.payment_method + '.png',
                    //         label: "Paystack",
                    //         //webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                    //     }

                    //     psL.push(obj);
                    //     isPaystackActive = true;
                    // }
                });
            }

            let cardsList = [];
            let paypalList = [];
            let isPaypalLink = false;

            if (isPaypalActive) {
                paypalList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "paypal" });
                if (paypalList.length > 0) {
                    isPaypalLink = true;
                } else {

                    let obj = {
                        payment_method: "braintree",
                        logo: base_url + '/images/paypal.png',
                        label: "Paypal",
                        webViewUrl: "https://" + store.domain + '/manage-payments'
                    }

                    paypalList.push(obj);
                }
            }

            if (isStripeActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "stripe" });
            } else if (isSquareActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "square" });
            } else if (isPaystackActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "paystack" });
            } else if (isPay360Active) {
                let urldata = env.apiUrl + "/card/webview?id=" + user._id + "&payment_method=pay360&from=wallet"
                cardsList = await cardTable.getUserCardByPay360({ user: user._id, payment_method: "pay360" }, urldata);
            } else if (isFlutterwaveActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "flutterwave" });
            } else if (isDpoActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "dpo" });
            }


            let otherList = [...paypalList, ...psL];

            const lastPaymentMethods = await Order.findOne({ user: user._id }, "paymentMethod paymentSourceRef").sort({ _id: -1 }).lean();
            cardsList.map(items => {
                if (lastPaymentMethods && items._id.toString() == lastPaymentMethods.paymentSourceRef) {
                    items["defaultPaymentMethod"] = true;
                    //items.set("defaultPaymentMethod", true, { strict: false });
                }
                else {
                    items["defaultPaymentMethod"] = false;
                    // items.set("defaultPaymentMethod", false, { strict: false });
                }
            });
            otherList.map(items => {
                if (lastPaymentMethods && items.payment_method == lastPaymentMethods.paymentMethod) {
                    items["defaultPaymentMethod"] = true;
                }
                else {
                    items["defaultPaymentMethod"] = false;

                }
            });

            if (storeTypeId) {
                let getStoreType = await storeType.getStoreTypeByIdAsync(storeTypeId);
                if (getStoreType && ["TAXI", "PICKUPDROP"].includes(getStoreType.storeType)) {
                    otherList = otherList.filter(element => (element.payment_method === "wallet" || element.payment_method === "cod"));
                }
            }

            const resdata = {
                otherList: otherList,
                cardsList: cardsList,
                wallet: wallet,
                isPaypalActive: isPaypalActive,
                isPaypalLink: isPaypalLink,
                isStripeActive: isStripeActive,
                isSquareActive: isSquareActive,
                isPaystackActive: isPaystackActive,
                isPay360Active: isPay360Active,
                isMoncashActive: isMoncashActive,
                isDpoActive: isDpoActive,
                pay360Url: pay360Url,
                dpoUrl,
                isFlutterwaveActive
            }
            if (helper.isValidHidethings(store, "isEnableMultiplePaymentMethod")) {
                await module.exports.multiplePaymentMethod(resdata, activePaymentMethodForCard, user, lastPaymentMethods);

            } else {
                Object.assign(resdata, { isEnableMultiplePaymentMethod: false });
            }
            let result = helper.showSuccessResponse('DATA_SUCCESS', resdata);
            res.json(result);
        } catch (error) {
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    multiplePaymentMethod: async (resdata, activePaymentMethodForCard, user, lastPaymentMethods) => {
        try {
            return new Promise(async (resolve, reject) => {
                Object.assign(resdata, { activePaymentMethodForCard });
                Object.assign(resdata, { isEnableMultiplePaymentMethod: true });
                let cardsList = [];
                if (resdata.isStripeActive && activePaymentMethodForCard === "stripe") {
                    cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "stripe" });
                } else if (resdata.isSquareActive && activePaymentMethodForCard === "square") {
                    cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "square" });
                } else if (resdata.isPaystackActive && activePaymentMethodForCard === "paystack") {
                    cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "paystack" });
                } else if (resdata.isPay360Active && activePaymentMethodForCard === "pay360") {
                    let urldata = env.apiUrl + "/card/webview?id=" + user._id + "&payment_method=pay360&from=wallet"
                    cardsList = await cardTable.getUserCardByPay360({ user: user._id, payment_method: "pay360" }, urldata);
                } else if (resdata.isFlutterwaveActive && activePaymentMethodForCard === "flutterwave") {
                    cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "flutterwave" });
                } else if (resdata.isDpoActive && activePaymentMethodForCard === "dpo") {
                    cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "dpo" });
                };
                if (lastPaymentMethods) {
                    cardsList.map(items => {
                        if (lastPaymentMethods && items._id.toString() == lastPaymentMethods.paymentSourceRef) {
                            items["defaultPaymentMethod"] = true;
                        } else {
                            items["defaultPaymentMethod"] = false;
                        }
                    });
                    resdata.otherList.map(items => {
                        if (lastPaymentMethods && items.payment_method == lastPaymentMethods.paymentMethod) {
                            Object.assign(items, { defaultPaymentMethod: true });
                        }
                        else {
                            Object.assign(items, { defaultPaymentMethod: false });
                        }
                    });
                };

                Object.assign(resdata, { cardsList: cardsList });
                resolve(resdata)
            });
        } catch (error) {
            console.log("error:===>", error)
        }

    },

    userAddCard: async (req, res) => {
        try {
            let data = req.body;
            console.log("userAddCard --> ", data);
            if (!data.payment_method) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_IS_REQUIRED'));
            }

            if (data.payment_method === "stripe") {
                module.exports.addCardByStripe(req, res);
            } else if (data.payment_method === "paypal") {
                module.exports.addCardByBraintree(req, res);
            } else if (data.payment_method === "square") {
                module.exports.addCardBySquare(req, res);
            } else if (data.payment_method === "paystack") {
                module.exports.addCardByPaystack(req, res);
            } else if (data.payment_method === "flutterwave") {
                module.exports.addCardByFlutterwave(req, res);

            } else {
                return res.json(helper.showValidationErrorResponse('INVALID_PAYMENT_METHOD'));
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addCardByStripe: async (req, res) => {
        try {
            const user = req.user;
            let data = req.body;
            data.user = user._id;
            data.email = user.email;
            let store = req.store;
            data.storeId = store.storeId;

            const getStoreType = await Store.getStorePaymentSettingAsync(data.storeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE'));
            }

            if (getStoreType.paymentSettings.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            const getGatewaySetting = getStoreType.paymentSettings.filter(payment => {
                return payment.payment_method === data.payment_method;
            });

            if (getGatewaySetting.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStoreType.paymentMode === 'sandbox') {
                data.secretKey = getGatewaySetting[0].sandboxSecretKey;
            } else {
                data.secretKey = getGatewaySetting[0].liveSecretKey;
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (!data.last4digit) {
                return res.json(helper.showValidationErrorResponse('LAST_4_DIGIT_IS_REQUIRED'));
            }

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            data.logo = helper.getCardIcon(data.type);

            if (!data.token) {
                return res.json(helper.showValidationErrorResponse('TOKEN_IS_REQUIRED'));
            }
            //console.log("data---", data)
            paymentMiddleware.stripeCreateCustomer(data, (response) => {
                if (!response.status) {
                    //console.log("add crdd err strip", response)
                    console.log(helper.showStripeErrorResponse(response.message, response.code))
                    return res.json(helper.showStripeErrorResponse(response.message, response.code));
                } else {
                    data.token = response.data.id;
                    data.details = response;

                    cardTable.addCard(data, async (err, resdata) => {
                        if (err) {
                            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            await User.findByIdAndUpdate(user._id, { isBankFieldsAdded: true })
                            res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                        }
                    });
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addCardByBraintree: async (req, res) => {
        try {
            const user = req.user;
            let data = req.body;
            data.user = user._id;
            data.email = user.email;
            data.name = user.name;
            let store = req.store;
            data.storeId = store.storeId;
            let payment_method = data.payment_method;
            data.payment_method = 'braintree';

            let checkPayment = await settingService.chekPaymentSetting(data);

            if (!checkPayment.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (checkPayment.flag && !checkPayment.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }

            if (!data.token) {
                return res.json(helper.showValidationErrorResponse('NONCE_IS_REQUIRED'));
            }

            if (checkPayment.paymentSettings.merchantId == null || checkPayment.paymentSettings.publicKey == null || checkPayment.paymentSettings.privateKey == null) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            data = { ...data, ...checkPayment.paymentSettings };
            data.paymentMode = checkPayment.paymentMode;
            data.logo = helper.getCardIcon(payment_method);

            const getCard = await cardTable.findOne({ payment_method: payment_method, user: ObjectId(data.user) });

            if (getCard == null) {

                paymentMiddleware.createCustomerByBraintree(data, (response) => {
                    if (!response.status) {
                        res.json(helper.showBraintreeErrorResponse(response.message, response.code));
                    } else {
                        data.token = response.response.customer.id;
                        data.details = response.response.customer;
                        data.payment_method = payment_method;

                        cardTable.addCardByBraintree(data, (err, resdata) => {
                            if (err) {
                                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                            }
                        });
                    }
                });

            } else {

                data.customerId = getCard.token;

                paymentMiddleware.updateCustomerByBraintree(data, (response) => {
                    if (!response.status) {
                        res.json(helper.showBraintreeErrorResponse(response.message, response.code));
                    } else {
                        data.token = response.response.customer.id;
                        data.details = response.response.customer;
                        data.payment_method = payment_method;

                        cardTable.addCardByBraintree(data, (err, resdata) => {
                            if (err) {
                                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                            }
                        });
                    }
                });
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addCardByPaystack: async (req, res) => {
        try {
            const user = req.user;
            let data = req.body;
            data.user = user._id;
            data.email = user.email;
            let store = req.store;
            data.storeId = store.storeId;

            const getStoreType = await Store.getStorePaymentSettingAsync(data.storeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE'));
            }

            if (getStoreType.paymentSettings.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            const getGatewaySetting = getStoreType.paymentSettings.filter(payment => {
                return payment.payment_method === data.payment_method;
            });

            if (getGatewaySetting.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStoreType.paymentMode === 'sandbox') {
                data.secretKey = getGatewaySetting[0].sandboxSecretKey
            } else {
                data.secretKey = getGatewaySetting[0].liveSecretKey;
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            data.currency = getStoreType.currency.code
            if (!["NGN", "GHS", "ZAR"].includes(data.currency)) {
                return res.json(helper.showValidationErrorResponse('Currency Not Valid'));
            }
            if (!data.token) {
                return res.json(helper.showValidationErrorResponse('TOKEN_IS_REQUIRED'));
            }
            paymentMiddleware.verifyTransactionPaystack(data, (response) => {
                if (!response.status) {
                    console.log("In verify")
                    res.json(helper.showPaystackErrorResponse(response.message, response.status));
                } else {

                    let refundObj = {
                        chargeId: response.chargeId.data.id,
                        secretKey: data.secretKey,
                        cost: response.chargeId.data.amount,
                        currency: data.currency
                    }
                    console.log("refund obj----")
                    console.log(refundObj)
                    if (response.chargeId.data.status == "success") {
                        paymentMiddleware.refundAmountByPaystack(refundObj, (response2) => {
                            if (!response2.status) {
                                console.log("In refund--")
                                res.json(helper.showPaystackErrorResponse(response2.message, response2.status));
                            }
                            else {
                                data.token = response.chargeId.data.authorization.authorization_code;
                                data.email = response.chargeId.data.customer.email;
                                data.details = response.chargeId.data.customer;
                                data.last4digit = response.chargeId.data.authorization.last4
                                data.logo = helper.getCardIcon(response.chargeId.data.authorization.card_type);
                                if (response.chargeId.data.authorization.reusable) {
                                    cardTable.addCard(data, (err, resdata) => {
                                        if (err) {
                                            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                        } else {
                                            res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                                        }
                                    });
                                }
                                else {
                                    return res.json(helper.showValidationErrorResponse('YOU CANNOT SAVE THIS CARD'));
                                }
                            }
                        });
                    }
                    else {
                        return res.json(helper.showValidationErrorResponse('PLEASE ENTER VALID CARD'));
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addCardByFlutterwave: async (req, res) => {
        try {
            const user = req.user;
            let data = req.body;
            data.user = user._id;
            data.email = user.email;
            let store = req.store;
            data.storeId = store.storeId;
            console.log("storeId:", data.storeId);
            const getStoreType = await Store.getStorePaymentSettingAsync(data.storeId);
            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE'));
            }

            if (getStoreType.paymentSettings.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            const getGatewaySetting = getStoreType.paymentSettings.filter(payment => {
                return payment.payment_method === data.payment_method;
            });

            if (getGatewaySetting.length === 0) {
                console.log("<===getGatewaySetting Issues===>");
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStoreType.paymentMode === 'sandbox') {
                data.secretKey = getGatewaySetting[0].sandboxSecretKey;
                data.pubKey = getGatewaySetting[0].sandboxPublishabelKey;
                data.enckey = getGatewaySetting[0].sandboxEncKey;
            } else {
                data.secretKey = getGatewaySetting[0].liveSecretKey;
                data.pubKey = getGatewaySetting[0].livePublishabelKey;
                data.enckey = getGatewaySetting[0].liveEncKey;
            }

            if (!data.secretKey || !data.pubKey || !data.enckey) {
                console.log("<===keys Issues===>");
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            data.currency = getStoreType.currency.code
            if (!["NGN", "GHS", "ZAR", "USD"].includes(data.currency)) {
                return res.json(helper.showValidationErrorResponse('Currency Not Valid'));
            }
            if (!data.token) {
                return res.json(helper.showValidationErrorResponse('TOKEN_IS_REQUIRED'));
            }
            data.transactionId = data.token;
            paymentMiddleware.verifyTransactionFlutterwave(data, (response) => {
                console.log("response:==>", response)
                if (!response.status) {
                    console.log("In verify --", response)
                    return res.json(helper.showValidationErrorResponse(response.message));
                } else {

                    console.log("refund obj----")
                    if (response.data.status == "successful") {
                        let cronJobRefundObj = {
                            transactionId: data.transactionId,
                            cost: response.data.amount,
                            storeId: data.storeId
                        };
                        let refundProceedWaitTime = 'in ' + 10 + ' minutes';
                        agenda.schedule(refundProceedWaitTime, 'flutterwave refund', cronJobRefundObj);

                        data.token = response.data.card.token;
                        data.email = response.data.customer.email;
                        data.details = response.data.customer;
                        data.last4digit = response.data.card.last_4digits;
                        data.logo = helper.getCardIcon(response.data.card.type);
                        cardTable.addCard(data, (err, resdata) => {
                            if (err) {
                                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                            }
                        });

                    }
                    else {
                        return res.json(helper.showValidationErrorResponse('PLEASE ENTER VALID CARD'));
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addCardBySquare: async (req, res) => {
        try {
            const user = req.user;
            let data = req.body;
            data.user = user._id;
            data.email = user.email;
            data.name = user.name;
            let store = req.store;
            data.storeId = store.storeId;

            const getStoreType = await Store.getStorePaymentSettingAsync(data.storeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE'));
            }

            if (getStoreType.paymentSettings.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            const getGatewaySetting = getStoreType.paymentSettings.filter(payment => {
                return payment.payment_method === data.payment_method;
            });

            if (getGatewaySetting.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStoreType.paymentMode === 'sandbox') {
                data.secretKey = getGatewaySetting[0].sandboxSecretKey;
            } else {
                data.secretKey = getGatewaySetting[0].liveSecretKey;
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (!data.last4digit) {
                return res.json(helper.showValidationErrorResponse('LAST_4_DIGIT_IS_REQUIRED'));
            }

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            data.logo = helper.getCardIcon(data.type);

            if (!data.token) {
                return res.json(helper.showValidationErrorResponse('TOKEN_IS_REQUIRED'));
            }

            paymentMiddleware.createCustomerBySquare(data, (response) => {
                if (!response.status) {
                    res.json(helper.showStripeErrorResponse(response.message, response.code));
                } else {

                    data.squareCustomerId = response.response.id;
                    data.details = response.response;
                    data.card_nonce = data.token
                    paymentMiddleware.createCustomerCardBySquare(data, (squareresponse) => {
                        console.log("squareresponse :", squareresponse);

                        if (!squareresponse.status) {
                            res.json(helper.showStripeErrorResponse(response.message, response.code));
                        } else {
                            data.token = squareresponse.response.card.id

                            cardTable.addCard(data, (err, resdata) => {
                                if (err) {
                                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                } else {
                                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                                }
                            });
                        }
                    })

                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    userRemoveCard: async (req, res) => {
        try {
            const user = req.user;
            let data = req.body;
            data.user = user._id;
            data.email = user.email;
            data.name = user.name;
            let store = req.store;
            data.storeId = store.storeId;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getCard = await cardTable.findById(data._id);

            if (getCard === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ID'));
            }

            const getStoreType = await Store.getStorePaymentSettingAsync(data.storeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE'));
            }

            if (getStoreType.paymentSettings.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            const getGatewaySetting = getStoreType.paymentSettings.filter(payment => {
                return payment.payment_method === (getCard.payment_method && getCard.payment_method === "paypal" ? "braintree" : getCard.payment_method);
            });

            if (getGatewaySetting.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStoreType.paymentMode === 'sandbox') {
                data.secretKey = getGatewaySetting[0].sandboxSecretKey;
            } else {
                data.secretKey = getGatewaySetting[0].liveSecretKey;
            }

            cardTable.removeCard(data._id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                    //disable customer card from square
                    if (resdata.payment_method === "square") {
                        data.cardId = resdata.token
                        paymentMiddleware.disableCustomerCardBySquare(data, (response) => { })
                    }
                }
            });
        } catch (error) {
            console.log("error==>", error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addStoreCardByStripe: async (req, res) => {
        try {
            const user = req.user;
            let data = req.body;
            data.user = user._id;
            data.email = user.email;
            let store = req.store;
            data.store = store.storeId;

            if (env.superAdminStripe.paymentMode === 'sandbox') {
                data.secretKey = env.superAdminStripe.sandbox.Stripe_Secret_Key;
            } else {
                data.secretKey = env.superAdminStripe.live.Stripe_Secret_Key;
            }

            if (!data.last4digit) {
                return res.json(helper.showValidationErrorResponse('LAST_4_DIGIT_IS_REQUIRED'));
            }

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            data.logo = helper.getCardIcon(data.type);

            if (!data.token) {
                return res.json(helper.showValidationErrorResponse('TOKEN_IS_REQUIRED'));
            }

            paymentMiddleware.stripeCreateCustomer(data, (response) => {
                if (!response.status) {
                    res.json(helper.showStripeErrorResponse(response.message, response.code));
                } else {

                    console.log("response", response);

                    data.token = response.data.id;
                    data.details = response;

                    cardTable.addCard(data, async (err, resdata) => {
                        if (err) {
                            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            await Store.findByIdAndUpdate({ _id: data.store }, { cardDetails: resdata._id });
                            res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                        }
                    });
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    upgradeStorePlan: async (req, res) => {
        try {
            let data = req.body;
            const user = req.user;
            data.user = user._id;
            data.email = user.email;
            data.customerName = user.name;
            let store = req.store;
            data.store = store.storeId;

            if (env.superAdminStripe.paymentMode === 'sandbox') {
                data.secretKey = env.superAdminStripe.sandbox.Stripe_Secret_Key;
            } else {
                data.secretKey = env.superAdminStripe.live.Stripe_Secret_Key;
            }

            //check first card is added or not
            let getStore = await Store.findById(data.store, 'plan cardDetails storeType').populate({ path: "cardDetails" }).populate({ path: 'storeType', match: { status: "active" }, select: 'storeType storeVendorType status' }).populate({ path: 'plan.billingPlan', select: 'type interval price addon' });;
            let cardDetails = null;
            if (getStore.cardDetails) {
                cardDetails = getStore.cardDetails;
            }

            if (cardDetails == null) {
                return res.json(helper.showValidationErrorResponse('PLEASE_ADD_YOUR_CARD_FIRST'));
            }

            if (!data.billingPlan) {
                return res.json(helper.showValidationErrorResponse('PLAN_ID_IS_REQUIRED'));
            }

            const getPlan = await BillingPlan.findById(data.billingPlan, 'planId type interval price addon');
            console.log("getPlan :", getPlan);

            if (getPlan == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_PLAN'));
            }

            if (getStore.plan.isTrial) {
                // return res.json(helper.showValidationErrorResponse('YOU_ARE_ON_TRIAL'));
                if (["premium", "basic"].includes(getPlan.type) && getStore.storeType.length > 1) {
                    return res.json(helper.showValidationErrorResponse('ONLY_1_STORE_ALLOWED'));
                }

                if (getPlan.type === "basic") {
                    let isAllSingleVendor = true;

                    getStore.storeType.forEach(element => {
                        if (element.storeVendorType === "AGGREAGATOR") {
                            isAllSingleVendor = false;
                        }
                    });

                    if (!isAllSingleVendor) {
                        return res.json(helper.showValidationErrorResponse('ONLY_SINGLE_VENDOR_ALLOWED'));
                    }
                }
                data.cost = Number(getPlan.price).toFixed(2);
                data.paymentSourceRef = getStore.cardDetails._id;
                data.billingPlan = getPlan._id;
                console.log("final cost ", data.cost);
                payment(data, getStore, getPlan)
            }
            else {
                let isExpired = false;
                const cDate = new Date();
                const exptime = new Date(getStore.plan.endDate);
                if (cDate.getTime() >= exptime.getTime()) {
                    isExpired = true;
                }

                if (!getStore.plan.endDate) {
                    isExpired = true;
                }

                if (isExpired) {
                    return res.json(helper.showValidationErrorResponse('CONTACT_OUR_SUPPERT_TEAM'));
                }

                if (["premium", "basic"].includes(getPlan.type) && getStore.storeType.length > 1) {
                    return res.json(helper.showValidationErrorResponse('ONLY_1_STORE_ALLOWED'));
                }

                if (getPlan.type === "basic") {
                    let isAllSingleVendor = true;

                    getStore.storeType.forEach(element => {
                        if (element.storeVendorType === "AGGREAGATOR") {
                            isAllSingleVendor = false;
                        }
                    });

                    if (!isAllSingleVendor) {
                        return res.json(helper.showValidationErrorResponse('ONLY_SINGLE_VENDOR_ALLOWED'));
                    }
                }

                if (getPlan.type === getStore.plan.billingPlan.type) {
                    return res.json(helper.showValidationErrorResponse('YOU_HAVE_ALREADY_SUBSCRIBED'));
                }

                let prevPlanCost = Number(getStore.plan.billingPlan.price);
                let planCost = Number(getPlan.price);

                // if (getStore.plan.isAddon) {
                //     prevPlanCost += Number(getStore.plan.billingPlan.addon);
                // }
                // if (data.isAddon) {
                //     planCost += Number(getPlan.addon);
                // }

                if (planCost < prevPlanCost) {

                    Store.findOneAndUpdate({ _id: ObjectId(data.store) }, { "plan.isTrial": false, "plan.billingPlan": data.billingPlan, "plan.planAmount": getPlan.price, "plan.isDiscount": false })
                        .then(resdata => {
                            res.json(helper.showSuccessResponse('SUBSCRIPTION_SUCCESS', resdata));
                        })
                        .catch(err => {
                            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        })
                    return;
                }

                let planRemaningDays = moment(getStore.plan.endDate).diff(moment(), 'days');
                let oneDayPlanCost = planCost / (getPlan.interval === "month" ? 30 : 360);
                let remaningDaysCost = oneDayPlanCost * planRemaningDays;

                let oneDayPrevPlanCost = prevPlanCost / (getStore.plan.billingPlan.interval === "month" ? 30 : 360);
                let remaningPrevPlanCost = oneDayPrevPlanCost * planRemaningDays;

                data.cost = parseFloat(parseFloat(remaningDaysCost - remaningPrevPlanCost).toFixed(2));
                data.paymentSourceRef = getStore.cardDetails._id;
                data.billingPlan = getPlan._id;
                console.log("final cost ", data.cost);

                payment(data, getStore, getPlan)
            }
            function payment(data, getStore, getPlan) {
                paymentMiddleware.paymentByStripe(data, async (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {
                        console.log("response", response);
                        data.chargeId = response.response.id;
                        const interval = getPlan.interval;
                        const planAmount = getPlan.price;
                        data.endDate = moment().add(1, interval + "s").endOf('day');
                        const transactionDetails = response.response;
                        data.meta = [
                            {
                                key: "payment_method",
                                value: "Stripe",
                            },
                            {
                                key: "balance_transaction",
                                value: transactionDetails.balance_transaction,
                            },
                            {
                                key: "id",
                                value: transactionDetails.id,
                            },
                            {
                                key: "receipt_url",
                                value: transactionDetails.receipt_url,
                            },
                            {
                                key: "renewal_date",
                                value: data.endDate,
                            }
                        ];

                        // Update plan in store
                        await Store.findOneAndUpdate({ _id: ObjectId(getStore._id) }, { "plan.isTrial": false, "plan.endDate": data.endDate, "plan.planAmount": planAmount, "plan.billingPlan": data.billingPlan });

                        let resdata = Transaction.addStoreBillingTransaction(getStore._id, data.cost, data.chargeId, data.meta, "Upgrade Plan Charge");

                        res.json(helper.showSuccessResponse('SUBSCRIPTION_SUCCESS', resdata));
                    }
                });
            }

        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    upgradeStorePlanNew: async (req, res) => {
        try {
            let data = req.body;
            const user = req.user;
            data.user = user._id;
            data.email = user.email;
            data.customerName = user.name;
            let store = req.store;
            data.store = store.storeId;

            if (env.superAdminStripe.paymentMode === 'sandbox') {
                data.secretKey = env.superAdminStripe.sandbox.Stripe_Secret_Key;
            } else {
                data.secretKey = env.superAdminStripe.live.Stripe_Secret_Key;
            }

            //check first card is added or not
            let getStore = await Store.findById(data.store, 'plan cardDetails storeType').populate({ path: "cardDetails" }).populate({ path: 'storeType', match: { status: "active" }, select: 'storeType storeVendorType status' }).populate({ path: 'plan.billingPlan', select: 'type interval price addon' });;
            let cardDetails = null;
            if (getStore.cardDetails) {
                cardDetails = getStore.cardDetails;
            }

            if (cardDetails == null) {
                return res.json(helper.showValidationErrorResponse('PLEASE_ADD_YOUR_CARD_FIRST'));
            }

            if (!data.billingPlan) {
                return res.json(helper.showValidationErrorResponse('PLAN_ID_IS_REQUIRED'));
            }

            const getPlan = await BillingPlan.findById(data.billingPlan, 'type interval price addon');
            console.log("getPlan :", getPlan);

            if (getPlan == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_PLAN'));
            }

            if (getPlan._id.toString() == getStore.plan.billingPlan._id.toString() && !getStore.plan.isTrial) {
                return res.json(helper.showValidationErrorResponse('YOU_HAVE_ALREADY_SUBSCRIBED'));
            }

            let isExpired = false;
            const cDate = new Date();
            const exptime = new Date(getStore.plan.endDate);
            if (cDate.getTime() >= exptime.getTime()) {
                isExpired = true;
            }

            let downgrade = false;

            if (getPlan.interval === "month" && getStore.plan.billingPlan.interval === "semiAnnual" && !getStore.plan.isTrial) {
                downgrade = true;
            } else if (getPlan.interval === "month" && getStore.plan.billingPlan.interval === "year" && !getStore.plan.isTrial) {
                downgrade = true;
            } else if (getPlan.interval === "semiAnnual" && getStore.plan.billingPlan.interval === "year" && !getStore.plan.isTrial) {
                downgrade = true;
            }

            if (downgrade && !isExpired && !getStore.plan.isTrial) {
                return res.json(helper.showValidationErrorResponse('CONTACT_OUR_SUPPERT_TEAM'));
            } else {

                if (!downgrade && !getStore.plan.isTrial) {
                    let planPrice = getPlan.price;
                    //previous plan
                    let planRemaningDays = moment(getStore.plan.endDate).diff(moment(), 'days');
                    let prevPlanCost = getStore.plan.billingPlan.price;
                    let oneDayPrevPlanCost = prevPlanCost / (getStore.plan.billingPlan.interval === "month" ? 30 : (getStore.plan.billingPlan.interval === "semiAnnual" ? 180 : 365));
                    let remaningPrevPlanCost = oneDayPrevPlanCost * planRemaningDays;
                    data.cost = helper.roundNumber(planPrice - remaningPrevPlanCost);
                } else {
                    data.cost = helper.roundNumber(getPlan.price + getPlan.addon);
                }

                data.paymentSourceRef = getStore.cardDetails._id;
                data.currency = "USD";

                paymentMiddleware.paymentByStripe(data, async (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {
                        data.chargeId = response.response.id;
                        const interval = getPlan.interval;
                        const planAmount = getPlan.price;
                        let days = 30;

                        if (interval === 'semiAnnual') {
                            days = 180;
                        } else if (interval === 'year') {
                            days = 365;
                        }

                        data.endDate = moment().add(days, "days").endOf('day');

                        const transactionDetails = response.response;

                        data.meta = [
                            {
                                key: "payment_method",
                                value: "Stripe",
                            },
                            {
                                key: "balance_transaction",
                                value: transactionDetails.balance_transaction,
                            },
                            {
                                key: "id",
                                value: transactionDetails.id,
                            },
                            {
                                key: "receipt_url",
                                value: transactionDetails.receipt_url,
                            },
                            {
                                key: "renewal_date",
                                value: data.endDate,
                            }
                        ];

                        // Update plan in store
                        await Store.findOneAndUpdate({ _id: ObjectId(getStore._id) }, { "plan.isTrial": false, "plan.endDate": data.endDate, "plan.planAmount": planAmount, "plan.billingPlan": data.billingPlan });

                        let resdata = Transaction.addStoreBillingTransaction(getStore._id, data.cost, data.chargeId, data.meta, "Upgrade Plan Charge");

                        res.json(helper.showSuccessResponse('SUBSCRIPTION_SUCCESS', resdata));
                    }
                });
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addMoneyToWallet: async (req, res) => {
        try {
            const user = req.user;
            let getCard;
            user.wallet = user.wallet ? user.wallet : 0;

            let data = req.body;
            let store = req.store;
            data.storeId = store.storeId;
            if (!data.paymentSourceRef) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_REQUIRED'));
            }
            if (data.payment_method != "moncash") {
                getCard = await cardTable.getCardByIdAsync(data.paymentSourceRef);
                if (getCard == null) {
                    return res.json(helper.showValidationErrorResponse('INVALID_PAYMENT_ID'));
                }
            }

            if (!data.wallet) {
                return res.json(helper.showValidationErrorResponse('WALLET_AMOUNT_IS_REQUIRED'));
            }
            let payment_method
            data.wallet = Number(data.wallet);
            if (data.payment_method != "moncash") {
                data.payment_method = getCard.payment_method;
                payment_method = getCard.payment_method;
            }
            else {
                payment_method = "moncash"
            }

            if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
                payment_method = 'braintree';
            }

            let getStore = await settingService.chekStoreSetting(data.storeId, payment_method);
            data.currency = getStore.currency.code;

            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }

            if (data.payment_method === "stripe") {

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    cost: data.wallet,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: data.currency
                }
                paymentMiddleware.paymentByStripe(chargeData, (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {
                        let wallet = helper.roundNumber(data.wallet + user.wallet);
                        module.exports.transactionuser(user, store, data.wallet, wallet)
                        User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                            if (err) {
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse('SAVE_SUCCESS', resdata));
                                module.exports.userRefereeSetting(data, resdata, store);
                            }
                        });
                    }
                });

            } else if (data.payment_method === "paystack") {
                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }
                let chargeData = {
                    cost: data.wallet,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: data.currency
                }
                console.log("chargeData------")
                console.log(chargeData)
                paymentMiddleware.paymentChargebyPaystack(chargeData, (response) => {
                    if (!response.status) {
                        console.log("error in charge")
                        res.json(helper.showStripeErrorResponse(response.message, response.status));
                    } else {
                        console.log("response.response.status", response.response.status)

                        if (response.response.status != "success") {
                            console.log("Payment failed")
                            res.json(helper.showStripeErrorResponse(response.response.gateway_response, response.response.status));

                        }
                        else {
                            let wallet = helper.roundNumber(data.wallet + user.wallet);
                            module.exports.transactionuser(user, store, data.wallet, wallet)
                            User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                                if (err) {
                                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                } else {
                                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                                    module.exports.userRefereeSetting(data, resdata, store);
                                }
                            });
                        }
                    }
                });
            } else if (data.payment_method === "flutterwave") {

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                    data.pubKey = getStore.paymentSettings.sandboxPublishabelKey;
                    data.enckey = getStore.paymentSettings.sandboxEncKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                    data.pubKey = getStore.paymentSettings.livePublishabelKey;
                    data.enckey = getStore.paymentSettings.liveEncKey;
                }

                let chargeData = {
                    cost: data.wallet,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    pubKey: data.pubKey,
                    enckey: data.enckey,
                    currency: data.currency
                }
                paymentMiddleware.paymentChargebyFlutterwave(chargeData, (response) => {
                    if (!response.status) {
                        return res.json(helper.showValidationErrorResponse(response.message));

                    } else {
                        console.log("response.status delivery", response.response.status)
                        if (response.response.status != "successful") {
                            console.log("Payment failed")
                            return res.json(helper.showValidationErrorResponse(response.message));
                        }
                        else {
                            let wallet = helper.roundNumber(data.wallet + user.wallet);
                            module.exports.transactionuser(user, store, data.wallet, wallet);
                            User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                                if (err) {
                                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                } else {
                                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                                    module.exports.userRefereeSetting(data, resdata, store);

                                }
                            });
                        }
                    }
                });
            } else if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {

                if (getStore.paymentSettings.merchantId == null || getStore.paymentSettings.publicKey == null || getStore.paymentSettings.privateKey == null) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    cost: data.wallet,
                    paymentSourceRef: data.paymentSourceRef,
                    merchantId: getStore.paymentSettings.merchantId,
                    publicKey: getStore.paymentSettings.publicKey,
                    privateKey: getStore.paymentSettings.privateKey,
                    paymentMode: getStore.paymentMode
                }

                paymentMiddleware.paymentByBraintreeByCustomer(chargeData, (response) => {
                    if (!response.status) {
                        res.json(helper.showBraintreeErrorResponse(response.message, response.code));
                    } else {
                        let wallet = helper.roundNumber(data.wallet + user.wallet);
                        module.exports.transactionuser(user, store, data.wallet, wallet)
                        User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                            if (err) {
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                                module.exports.userRefereeSetting(data, resdata, store);

                            }
                        });
                    }
                });
            } else if (data.payment_method === "pay360") {

                if (!ObjectId.isValid(data.paymentSourceRef)) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                }



                let webViewUrl = env.apiUrl + "/card/webview?id=" + user._id + "&payment_method=" + data.payment_method + "&from=wallet&ref=" + data.paymentSourceRef + "&amount=" + data.wallet;
                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { webViewUrl: webViewUrl }));

            } else if (data.payment_method === "moncash") {
                let webViewUrl = env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + data.payment_method + "&from=wallet&amount=" + data.wallet;;
                //let webViewUrl = env.apiUrl + "/card/webview?id=" + user._id + "&payment_method=" + data.payment_method + "&from=wallet&ref=" + data.paymentSourceRef + "&amount=" + data.wallet;
                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', { webViewUrl: webViewUrl }));

            } else if (data.payment_method === "dpo") {

                if (getStore.paymentMode === 'sandbox') {
                    data.companytoken = getStore.paymentSettings.companytoken;
                    data.endpoint = getStore.paymentSettings.endpoint;
                    data.servicetype = getStore.paymentSettings.servicenumber;
                } else {

                    data.companytoken = getStore.paymentSettings.livecompanytoken;
                    data.endpoint = getStore.paymentSettings.liveendpoint;
                    data.servicetype = getStore.paymentSettings.liveservicenumber;

                }
                if (!data.companytoken) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.endpoint) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.servicetype) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                let todaydate = Date.now()
                let servicedate = momentz.tz(todaydate, getStore.timezone).format("YYYY/MM/DD HH:mm")
                chargeData = {
                    companytoken: data.companytoken,
                    currency: getStore.currency.code,
                    amount: data.wallet,
                    endpoint: data.endpoint,
                    servicetype: data.servicetype,
                    servicedescription: "User add to wallet amount",
                    servicedate: servicedate
                }
                paymentMiddleware.dpoCreatePayment(chargeData, async (response) => {
                    if (!response.status) {
                        return res.json(helper.showValidationErrorResponse(response.message));
                    }
                    else {
                        //console.log("response---wallet", response)
                        let carddata = {
                            companytoken: data.companytoken,
                            endpoint: data.endpoint,
                            transactiontoken: response.data.TransToken,
                            paymentSourceRef: data.paymentSourceRef
                        }
                        paymentMiddleware.chargebycard(carddata, async (cdres) => {
                            if (!cdres.status) {
                                let cancelrequest = {
                                    companytoken: data.companytoken,
                                    endpoint: data.endpoint,
                                    transactiontoken: response.data.TransToken
                                }
                                paymentMiddleware.dpoCancelPayment(cancelrequest, async (cancelres) => {
                                    if (!cancelres.status) {
                                        console.log("cancel request error  message---", cancelres.message)
                                        //return res.json(helper.showValidationErrorResponse(response.message));
                                    }
                                    else {
                                        console.log("dpo request cancelled", cancelres)
                                    }
                                })
                                return res.json(helper.showValidationErrorResponse(cdres.message));

                            }
                            else {
                                console.log("charge by card data---", cdres)
                                let wallet = helper.roundNumber(data.wallet + user.wallet);
                                module.exports.transactionuser(user, store, data.wallet, wallet)
                                User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                                    if (err) {
                                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                    } else {
                                        module.exports.userRefereeSetting(data, resdata, store);
                                        return res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                                    }
                                });
                            }
                        })
                    }
                })
            }
            else {
                return res.json(helper.showValidationErrorResponse('INVALID_PAYMENT_METHOD'));
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addtowalletpaystck: async (req, res) => {
        try {
            const user = req.user;
            user.wallet = user.wallet ? user.wallet : 0;

            let data = req.body;
            let store = req.store;
            data.storeId = store.storeId;
            if (!data.hasOwnProperty('transactionRef')) {
                return res.json(helper.showValidationErrorResponse('TOKEN_IS_REQUIRED'));
            }
            let getStore = await settingService.chekStoreSetting(data.storeId, "paystack");

            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }
            let paystackObj = {
                secretKey: data.secretKey,
                token: data.transactionRef
            }
            //console.log("paystackObj")
            //console.log(paystackObj)
            paymentMiddleware.verifyTransactionPaystack(paystackObj, (response) => {
                if (!response.status) {
                    console.log("In verify")
                    res.json(helper.showPaystackErrorResponse(response.message, response.status));
                } else {

                    //console.log("response----for paystack")
                    //console.log(response.chargeId)
                    data.wallet = response.chargeId.data.amount / 100
                    if (response.chargeId.data.status == "success") {
                        let wallet = helper.roundNumber(data.wallet + user.wallet);
                        module.exports.transactionuser(user, store, data.wallet, wallet)
                        User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                            if (err) {
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                                module.exports.userRefereeSetting(data, resdata, store);

                            }
                        });
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addtowalletByFlutterwave: async (req, res) => {
        try {
            const user = req.user;
            user.wallet = user.wallet ? user.wallet : 0;

            let data = req.body;
            let store = req.store;
            data.storeId = store.storeId;
            //console.log("data:==>", data)
            if (!data.hasOwnProperty('transactionRef')) {
                return res.json(helper.showValidationErrorResponse('TOKEN_IS_REQUIRED'));
            }
            let getStore = await settingService.chekStoreSetting(data.storeId, "flutterwave");

            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }

            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                data.pubKey = getStore.paymentSettings.sandboxPublishabelKey;
                data.enckey = getStore.paymentSettings.sandboxEncKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
                data.pubKey = getStore.paymentSettings.livePublishabelKey;
                data.enckey = getStore.paymentSettings.liveEncKey;
            }
            let paystackObj = {
                secretKey: data.secretKey,
                pubKey: data.pubKey,
                transactionId: data.transactionRef,
                enckey: data.enckey
            }

            paymentMiddleware.verifyTransactionFlutterwave(paystackObj, (response) => {
                // console.log("response --", response)
                if (!response.status) {
                    console.log("In verify --", response)
                    return res.json(helper.showValidationErrorResponse(response.message));
                } else {
                    data.wallet = response.data.amount;
                    if (response.data.status == "successful") {
                        let wallet = helper.roundNumber(data.wallet + user.wallet);
                        module.exports.transactionuser(user, store, data.wallet, wallet)
                        User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                            if (err) {
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                                module.exports.userRefereeSetting(data, resdata, store);
                            }
                        });
                    } else {
                        return res.json(helper.showValidationErrorResponse(response.message));
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    transactiondata: async (user, store, wallet) => {
        await Transaction.addTransaction(
            null,
            null,
            "DRIVER",
            store.storeId,
            user._id,
            wallet,
            "credit",
            `Credited in Wallet`,
            null,
            null,
            null,
            false
        );
    },
    transactionuser: async (user, store, wallet, balance) => {
        await Transaction.addTransactionUser(
            null,
            null,
            "USER",
            store.storeId,
            user._id,
            wallet,
            balance,
            "credit",
            `Credited in Wallet`,
            null,
            null,
            null,
            false
        );
    },

    driverMoneyToWallet: async (req, res) => {
        try {
            const user = req.user;
            user.wallet = user.wallet ? user.wallet : 0;

            let data = req.body;
            let store = req.store;
            data.storeId = store.storeId;

            if (!data.paymentSourceRef) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_REQUIRED'));
            }

            let getCard = await cardTable.getCardByIdAsync(data.paymentSourceRef);

            if (getCard == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_PAYMENT_ID'));
            }

            if (!data.wallet) {
                return res.json(helper.showValidationErrorResponse('WALLET_AMOUNT_IS_REQUIRED'));
            }
            data.wallet = Number(data.wallet);

            data.payment_method = getCard.payment_method;
            let payment_method = getCard.payment_method;

            if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
                payment_method = 'braintree';
            }

            let getStore = await settingService.chekStoreSetting(data.storeId, payment_method);
            data.currency = getStore.currency.code;

            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }

            if (data.payment_method === "stripe") {

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    cost: data.wallet,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: data.currency
                }
                paymentMiddleware.paymentByStripe(chargeData, async (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {
                        let wallet = helper.roundNumber(data.wallet);
                        module.exports.transactiondata(user, store, wallet)
                        res.json(helper.showSuccessResponse('UPDATE_SUCCESS'));
                    }
                });

            } else if (data.payment_method === "flutterwave") {

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                    data.pubKey = getStore.paymentSettings.sandboxPublishabelKey;
                    data.enckey = getStore.paymentSettings.sandboxEncKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                    data.pubKey = getStore.paymentSettings.livePublishabelKey;
                    data.enckey = getStore.paymentSettings.liveEncKey;
                }
                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.pubKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.enckey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                let chargeData = {
                    cost: data.wallet,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    pubKey: data.pubKey,
                    enckey: data.enckey,
                    currency: data.currency
                }
                paymentMiddleware.paymentChargebyFlutterwave(chargeData, (response) => {
                    if (!response.status) {
                        res.json(helper.showValidationErrorResponse(response.message));
                    } else {
                        console.log("response.status delivery", response.response.status)
                        if (response.response.status != "successful") {
                            console.log("Payment failed")
                            res.json(helper.showValidationErrorResponse(response.message));
                        }
                        else {
                            let wallet = helper.roundNumber(data.wallet + user.wallet);
                            module.exports.transactionuser(user, store, data.wallet, wallet);
                            User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                                if (err) {
                                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                } else {
                                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));

                                }
                            });
                        }
                    }
                });
            } else if (data.payment_method === "paystack") {

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }

                let chargeData = {
                    cost: data.wallet,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: data.currency
                }
                paymentMiddleware.paymentChargebyPaystack(chargeData, async (response) => {
                    if (!response.status) {
                        console.log("error in charge")
                        res.json(helper.showStripeErrorResponse(response.message, response.status));
                    } else {
                        console.log("response..status", response.response.status)
                        if (response.response.status != "success") {
                            console.log("Payment failed")
                            res.json(helper.showStripeErrorResponse(response.response.gateway_response, response.response.status));

                        }
                        else {
                            let wallet = helper.roundNumber(data.wallet);
                            module.exports.transactiondata(user, store, wallet);
                            res.json(helper.showSuccessResponse('UPDATE_SUCCESS'));

                        }
                    }
                });
            } else if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {

                if (getStore.paymentSettings.merchantId == null || getStore.paymentSettings.publicKey == null || getStore.paymentSettings.privateKey == null) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    cost: data.wallet,
                    paymentSourceRef: data.paymentSourceRef,
                    merchantId: getStore.paymentSettings.merchantId,
                    publicKey: getStore.paymentSettings.publicKey,
                    privateKey: getStore.paymentSettings.privateKey,
                    paymentMode: getStore.paymentMode
                }

                paymentMiddleware.paymentByBraintreeByCustomer(chargeData, async (response) => {
                    if (!response.status) {
                        res.json(helper.showBraintreeErrorResponse(response.message, response.code));
                    } else {
                        let wallet = helper.roundNumber(data.wallet);
                        module.exports.transactiondata(user, store, wallet);
                        res.json(helper.showSuccessResponse('UPDATE_SUCCESS'));
                    }
                });
            } else if (data.payment_method === "dpo") {

                if (getStore.paymentMode === 'sandbox') {
                    data.companytoken = getStore.paymentSettings.companytoken;
                    data.endpoint = getStore.paymentSettings.endpoint;
                    data.servicetype = getStore.paymentSettings.servicenumber;
                } else {

                    data.companytoken = getStore.paymentSettings.livecompanytoken;
                    data.endpoint = getStore.paymentSettings.liveendpoint;
                    data.servicetype = getStore.paymentSettings.liveservicenumber;

                }
                if (!data.companytoken) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.endpoint) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                if (!data.servicetype) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                let todaydate = Date.now()
                let servicedate = momentz.tz(todaydate, getStore.timezone).format("YYYY/MM/DD HH:mm")
                chargeData = {
                    companytoken: data.companytoken,
                    currency: getStore.currency.code,
                    amount: data.wallet,
                    endpoint: data.endpoint,
                    servicetype: data.servicetype,
                    servicedescription: "User add to wallet amount",
                    servicedate: servicedate
                }
                paymentMiddleware.dpoCreatePayment(chargeData, async (response) => {
                    if (!response.status) {
                        return res.json(helper.showValidationErrorResponse(response.message));
                    }
                    else {
                        //console.log("response---wallet", response)
                        let carddata = {
                            companytoken: data.companytoken,
                            endpoint: data.endpoint,
                            transactiontoken: response.data.TransToken,
                            paymentSourceRef: data.paymentSourceRef
                        }
                        paymentMiddleware.chargebycard(carddata, async (cdres) => {
                            if (!cdres.status) {
                                let cancelrequest = {
                                    companytoken: data.companytoken,
                                    endpoint: data.endpoint,
                                    transactiontoken: response.data.TransToken
                                }
                                paymentMiddleware.dpoCancelPayment(cancelrequest, async (cancelres) => {
                                    if (!cancelres.status) {
                                        console.log("driver cancel request error  message---", cancelres.message)
                                        //return res.json(helper.showValidationErrorResponse(response.message));
                                    }
                                    else {
                                        console.log("driver dpo request cancelled", cancelres)
                                    }
                                })
                                return res.json(helper.showValidationErrorResponse(cdres.message));

                            }
                            else {
                                console.log("driver charge by card data---", cdres)
                                let wallet = helper.roundNumber(data.wallet + user.wallet);
                                module.exports.transactionuser(user, store, data.wallet, wallet)
                                User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, profileresdata) => {
                                    if (err) {
                                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                    } else {
                                        res.json(helper.showSuccessResponse('UPDATE_SUCCESS', profileresdata));
                                    }
                                });
                            }
                        })
                    }
                })
            } else {
                return res.json(helper.showValidationErrorResponse('INVALID_PAYMENT_METHOD'));
            }
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    driverAddMoneyToWalletDirect: async (req, res) => {
        try {
            let data = req.body;
            let payment_method = data.payment_method;
            switch (payment_method) {
                case 'flutterwave':
                    return module.exports.driveraddtowalletFlutterwave(req, res);
                case 'paystack':
                    return module.exports.driveraddtowalletpaystck(req, res);
                default:
                    return module.exports.driveraddtowalletpaystck(req, res);
            }

        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    driveraddtowalletpaystck: async (req, res) => {
        try {
            const user = req.user;
            user.wallet = user.wallet ? user.wallet : 0;

            let data = req.body;
            let store = req.store;
            data.storeId = store.storeId;

            if (!data.hasOwnProperty('transactionRef')) {
                return res.json(helper.showValidationErrorResponse('TOKEN_IS_REQUIRED'));
            }
            let getStore = await settingService.chekStoreSetting(data.storeId, "paystack");

            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }
            let paystackObj = {
                secretKey: data.secretKey,
                token: data.transactionRef
            }
            paymentMiddleware.verifyTransactionPaystack(paystackObj, (response) => {
                if (!response.status) {
                    console.log("In driver verify paystack direct")
                    res.json(helper.showPaystackErrorResponse(response.message, response.status));
                } else {
                    data.wallet = response.chargeId.data.amount / 100
                    if (response.chargeId.data.status == "success") {
                        let wallet = helper.roundNumber(data.wallet);
                        module.exports.transactiondata(user, store, wallet)
                        res.json(helper.showSuccessResponse('UPDATE_SUCCESS'));
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    driveraddtowalletFlutterwave: async (req, res) => {
        try {
            const user = req.user;
            user.wallet = user.wallet ? user.wallet : 0;

            let data = req.body;
            let store = req.store;
            data.storeId = store.storeId;

            if (!data.hasOwnProperty('transactionRef')) {
                return res.json(helper.showValidationErrorResponse('TOKEN_IS_REQUIRED'));
            }
            let getStore = await settingService.chekStoreSetting(data.storeId, "flutterwave");

            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }

            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                data.pubKey = getStore.paymentSettings.sandboxPublishabelKey;
                data.enckey = getStore.paymentSettings.sandboxEncKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
                data.pubKey = getStore.paymentSettings.livePublishabelKey;
                data.enckey = getStore.paymentSettings.liveEncKey;
            }

            let paystackObj = {
                secretKey: data.secretKey,
                pubKey: data.pubKey,
                enckey: data.enckey,
                transactionId: data.transactionRef
            }
            paymentMiddleware.verifyTransactionFlutterwave(paystackObj, (response) => {
                if (!response.status) {
                    console.log("In driver verify flutterwave direct")
                    res.json(helper.showPaystackErrorResponse(response.message, response.status));
                } else {
                    if (response.data.status == "successful") {
                        data.wallet = response.data.amount;
                        let wallet = helper.roundNumber(data.wallet);
                        module.exports.transactiondata(user, store, wallet)
                        res.json(helper.showSuccessResponse('UPDATE_SUCCESS'));
                    }
                    else {
                        return res.json(helper.showValidationErrorResponse(response.message));
                    }
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    webViewPayment: async (req, res) => {
        try {
            let title = '';
            let message = '';
            let chargeData = {}
            let data = {}
            let { payment_method, from, id, amount } = req.query;
            title = "Process Payment";
            message = '';

            let getData = null;
            let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from
            if (from === "checkout") {
                getData = await Order.findOne({ customOrderId: id }, 'store user customOrderId orderTotal deliveryType billingDetails vendor')
                    .populate({ path: 'user', select: 'name email mobileNumber' })
                    .exec();
                data.name = getData.user.name;
                data.email = getData.user.email;
                data.mobileNumber = getData.user.countryCode + getData.user.mobileNumber;
                data.address = getData.deliveryType && getData.deliveryType === "DELIVERY" ? getData.billingDetails.address : null;
                data.amount = getData.orderTotal;
                data.customOrderId = id;
            } else if (from === "wallet") {
                getData = await User.findOne({ _id: ObjectId(id) }, 'store name email mobileNumber address');
                data.name = getData.name;
                data.email = getData.email;
                data.mobileNumber = getData.countryCode + getData.mobileNumber;
                data.address = getData.address ? getData.address : "";
                data.amount = amount ? amount : 0;
                data.customOrderId = Date.now();
            }

            if (!getData) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: title, data: 'User detail not found', message: "Invalid Data", url: cancelurl });
            }

            if (!data.amount) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: title, data: 'Params not  found', message: "Amount is required", url: cancelurl });
            }

            data.storeId = getData.store;

            let getStore = await settingService.chekStoreSetting(data.storeId, payment_method);

            if (!getStore) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: title, data: 'Store detail not found', message: "Store detail not found", url: cancelurl });
            }

            data.storeName = getStore.storeName;
            data.paymentMode = getStore.paymentMode;
            data.currency = getStore.currency.code;
            data.logo = getStore.logo ? getStore.logo.link : '';
            data.theme = getStore.theme;

            if (payment_method === "razorpay") {

                data.callback_url = env.apiUrl + "card/webview/callback?id=" + id + "&payment_method=" + payment_method.toLowerCase() + "&from=" + from + "&amount=" + data.amount

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxKey_secret;
                    data.Key_id = getStore.paymentSettings.sandboxKey_id;
                } else {
                    data.secretKey = getStore.paymentSettings.liveKey_secret;
                    data.Key_id = getStore.paymentSettings.liveKey_id;
                }

                chargeData = {
                    callback_url: data.callback_url,
                    return_url: env.apiUrl + "card/return?id=" + id + "&from=" + from + "&payment_method=" + payment_method + "&amount=" + data.amount,
                    currency: data.currency,
                    amount: data.amount,
                    KEY_SECRET: data.secretKey,
                    KEY_ID: data.Key_id,
                    name: data.storeName,
                    logo: data.logo,
                    theme: data.theme,
                    C_name: data.name,
                    C_email: data.email,
                    C_mobileNumber: data.mobileNumber,
                    C_address: data.address

                }

                paymentMiddleware.razorPayCreateOrder(chargeData, (response) => {
                    if (!response.status) {
                        cancelurl += "&type=FAILED"
                        return res.render('webViewError', { title: title, data: 'No Content Added', message: response.message, url: cancelurl });
                    } else {
                        res.render('razorPayIndex', { title: title, data: 'No Content Added', message: "", razorpay_response: response.data, chargeData });
                    }
                });

            } else if (payment_method === "orangeMoney") {

                if (getStore.paymentSettings.consumerKey == null || getStore.paymentSettings.merchantKey == null) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                const OMData = {
                    consumerKey: getStore.paymentSettings.consumerKey
                };

                paymentMiddleware.authByorangeMoney(OMData, (response) => {
                    if (!response.status) {
                        cancelurl += "&type=FAILED"
                        res.render('webViewError', { title: title, data: 'No Content Added', message: response.response.error_description, url: cancelurl });
                    } else {
                        console.log("response2", response);
                        data.access_token = response.response.access_token;
                        data.merchantKey = getStore.paymentSettings.merchantKey;
                        data.return_url = env.apiUrl + "card/return?id=" + id + "&from=" + from + "&payment_method=" + payment_method + "&amount=" + data.amount;
                        data.notif_url = env.apiUrl + 'card/notify?id=' + id + "&from=" + from + "&payment_method=" + payment_method + "&amount=" + data.amount;

                        paymentMiddleware.paymentByorangeMoney(data, (response) => {
                            if (!response.status) {
                                cancelurl += "&type=FAILED"
                                res.render('webViewError', { title: title, data: 'No Content Added', message: response.response.message, url: cancelurl });
                            } else {
                                console.log("response3", response);
                                res.redirect(response.response.payment_url);
                            }
                        });
                    }
                });

            } else if (payment_method === "pay360") {
                //  //11006250 ISV_ID
                //   //11006530 merchantId
                //  //6349173732734094212.MYW9N2X8C1IK82SIKP5NI8311 JWT
                // //GBP currency
                // //env.apiUrl + 
                //// if (!Number(data.amount)) {
                ////     return res.render('webViewError', { title: "Error", data: 'Payment Failed', message: "Amount not found" });
                //// }

                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.secretKey;
                    data.isv_id = getStore.paymentSettings.isvId;
                    data.merchantId = getStore.paymentSettings.merchantId;
                    data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                    data.apikey = getStore.paymentSettings.apikey
                    data.gatewayUrl = getStore.paymentSettings.gatewayUrl
                    data.supplierId = getStore.paymentSettings.supplierId;
                } else {

                    data.secretKey = getStore.paymentSettings.livesecretKey;
                    data.isv_id = getStore.paymentSettings.liveisvId;
                    data.merchantId = getStore.paymentSettings.livemerchantId;
                    data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;
                    data.apikey = getStore.paymentSettings.liveapikey
                    data.gatewayUrl = getStore.paymentSettings.livegatewayUrl
                    data.supplierId = getStore.paymentSettings.livesupplierId;
                }
                if (!data.secretKey) {
                    cancelurl += "&type=FAILED"
                    return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Screate key not valid", url: cancelurl });
                }
                if (!data.isv_id) {
                    cancelurl += "&type=FAILED"
                    return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "ISV key not valid", url: cancelurl });
                }
                if (!data.pay360BaseUrl) {
                    cancelurl += "&type=FAILED"
                    return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "url not valid", url: cancelurl });
                }
                if (!req.query.ref) {
                    cancelurl += "&type=FAILED"
                    return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "paymentSource not found", url: cancelurl });
                }
                let chargeData = {
                    return_url: env.apiUrl + "card/return/url/pay360?id=" + id + "&payment_method=pay360&from=" + from + "&amount=" + data.amount,
                    cancel_url: env.apiUrl + "card/return/url/pay360?id=" + id + "&from=" + from + "&type=cancel",
                    currency: data.currency,
                    amount: data.amount,
                    JWT: data.secretKey,
                    ISV_ID: data.isv_id,
                    paymentSourceRef: ObjectId(req.query.ref),
                    pay360BaseUrl: data.pay360BaseUrl
                }
                if (from === "checkout") {
                    let vendorbankfind = []
                    let adminbankfind = []
                    if (!data.apikey) {
                        cancelurl += "&type=FAILED"
                        return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "apikey not found", url: cancelurl });
                    }
                    if (!data.gatewayUrl) {
                        cancelurl += "&type=FAILED"
                        return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "gatewayUrl not found", url: cancelurl });
                    }
                    if (!getData.vendor) {
                        cancelurl += "&type=FAILED"
                        return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Vendor Not found", url: cancelurl });
                    }
                    let getVendor = await User.findOne({ _id: getData.vendor }, 'store name pay360Split')
                        .populate("store");

                    if (!getVendor) {
                        cancelurl += "&type=FAILED"
                        return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Vendor Not found", url: cancelurl });
                    }
                    let bankdata = {
                        API_KEY: data.apikey,
                        gatewayUrl: data.gatewayUrl,
                        merchantId: getVendor.pay360Split.merchantId
                    }
                    paymentMiddleware.getbank360(bankdata, async (response) => {
                        if (!response.status) {
                            cancelurl += "&type=FAILED"
                            return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
                        }
                        if (!response.chargeId || !response.chargeId.length) {
                            cancelurl += "&type=FAILED"
                            return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "If you are vendor, please add bank account and merchantId for pay360 payment gateway", url: cancelurl });
                        }
                        vendorbankfind = response.chargeId.filter(bank => {
                            return getVendor.pay360Split.accountId == bank.accountNumber && bank.merchantOwned == true
                        })
                        adminbankfind = response.chargeId.filter(bank => {
                            return bank.merchantOwned == false
                        })
                        if (!vendorbankfind.length) {
                            cancelurl += "&type=FAILED"
                            return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "If you are vendor, your bank account not found", url: cancelurl });
                            //return deliveryRequest.afetrPaymentNotify(id, "FAILED", from);

                        }
                        if (!adminbankfind.length) {
                            cancelurl += "&type=FAILED"
                            res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "If you are store admin, please configure payment setting for pay360", url: cancelurl });
                        }
                        if (!adminbankfind[0].thirdPartyBankAccount || adminbankfind[0].thirdPartyBankAccount.merchantId != data.supplierId) {
                            cancelurl += "&type=FAILED"
                            res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "If you are store admin, please configure payment setting for pay360", url: cancelurl });
                        }
                        chargeData.admin = getVendor.store.storeName
                        chargeData.merchant = getVendor.name
                        chargeData.merchantaccount = vendorbankfind[0].id
                        chargeData.adminaccount = adminbankfind[0].id
                        chargeData.merchantId = getVendor.pay360Split.merchantId
                        paymentMiddleware.splittransaction360(chargeData, async (response) => {
                            if (!response.status) {
                                console.log("curl error---", response)
                                cancelurl += "&type=FAILED"
                                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
                            }
                            else {
                                if (from === "checkout") {
                                    await Order.updateOne({ customOrderId: id }, { transactionDetails: response.chargeId });
                                }
                                res.redirect(response.chargeId.redirectUrl);
                            }
                        });
                    })
                }
                else {
                    if (!data.merchantId) {
                        cancelurl += "&type=FAILED"
                        return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "merchantId not valid", url: cancelurl });
                    }
                    chargeData.merchantId = data.merchantId
                    paymentMiddleware.transaction360(chargeData, async (response) => {
                        if (!response.status) {
                            cancelurl += "&type=FAILED"
                            return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
                        }
                        else {
                            // if (from === "checkout") {
                            //     await Order.updateOne({ customOrderId: id }, { transactionDetails: response.chargeId });
                            // }
                            res.redirect(response.chargeId.redirectUrl);
                        }
                    });
                }

            } else if (payment_method === "moncash") {
                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.secretKey;
                    data.secretId = getStore.paymentSettings.secretId;
                } else {
                    data.secretKey = getStore.paymentSettings.livesecretKey;
                    data.secretId = getStore.paymentSettings.livesecretId;
                }
                if (!data.secretKey) {
                    cancelurl += "&type=FAILED"
                    return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Screate key not valid", url: cancelurl });
                }
                if (!data.secretId) {
                    cancelurl += "&type=FAILED"
                    return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Secret Id not valid", url: cancelurl });
                }
                let chargeData = {
                    amount: data.amount,
                    secretKey: data.secretKey,
                    secretId: data.secretId,
                    paymentMode: getStore.paymentMode

                }
                // let vendorWaitTime = 'in ' + Number(5) + ' minutes';
                // agenda.schedule(vendorWaitTime, 'check order status', { orderId: orderId });
                let expiredate = new Date()
                expiredate.setMinutes(expiredate.getMinutes() + 2);
                expiredate = Date.parse(expiredate)
                if (from === "checkout") {
                    chargeData.orderId = JSON.stringify({ id: id, from: from, expirein: expiredate })
                    paymentMiddleware.moncashCreateOrder(chargeData, async (response) => {
                        if (!response.status) {
                            cancelurl += "&type=FAILED"
                            return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
                        }
                        //res.send(response.data.redirectUrl)
                        res.redirect(response.data.redirectUrl);

                    })
                }
                else {
                    chargeData.orderId = JSON.stringify({ id: id, from: from, amount: data.amount, expirein: expiredate })
                    paymentMiddleware.moncashCreateOrder(chargeData, async (response) => {
                        console.log("moncase response==========>", response)
                        if (!response.status) {
                            cancelurl += "&type=FAILED"
                            return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
                        }
                        else {
                            //res.send(response.data.redirectUrl)
                            res.redirect(response.data.redirectUrl);
                        }
                    });
                }
            }
            // else if (payment_method === "dpo") {
            //     let getStore = await settingService.chekStoreSetting(data.storeId, payment_method);

            //     if (!getStore || !getStore.flag) {
            //         cancelurl += "&type=FAILED"
            //         return res.render('webViewError', { title: title, data: 'Store detail not found', message: "Store detail not found", url: cancelurl });
            //     }
            //     if (!getStore.paymentSettings.status) {
            //         cancelurl += "&type=FAILED"
            //         return res.render('webViewError', { title: title, data: 'Payemnt failed', message: "Paymentgateway not active", url: cancelurl });
            //     }
            //     if (getStore.paymentMode === 'sandbox') {
            //         data.companytoken = getStore.paymentSettings.companytoken;
            //         data.endpoint = getStore.paymentSettings.endpoint;
            //         data.servicetype = getStore.paymentSettings.servicenumber;
            //     } else {
            //         data.companytoken = getStore.paymentSettings.livecompanytoken;
            //         data.endpoint = getStore.paymentSettings.liveendpoint;
            //         data.servicetype = getStore.paymentSettings.liveservicenumber;
            //     }
            //     if (!data.companytoken) {
            //         cancelurl += "&type=FAILED"
            //         return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Token not valid", url: cancelurl });
            //     }
            //     if (!data.endpoint) {
            //         cancelurl += "&type=FAILED"
            //         return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "EndPoint url not valid", url: cancelurl });
            //     }
            //     if (!data.servicetype) {
            //         cancelurl += "&type=FAILED"
            //         return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Service Number Required", url: cancelurl });
            //     }
            //     let todaydate = Date.now()
            //     let servicedate = momentz.tz(todaydate, getStore.timezone).format("YYYY/MM/DD HH:mm")
            //     let chargeData = {
            //         return_url: env.apiUrl + "card/return/url/dpo?id=" + id + "&payment_method=dpo&from=" + from + "&amount=" + data.amount + "&storeId=" + data.storeId,
            //         cancel_url: env.apiUrl + "card/return/url/dpo?id=" + id + "&from=" + from + "&type=cancel" + "&storeId=" + data.storeId,
            //         companytoken: data.companytoken,
            //         currency: data.currency,
            //         amount: data.amount,
            //         endpoint: data.endpoint,
            //         servicetype: data.servicetype,
            //         servicedate: servicedate
            //     }
            //     let createurl = data.endpoint + "/payv2.php?ID="
            //     if (from === "checkout") {
            //         let getVendor = await User.findOne({ _id: getData.vendor }, 'name')
            //         chargeData.servicedescription = id + " order genrated from " + getVendor.name
            //         paymentMiddleware.dpoCreatePayment(chargeData, async (response) => {
            //             if (!response.status) {
            //                 cancelurl += "&type=FAILED"
            //                 return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
            //             }
            //             else {
            //                 createurl += response.data.TransToken
            //                 console.log("create url---- checkout", createurl)
            //                 res.redirect(createurl);
            //             }


            //         })
            //     }
            //     else {
            //         chargeData.servicedescription = data.amount + " amount added in user wallet"
            //         paymentMiddleware.dpoCreatePayment(chargeData, async (response) => {
            //             console.log("response--", response)
            //             if (!response.status) {
            //                 cancelurl += "&type=FAILED"
            //                 return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
            //             }
            //             else {
            //                 createurl += response.data.TransToken
            //                 console.log("create url---- wallet", createurl)
            //                 res.redirect(createurl);
            //             }
            //         });
            //     }
            // }
            else {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: 'Wrong Payment method', data: 'No Content Added', message: "Internal server error", url: cancelurl });
            }
            // } else if (payment_method === "paystack") {

            //     if (getStore.paymentMode === 'sandbox') {
            //         data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            //         data.publishabelKey = getStore.paymentSettings.sandboxPublishabelKey;
            //     } else {

            //         data.secretKey = getStore.paymentSettings.liveSecretKey;
            //         data.publishabelKey = getStore.paymentSettings.livePublishabelKey;

            //     }
            //     if (!data.secretKey) {
            //         return res.render('webViewError', { title: "Error", data: 'Payment Failed', message: "Screate key not valid" });
            //     }
            //     if (!data.publishabelKey) {
            //         return res.render('webViewError', { title: "Error", data: 'Payment Failed', message: "Public key not valid" });
            //     }
            //     let chargeData = {
            //         return_url: env.apiUrl + "card/paystack/return?id=" + id + "&payment_method=paystack&from=" + from + "&amount=" + data.amount,
            //         amount: data.amount,
            //         email: data.email,
            //         secretKey: data.secretKey,
            //         publishabelKey: data.publishabelKey
            //     }
            //     paymentMiddleware.webviewTransactionPaystack(chargeData, async (response) => {
            //         if (!response.status) {
            //             deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //             return res.render('webViewError', { title: "Error", data: 'Payment Failed', message: response.message });
            //         }
            //         else {
            //             if (response.chargeId.status) {
            //                 res.redirect(response.chargeId.data.authorization_url);
            //             }
            //             else {
            //                 deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //                 return res.render('webViewError', { title: "Error", data: 'Payment Failed', message: "Failed" });
            //             }
            //         }
            //     });
            // }
        } catch (error) {
            console.log("err", error);
            res.render('webViewError', { title: 'Payment Failed', data: 'No Content Added', message: "Something went wrong", url: "" });
        }
    },

    addCardWebview: async (req, res) => {
        try {
            let title = '';
            let message = '';
            let chargeData = {}
            let data = {}
            let { payment_method, id } = req.query;
            title = "Process Payment";
            message = '';

            let getData = null;
            let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=wallet&type=FAILED"
            getData = await User.findOne({ _id: ObjectId(id) }, 'store name email countryCode mobileNumber address');
            if (!getData) {
                return res.render('webViewError', { title: title, data: 'User detail not found', message: "User Invalid", url: cancelurl });
            }
            let getStore = await settingService.chekStoreSetting(getData.store, payment_method);
            if (!getStore) {
                return res.render('webViewError', { title: title, data: 'payment key not found', message: "Store Invalid", url: cancelurl });
            }


            if (payment_method == "pay360") {
                if (getStore.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.secretKey;
                    data.isv_id = getStore.paymentSettings.isvId;
                    data.merchantId = getStore.paymentSettings.merchantId;
                    data.pay360BaseUrl = getStore.paymentSettings.pay360BaseUrl ? getStore.paymentSettings.pay360BaseUrl : env.pay360BaseUrl;
                } else {

                    data.secretKey = getStore.paymentSettings.livesecretKey;
                    data.isv_id = getStore.paymentSettings.liveisvId;
                    data.merchantId = getStore.paymentSettings.livemerchantId;
                    data.pay360BaseUrl = getStore.paymentSettings.livepay360BaseUrl ? getStore.paymentSettings.livepay360BaseUrl : env.pay360BaseUrl;

                }
                chargeData = {
                    return_url: env.apiUrl + "card/pay360/addcard?id=" + id + "&payment_method=pay360&sid=" + getData.store,
                    cancel_url: env.apiUrl + "card/return/url/pay360?id=" + id + "&from=wallet" + "&type=cancel",
                    JWT: data.secretKey,
                    ISV_ID: data.isv_id,
                    merchantId: data.merchantId,
                    pay360BaseUrl: data.pay360BaseUrl
                }
                paymentMiddleware.genratecard(chargeData, async (response) => {
                    if (!response.status) {
                        console.log("errr------")
                        console.log(response)
                        //deliveryRequest.afetrPaymentNotify(id, "FAILED", "wallet");
                        return res.render('webViewError', { title: "Error", data: 'Payment Failed', message: response.message, url: cancelurl });
                    }
                    else {

                        // req.session.requestId = response.chargeId.requestId;
                        var query = { "details.status": false, user: getData._id, payment_method: "pay360" }
                        let obj = { "details.status": false, user: getData._id, payment_method: "pay360", token: response.chargeId.requestId }
                        cardTable.cardAddPay360(obj, query, (err, resdata) => {
                            if (err) {
                                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("resdata---------")
                                console.log(response)
                                //res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', response));
                                res.redirect(response.chargeId.redirectUrl);
                            }
                        });

                        //res.redirect(response.chargeId.redirectUrl);
                    }
                })
            } else if (payment_method == "dpo") {
                if (getStore.paymentMode === 'sandbox') {
                    data.companytoken = getStore.paymentSettings.companytoken;
                    data.endpoint = getStore.paymentSettings.endpoint;
                    data.servicetype = getStore.paymentSettings.servicenumber;
                } else {

                    data.companytoken = getStore.paymentSettings.livecompanytoken;
                    data.endpoint = getStore.paymentSettings.liveendpoint;
                    data.servicetype = getStore.paymentSettings.liveservicenumber;

                }
                let countrycc = Config.COUNTRIES.find(e => e.cc === getData.countryCode)
                if (!countrycc) {
                    return res.render('webViewError', { title: title, data: 'Invalid Country Code', message: "Invalid Country Code", url: cancelurl });
                }
                let todaydate = Date.now()
                let servicedate = momentz.tz(todaydate, getStore.timezone).format("YYYY/MM/DD HH:mm")
                chargeData = {
                    companytoken: data.companytoken,
                    return_url: env.apiUrl + "card/dpo/addcard?id=" + id + "&payment_method=dpo&sid=" + getData.store,
                    cancel_url: env.apiUrl + "card/return/url/dpo?id=" + id + "&from=wallet" + "&type=cancel",
                    currency: getStore.currency.code,
                    amount: 1,
                    endpoint: data.endpoint,
                    email: getData.email,
                    phone: getData.mobileNumber,
                    countrycode: countrycc.code,
                    servicetype: data.servicetype,
                    servicedescription: "User add card",
                    servicedate: servicedate
                }
                let createurl = data.endpoint + "/payv2.php?ID="
                paymentMiddleware.paymentforsavecard(chargeData, async (response) => {
                    if (!response.status) {
                        cancelurl += "&type=FAILED"
                        return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
                    }
                    else {
                        createurl += response.data.TransToken
                        res.redirect(createurl);
                    }
                })
            }

        } catch (error) {
            console.log("err", error);
            res.render('webViewError', { title: 'Internal server error', data: 'No Content Added', message: "Internal server error", url: cancelurl });
        }
    },

    ReturnPingFromPaymentGateway: async (req, res) => {
        try {
            let { payment_method, id, from, amount } = req.query;
            let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from + "&type=CANCELLED"
            res.render('webViewError', { title: 'Payment Cancelled', data: 'No Content Added', message: "Payment Cancelled", url: cancelurl });

        } catch (error) {
            res.render('webViewError', { title: 'Payment Cancelled', data: 'No Content Added', message: 'Payment Cancelled', url: cancelurl });
        }
    },

    webViewCallback: async (req, res) => {
        try {
            let data = req.body;
            let { payment_method, from, id, amount } = req.query;

            console.log("req.query", req.query);
            console.log("data", data);

            let getData = null;
            let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from + "&type=FAILED"
            if (from === "checkout") {
                getData = await Order.findOne({ customOrderId: id }, 'store orderTotal scheduledType');
                data.amount = getData.orderTotal;
                data.scheduledType = getData.scheduledType;
            } else if (from === "wallet") {
                getData = await User.findOne({ _id: ObjectId(id) }, 'store wallet role');
                data.amount = amount ? amount : 0;
                data.wallet = getData.wallet;
                data.scheduledType = '';
            }

            data.storeId = getData.store;

            let getStore = await settingService.chekStoreSetting(data.storeId, payment_method);

            data.storeName = getStore.storeName;
            data.paymentMode = getStore.paymentMode;

            if (data.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxKey_secret;
                data.Key_id = getStore.paymentSettings.sandboxKey_id;
            } else {
                data.secretKey = getStore.paymentSettings.liveKey_secret;
                data.Key_id = getStore.paymentSettings.liveKey_id;
            }

            if (!data.razorpay_payment_id) {
                return res.render('webViewError', { title: 'Payment Failed', data: 'No Content Added', message: "Payment Failed", url: cancelurl });
            }

            let chargeData = {
                amount: data.amount,
                payment_id: data.razorpay_payment_id,
                KEY_SECRET: data.secretKey,
                KEY_ID: data.Key_id
            }

            paymentMiddleware.razorPayCapture(chargeData, async (response) => {
                if (!response.status) {
                    deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                } else {

                    if (from === "checkout") {
                        orderService.afterWebviewPaymentSuccess({ id, transactionDetails: response.data });
                    }

                    deliveryRequest.afetrPaymentNotify(id, "SUCCESS", from);

                    if (from === "wallet") {
                        if (getData.role === "USER") {

                            let wallet = helper.roundNumber(Number(data.amount) + data.wallet);
                            User.updateUserProfile({ _id: id, wallet: wallet }, (err, resdata) => {
                                if (err) {
                                    console.log("wallet rp err", err);
                                } else {
                                    console.log("wallet rp success", data.amount);
                                }
                            });
                        }
                        else {
                            let wallet = helper.roundNumber(Number(data.amount));
                            module.exports.transactiondata(getData, { storeId: getData.store }, wallet);
                        }

                    }
                }
            });

            res.render('webViewSuccess', { title: 'Payment Successful', msg: "Payment Successful", data: 'No Content Added', message: "Thank you", from: from, id: getData._id, scheduledType: data.scheduledType, screen: '', paymentStatus: '', payment_method: 'razorpay' });

        } catch (error) {
            console.log("err", error);
            res.render('webViewError', { title: 'Internal server error', data: 'No Content Added', message: "Internal server error", url: cancelurl });
        }
    },

    stripeConnect: async (req, res) => {
        try {
            let data = req.query;
            let title = "Stripe Connect Onboarding for Express accounts";
            data.return_url = env.apiUrl + "card/stripe/connect/return?id=" + data.id;

            if (data.host && data.pathname) {
                data.return_url = env.apiUrl + "card/stripe/connect/return?id=" + data.id + "&host=" + data.host + "&pathname=" + data.pathname;
            }

            console.log("data", data);

            if (!data.id) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: "Unable to find Vendor id" });
            }

            const getUser = await User.findById(data.id, 'stripeConnect store');

            if (getUser == null) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: "Invalid vendor" });
            }

            let getStore = await settingService.chekStoreSetting(getUser.store, 'stripe');

            if (!getStore.flag) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: __('SETUP_PAYMENT_SETTING_FIRST') });
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: __('PAYMENT_METHOD_DISABLE') });
            }

            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }

            if (!data.secretKey) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: __('SETUP_PAYMENT_SETTING_FIRST') });
            }

            if (getUser.stripeConnect.status) {
                return res.render('stripeConnectSuccess', { title: title, data: 'No Content Added', message: getUser.stripeConnect.accountId });
            }

            if (!getUser.stripeConnect.status && getUser.stripeConnect.accountId == null) {

                data.type = "express";
                paymentMiddleware.stripeCreateAccount(data, async (response) => {
                    if (!response.status) {
                        return res.render('stripeConnect', { title: title, data: 'No Content Added', message: response.message });
                    } else {

                        data.accountId = response.response.id;
                        data.refresh_url = env.apiUrl + "card/stripe/connect/refresh?id=" + data.id;
                        data.login_link = null;

                        await User.findOneAndUpdate({ _id: data.id }, { "stripeConnect.accountId": data.accountId, "stripeConnect.login_link": data.login_link }, { new: true });

                        paymentMiddleware.stripeCreateAccountLink(data, (response) => {
                            if (!response.status) {
                                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: response.message });
                            } else {
                                res.redirect(response.response.url);
                            }
                        });
                    }
                });

            } else {

                data.accountId = getUser.stripeConnect.accountId;
                data.refresh_url = env.apiUrl + "card/stripe/connect/refresh?id=" + data.id;

                paymentMiddleware.stripeCreateAccountLink(data, (response) => {
                    if (!response.status) {
                        return res.render('stripeConnect', { title: title, data: 'No Content Added', message: response.message });
                    } else {
                        res.redirect(response.response.url);
                    }
                });
            }
        } catch (error) {
            console.log("err", error);
            res.render('stripeConnect', { title: 'Stripe Connect Onboarding for Standard accounts', data: 'No Content Added', message: "Internal server error" });
        }
    },

    stripeConnectRefresh: async (req, res) => {
        try {
            let data = req.query;
            let title = "Stripe Connect Onboarding for Express accounts";
            data.return_url = env.apiUrl + "card/stripe/connect/return?id=" + data.id;

            if (data.host && data.pathname) {
                data.return_url = env.apiUrl + "card/stripe/connect/return?id=" + data.id + "&host=" + data.host + "&pathname=" + data.pathname;
            }

            console.log("data refresh", data);

            if (!data.id) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: "Unable to find Vendor id" });
            }

            const getUser = await User.findById(data.id, 'stripeConnect store');

            if (getUser == null) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: "Invalid vendor" });
            }

            let getStore = await settingService.chekStoreSetting(getUser.store, 'stripe');

            if (!getStore.flag) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: __('SETUP_PAYMENT_SETTING_FIRST') });
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: __('PAYMENT_METHOD_DISABLE') });
            }

            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }

            if (!data.secretKey) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: __('SETUP_PAYMENT_SETTING_FIRST') });
            }

            if (getUser.stripeConnect.status) {
                return res.render('stripeConnectSuccess', { title: title, data: 'No Content Added', message: getUser.stripeConnect.accountId });
            }

            if (getUser.stripeConnect.accountId == null && !getUser.stripeConnect.status) {

                data.type = "express";
                paymentMiddleware.stripeCreateAccount(data, async (response) => {
                    if (!response.status) {
                        return res.render('stripeConnect', { title: title, data: 'No Content Added', message: response.message });
                    } else {

                        data.accountId = response.response.id;
                        data.refresh_url = env.apiUrl + "card/stripe/connect/refresh?id=" + data.id;
                        data.login_link = null;

                        await User.findOneAndUpdate({ _id: data.id }, { "stripeConnect.accountId": data.accountId, "stripeConnect.login_link": data.login_link }, { new: true });

                        paymentMiddleware.stripeCreateAccountLink(data, (response) => {
                            if (!response.status) {
                                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: response.message });
                            } else {
                                res.redirect(response.response.url);
                            }
                        });
                    }
                });

            } else {

                data.accountId = getUser.stripeConnect.accountId;
                data.refresh_url = env.apiUrl + "card/stripe/connect/refresh?id=" + data.id;

                paymentMiddleware.stripeCreateAccountLink(data, (response) => {
                    if (!response.status) {
                        return res.render('stripeConnect', { title: title, data: 'No Content Added', message: response.message });
                    } else {
                        res.redirect(response.response.url);
                    }
                });
            }
        } catch (error) {
            console.log("err", error);
            res.render('stripeConnect', { title: 'Stripe Connect Onboarding for Standard accounts', data: 'No Content Added', message: "Internal server error" });
        }
    },

    stripeConnectReturn: async (req, res) => {
        try {
            let data = req.query;
            let title = "Stripe Connect Onboarding for Express accounts";
            data.return_url = env.apiUrl + "card/stripe/connect/return?id=" + data.id;

            if (data.host && data.pathname) {
                data.return_url = env.apiUrl + "card/stripe/connect/return?id=" + data.id + "&host=" + data.host + "&pathname=" + data.pathname;
            }

            console.log("data success", data);

            if (!data.id) {
                return res.render('stripeConnect', { title: title, data: 'No Content Added', message: "Unable to find Vendor id" });
            }

            const getUser = await User.findById(data.id, 'stripeConnect store');

            let getStore = await settingService.chekStoreSetting(getUser.store, 'stripe');

            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }

            data.login_link = null;
            data.accountId = getUser.stripeConnect.accountId;

            if (data.accountId && data.secretKey) {
                let loginLink = await paymentMiddleware.createLoginLinkStripeExpress(data);
                data.login_link = loginLink.url;
            }

            await User.findOneAndUpdate({ _id: data.id }, { "stripeConnect.status": true, "stripeConnect.login_link": data.login_link }, { new: true });

            if (data.host && data.pathname) {
                res.redirect("https://" + data.host + data.pathname);
            } else {
                res.render('stripeConnectSuccess', { title: title, data: 'No Content Added', message: getUser.stripeConnect.accountId });
            }
        } catch (error) {
            console.log("err", error);
            let data = req.query;
            if (data.host && data.pathname) {
                res.redirect("https://" + data.host + data.pathname);
            } else {
                res.render('stripeConnect', { title: 'Stripe Connect Onboarding for Standard accounts', data: 'No Content Added', message: "Internal server error" });
            }
        }
    },

    stripeConnectAccountRemove: async (req, res) => {
        try {
            let data = req.query;

            if (!data.id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getUser = await User.findById(data.id, 'stripeConnect store');

            if (getUser == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_USER'));
            }

            if (getUser.stripeConnect.status == false) {
                return res.json(helper.showValidationErrorResponse('STRIPE_ACCOUNT_NOT_CONNECTED_YET'));
            }

            let getStore = await settingService.chekStoreSetting(getUser.store, 'stripe');

            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }

            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
            }

            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            data.accountId = getUser.stripeConnect.accountId;

            paymentMiddleware.stripeDeleteAccount(data, async (response) => {
                if (!response.status) {
                    res.json(helper.showStripeErrorResponse(response.message, response.code));
                } else {
                    let resdata = await User.findOneAndUpdate({ _id: data.id }, { "stripeConnect.status": false, "stripeConnect.accountId": null }, { new: true });
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getDriverPaymentsListForApp: async (req, res) => {
        try {
            let user = req.user;
            let wallet = user.wallet ? user.wallet : 0;
            let store = req.store;
            let pay360Url = "";
            const paymentSettings = store.paymentSettings;
            let psL = [];
            let base_url = env.apiBaseUrl;
            let isPaypalActive = false;
            let isStripeActive = false;
            let isSquareActive = false;
            let isPaystackActive = false;
            let isPay360Active = false;
            let isMoncashActive = false;
            let isDpoActive = false;
            let isFlutterwaveActive = false;
            let dpoUrl = ""
            let activePaymentMethodForCard = store.activePaymentMethodForAddCard;

            if (paymentSettings.length > 0) {

                paymentSettings.forEach(element => {

                    if (element.payment_method === "orangeMoney" && element.status) {

                        let obj = {
                            payment_method: "orangeMoney",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Orange Money",
                            webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "razorpay" && element.status) {

                        let obj = {
                            payment_method: "razorpay",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Cards, Wallet, UPI and Netbanking",
                            webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "pay360" && element.status) {

                        // let obj = {
                        //     payment_method: "pay360",
                        //     logo: base_url + '/images/' + element.payment_method + '.png',
                        //     label: "Pay with pay360",
                        //     webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        // }

                        // psL.push(obj);
                        isPay360Active = true
                        pay360Url = env.apiUrl + "card/add/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"

                        //psL.push(obj);
                    }
                    if (element.payment_method === "moncash" && element.status) {
                        isMoncashActive = true;
                        let obj = {
                            payment_method: "moncash",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Pay with Moncash",
                            webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                    }
                    if (element.payment_method === "dpo" && element.status) {
                        isDpoActive = true;
                        dpoUrl = env.apiUrl + "card/add/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        // let obj = {
                        //     payment_method: "dpo",
                        //     logo: base_url + '/images/' + element.payment_method + '.jpeg',
                        //     label: "Add Dpo Card",
                        //     webViewUrl: dpoUrl
                        // }

                        //psL.push(obj);
                    }
                    if (element.payment_method === "braintree" && element.status) {
                        isPaypalActive = true;
                    }

                    if (element.payment_method === "stripe" && element.status) {
                        isStripeActive = true;
                    }

                    if (element.payment_method === "square" && element.status) {
                        isSquareActive = true;
                    }

                    if (element.payment_method === "paystack" && element.status) {
                        let obj = {
                            payment_method: "paystack",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Paystack",
                            //webViewUrl: env.apiUrl + "card/webview?id=" + user._id + "&payment_method=" + element.payment_method + "&from=wallet&deviceType=web"
                        }

                        psL.push(obj);
                        isPaystackActive = true;
                    }
                    if (element.payment_method === "flutterwave" && element.status) {
                        let obj = {
                            payment_method: "flutterwave",
                            logo: base_url + '/images/' + element.payment_method + '.png',
                            label: "Flutterwave"
                        }

                        psL.push(obj);
                        isFlutterwaveActive = true;
                    }
                });
            }

            let cardsList = [];
            let paypalList = [];
            let isPaypalLink = false;

            if (isPaypalActive) {
                paypalList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "paypal" });
                if (paypalList.length > 0) {
                    isPaypalLink = true;
                } else {

                    let obj = {
                        payment_method: "braintree",
                        logo: base_url + '/images/paypal.png',
                        label: "Paypal",
                        webViewUrl: "https://" + store.domain + '/driver-paypal'
                    }

                    paypalList.push(obj);
                }
            }

            if (isStripeActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "stripe" });
            } else if (isSquareActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "square" });
            } else if (isPaystackActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "paystack" });
            } else if (isPay360Active) {
                let urldata = env.apiUrl + "/card/webview?id=" + user._id + "&payment_method=pay360&from=wallet"
                cardsList = await cardTable.getUserCardByPay360({ user: user._id, payment_method: "pay360" }, urldata);
            } else if (isFlutterwaveActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "flutterwave" });
            } else if (isDpoActive) {
                cardsList = await cardTable.getUserCardByPaymentMethod({ user: user._id, payment_method: "dpo" });
            }

            let otherList = [...paypalList, ...psL];

            const resdata = {
                otherList: otherList,
                cardsList: cardsList,
                wallet: wallet,
                isPaypalActive: isPaypalActive,
                isPaypalLink: isPaypalLink,
                isStripeActive: isStripeActive,
                isSquareActive: isSquareActive,
                isPaystackActive: isPaystackActive,
                isPay360Active: isPay360Active,
                isMoncashActive: isMoncashActive,
                isDpoActive: isDpoActive,
                pay360Url: pay360Url,
                dpoUrl,
                isFlutterwaveActive
            }
            if (helper.isValidHidethings(store, "isEnableMultiplePaymentMethod")) {
                await module.exports.multiplePaymentMethod(resdata, activePaymentMethodForCard, user);

            } else {
                Object.assign(resdata, { isEnableMultiplePaymentMethod: false });
            }
            let result = helper.showSuccessResponse('DATA_SUCCESS', resdata);
            res.json(result);
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    payReturnUrl: async (req, res) => {
        try {
            let data = {}//req.body;
            let { payment_method, from, id, amount, type } = req.query;
            let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from + "&type=FAILED"
            let getData = null;
            if (!type) {
                console.log(req.query)

                if (from === "checkout") {
                    getData = await Order.findOne({ customOrderId: id }, 'store orderTotal scheduledType');
                    data.amount = getData.orderTotal;
                    data.scheduledType = getData.scheduledType;
                    orderService.afterWebviewPaymentSuccess({ id });
                } else if (from === "wallet") {
                    getData = await User.findOne({ _id: ObjectId(id) }, 'store wallet role');
                    data.amount = amount ? amount : 0;
                    data.wallet = getData.wallet;
                    data.scheduledType = '';
                    if (getData.role === "USER") {

                        let wallet = helper.roundNumber(Number(data.amount) + data.wallet);
                        module.exports.transactionuser(getData, { storeId: getData.store }, data.amount, wallet)
                        User.updateUserProfile({ _id: id, wallet: wallet }, (err, resdata) => {
                            if (err) {
                                console.log("wallet rp err", err);
                            } else {
                                console.log("wallet rp success", data.amount);
                            }
                        });
                    }
                    else {
                        let wallet = helper.roundNumber(Number(data.amount));
                        module.exports.transactiondata(getData, { storeId: getData.store }, wallet);
                    }
                }
                deliveryRequest.afetrPaymentNotify(id, "SUCCESS", from);
                console.log("from------", from)
                res.render('webViewSuccess', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: from, id: getData._id, scheduledType: data.scheduledType, screen: "pay360", paymentStatus: true, payment_method: 'pay360' });
            }
            else {
                res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Payment not complete", url: cancelurl });
            }
        }
        catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    dpoReturnUrl: async (req, res) => {
        try {
            let data = {}, transactiondta = ""//req.body;
            let { payment_method, from, id, amount, type, storeId, TransactionToken } = req.query;
            let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from + "&type=FAILED"
            let getData = null;
            if (from === "checkout") {
                getData = await Order.findOne({ customOrderId: id }, 'store orderTotal scheduledType');
                data.amount = getData.orderTotal;
                data.scheduledType = getData.scheduledType;
            } else if (from === "wallet") {
                getData = await User.findOne({ _id: ObjectId(id) }, 'store wallet role');
                data.amount = amount ? amount : 0;
                data.wallet = getData.wallet;
                data.scheduledType = '';
            }

            data.storeId = getData.store;
            let getStore = await module.exports.checkstorepaymentSetting(ObjectId(data.storeId), "dpo");
            if (!getStore.flag) {
                deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Setup your payment setting", url: "" });
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Payment method is disable", url: "" });
            }
            if (getStore.paymentMode === 'sandbox') {
                data.companytoken = getStore.paymentSettings.companytoken;
                data.endpoint = getStore.paymentSettings.endpoint;
            }
            else if (getStore.paymentMode === 'live') {
                data.companytoken = getStore.paymentSettings.livecompanytoken;
                data.endpoint = getStore.paymentSettings.liveendpoint;
            }
            else {
                deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                return res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Payment mode not valid", url: "" });
            }

            if (!data.companytoken) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Token not valid", url: cancelurl });
            }
            if (!data.endpoint) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "EndPoint url not valid", url: cancelurl });
            }
            let checktransaction = {
                companytoken: data.companytoken,
                endpoint: data.endpoint,
                transactiontoken: TransactionToken

            }
            if (!type) {
                paymentMiddleware.dpoVerifyPayment(checktransaction, async (response) => {
                    if (!response.status) {
                        cancelurl += "&type=FAILED"
                        return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
                    }
                    else {
                        if (from === "checkout") {
                            getData = await Order.findOne({ customOrderId: id }, 'store orderTotal scheduledType');
                            data.amount = getData.orderTotal;
                            data.scheduledType = getData.scheduledType;
                            transactiondta = { transactionId: TransactionToken, refundDetails: getData.orderTotal + " amount has been creatdited of " + id + " order" }
                            orderService.afterWebviewPaymentSuccess({ id, transactionDetails: transactiondta });
                        } else if (from === "wallet") {
                            getData = await User.findOne({ _id: ObjectId(id) }, 'store wallet role');
                            data.amount = amount ? amount : 0;
                            data.wallet = getData.wallet;
                            data.scheduledType = '';
                            if (getData.role === "USER") {

                                let wallet = helper.roundNumber(Number(data.amount) + data.wallet);
                                module.exports.transactionuser(getData, { storeId: getData.store }, data.amount, wallet)
                                User.updateUserProfile({ _id: id, wallet: wallet }, (err, resdata) => {
                                    if (err) {
                                        console.log("wallet rp err", err);
                                    } else {
                                        console.log("wallet rp success", data.amount);
                                    }
                                });
                            }
                            else {
                                let wallet = helper.roundNumber(Number(data.amount));
                                module.exports.transactiondata(getData, { storeId: getData.store }, wallet);
                            }
                        }
                        deliveryRequest.afetrPaymentNotify(id, "SUCCESS", from);
                        console.log("HERREERER");
                        res.render('webViewSuccess', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: from, id: getData._id, scheduledType: data.scheduledType, screen: "dpo", paymentStatus: true, payment_method: 'dpo' });
                    }
                })
            }
            else {
                paymentMiddleware.dpoCancelPayment(checktransaction, async (response) => {
                    if (!response.status) {
                        cancelurl += "&type=FAILED"
                        return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
                    }
                    else {
                        res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Payment not complete", url: cancelurl });
                    }
                })
            }
        }
        catch (error) {
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    moncashReturnUrl: async (req, res) => {
        try {
            let id = "", from = "", amount, data = {}//req.body;
            let store = req.store
            let { transactionId } = req.query;
            let cancelurl = "";
            let getData = null;
            let getStore = await module.exports.checkstorepaymentSetting(store.storeId, "moncash")
            if (!getStore.flag) {
                deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Setup your payment setting", url: "" });
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Payment method is disable", url: "" });
            }
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.secretKey;
                data.secretId = getStore.paymentSettings.secretId;
            }
            else if (getStore.paymentMode === 'live') {
                data.secretKey = getStore.paymentSettings.livesecretKey;
                data.secretId = getStore.paymentSettings.livesecretId;
            }
            else {
                deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                return res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Payment mode not valid", url: "" });
            }

            if (!data.secretKey) {
                deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Screate key not valid", url: "" });
            }
            if (!data.secretId) {
                deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Secret Id not valid", url: "" });
            }
            let checktransaction = {
                secretKey: data.secretKey,
                secretId: data.secretId,
                paymentMode: getStore.paymentMode,
                transaction_id: transactionId

            }
            if (transactionId) {
                paymentMiddleware.moncashCapturePayment(checktransaction, async (response) => {
                    console.log("response data return url--", response)
                    if (!response.status) {
                        deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                        return res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: response.message, url: "" });
                        //return res.render('stripeConnect', { title: title, data: 'No Content Added', message: response.message });
                    } else {
                        if (response.data.status == 200) {
                            let obj = {}
                            obj = JSON.parse(response.data.payment.reference)
                            id = obj.id
                            from = obj.from
                            amount = Number(obj.amount)
                            cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from + "&type=FAILED"
                            //  if (obj.expirein && Date.now() < obj.expirein) {
                            if (from === "checkout") {
                                getData = await Order.findOne({ customOrderId: id }, 'store orderTotal scheduledType');
                                data.amount = getData.orderTotal;
                                data.scheduledType = getData.scheduledType;
                                orderService.afterWebviewPaymentSuccess({ id, transactionDetails: transactionId });
                            } else if (from === "wallet") {
                                getData = await User.findOne({ _id: ObjectId(id) }, 'store wallet role');
                                data.amount = amount ? amount : 0;
                                data.wallet = getData.wallet;
                                data.scheduledType = '';
                                if (getData.role === "USER") {

                                    let wallet = helper.roundNumber(Number(data.amount) + data.wallet);
                                    module.exports.transactionuser(getData, { storeId: getData.store }, data.amount, wallet)
                                    User.updateUserProfile({ _id: id, wallet: wallet }, (err, resdata) => {
                                        if (err) {
                                            console.log("wallet rp err", err);
                                            //return res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Payment not complete", url: cancelurl });
                                        } else {
                                            console.log("wallet rp success", data.amount);
                                        }
                                    });
                                }
                                else {
                                    let wallet = helper.roundNumber(Number(data.amount));
                                    module.exports.transactiondata(getData, { storeId: getData.store }, wallet);
                                }
                            }
                            deliveryRequest.afetrPaymentNotify(id, "SUCCESS", from);
                            res.render('webViewSuccess', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: from, id: getData._id, scheduledType: data.scheduledType, screen: "moncash", paymentStatus: true, payment_method: 'moncash' });
                            // }
                            // else {
                            //     res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Session Time Out", url: cancelurl });
                            // }
                        }
                        else {
                            deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                            res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Payment not complete", url: "" });
                        }
                    }
                });
            }
            else {
                deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Not valid transaction", url: "" });
            }
        }
        catch (error) {
            console.log("error", error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    moncashsuccess: async (req, res) => {
        try {
            res.render('webViewSuccess', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: '', id: '', scheduledType: '', screen: "moncash", paymentStatus: true, payment_method: 'moncash' });
            // let id = "", from = "", data = {}//req.body;
            // let store = req.store
            // let { transactionId } = req.query;
            // let cancelurl = "";
            // let getData = null;
            // let getStore = await module.exports.checkstorepaymentSetting(store.storeId, "moncash")
            // if (!getStore.flag) {
            //     deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //     return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Setup your payment setting", url: "" });
            // }

            // if (getStore.flag && !getStore.paymentSettings.status) {
            //     deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //     return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Payment method is disable", url: "" });
            // }
            // if (getStore.paymentMode === 'sandbox') {
            //     data.secretKey = getStore.paymentSettings.secretKey;
            //     data.secretId = getStore.paymentSettings.secretId;
            // }
            // else if (getStore.paymentMode === 'live') {
            //     data.secretKey = getStore.paymentSettings.livesecretKey;
            //     data.secretId = getStore.paymentSettings.livesecretId;
            // }
            // else {
            //     deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //     return res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Payment mode not valid", url: "" });
            // }

            // if (!data.secretKey) {
            //     deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //     return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Screate key not valid", url: "" });
            // }
            // if (!data.secretId) {
            //     deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //     return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Secret Id not valid", url: "" });
            // }
            // let checktransaction = {
            //     secretKey: data.secretKey,
            //     secretId: data.secretId,
            //     paymentMode: getStore.paymentMode,
            //     transaction_id: transactionId

            // }
            // if (transactionId) {
            //     paymentMiddleware.moncashCapturePayment(checktransaction, async (response) => {
            //         console.log("response data return url--", response)
            //         if (!response.status) {
            //             deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //             return res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: response.message, url: "" });
            //             //return res.render('stripeConnect', { title: title, data: 'No Content Added', message: response.message });
            //         } else {
            //             if (response.data.status == 200) {
            //                 let obj = {}
            //                 obj = JSON.parse(response.data.payment.reference)
            //                 id = obj.id
            //                 from = obj.from
            //                 cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from + "&type=FAILED"
            //                 //  if (obj.expirein && Date.now() < obj.expirein) {
            //                 if (from === "checkout") {
            //                     getData = await Order.findOne({ customOrderId: id }, 'store orderTotal scheduledType');
            //                 } else if (from === "wallet") {
            //                     getData = await User.findOne({ _id: ObjectId(id) }, 'store wallet role');
            //                 }
            //                 deliveryRequest.afetrPaymentNotify(id, "SUCCESS", from);
            //                 res.render('webViewSuccess', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: from, id: getData._id, scheduledType: data.scheduledType, screen: "moncash", paymentStatus: true, payment_method: 'moncash' });
            //             }
            //             else {
            //                 deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //                 res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Payment not complete", url: "" });
            //             }
            //         }
            //     });
            // }
            // else {
            //     deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //     res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Not valid transaction", url: "" });
            // }
        } catch (error) {
            console.log("err--", error)
            res.render('webViewSuccess', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: '', id: '', scheduledType: '', screen: "moncash", paymentStatus: true, payment_method: 'moncash' });
        }
    },
    checkstorepaymentSetting: async (storeId, payment_method) => {

        let flag = true;
        let paymentSettings = null;

        const getPayment = await Store.getStoreSettingAsync(storeId);

        if (!getPayment.paymentSettings || getPayment.paymentSettings.length === 0) {
            flag = false;
        }

        const getGatewaySetting = getPayment.paymentSettings.filter(payment => {
            return payment.payment_method === payment_method;
        });

        if (getGatewaySetting.length === 0) {
            flag = false;
        } else {
            paymentSettings = getGatewaySetting[0];
        }

        let paymentMode = getPayment.paymentMode;

        return {
            _id: getPayment._id,
            flag: flag,
            paymentMode: paymentMode,
            paymentSettings: paymentSettings,
            timezone: getPayment.timezone,
            googleMapKey: getPayment.googleMapKey,
            loyaltyPoints: getPayment.loyaltyPoints,
            storeName: getPayment.storeName,
            owneremail: getPayment.owner.email,
            currency: getPayment.currency,
            orderAutoApproval: getPayment.orderAutoApproval,
            logo: getPayment.logo,
            theme: getPayment.themeSettings.primaryColor,
            mailgun: getPayment.mailgun,
            language: getPayment.language,
            firebase: getPayment.firebase,
            domain: getPayment.domain,
            twilio: getPayment.twilio,
            orderAutoCancel: getPayment.orderAutoCancel,
            notifications: getPayment.notifications
        }
    },
    paystackReturnUrl: async (req, res) => {
        try {
            let data = {}
            let querydata = req.query
            let { payment_method, from, id, amount, reference } = req.query;
            let getData = null;
            let responseObj = {};
            if (from === "checkout") {
                getData = await Order.findOne({ customOrderId: id }, 'store orderTotal scheduledType paymentMethod paymentSourceRef rideType journeyType').lean();
                data.amount = getData.orderTotal;
                data.scheduledType = getData.scheduledType;
                responseObj = { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", ...getData, orderStatus: "pending", paymentStatus: "success", from: from, id: getData._id };
            } else if (from === "wallet") {
                getData = await User.findOne({ _id: ObjectId(id) }, 'store wallet role');
                data.amount = amount ? amount : 0;
                data.wallet = getData.wallet;
                data.scheduledType = '';
            }

            data.storeId = getData.store;

            let getStore = await settingService.chekStoreSetting(data.storeId, payment_method);

            data.storeName = getStore.storeName;
            data.paymentMode = getStore.paymentMode;

            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
            } else {

                data.secretKey = getStore.paymentSettings.liveSecretKey;

            }
            if (!data.secretKey) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));

            }

            let verifyTrasaction = {
                secretKey: data.secretKey,
                token: reference
            }

            paymentMiddleware.verifyTransactionPaystack(verifyTrasaction, async (response) => {
                if (!response.status) {
                    res.json(helper.showPaystackErrorResponse(response.message, response.status));
                } else {
                    if (from === "checkout") {
                        orderService.afterWebviewPaymentSuccess({ id, transactionDetails: response.chargeId });
                        res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', responseObj));

                    } else if (from === "wallet") {
                        if (getData.role === "USER") {

                            let wallet = helper.roundNumber(Number(data.amount) + data.wallet);
                            User.updateUserProfile({ _id: id, wallet: wallet }, (err, resdata) => {
                                if (err) {
                                    console.log("wallet rp err", err);
                                    return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
                                } else {
                                    console.log("wallet rp success", data.amount);
                                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: from, id: getData._id, scheduledType: data.scheduledType }));
                                }
                            });
                        }
                        else {
                            let wallet = helper.roundNumber(Number(data.amount));
                            module.exports.transactiondata(getData, { storeId: getData.store }, wallet);
                            return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: from, id: getData._id, scheduledType: data.scheduledType }));
                        }

                    }
                }
            });




        }
        catch (error) {
            console.log("errr----------")
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    flutterwaveReturnUrl: async (req, res) => {
        try {
            let data = {}
            let { payment_method, from, id, amount, reference } = req.query;
            console.log("req.query------", req.query)
            let getData = null;
            let responseObj = {};
            if (from === "checkout") {
                getData = await Order.findOne({ customOrderId: id }, 'store orderTotal scheduledType paymentMethod paymentSourceRef journeyType').lean();
                data.amount = getData.orderTotal;
                data.scheduledType = getData.scheduledType;
                responseObj = {
                    title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you",
                    ...getData, orderStatus: "pending", paymentStatus: "success", from: from, id: getData._id
                };
            } else if (from === "wallet") {
                getData = await User.findOne({ _id: ObjectId(id) }, 'store wallet role');
                data.amount = amount ? amount : 0;
                data.wallet = getData.wallet;
                data.scheduledType = '';
            }

            data.storeId = getData.store;

            let getStore = await settingService.chekStoreSetting(data.storeId, payment_method);
            console.log("-----------getStore------")
            data.storeName = getStore.storeName;
            data.paymentMode = getStore.paymentMode;
            if (getStore.paymentMode === 'sandbox') {
                data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                data.pubKey = getStore.paymentSettings.sandboxPublishabelKey;
                data.enckey = getStore.paymentSettings.sandboxEncKey;
            } else {
                data.secretKey = getStore.paymentSettings.liveSecretKey;
                data.pubKey = getStore.paymentSettings.livePublishabelKey;
                data.enckey = getStore.paymentSettings.liveEncKey;
            }

            if (!data.secretKey || !data.pubKey || !data.enckey) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));

            }

            let verifyTrasaction = {
                secretKey: data.secretKey,
                pubKey: data.pubKey,
                enckey: data.enckey,
                transactionId: reference
            }

            paymentMiddleware.verifyTransactionFlutterwave(verifyTrasaction, async (response) => {
                if (!response.status) {
                    res.json(helper.showValidationErrorResponse(response.message));
                } else {
                    if (response.data.status == "successful") {
                        if (from === "checkout") {
                            orderService.afterWebviewPaymentSuccess({ id, transactionDetails: response.data });
                            res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', responseObj));

                        } else if (from === "wallet") {
                            if (getData.role === "USER") {

                                let wallet = helper.roundNumber(Number(data.amount) + data.wallet);
                                User.updateUserProfile({ _id: id, wallet: wallet }, (err, resdata) => {
                                    if (err) {
                                        console.log("wallet rp err", err);
                                        return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
                                    } else {
                                        console.log("wallet rp success", data.amount);
                                        return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: from, id: getData._id, scheduledType: data.scheduledType }));
                                    }
                                });
                            }
                            else {
                                let wallet = helper.roundNumber(Number(data.amount));
                                module.exports.transactiondata(getData, { storeId: getData.store }, wallet);
                                return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', { title: 'Payment Successful', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: from, id: getData._id, scheduledType: data.scheduledType }));
                            }

                        }
                    }

                }
            });




        }
        catch (error) {
            console.log("errr----------")
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addCardUrl: async (req, res) => {
        try {
            let data = {}//req.body;
            let { id, sid, payment_method } = req.query;

            console.log(req.session.requestId);
            let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=wallet&type=FAILED"
            let getData = null;
            console.log(req.query)
            const getStoreType = await Store.getStorePaymentSettingAsync(ObjectId(sid));

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE'));
            }

            if (getStoreType.paymentSettings.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            const getGatewaySetting = getStoreType.paymentSettings.filter(payment => {
                return payment.payment_method === payment_method;
            });

            if (getGatewaySetting.length === 0) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStoreType.paymentMode === 'sandbox') {
                data.secretKey = getGatewaySetting[0].secretKey;
                data.isv_id = getGatewaySetting[0].isvId;
                data.merchantId = getGatewaySetting[0].merchantId;
                data.pay360BaseUrl = getGatewaySetting[0].pay360BaseUrl ? getGatewaySetting[0].pay360BaseUrl : env.pay360BaseUrl;
            } else {

                data.secretKey = getGatewaySetting[0].livesecretKey;
                data.isv_id = getGatewaySetting[0].liveisvId;
                data.merchantId = getGatewaySetting[0].livemerchantId;
                data.pay360BaseUrl = getGatewaySetting[0].livepay360BaseUrl ? getGatewaySetting[0].livepay360BaseUrl : env.pay360BaseUrl;

            }
            let card_data = await cardTable.findOne({ user: ObjectId(id), "details.status": false, payment_method: payment_method })
            if (card_data) {
                let obj = {
                    JWT: data.secretKey,
                    ISV_ID: data.isv_id,
                    merchantId: data.merchantId,
                    pay360BaseUrl: data.pay360BaseUrl,
                    requestId: card_data.token
                }
                paymentMiddleware.cardverifyby360(obj, async (response) => {
                    if (!response.status) {
                        console.log("errr------")
                        console.log(response)
                        return res.render('webViewError', { title: "Error", data: 'Failed to add card', message: response.message, url: cancelurl });
                    }
                    else {
                        // var query = { "details.status": false, user: data.user, payment_method: "pay360" }
                        let latsdigit = response.chargeId.paymentMethod.storedMethod.verification
                        let card_token = response.chargeId.paymentMethod.storedMethod.token
                        let card_type = response.chargeId.paymentMethod.card.cardScheme
                        let logo = helper.getCardIcon(card_type);
                        let card_data = response.chargeId.paymentMethod.storedMethod
                        let obj = { "details.status": true, "details.data": card_data, last4digit: latsdigit, user: ObjectId(id), payment_method: "pay360", token: card_token, type: card_type, logo: logo }
                        cardTable.addCard(obj, (err, resdata) => {
                            if (err) {
                                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("resdata---------")
                                console.log(response)
                                deliveryRequest.afetrPaymentNotify(id, "SUCCESS", "wallet");
                                res.render('webViewSuccess', { title: 'Card Added Successful', msg: "Card Added Successful", data: 'No Content Added', message: "Thank you", from: "Add Card", id: resdata._id, scheduledType: "No Content Added", screen: "", paymentStatus: "", payment_method: 'pay360' });
                                // res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', response));
                                //res.redirect(response.chargeId.redirectUrl);
                            }
                        });
                    }
                });
            }
            else {
                res.render('webViewError', { title: 'Card Decliend', data: 'Card Add Failed', message: "Card failed to add", url: cancelurl });
            }
        }
        catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addCardDpo: async (req, res) => {
        try {
            let data = {}//req.body;
            let { id, sid, payment_method, TransactionToken } = req.query;
            let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=wallet&type=FAILED"
            let getData = null;
            console.log("query----s", req.query)
            const getStoreType = await Store.getStorePaymentSettingAsync(ObjectId(sid));

            // if (!getStoreType.flag) {
            //     // deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //     cancelurl += "&type=FAILED"
            //     return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Setup your payment setting", url: cancelurl });
            // }

            // if (getStoreType.flag && !getStoreType.paymentSettings.status) {
            //     //deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
            //     cancelurl += "&type=FAILED"
            //     return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Payment method is disable", url: cancelurl });
            // }
            if (getStoreType === null) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Setup your payment setting", url: cancelurl });
            }

            if (getStoreType.paymentSettings.length === 0) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Setup your payment setting", url: cancelurl });
            }

            const getGatewaySetting = getStoreType.paymentSettings.filter(payment => {
                return payment.payment_method === payment_method;
            });

            if (getGatewaySetting.length === 0) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Setup your payment setting", url: cancelurl });
            }
            if (getStoreType.paymentMode === 'sandbox') {
                data.companytoken = getGatewaySetting[0].companytoken;
                data.endpoint = getGatewaySetting[0].endpoint;
            }
            else if (getStoreType.paymentMode === 'live') {
                data.companytoken = getGatewaySetting[0].livecompanytoken;
                data.endpoint = getGatewaySetting[0].liveendpoint;
            }
            else {
                //deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: 'Payment Cancelled', data: 'Payment Failed', message: "Payment mode not valid", url: cancelurl });
            }

            if (!data.companytoken) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Token not valid", url: cancelurl });
            }
            if (!data.endpoint) {
                cancelurl += "&type=FAILED"
                return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "EndPoint url not valid", url: cancelurl });
            }
            let checktransaction = {
                companytoken: data.companytoken,
                endpoint: data.endpoint,
                transactiontoken: TransactionToken

            }
            paymentMiddleware.dpoVerifyPayment(checktransaction, async (response) => {
                if (!response.status) {
                    cancelurl += "&type=FAILED"
                    return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: response.message, url: cancelurl });
                }
                else {
                    let phone = response.data.CustomerPhone
                    let email = response.data.CustomerEmail
                    let countrycode = response.data.CustomerCountry
                    let countrycc = Config.COUNTRIES.find(e => e.name === countrycode)
                    let mobilenumber = countrycc.cc + phone
                    mobilenumber = mobilenumber.replace("+", "")
                    console.log("dpo mobilenumber--", mobilenumber)
                    console.log("dpo email--", email)
                    let getsubscription = {
                        companytoken: data.companytoken,
                        endpoint: data.endpoint,
                        phone: mobilenumber,
                        email: email
                    }
                    let refundobj = {
                        companytoken: data.companytoken,
                        endpoint: data.endpoint,
                        transactiontoken: TransactionToken,
                        amount: Number(response.data.TransactionNetAmount) ? Number(response.data.TransactionNetAmount) : 1,
                        refundDetails: "Refund to user for add card"
                    }
                    paymentMiddleware.dpoRefundPayment(refundobj, async (refundres) => {
                        if (!refundres.status) {
                            console.log("falid refund add card", refundres.message)
                        }
                        else {
                            console.log("user refund success", refundres)
                        }
                    })
                    paymentMiddleware.getcardtoken(getsubscription, async (subres) => {
                        if (!subres.status) {
                            cancelurl += "&type=FAILED"
                            return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: subres.message, url: cancelurl });
                        }
                        else {
                            let latsdigit = response.data.CustomerCredit
                            let card_token = subres.data.SubscriptionToken
                            let card_type = response.data.CustomerCreditType
                            let logo = helper.getCardIcon(card_type);
                            let card_data = subres.data
                            let obj = { "details.status": true, "details.data": card_data, last4digit: latsdigit, user: ObjectId(id), payment_method: "dpo", token: card_token, type: card_type, logo: logo }
                            cardTable.addCard(obj, (err, carddata) => {
                                if (err) {
                                    console.log("err---", err)
                                    cancelurl += "&type=FAILED"
                                    return res.render('webViewError', { title: "Payment Failed", data: 'Payment Failed', message: "Failed to add card", url: cancelurl });
                                } else {
                                    console.log("resdata---------carddata")
                                    console.log(carddata)
                                    deliveryRequest.afetrPaymentNotify(id, "SUCCESS", "wallet");
                                    res.render('webViewSuccess', { title: 'Card Added Successful', msg: "Card Added Successful", data: 'No Content Added', message: "Thank you", from: "Add Card", id: id, scheduledType: "No Content Added", screen: "", paymentStatus: "", payment_method: 'dpo' });
                                }
                            });
                            //res.render('webViewSuccess', { title: 'Card Added', data: 'No Content Added', msg: "Payment Successful", message: "Thank you", from: "wallet", id: id, scheduledType: "", screen: "dpo", paymentStatus: true, payment_method: 'dpo' });
                        }
                    })
                }
            })
        }
        catch (error) {
            console.log("eror---", error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    orderNotifyPingFromPaymentGateway: async (req, res) => {
        try {
            let data = req.body;
            let { payment_method, id, from, amount } = req.query;

            console.log("OM Notify", data);
            console.log("OM Notify query", req.query);

            if (from === "checkout" && payment_method === "orangeMoney") {

                if (data.status === "SUCCESS") {
                    orderService.afterWebviewPaymentSuccess({ id });
                }


            } else if (from === "wallet" && payment_method === "orangeMoney") {

                if (data.status === "SUCCESS") {

                    let getData = await User.findOne({ _id: ObjectId(id) }, 'wallet');

                    let wallet = helper.roundNumber(getData.wallet + Number(amount));
                    User.updateUserProfile({ _id: id, wallet: wallet }, (err, resdata) => {
                        if (err) {
                            console.log("wallet om err", err);
                        } else {
                            console.log("wallet om success", amount);
                        }
                    });
                }

            }

            deliveryRequest.afetrPaymentNotify(id, data.status, from);

            res.json(data);

        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    pagecancel: async (req, res) => {
        try {
            let data = req.query
            //console.log(data)
            // if (!data || !data.id || !data.type || !data.from) {
            //     res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
            // }
            //   else {

            deliveryRequest.afetrPaymentNotify(data.id, data.type, data.from);
            res.json({})
            //  }
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    paystackWebhookReturn: async (req, res) => {
        try {
            let data = req.body;
            let query = req.query;
            console.log("data===>", data)
            console.log("query===>", query)
            let resdata = data || query;
            res.json(resdata);
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    userRefereeSetting: async (data, user, store) => {
        try {
            if (data.forCompleteSignUpProcess && user && user.role === "USER" && user.isPendingSignupProcess && store.userRefereeSetting && store.userRefereeSetting.status) {
                await User.updateOne({ _id: user._id }, { isPendingSignupProcess: false });
                await User.updateReferralUserCount({ _id: user.referredBy });
            }
        } catch (error) {
            console.log(error)
        }
    }
}