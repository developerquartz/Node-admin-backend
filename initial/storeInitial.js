const storeType = require('../models/storeTypeTable');
const Store = require('../models/storeTable');
const User = require('../models/userTable');
const Template = require('../models/templateTable');
const Content = require('../models/contentPagesTable');
const Settings = require('../models/superAdminSettingTable');
const Terminology = require('../models/terminologyTable');
const emailTemplate = require('../helper/emailTemplate');
const axiosRequest = require('../helper/request');
const Config = require('../config/constants.json');
const driverTerminology = require('../config/driverLang.json');
const customerTerminology = require('../config/customerLang.json');
const Section = require('../models/sectionTable');
const { v4: uuidv4 } = require('uuid');
const Promotion = require('../models/promotionTable');
const ObjectId = require('objectid')
const Cuisines = require('../models/cuisinesTable');
const formField = require('../models/formFieldsTable');
const documentTemplate = require('../models/documentTemplate');
const categoryTable = require('../models/categoryTable');
const moduleConfig = require('../config/moduleConfig');
const { addDefaultMenuAndItem } = require('../initial/scriptHelper');

module.exports = {

    afterStoreSignupSuccess: async (store, storeType, owner, plan) => {
        try {
            // console.log("plan", plan);
            // let domain = store.slug + "." + env.DOMAIN;
            // let dnsId = await axiosRequest.updateDNS(domain);
            //add storetype ref. to store table
            let updateStore = await Store.updateSettingsAsync({ domain: "", dnsId: "", owner: owner._id, storeType: storeType, _id: store._id });
            // let run = await axiosRequest.runScript(env.scriptUrl, updateStore);
            //run.type = "REBUILD_SCRIPT_CREATE";
            // run.notes = "Create Zip Script";
            //helper.createLogForScript(run);

            //add template script
            let processTemplate = await module.exports.processTemplates(store._id, owner._id, plan);
            //add terminology
            let processTerminologys = await module.exports.processTerminology(store._id, owner._id, plan);
            const getActiveStoreType = updateStore.storeType.filter(storeType => {
                return storeType.status === 'active';
            });
            // getActiveStoreType is for single vendor taxi store only
            let addDefaultMenu = await addDefaultMenuAndItem(store._id, plan, getActiveStoreType[0])

            const getstoreType = updateStore.storeType.filter(storeType => {
                return (storeType.status === 'active' && storeType.storeType === "FOOD")
            });
            let cuisinesData = []

            //add cuisines default data
            //console.log("plan--", plan)
            //console.log("getstoreType---", getActiveStoreType)
            if (getstoreType.length > 0) {

                let processCusinies = await module.exports.addDefaultCusinies(store._id, getstoreType[0]._id);

                processCusinies.map(item => {
                    cuisinesData.push(item._id)
                })
            }

            //process default document templete
            let processDocTemplate = await module.exports.processDocumentTemplate(store._id);

            if (plan && plan.planType && plan.planType === "basic") {
                if (!["CARRENTAL", "AIRBNB"].includes(getActiveStoreType[0]['storeType'])) {
                    helper.addDefaultVehicleType(store._id)
                }
                // if (!['TAXI', 'PICKUPDROP', 'SERVICEPROVIDER', "AIRBNB"].includes(getActiveStoreType[0]['storeType'])) {
                module.exports.singleVendorBasciPlan(store, updateStore.storeType, owner, cuisinesData, plan);

                //}
                // else {
                //     console.log("in false---")
                //     console.log(getActiveStoreType[0]['storeType'])
                //     let promotionData = await module.exports.addDefaultPromotionData(store._id, updateStore.storeType, plan, null);
                // }
                //module.exports.singleVendorBasciPlan(store, updateStore.storeType, owner, cuisinesData, plan);

            }
            else {
                //add promotion script
                helper.addDefaultVehicleType(store._id)
                let promotionData = await module.exports.addDefaultPromotionData(store._id, updateStore.storeType, plan, null);
                await module.exports.processContentPagesAndDefaultData(store._id, owner._id, plan, updateStore.storeType);
            }
        } catch (error) {
            console.log("afterStoreSignupSuccess err", error);
        }
    },

    processContentPagesAndDefaultData: async (storeId, ownerId, plan, storeTypeId, categoryArr) => {
        // console.log("storeTypeId :",storeTypeId);
        //note : storeTypeId must be object of storeType data for single vendor
        let processContentPagess = await module.exports.processContentPages(storeId, ownerId, plan, storeTypeId);

        await Promise.all(processContentPagess.map(async (item) => {
            if (!["HOMEPAGE", "ABOUT_US", "PRIVACY_POLICY", "REFUND_POLICY", "TERMS_CONDITIONS", "APP_BANNER"].includes(item.type))
                return;

            // console.log("item :",item.type);

            let objArr = []
            objArr = await module.exports.addContentPageDefaultData(item, plan, storeTypeId, categoryArr)
            // console.log("objArr :",objArr);

            await Section.insertMany(objArr, async (err, result) => {
                // console.log("result :",result);

                let ids = []
                result.map((item2) => {
                    ids.push(item2._id)
                })
                let refData = {
                    contentSection: item._id,
                    ref: ids
                }
                Content.AddRefToFields(refData);
            });
        }));
    },

    singleVendorBasciPlan: async (store, storeTypes, owner, cuisinesData, plan) => {
        try {
            let data = {};

            const getstoreType = storeTypes.filter(storeType => {
                return storeType.status === 'active';
            });
            data.store = store._id;
            data.name = store.storeName;
            data.email = owner.email;
            data.countryCode = owner.countryCode;
            data.mobileNumber = owner.mobileNumber;
            data.storeType = getstoreType[0]._id;
            data.status = "approved";
            data.role = "VENDOR";
            data.address = owner.address;
            data.deliveryType = ["TAKEAWAY", "DELIVERY"];
            data.userLocation = owner.userLocation;
            let defaultData = await module.exports.getVendorDefaultData(data, getstoreType[0]._id);
            data = { ...data, ...defaultData };

            data.cuisines = cuisinesData

            User.addUserByEmail(data, async (err, resdata) => {
                if (err) {
                    // console.log("singleVendorBasciPlan", err);
                } else {
                    let categoryArr = await module.exports.addDefaultCategoryForVendor(resdata._id, getstoreType[0]._id, getstoreType[0].storeType.toLowerCase())
                    // console.log("categoryArr :", categoryArr);

                    let promotionData = await module.exports.addDefaultPromotionData(store._id, getstoreType, plan, resdata._id);

                    //add content page data
                    await module.exports.processContentPagesAndDefaultData(store._id, owner._id, plan, getstoreType[0], categoryArr);
                }
            });
        } catch (error) {
            // console.log("singleVendorBasciPlan err", error);
        }
    },

    getDefaultData: (countryCode) => {

        let data = {};

        data.api_key = uuidv4();
        data.storeVersion = env.storeVersion;
        data.favIcon = env.favIcon;
        data.logo = env.logo;
        data.bannerImage = env.bannerImage;
        data.paymentMode = "sandbox";
        const paystackCountriesList = ["GH", "NG", "ZA"];
        const pay360CountriesList = ["GB", "IN"];
        const orangeMoneyCountriesList = ["BW", "CM", "CI", "GN", "MG", "ML", "SN", "SL"];
        const squareCountriesList = ["US", "AU", "CA", "JP", "GB", "IE", "FR", "ES"];
        const monCashCountriesList = ["HT"];

        let paymentSettings = [];

        if (orangeMoneyCountriesList.includes(countryCode)) {

            let paymentDataOrangeMoney = {
                payment_method: "orangeMoney",
                status: false,
                consumerKey: null,
                merchantKey: null
            }

            paymentSettings.push(paymentDataOrangeMoney);

        } else {

            let paymentDataStripe = {
                payment_method: "stripe",
                status: false,
                sandboxSecretKey: null,
                sandboxPublishabelKey: null,
                liveSecretKey: null,
                livePublishabelKey: null
            }

            paymentSettings.push(paymentDataStripe);

            if (squareCountriesList.includes(countryCode)) {

                let paymentDataPaystackMoney = {
                    payment_method: "square",
                    status: false,
                    secretKey: null
                }
                paymentSettings.push(paymentDataPaystackMoney);

            }

            if (paystackCountriesList.includes(countryCode)) {

                let paymentDataPaystackMoney = {
                    payment_method: "paystack",
                    status: false,
                    sandboxSecretKey: null,
                    sandboxPublishabelKey: null,
                    liveSecretKey: null,
                    livePublishabelKey: null,
                    minRefundAmount: 1
                }

                paymentSettings.push(paymentDataPaystackMoney);
            }

            if (pay360CountriesList.includes(countryCode)) {

                let paymentDataPay360Money = {
                    payment_method: "pay360",
                    status: false,
                    isvId: null,
                    secretKey: null,
                    merchantId: null,
                    supplierId: null,
                    pay360BaseUrl: null,
                    apikey: null,
                    gatewayUrl: null,
                    liveisvId: null,
                    livesecretKey: null,
                    livemerchantId: null,
                    livesupplierId: null,
                    livepay360BaseUrl: null,
                    liveapikey: null,
                    livegatewayUrl: null,
                }

                paymentSettings.push(paymentDataPay360Money);
            }
            if (monCashCountriesList.includes(countryCode)) {

                let paymentDataMonCash = {
                    payment_method: "moncash",
                    status: false,
                    secretKey: null,
                    secretId: null,
                    livesecretKey: null,
                    livesecretId: null
                }

                paymentSettings.push(paymentDataMonCash);
            }
            let paymentDataBraintree = {
                payment_method: "braintree",
                status: false,
                merchantId: null,
                publicKey: null,
                privateKey: null,
                paypalClientId: null
            }

            paymentSettings.push(paymentDataBraintree);

            if (countryCode == "IN") {

                let paymentDataRazorpay = {
                    payment_method: "razorpay",
                    status: false,
                    sandboxKey_secret: null,
                    sandboxKey_id: null,
                    liveKey_secret: null,
                    liveKey_id: null
                }

                paymentSettings.push(paymentDataRazorpay);
            }
        }

        let paymentDataCOD = {
            payment_method: "cod",
            status: false,
            limit: null
        }

        paymentSettings.push(paymentDataCOD);

        let paymentDataWallet = {
            payment_method: "wallet",
            status: false
        }

        paymentSettings.push(paymentDataWallet);

        data.paymentSettings = paymentSettings;
        data.deliveryMultiStoretype = true;
        data.distanceUnit = "km";
        data.tipType = "percentage";
        data.tip = [1, 2];
        data.themeSettings = {
            adminPrimaryBackgroundColor: "#f80b1b",
            adminPrimaryFontColor: "#ffffff",
            primaryColor: "#f80b1b",
            secondaryColor: "#20242d",
            secondaryFontColor: "#ffffff",
            fontColor: "#ffffff",
            wrapperBackgroundColor: "#ffffff",
            wrapperFontColor: "#000000",
            font: "SFMono-Regular",
            headerStyle: "centerLogo",
            topNavigation: {
                status: true,
                backgroundColor: "#20242d",
                fontColor: "#ffffff",
                content: "<p>⏲ Timing 12 Noon &ndash; 12 Mid Night | ☎ Call: +1XXXXXXXXXX, +1XXXXXXXXXX</p>"
            },
            navigation: {
                status: true,
                backgroundColor: "#f80b1b",
                fontColor: "#ffffff"
            },
            bodyWrapper: {
                backgroundColor: "#20242d",
                fontColor: "#ffffff"
            },
            button: {
                backgroundColor: "#20242d",
                fontColor: "#ffffff"
            },
            icons: {
                backgroundColor: "#20242d",
                fontColor: "#ffffff"
            },
            hyperlink: {
                fontColor: "#ffffff"
            },
            sideMenu: {
                backgroundColor: "#20242d",
                fontColor: "#ffffff"
            },
            footer: {
                backgroundColor: "#20242d",
                fontColor: "#ffffff"
            },
            customCss: "",
            customJs: ""
        };

        data.socialMedia = [
            {
                type: "facebook",
                link: "https://facebook.com"
            },
            {
                type: "twitter",
                link: "https://twitter.com"
            },
            {
                type: "instagram",
                link: "https://instagram.com"
            }
        ];

        data.socialMediaLoginSignUp = [
            {
                "type": "facebook",
                "status": false,
                "keys": {
                    "clientId": null,
                    "secretKey": null,
                    "callbackUrl": "/auth-callback"
                }
            },
            {
                "type": "google",
                "status": false,
                "keys": {
                    "clientId": null,
                    "secretKey": null,
                    "callbackUrl": "/auth-callback"
                }
            },
            {
                "type": "apple",
                "status": false,
                "keys": {
                    "appId": null,
                    "teamId": null,
                    "keyId": null,
                    "keyContent": null,
                    "callbackUrl": "/auth-callback"
                }
            }
        ];

        data.appUrl = {
            customer_android_app: "",
            driver_android_app: "",
            customer_ios_app: "",
            driver_ios_app: ""
        };

        data.googleMapKey = {
            android: "",
            ios: "",
            web: env.GOOGLE_MAP_API_KEY_WEB,
            server: env.GOOGLE_MAP_API_KEY
        };

        if (env.mailgun)
            data.mailgun = env.mailgun
        if (env.twilio)
            data.twilio = env.twilio
        if (env.firebase)
            data.firebase = env.firebase

        data.bankFields = [
            {
                label: "Account Number",
                value: ''
            },
            {
                label: "Account Name",
                value: ''
            },
            {
                label: "Bank Name",
                value: ''
            },
            {
                label: "Routing Number",
                value: ''
            }
        ];

        data.loyaltyPoints = {
            status: false,
            earningCriteria: {
                points: 1,
                value: 5
            },
            redemptionCriteria: {
                points: 1,
                value: 5
            }
        };

        data.notifications = {
            adminNotification: [
                {
                    type: "orderPlaced",
                    values: [
                        {
                            key: "notification",
                            value: true,
                            status: "active"
                        }
                    ]
                }
            ]
        };

        data.notificationSound = "alarm-buzzer";
        data.orderAutoApproval = false;

        data.commissionTransfer = {
            "commission.status": "offline",
            "commission.payoutSchedule": "realTime",
            "commission.scheduleDays": 7,
        };

        data.cookiePolicy = {
            status: "no",
            heading: "Cookiee Policy",
            description: "We use cookies to improve user experience and analyze website traffic. By clicking “Accept“, you agree to our website's cookie use as described in our cookie policy.",
            bodyBackgroundColor: "#f80b1b",
            bodyFontColor: "#ffffff",
            bodyStyle: "boxStyle",
            buttonLabel: "Accept",
            buttonBackgroundColor: "#20242d",
            buttonFontColor: "#ffffff",
            linkLabel: "Cookie Policy",
            linkUrl: "",
            linkFontColor: "#000000",
            linkTarget: "_self"
        }

        data.hideThings = Config.hideThings;
        data.codWalletLimit = 0;

        return data;
    },

    getVendorDefaultData: async (bodyData, storeTypeId) => {

        let storeTypeData = await storeType.findById(ObjectId(storeTypeId))
        let img = {
            food: "6107caab993732d90162d3ab",
            food_bg: "6107e41f993732d90162d3fb",

            grocery: "6107c426993732d90162d3a9",
            grocery_bg: "6107e45f993732d90162d3fc",

            medicine: "61079d44df9c3b1e0099866f",
            medicine_bg: "6107e49b993732d90162d3fd",

            meat: "6107c3f1993732d90162d3a8",
            meat_bg: "6107e4c6993732d90162d3fe",

            pizza: "6107c3b9993732d90162d3a7",
            pizza_bg: "6107e4ed993732d90162d3ff",

            liqure: "6107bff4993732d90162d3a2",
            liqure_bg: "6107e521993732d90162d400",

            flower: "6107c038993732d90162d3a3",
            flower_bg: "6107e54e993732d90162d401"

        }
        let data = {};
        if (!bodyData.profileImage)
            data.profileImage = img[storeTypeData.storeType.toLowerCase()]

        if (!bodyData.bannerImage)
            data.bannerImage = img[storeTypeData.storeType.toLowerCase() + "_bg"]

        data.onlineStatus = "online";
        data.pricePerPerson = 200;
        data.minOrderAmont = 10;
        data.taxAmount = 2;
        data.orderPreparationTime = 30;
        data.commisionType = "global";
        data.commission = {
            vendor: 80,
            deliveryBoy: 0
        };
        data.timeSlot = [
            {
                dayStatus: "no",
                day: 0,
                startTime: "09:00",
                endTime: "22:00"
            },
            {
                dayStatus: "no",
                day: 1,
                startTime: "09:00",
                endTime: "22:00"
            },
            {
                dayStatus: "no",
                day: 2,
                startTime: "09:00",
                endTime: "22:00"
            },
            {
                dayStatus: "no",
                day: 3,
                startTime: "09:00",
                endTime: "22:00"
            },
            {
                dayStatus: "no",
                day: 4,
                startTime: "09:00",
                endTime: "22:00"
            },
            {
                dayStatus: "no",
                day: 5,
                startTime: "09:00",
                endTime: "22:00"
            },
            {
                dayStatus: "no",
                day: 6,
                startTime: "09:00",
                endTime: "22:00"
            }
        ];

        data.notifications = [
            {
                type: "orderPlaced",
                values: [
                    {
                        key: "notification",
                        value: true,
                        status: "active"
                    }
                ]
            }
        ];

        data.notificationSound = "alarm-buzzer";
        data.orderAutoApproval = false;

        data.stripeConnect = {
            status: false,
            accountId: null,
            login_link: null
        }

        data.isVendorAvailable = false;
        data.vendorAvailability = "always";

        return data;
    },

    getDriverDefaultData: () => {
        let data = {};

        data.stripeConnect = {
            status: false,
            accountId: null,
            login_link: null
        }

        return data;
    },

    processStoreTypes: async (storeTypes, storeId) => {
        let STa = [];

        const allStoreTypes = Config.STORETYPES;

        allStoreTypes.forEach(storeTypeElement => {
            const element = {
                storeType: storeTypeElement.storeType,
                storeVendorType: "SINGLE",
                status: "inactive",
                label: storeTypeElement.label
            }

            let defaultStoreTypeImage = '';
            let defaultStoreTypeImageId = '';
            if (storeTypeElement.storeType === "FOOD") {
                defaultStoreTypeImage = '/images/food-bg.png';
                defaultStoreTypeImageId = "61138f33d96b4ad660ad6756";

            } else if (storeTypeElement.storeType === "GROCERY") {
                defaultStoreTypeImage = '/images/grocery-bg.png';
                defaultStoreTypeImageId = "61138fd0d96b4ad660ad6763";

            } else if (storeTypeElement.storeType === "MEDICINE") {
                defaultStoreTypeImage = '/images/medicine-bg.png';
                defaultStoreTypeImageId = "61138ffad96b4ad660ad6765";

            } else if (storeTypeElement.storeType === "MEAT") {
                defaultStoreTypeImage = '/images/meat-bg.png';
                defaultStoreTypeImageId = "6113902ed96b4ad660ad6779";

            } else if (storeTypeElement.storeType === "PIZZA") {
                defaultStoreTypeImage = '/images/pizza-bg.png';
                defaultStoreTypeImageId = "61139055d96b4ad660ad6788";

            } else if (storeTypeElement.storeType === "LIQUOR") {
                defaultStoreTypeImage = '/images/liquor-bg.png';
                defaultStoreTypeImageId = "61139078d96b4ad660ad6789";

            } else if (storeTypeElement.storeType === "FLOWER") {
                defaultStoreTypeImage = '/images/flower-bg.png';
                defaultStoreTypeImageId = "611390a7d96b4ad660ad678d";

            } else if (storeTypeElement.storeType === "TAXI") {
                defaultStoreTypeImage = '/images/taxi-bg.png';
                defaultStoreTypeImageId = "611390ccd96b4ad660ad678e";

            } else if (storeTypeElement.storeType === "PICKUPDROP") {
                defaultStoreTypeImage = '/images/courier-bg.png';
                defaultStoreTypeImageId = "611390f8d96b4ad660ad678f";

            } else if (storeTypeElement.storeType === "SERVICEPROVIDER") {
                defaultStoreTypeImage = '/images/Provider.png';
                defaultStoreTypeImageId = "623c2fd5f1416f12f5bfa1fe";

            }
            else if (storeTypeElement.storeType === "AIRBNB") {
                defaultStoreTypeImage = '/images/hotel.png';
                defaultStoreTypeImageId = "624c142f85329f0fa342d585";

            }
            else if (storeTypeElement.storeType === "CARRENTAL") {
                defaultStoreTypeImage = '/images/car_rental.png';
                defaultStoreTypeImageId = "62591301e943810620fa4890";

            }

            const _index = storeTypes.findIndex(store => store.storeType === storeTypeElement.storeType)
            if (_index !== -1) {
                element.storeVendorType = storeTypes[_index].storeVendorType
                element.status = "active"
            }
            let storeText = `<h1>Your Favourite Food<br>Delivered Hot and Fresh</h1><p>The best places near you</p>`;

            let object = {
                store: storeId,
                storeType: element.storeType,
                storeTypeImage: defaultStoreTypeImageId,
                defaultStoreTypeImage: defaultStoreTypeImage,
                label: element.label,
                taxAmount: 2,

                deliveryAreaDriver: 20,
                noOfDriversPerRequest: 5,
                driverWaitTime: 2,
                "scheduled.status": false,
                "otpSettings.status": false,
                "rideHailingSettings.status": false,
                "cityPricingSettings.status": false,
                storeVendorType: element.storeVendorType,
                status: element.status,
                date_created_utc: new Date()
            }

            if (storeTypeElement.storeType == "FOOD") object.storeText = storeText;

            if (storeTypeElement.storeType == 'AIRBNB') {
                delete object.deliveryAreaDriver
                delete object.noOfDriversPerRequest
                delete object.driverWaitTime
                delete object.otpSettings
                delete object.rideHailingSettings
                delete object.cityPricingSettings
                object.vendorWaitTime = 1;
                object["commission.vendor"] = 80;
                object["taxSettings.level"] = "vendor";
                object["taxSettings.percentage"] = 2;
                object["scheduled.vendorRequestTime"] = 15;

            }
            if (storeTypeElement.storeType == 'CARRENTAL') {
                delete object.deliveryAreaDriver
                delete object.noOfDriversPerRequest
                delete object.driverWaitTime
                delete object.otpSettings
                delete object.rideHailingSettings
                delete object.cityPricingSettings
                object.deliveryAreaVendor = 20;
                object.vendorWaitTime = 1;
                object["commission.vendor"] = 80;
                object["taxSettings.level"] = "vendor";
                object["taxSettings.percentage"] = 2;
                object["scheduled.vendorRequestTime"] = 15;

            }
            if (storeTypeElement.storeType == 'TAXI') {

                object["bidSettings.status"] = false;
                object["bidSettings.percentage"] = 10;
                object["bidSettings.flatAmount"] = 10;
                object["bidSettings.requestTimer"] = 30;

            }
            if (storeTypeElement.storeType == 'PICKUPDROP') {
                object["multiDropsSettings"] = false;
            }


            if (storeTypeElement.storeType == 'SERVICEPROVIDER') {
                object.requestType = 'Random'
                object["commission.deliveryBoy"] = 90;
                object.deliveryAreaVendor = 1;
            }
            if (!['PICKUPDROP', 'TAXI', 'SERVICEPROVIDER', 'AIRBNB', 'CARRENTAL'].includes(storeTypeElement.storeType)) {
                object.deliveryType = ["TAKEAWAY", "DELIVERY"]
                object.deliveryPlatform = {
                    platform: "self",
                    deliveryProvider: [
                        {
                            type: "postmates",
                            keys: {
                                authenticationKey: null,
                                customerId: null
                            }
                        }
                    ]
                }
                object.deliveryAreaVendor = 20;
                isVeganFilterActive = true;
                hideVendorInfo = true;
                object.deliveryAreaVendorTakeaway = 30;
                object.vendorWaitTime = 1;
                object["taxSettings.level"] = "vendor";
                object["taxSettings.percentage"] = 2;
                object["commission.vendor"] = 80;
                object["commission.deliveryBoy"] = 90;
                object["scheduled.vendorRequestTime"] = 15;
                object["freeDeliverySettings.status"] = false;
                object["freeDeliverySettings.range"] = [
                    {
                        minOrderValue: 0,
                        maxOrderValue: 50
                    }
                ];
                object.deliveryFeeType = "unit";
                object["deliveryFeeSettings.base_price"] = 10;
                object["deliveryFeeSettings.per_unit_distance"] = 1.17;
                object["deliveryFeeSettings.per_unit_time"] = 0.17;
                object["deliveryFeeSettings.unit"] = "km";
                object["isEnableDeliveryTimeSlot"] = false;

            }
            STa.push(object);
        })
        let st = await storeType.insertMany(STa);

        let Stids = [];
        st.forEach(element => {
            Stids.push(element._id);
        });
        return Stids;
    },

    addDefaultCategoryForVendor: async (vendor, storeType, storeTypeName) => {

        let data = {
            "food": [
                {

                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Snacks",
                    "catDesc": "",
                    "parent": "none",
                    "catImage": "611f3b26d5209fd011f710ce",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Desserts",
                    "catDesc": "",
                    "parent": "none",
                    "catImage": "611f3b58d5209fd011f710cf",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Beverages",
                    "catDesc": "",
                    "parent": "none",
                    "catImage": "611f3b8fd5209fd011f710d0",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Soup",
                    "catDesc": "",
                    "parent": "none",
                    "catImage": "611f3bbcd5209fd011f710d1",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Breads",
                    "catDesc": "",
                    "parent": "none",
                    "catImage": "611f3bf6d5209fd011f710d2",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }],
            "grocery": [
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Fruits",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e564ed5209fd011f70b53",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Vegetables",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5629d5209fd011f70b52",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Dairy",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e55fbd5209fd011f70b51",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Bread",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e55d0d5209fd011f70b50",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Spices & Seasonings",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e558cd5209fd011f70b4f",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }],
            "medicine": [
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Masks",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e4d53d5209fd011f70b3d",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Sanitizers",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e4d8ed5209fd011f70b3e",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Gloves",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e4dc2d5209fd011f70b3f",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "PPE Kits",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e4e05d5209fd011f70b40",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Thermometers",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e4e2ed5209fd011f70b41",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }],
            "pizza": [
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Desserts",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e4ee9d5209fd011f70b42",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Drinks",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5380d5209fd011f70b46",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Non Veg Pizza",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e53b5d5209fd011f70b47",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Veg Pizza",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e53e3d5209fd011f70b48",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Cheese Pizza",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5423d5209fd011f70b49",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }],
            "flower": [
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Rose",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e54a6d5209fd011f70b4a",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Orchids",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e54d0d5209fd011f70b4b",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Lilies",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e54fbd5209fd011f70b4c",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Flower Boxes",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5528d5209fd011f70b4d",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Flower and Taddy",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5552d5209fd011f70b4e",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }],
            "meat": [
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Chicken",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5682d5209fd011f70b54",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Mutton",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e56b1d5209fd011f70b55",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Eggs",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e56d3d5209fd011f70b56",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Sea food",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e56f7d5209fd011f70b57",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Prawn",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e572bd5209fd011f70b58",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }],
            "liquor": [
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Wishky",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e579bd5209fd011f70b59",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Vodka",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e57e9d5209fd011f70b5a",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Rum",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5809d5209fd011f70b5b",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Brandy",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5867d5209fd011f70b5c",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Tequila",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5890d5209fd011f70b5d",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }],
            "other": [
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Fruits",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e564ed5209fd011f70b53",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Vegetables",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e5629d5209fd011f70b52",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Dairy",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e55fbd5209fd011f70b51",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Bread",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e55d0d5209fd011f70b50",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                },
                {
                    "subcategories": [],
                    "sortOrder": 1,
                    "status": "active",
                    "catName": "Spices & Seasonings",
                    "catDesc": null,
                    "parent": "none",
                    "catImage": "611e558cd5209fd011f70b4f",
                    "isFeatured": false,
                    "vendor": vendor,
                    "storeType": storeType,
                    "date_created_utc": new Date(),
                    "meta_data": []
                }],
        }

        let finalArr = []
        if (data[storeTypeName] && data[storeTypeName].length > 0)
            await Promise.all(data[storeTypeName].map(async item => {
                let data = await categoryTable.create(item)
                finalArr.push(data)
            }))
        return finalArr;

    },

    updateVendorTakeawayAllStoreTypeScript: async () => {
        return await storeType.updateMany({}, { $set: { deliveryAreaVendorTakeaway: 30 } });
    },

    processTemplates: async (storeId, user, plan) => {

        let customerTemplates = await emailTemplate.getCustomerTemplates(storeId, user);

        let driverTemplates = await emailTemplate.getDriverTemplates(storeId, user);

        let vendorTemplates = [];
        if (plan && plan.planType && plan.planType === "basic") {
            vendorTemplates = await emailTemplate.singleVendorOrderTemplate(storeId, user);
        } else {
            vendorTemplates = await emailTemplate.getVendorTemplates(storeId, user);
        }

        let adminTemplates = await emailTemplate.getAdminTemplates(storeId, user);

        let templatData = [...customerTemplates, ...driverTemplates, ...vendorTemplates, ...adminTemplates];

        await Template.insertMany(templatData);
    },

    processContentPages: async (storeId, user, plan, storeTypeId) => {
        //note : storeTypeId must be object of storeType data for single vendor
        let contentData = [
            { store: storeId, user: user, deviceType: "web", title: "About Us", type: "ABOUT_US", content: "Lorem Ipsum", status: "active", date_created_utc: new Date() },
            { store: storeId, user: user, deviceType: "web", title: "Privacy Policy", type: "PRIVACY_POLICY", content: "Lorem Ipsum", status: "active", date_created_utc: new Date() },
            { store: storeId, user: user, deviceType: "web", title: "Refund Policy", type: "REFUND_POLICY", content: "Lorem Ipsum", status: "active", date_created_utc: new Date() },
            { store: storeId, user: user, deviceType: "web", title: "Terms Conditions", type: "TERMS_CONDITIONS", content: "Lorem Ipsum", status: "active", date_created_utc: new Date() },
            { store: storeId, user: user, deviceType: "web", title: "Contact Us", type: "CONTACT_US", content: "<p><span style=\"color:#000000\">Try us if you&#39;re in search of any item related to our niche. We are offering you a user-friendly platform, with ease while placing an order. One can pay securely and manage their transactions with our encrypted payment gateways. </span><br />\n<span style=\"color:#000000\">Get real-time updates after placing an order</span></p>\n", status: "active", date_created_utc: new Date() },
            { store: storeId, user: user, deviceType: "web", title: "Homepage", type: "HOMEPAGE", content: "Lorem Ipsum", status: "active", date_created_utc: new Date() }
        ];

        if (plan && plan.planType && plan.planType === "basic" && !["TAXI", "PICKUPDROP"].includes(storeTypeId.storeType))
            contentData.push({ store: storeId, user: user, deviceType: "mobile", title: "App Banner", type: "APP_BANNER", content: "APP_BANNER", status: "active", date_created_utc: new Date() })

        return await Content.insertMany(contentData);
    },
    processContentPagesByScript: async (storeId, user) => {

        let contentData = { store: storeId, user: user, deviceType: "mobile", title: "App Banner", type: "APP_BANNER", content: "APP_BANNER", status: "active", date_created_utc: new Date() };


        await Content.findOneAndUpdate({ store: storeId, user: user, type: "APP_BANNER" }, contentData, { upsert: true, new: true });
    },
    addMailgunAndTwilioSettings: async (storeId, user) => {
        let obj = { store: storeId, user: user }
        if (env.mailgun)
            obj.mailgun = env.mailgun
        if (env.twilio)
            obj.twilio = env.twilio
        if (env.AWS)
            obj.aws = env.AWS
        return await Settings.create(obj);
    },
    addDefaultPromotionData: async (storeId, storeTypes, plan, vendor) => {

        let type = (plan && plan.planType && plan.planType === "basic") ? "singleVendor" : "multiVendor"
        let img = {
            food: "6107caab993732d90162d3ab",
            grocery: "6107c426993732d90162d3a9",
            medicine: "61079d44df9c3b1e0099866f",
            meat: "6107c3f1993732d90162d3a8",
            pizza: "6107c3b9993732d90162d3a7",
            liquor: "6107bff4993732d90162d3a2",
            flower: "6107c038993732d90162d3a3",
            taxi: "61a77782efeb1a7668ecc01b",
            pickupdrop: "61a777d4efeb1a7668ecc01c"
        }

        let data = []


        Promise.all(storeTypes.map(item => {

            console.log("item :", item);

            if (item.status === 'active') {
                let storeTypeName = item.storeType
                data.push({
                    "status": "active",
                    "promotionName": storeTypeName.charAt(0).toUpperCase() + storeTypeName.slice(1) + " Promotion",
                    "promotionImage": img[storeTypeName.toLowerCase()],
                    "type": type,
                    "storeTypeId": item._id,
                    "store": storeId,
                    "vendor": vendor,
                    "date_created_utc": new Date(),
                    "meta_data": []
                })
            }
        }));
        console.log("data :", data);


        return await Promotion.insertMany(data);
    },
    addDefaultCusinies: async (storeId, storeTypeId) => {
        let data = [{
            "status": "active",
            "name": "Indian",
            "image": "6109161c993732d90162d9d7",
            "storeType": storeTypeId,
            "store": storeId,
            "date_created_utc": new Date(),
            "meta_data": []
        },
        {
            "status": "active",
            "name": "American",
            "image": "610914e3993732d90162d9d2",
            "storeType": storeTypeId,
            "store": storeId,
            "date_created_utc": new Date(),
            "meta_data": []
        },
        {
            "status": "active",
            "name": "Chinese",
            "image": "61091642993732d90162d9d8",
            "storeType": storeTypeId,
            "store": storeId,
            "date_created_utc": new Date(),
            "meta_data": []
        },
        {
            "status": "active",
            "name": "Japanese",
            "image": "61091691993732d90162d9d9",
            "storeType": storeTypeId,
            "store": storeId,
            "date_created_utc": new Date(),
            "meta_data": []
        },
        {
            "status": "active",
            "name": "Italian",
            "image": "610916e0993732d90162d9da",
            "storeType": storeTypeId,
            "store": storeId,
            "date_created_utc": new Date(),
            "meta_data": []
        }]

        return await Cuisines.insertMany(data)
    },
    addContentPageDefaultData: async (item, plan, storeType, categoryArr) => {
        // console.log("storeType :",storeType);
        //note : storeType must be object of storeType data for single vendor

        if (item.type === "HOMEPAGE") {
            let homeBanner = {
                "sortOrder": 1,
                "status": "active",
                "contentSection": item._id,
                "type": "banner",
                "heading": "",
                "content": "<h1><span style=\"color:#000000\">A Click Away From Your Pick.</span></h1>\n\n<p><span style=\"color:#000000\"><strong>Saving Your Time.</strong> We&rsquo;ve got something for <strong>everyone.</strong></span></p>\n",
                "fullWidth": true,
                "banner": "6093c8bbcc43a6ebacfd6fe3",
                "searchOption": true,
                "date_created_utc": new Date(),
                "multipleContent": [],
                "meta_data": []
            }
            let slider = {
                "sortOrder": 1,
                "status": "active",
                "contentSection": item._id,
                "type": "slider",
                "multipleContent": [
                    {
                        "_id": "61013126863baf9bc501ce27",
                        "heading": "Los Angeles",
                        "subHeading": "We Had Such A Great Time In LA!",
                        "banner": "61013d2f07a4d92131e376e8"
                    },
                    {
                        "_id": "61013126863baf9bc501ce28",
                        "heading": "Chicago",
                        "subHeading": "Thank You, Chicago!",
                        "banner": "61013d2f07a4d92131e376e8"
                    },
                    {
                        "_id": "61013126863baf9bc501ce29",
                        "heading": "New York",
                        "subHeading": "We Love The Big Apple!",
                        "banner": "61013d2f07a4d92131e376e8"
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": [

                ],
                "templateType": "slider1"
            }
            let gallery = {
                "sortOrder": 2,
                "status": "active",
                "contentSection": item._id,
                "type": "gallery",
                "templateType": "gallery1",
                "label": "Gallery",
                "subHeading": "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet",
                "multipleContent": [
                    {
                        "heading": "bridge",
                        "banner": "6101429b07a4d92131e376e9"
                    },
                    {
                        "heading": "park",
                        "banner": "6101430507a4d92131e376ea"
                    },
                    {
                        "heading": "tunnel",
                        "banner": "6101433907a4d92131e376eb"
                    },
                    {
                        "heading": "traffic",
                        "banner": "6101436507a4d92131e376ec"
                    },
                    {
                        "heading": "coast",
                        "banner": "6101438b07a4d92131e376ed"
                    },
                    {
                        "heading": "bridge",
                        "banner": "6101429b07a4d92131e376e9"
                    },
                    {
                        "heading": "park",
                        "banner": "6101430507a4d92131e376ea"
                    },
                    {
                        "heading": "tunnel",
                        "banner": "6101433907a4d92131e376eb"
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": [

                ]
            }

            let arr = [

                {
                    "sortOrder": 3,
                    "status": "active",
                    "contentSection": item._id,
                    "type": "contentImage",
                    "heading": "Stay Safe and Save Big While you Order with Us",
                    "buttonText": "Read More",
                    "buttonLink": env.adminPanelUrl,
                    "backgroundColor": "#fffefe",
                    "imagePosition": "Left",
                    "content": "<p><span style=\"color:#000000\">Buy what you want, when you want it, and from wherever you want it. At the touch of a button, you&#39;ll be able to find the local products you&#39;re looking for. Explore local stores, local items, top local products, and much more in the days ahead.</span></p>\n",
                    "banner": "6093c989cc43a6ebacfd6fe4",
                    "date_created_utc": new Date(),
                    "multipleContent": [],
                    "meta_data": [],
                    "label": ""
                },
                {
                    "sortOrder": 2,
                    "status": "active",
                    "contentSection": item._id,
                    "type": "feature",
                    "backgroundColor": "#f9f9f9",
                    "multipleContent": [
                        {
                            "heading": "Become a Driver",
                            "buttonText": "Apply Now",
                            "buttonLink": "/driver-registration",
                            "content": "<p>As a delivery driver, you&#39;ll make reliable money&mdash;working anytime, anywhere.</p>\n",
                            "banner": "6093ca21cc43a6ebacfd6fe5"
                        },
                        {
                            "heading": "Become a Partner",
                            "buttonText": "Apply Now",
                            "buttonLink": "/vender-registration",
                            "banner": "6093cb5fcc43a6ebacfd6fe6",
                            "content": "<p>Grow your business and reach new customers by partnering with us.</p>\n"
                        },
                        {
                            "heading": "Try Our App",
                            "buttonText": "",
                            "buttonLink": "",
                            "banner": "6093cbc7cc43a6ebacfd6fe7",
                            "content": "<p>Experience the best your neighborhood has to offer, all in one app.</p>\n\n<p><a href=\"https://www.apple.com/app-store/\" target=\"_blank\">iOS App </a>&nbsp; <a href=\"https://play.google.com/store/apps\" target=\"_blank\">Android App </a></p>\n"
                        }
                    ],
                    "date_created_utc": new Date(),
                    "meta_data": [],
                    "label": "Services & Features"
                },
                {
                    "sortOrder": 4,
                    "status": "active",
                    "contentSection": item._id,
                    "type": "content",
                    "heading": "About Us",
                    "buttonText": "Read More",
                    "buttonLink": "/aboutus",
                    "content": "<p>We are&nbsp;allowing customers to shop with ease and we are making technology easier for business owners so they can focus on growing their business. We&#39;re always looking for new ways to grow our platform by bringing in the best products in the market.</p>\n",
                    "backgroundColor": "#cee9f8",
                    "date_created_utc": new Date(),
                    "multipleContent": [],
                    "meta_data": [],
                    "label": ""
                },
                {
                    "sortOrder": 5,
                    "status": "active",
                    "contentSection": item._id,
                    "type": "testimonial",
                    "backgroundColor": "#ffffff",
                    "multipleContent": [
                        {
                            "heading": "Isabella Rose",
                            "subHeading": "",
                            "content": "<p><span style=\"color:#000000\">Great customer support, very professional with fast and courteous drivers.</span></p>\n",
                            "banner": "6093cc2fcc43a6ebacfd6fe8"
                        },
                        {
                            "heading": "Jack Parker",
                            "subHeading": "",
                            "banner": "6093cce8cc43a6ebacfd6fe9",
                            "content": "<p><span style=\"color:#000000\">True heroes for upgrading their service and delivering during this virus outbreak. Please tip generously.</span></p>\n"
                        },
                        {
                            "heading": "Gunther Muriel ",
                            "subHeading": "",
                            "banner": "6093cce8cc43a6ebacfd6fe9",
                            "content": "<p><span style=\"color:#000000\">Working under a tight deadline, their team overcame unexpected challenges to get us what we needed when we needed it.</span></p>\n"
                        },
                        {
                            "heading": "Augustus Geller",
                            "content": "<p><span style=\"color:#000000\">Safe to order and secured payment options that are easy on the pockets as well. Would definitely recommend it. </span></p>\n",
                            "banner": "6093cce8cc43a6ebacfd6fe9"
                        }
                    ],
                    "date_created_utc": new Date(),
                    "meta_data": [],
                    "label": "Our Testimonials"
                }
            ]

            // Banner, ContentImage, Feature, Content and Testimonial type content for "TAXI" and "PICKUPDROP" only
            if (plan && plan.planType && plan.planType === "basic" && ["TAXI", "PICKUPDROP"].includes(storeType.storeType))
                arr = [...[homeBanner], ...arr]
            else if (plan && plan.planType && plan.planType === "basic")
                arr = [...[slider, gallery], ...arr]
            else
                arr = [...[homeBanner], ...arr]

            arr.forEach((item, i) => {
                arr[i]["sortOrder"] = i
            })

            return arr;
        }
        if (item.type === "ABOUT_US")
            return [
                {
                    "sortOrder": 2,
                    "status": "active",
                    "contentSection": item._id,
                    "type": "contentImage",
                    "heading": "About the store:",
                    "buttonText": "",
                    "buttonLink": "",
                    "backgroundColor": "#ffffff",
                    "content": "<p><span style=\"color:#000000\">Our product was designed to make technology simpler for business owners so they can concentrate on growing their business while still encouraging consumers to shop more easily. We are a&nbsp;feature-rich platform that helps businesses and Customers on the go.&nbsp;</span></p>\n\n<p><span style=\"color:#000000\">Try us if you&#39;re in search of any item related to our niche. We are offering you a user-friendly platform, with ease while placing an order. One can pay securely and manage their transactions with our encrypted payment gateways. </span><br />\n<span style=\"color:#000000\">Get real-time updates after placing an order</span></p>\n\n<p>&nbsp;</p>\n",
                    "banner": "6093cdbccc43a6ebacfd6fea",
                    "imagePosition": "Left",
                    "date_created_utc": new Date(),
                    "multipleContent": [],
                    "meta_data": []
                },
                {
                    "sortOrder": 3,
                    "status": "active",
                    "contentSection": item._id,
                    "type": "content",
                    "heading": "We Love Our Customers",
                    "buttonText": "",
                    "buttonLink": "",
                    "backgroundColor": "#979595",
                    "content": "<p><span style=\"color:#000000\">We are pleased to offer you better and advanced services. If there is any kind of suggestion to make us serve you in a better way. Then we are ready to embrace it!!! </span><br />\n&nbsp;</p>\n\n<p><span style=\"color:#000000\">Thank you so much for being a valued customer</span></p>\n",
                    "date_created_utc": new Date(),
                    "multipleContent": [],
                    "meta_data": []
                }
            ]

        if (item.type === "PRIVACY_POLICY")
            return [{
                "sortOrder": 1,
                "status": "active",
                "contentSection": item._id,
                "type": "content",
                "heading": "",
                "buttonText": "",
                "buttonLink": "",
                "backgroundColor": "#ffffff",
                "content": `

                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">Your privacy is critically important to us.</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">It is our policy to respect your privacy regarding any information we may collect from you while operating your store. This Privacy Policy applies to all our users. It is the company&rsquo;s sole responsibility to protect your privacy and personally identifiable information you may provide us at all costs. This privacy policy (&quot;Privacy Policy) was adopted to explain what information may be collected on our Website, how the information is being used, and under what circumstances we might disclose the information to third parties if there be any. This Privacy Policy applies only to the information we collect through the Website and does not apply to the ones we get from other sources. This Privacy Policy together with the Terms and conditions posted on our Website, set forth the general rules and policies governing your use on our Website. You may be required to agree to additional terms and conditions depending on your activities visiting our website.</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000"><strong>- Website Visitors&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">Like most website operators, we collect non-personal &ndash;identifiable information of the sort that web browsers and servers typically make available such as the browser type, language preference, referring site, and the date and time of visitor&rsquo;s request. Our purpose in collecting non-personal identifiable information is to better understand how visitors use this website. From time to time, we may release non-identifiable information in the aggregate, e.g., by publishing a report on trends in the usage of its website.</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">We also collect potential personal &ndash;identifiable information like Internet Protocol (IP) addresses for logged-in users and for users leaving comments on website blog posts and only disclose logged-in user and commenter IP addresses under the same circumstance it is being used as described below.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- Gathering of Personally-Identifiable Information</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">Certain visitors to our website choose to interact in ways that require us to gather personal information. The amount and type of information that we gather depend on the nature of the interaction. For example, we ask visitors who sign up for a blog at our website to provide a username and email address.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- Security</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">The security of your Personal Information is important to us, but kindly note that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Information, we cannot guarantee its absolute security.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- Advertisements</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">Ads appearing on our website may be delivered to users by advertising partners who may set cookies. These cookies allow the ad server to recognize your computer each time they send you an online advertisement to compile information about you or others who use your computer. This information allows ad networks to among other things deliver targeted advertisements that they believe will be of most interest to you. This Privacy Policy covers the use of cookies by us and does not cover the use of cookies by any advertisers.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- Links To External Sites</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">Our Service may contain links to external sites that are not operated by us. If you click on a third-party link, you will be directed to that third party&#39;s site. We strongly advise you to review the Privacy Policy and terms and conditions of every site you visit.</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites, products, or services.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- Our website uses Google AdWords for remarketing</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">We use remarketing services to advertise on third-party websites (including Google) to previous visitors to our site. It could mean that we advertise to previous visitors who haven&#39;t completed a task on our site, for example using the contact form to make an inquiry. This could be in the form of an advertisement on the Google search results page or a site in the Google Display Network. Third-party vendors including Google use cookies to serve ads based on someone&#39;s past visits. Of course, any data collected will be used in accordance with our own privacy policy and Google&#39;s privacy policy.</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">You can set preferences for how Google advertises to you using the Google Ad Preferences page Protection of Certain Personally-Identifiable Information</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">We disclose potentially personally identifiable and personally-identifying information only to its employees, contractors, and affiliated organizations that (i) need to know that information in order to process it on our company&rsquo;s behalf or to provide services available at the website, and (ii) that have agreed not to disclose it to others. Some of those employees, contractors, and affiliated organizations may be located outside of your home country; by using our website, you consent to the transfer of such information to them. We do not give out or sell potentially personally identifiable and personally-identifying information to anyone. Our company can only disclose potentially identifying and personally identifying information only in response to a subpoena, court order, or other governmental requests, or when the company believes in good faith that disclosure is reasonably necessary to protect the property or rights of our company, third parties, or the public at large.</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">If you are a registered user and have supplied your email address, we may occasionally send you an email to tell you about new features, solicit your feedback, or just keep you up to date with the recent happenings on Jupytar Express and our products.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- Aggregated Statistics</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">We may collect statistics about the behavior of visitors to its website and may display this information publicly or provide it to others. However, your personally identifying information may not be disclosed.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- Affiliate Disclosure</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">This site uses affiliate links and does earn a commission from certain links. This does not affect your purchases or the price you may pay.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- Cookies</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">To enrich and perfect your online experience, we use &quot;Cookies&quot;, similar technologies and services provided by others to display personalized content, appropriate advertising, and store your preferences on your computer.</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">A cookie is a string of information that a website stores on a visitor&#39;s computer, and that the visitor&#39;s browser provides to the website each time the visitor returns. We use cookies to help our company identity and track visitors, their usage of the website, and their website access preferences. Visitors who do not wish to have cookies placed on their computers should ensure to set their browsers refuse cookies before using our websites, with the disadvantage that certain features of this website may not be able to function properly without the aid of cookies.</span></span></span></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">By continuing to navigate through our website without changing your cookie settings, you are hereby acknowledging and agreeing to our use of cookies.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- E-commerce</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">Those who engage in transactions with us &ndash; by purchasing products or the use of their services are asked to provide additional information, including as necessary the personal and financial information required to process those transactions. In each case, such information will be collected only when necessary or appropriate to fulfill the purpose of the visitor&#39;s interaction with us. We do not disclose personally-identifying information other than as described below. Visitors can always refuse to supply personally-identifying information, with the caveat that it may prevent them from engaging in certain website-related activities.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">- Business Transfers</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">If our assets are substantially acquired or in an event that might cause us to go out of business or enters bankruptcy, the users&rsquo; information would be one of the assets that will be transferred or acquired by a third party. You can acknowledge that such transfers may occur and that any acquirer of our company may continue to use your personal information as set forth in this policy.</span></span></span></p>
                
                <p><strong><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">Privacy Policy Changes</span></span></span></strong></p>
                
                <p><span style="font-size:11pt"><span style="font-family:Arial"><span style="color:#000000">However, changes are likely to be minor when we may want to change its Privacy Policy as time goes by at their sole discretion. Our company encourages visitors to frequently check this page for any changes that will be made to its Privacy Policy. Your continued use of this site will constitute your acceptance of any change in this privacy policy.</span></span></span></p>
                
                <p>&nbsp;</p>
                `,
                "date_created_utc": new Date(),
                "multipleContent": [],
                "meta_data": []
            }]

        if (item.type === "REFUND_POLICY")
            return [{
                "sortOrder": 1,
                "status": "active",
                "contentSection": item._id,
                "type": "content",
                "heading": "",
                "backgroundColor": "#ffffff",
                "content": "<h3>Where does it come from?</h3>\n\n<p>Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of &quot;de Finibus Bonorum et Malorum&quot; (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, &quot;Lorem ipsum dolor sit amet..&quot;, comes from a line in section 1.10.32.</p>\n\n<p>The standard chunk of Lorem Ipsum used since the 1500</p>\n",
                "buttonText": "",
                "buttonLink": "",
                "date_created_utc": new Date(),
                "multipleContent": [],
                "meta_data": []
            }]

        if (item.type === "TERMS_CONDITIONS")
            return [{
                "sortOrder": 1,
                "status": "active",
                "contentSection": item._id,
                "type": "content",
                "heading": "",
                "buttonText": "",
                "buttonLink": "",
                "backgroundColor": "#ffffff",
                "content": "<h3>Why do we use it?</h3>\n\n<p>It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using &#39;Content here, content here&#39;, making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for &#39;lorem ipsum&#39; will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).</p>\n\n<p>&nbsp;</p>\n\n<h3>Where does it come from?</h3>\n\n<p>Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of &quot;de Finibus Bonorum et Malorum&quot; (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, &quot;Lorem ipsum dolor sit amet..&quot;, comes from a line in section 1.10.32.</p>\n\n<p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from &quot;de Finibus Bonorum et Malorum&quot; by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p>\n\n<h3>Where can I get some?</h3>\n\n<p>There are many variations of passages of Lorem Ipsum available, but the majority have suffered alte</p>\n",
                "date_created_utc": new Date(),
                "multipleContent": [],
                "meta_data": []
            }]

        if (item.type === "APP_BANNER" && !["TAXI", "PICKUPDROP"].includes(storeType.storeType)) {
            let catMultipleContent = []
            if (categoryArr.length > 0)
                categoryArr.forEach(item => {
                    catMultipleContent.push({
                        "category": item._id,
                        "banner": item.catImage,
                        "storeType": storeType._id
                    })
                })
            return [{
                "sortOrder": 1,
                "status": "active",
                "contentSection": item._id,
                "type": "productBanner",
                "templateType": null,
                "multipleContent": [
                    {
                        "product": [
                        ],
                        "banner": "611f79ecbfc6385e6f9cd9c1",
                        "storeType": storeType._id
                    },
                    {
                        "product": [
                        ],
                        "storeType": storeType._id,
                        "banner": "611e34a96097890001d6a804"
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            },
            {
                "sortOrder": 2,
                "status": "active",
                "contentSection": item._id,
                "type": "categoryBanner",
                "templateType": null,
                "multipleContent": catMultipleContent,
                "date_created_utc": new Date(),
                "meta_data": []
            },
            {
                "sortOrder": 3,
                "status": "active",
                "contentSection": item._id,
                "type": "simpleBanner",
                "templateType": null,
                "multipleContent": [
                    {
                        "banner": "611f2961d5209fd011f70dce",
                        "storeType": storeType._id,
                        "redirectTo": "none"
                    },
                    {
                        "banner": "611f299dd5209fd011f70dcf",
                        "storeType": storeType._id,
                        "redirectTo": "none"
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            }]
        }
    },

    processTerminology: async (storeId, user, planType) => {
        let driverObjArr = driverTerminology.Insert_JSON_arr
        let customerObjArr = customerTerminology.Insert_JSON_arr
        let orderLangObjArr = customerTerminology.orderLang_arr

        let TerminologyData = [
            { store: storeId, user: user, type: "drivers", lang: "en", values: driverObjArr, status: "active", date_created: new Date() },
            { store: storeId, user: user, type: "customers", lang: "en", values: customerObjArr, status: "active", date_created: new Date() },
            { store: storeId, user: user, type: "order", lang: "en", values: orderLangObjArr, status: "active", date_created: new Date() },

        ];

        return await Terminology.insertMany(TerminologyData);
    },

    processDocumentTemplate: async (storeId) => {
        let vendorKyc = [{
            "type": "personalInfo",
            "isComplete": false,
            "fields": [
            ],
            "status": "active",
            "name": "Kyc Detail",
            "role": "VENDOR",
            "store": storeId,
            "date_created_utc": new Date(),
            "meta_data": []
        }];
        let driverKyc = [{
            "type": "personalInfo",
            "isComplete": false,
            "fields": [
            ],
            "status": "active",
            "name": "Kyc Detail",
            "role": "DRIVER",
            "store": storeId,
            "date_created_utc": new Date(),
            "meta_data": []
        }];
        let vehicleInfo = [{

            "isComplete": false,
            "type": "vehicleInfo",
            "fields": [
            ],
            "status": "active",
            "name": "Vehicle Info",
            "role": "DRIVER",
            "store": storeId,
            "date_created_utc": new Date(),
            "meta_data": []
        }];
        let finalData = []
        let data = [...vendorKyc, ...driverKyc, ...vehicleInfo]
        let docData = []
        await Promise.all(data.map(async item => {
            let savedData = await documentTemplate.create(item);
            docData.push(savedData)
        }))

        // console.log("docData :", docData);

        for (let index = 0; index < docData.length; index++) {
            let element = docData[index];
            let docTemplateData = await module.exports.addDefaultDriverVendorKycVehicleInfo(element._id, element)
            // console.log(`docTemplateData ${index}:`, docTemplateData);

            let fieldsId = docTemplateData.map(item => item._id)
            // console.log(`fieldsId ${index}:`, fieldsId);

            let docData2 = await documentTemplate.findByIdAndUpdate(element._id, { $addToSet: { fields: fieldsId } }, { new: true })
            finalData.push(docData2)
        }
        return finalData;
    },

    addDefaultDriverVendorKycVehicleInfo: async (templateId, element) => {
        try {
            let driverVehicleInfo = [{
                "validation": {
                    "required": true
                },
                "type": "select",
                "sortOrder": 1,
                "status": "active",
                "template": templateId,
                "label": "Vehicle Type",
                "options": [
                    {
                        "label": "Please Select",
                        "value": "---Select---"
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            },
            {
                "validation": {
                    "required": true
                },
                "type": "text",
                "sortOrder": 2,
                "status": "active",
                "template": templateId,
                "label": "Vehicle Name",
                "options": [
                    {
                        "label": "",
                        "value": ""
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            },
            {
                "validation": {
                    "required": true
                },
                "type": "text",
                "sortOrder": 3,
                "status": "active",
                "template": templateId,
                "label": "Vehicle Color",
                "options": [
                    {
                        "label": "",
                        "value": ""
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            },
            {
                "validation": {
                    "required": true
                },
                "type": "text",
                "sortOrder": 4,
                "status": "active",
                "template": templateId,
                "label": "Vehicle Number",
                "options": [
                    {
                        "label": "",
                        "value": ""
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            },
            {
                "validation": {
                    "required": true
                },
                "type": "file",
                "sortOrder": 5,
                "status": "active",
                "template": templateId,
                "label": "Vehicle Image",
                "options": [
                    {
                        "label": "",
                        "value": ""
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            }]
            let kycInfo = [{
                "validation": {
                    "required": true
                },
                "type": "text",
                "sortOrder": 1,
                "status": "active",
                "template": templateId,
                "label": "License Number",
                "options": [
                    {
                        "label": "",
                        "value": ""
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            },
            {
                "validation": {
                    "required": true
                },
                "type": "datePicker",
                "sortOrder": 2,
                "status": "active",
                "template": templateId,
                "label": "License Exp. Date",
                "options": [
                    {
                        "label": "",
                        "value": ""
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            },
            {
                "validation": {
                    "required": true
                },
                "type": "file",
                "sortOrder": 3,
                "status": "active",
                "template": templateId,
                "label": "License Image",
                "options": [
                    {
                        "label": "",
                        "value": ""
                    }
                ],
                "date_created_utc": new Date(),
                "meta_data": []
            }]
            if (element.type === "personalInfo") {
                let respArr = [];
                await Promise.all(kycInfo.map(async item => {
                    let resp = await formField.create(item)
                    respArr.push(resp)
                }))
                return respArr;
            }
            else if (element.type === "vehicleInfo") {
                let respArr = [];
                await Promise.all(driverVehicleInfo.map(async item => {
                    let resp = await formField.create(item)
                    respArr.push(resp)
                }))
                return respArr;
            }
        } catch (error) {
            // console.log("error catch :", error);

        }
    },

}