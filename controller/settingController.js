const storeType = require('../models/storeTypeTable');
const Store = require('../models/storeTable');
const User = require('../models/userTable');
const Config = require('../config/constants.json');
const ObjectId = require('objectid');
const terminologyModel = require('../models/terminologyTable');
const stortyp = ["TAXI", "PICKUPDROP"];

module.exports = {

    getStarted: async (req, res) => {
        try {
            let data = {}
            let store = req.store;
            data._id = store.storeId;

            let accountSetup = false;
            let storeTypeSettings = false;
            let addDomain = false;
            let isSetupComplete = false;

            const getAccountSetup = await Store.getAccountSetup(data._id)
            if (getAccountSetup) {
                const paymentSettings = getAccountSetup.paymentSettings ?
                    getAccountSetup.paymentSettings.filter(element => {
                        return element.status && !!element.liveSecretKey && !!element.livePublishabelKey
                    }) : [];

                if (paymentSettings.length > 0 && paymentSettings.length === (getAccountSetup.paymentSettings || []).length) {
                    accountSetup = true
                }
            }

            const getStoreType = await Store.findById(data._id, "storeName domain")
                .populate({
                    path: 'storeType', match: {
                        status: "active",
                        $or: [
                            { storeTypeImage: { $exists: true, $eq: null } },
                            { deliveryAreaCustomer: { $exists: true, $eq: null } },
                            { deliveryAreaDriver: { $exists: true, $eq: null } },
                            { deliveryAreaVendor: { $exists: true, $eq: null } },
                            { noOfDriversPerRequest: { $exists: true, $eq: null } },
                            { "deliveryFeeSettings.base": { $exists: true, $eq: null } },
                            { "deliveryFeeSettings.per_unit_distance": { $exists: true, $eq: null } },
                            { "deliveryFeeSettings.per_unit_time": { $exists: true, $eq: null } },
                            { "commission.vendor": { $exists: true, $eq: null } },
                            { "commission.deliveryBoy": { $exists: true, $eq: null } },
                        ]
                    }
                })

            if (getStoreType.storeType.length <= 0) {
                storeTypeSettings = true
            }

            if (getStoreType.domain && !getStoreType.domain.includes("projectNamestore.com")) {
                addDomain = true
            }

            if (accountSetup && storeTypeSettings && addDomain) {
                isSetupComplete = true
            }

            return res.json(helper.showSuccessResponse('DATA_SUCCESS', {
                accountSetup, storeTypeSettings, addDomain, isSetupComplete
            }))
        } catch (error) {
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }

    },

    addSetting: async (req, res) => {
        try {
            let data = req.body;

            storeType.updateSettings(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                    await User.updateMany({ role: "VENDOR", storeType: { $in: [resdata._id] } }, { deliveryType: resdata.deliveryType });

                    let getStoreData = await Store.findOne({
                        _id: ObjectId(resdata.store)
                    })
                        .populate({
                            path: 'storeType',
                            select: 'label storeType storeVendorType status deliveryType requestType isVeganFilterActive hideVendorInfo'
                        })
                        .populate({
                            path: 'logo'
                        })
                        .populate({
                            path: 'bannerImage'
                        })
                        .populate({
                            path: 'favIcon'
                        })
                        .populate({ path: 'plan.billingPlan' });

                    helper.updateConfigStoreSetting(getStoreData);
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreSetting: async (req, res) => {
        try {
            console.log('Global setting ===>');
            let data = req.body;
            let store = req.store;
            data._id = store.storeId;
            let hideThings = store.hideThings
            let demo = hideThings.filter(element => element.type == "isDemo")
            let is_demo = demo.length ? demo[0]['value'] : false
            Store.getStoreSettingById(data._id, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let getstoreType = [];
                    if (resdata.storeType) {

                        getstoreType = resdata.storeType.filter(storeType => {
                            return storeType.status === 'active';
                        });
                        if (!getstoreType.length) {
                            return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
                        }
                        await Promise.all(getstoreType.map(async element => {
                            if (element.storeVendorType === 'SINGLE') {
                                if (["TAXI", "PICKUPDROP", "SERVICEPROVIDER"].includes(element.storeType)) {
                                    //delete resdata.notifications.vendorNotification;
                                    let adminNotification = { adminNotification: resdata.notifications.adminNotification };
                                    resdata.set("notifications", adminNotification, { strict: false });
                                }

                                let getVendor = await User.find({ storeType: { $in: [ObjectId(element._id)] }, role: "VENDOR" }, 'name').limit(1);
                                //console.log("getVendor", getVendor);
                                if (getVendor.length > 0) {
                                    element.set("singleVendorId", getVendor[0]._id, { strict: false });
                                    element.set("singleVendoName", getVendor[0].name, { strict: false });
                                }
                            }
                        }));
                    }
                    let twilioKey = resdata.twilio
                    if (twilioKey) {
                        let invalitwilio = false
                        for (i in twilioKey) {
                            if (!twilioKey[i] || twilioKey[i] == "null" || twilioKey[i] == "undefined") {
                                invalitwilio = true
                                break;
                            }
                        }
                        if (!invalitwilio) {
                            twilioKey = {
                                "accountSid": resdata.twilio.accountSid.replace(/.(?=.{15})/g, '*'),
                                "authToken": resdata.twilio.authToken.replace(/.(?=.{15})/g, '*'),
                                "twilioFrom": resdata.twilio.twilioFrom.replace(/.(?=.{5})/g, '*')
                            }
                            resdata.twilio = twilioKey

                        }
                    }
                    resdata.set("demo", is_demo, { strict: false })
                    resdata.set("storeTypeEnabled", getstoreType, { strict: false });
                    resdata.set("STORETYPES", Config.STORETYPES, { strict: false });
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreSettingForApps: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let version = req.headers.version;
            let languageCode = req.get('Get-Language');

            let resdata = {};
            if (!req.store) {
                if (version && version >= env.version)
                    resdata = {
                        langJSON: driverTerminology.langJSON_arr
                    };
                else
                    resdata = {
                        langJSON: driverTerminology.langJSON
                    };

                return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
            }

            if (languageCode) {
                let langcode = store.storeLanguage.find(i => i.code == languageCode);
                languageCode = langcode ? langcode.code : store.language.code;
            } else {
                languageCode = store.language.code;
            }

            data._id = store.storeId;
            let terminologyData;
            let driverTerminology = require('../config/driver-lang-' + languageCode + '.json');
            let getTerminologyData = await terminologyModel.findOne({ store: store.storeId, lang: languageCode, type: "drivers" });
            let staticTerminology = driverTerminology.langJSON_arr;

            if (getTerminologyData != null) {
                let storeTerminology = getTerminologyData.values;
                terminologyData = [...staticTerminology, ...storeTerminology];
            } else {
                let storeTerminology = driverTerminology.Insert_JSON_arr;
                terminologyData = [...staticTerminology, ...storeTerminology];
            }

            Store.getStoreSettingByIdForApps(data._id, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let walletStatus = false;
                    resdata.paymentSettings.map((item) => {
                        if (item.payment_method === "wallet")
                            walletStatus = item.status;
                    })
                    resdata.set('isWalletEnabled', walletStatus, { strict: false });

                    let isRideHailing = false;
                    let isServiceProvider = false
                    let isEnableCarPool = false;
                    let isManageIndividualPoolTrip = false;
                    let multiStopsTripSettings;
                    let driverTripFareSettings;
                    if (resdata.storeType) {
                        let getstoreType = resdata.storeType.filter(storeType => {
                            return storeType.status === 'active' && storeType.storeType === "TAXI";
                        });

                        let Serviceprovider = resdata.storeType.filter(storeType => {
                            return storeType.status === 'active' && storeType.storeType === "SERVICEPROVIDER";
                        });
                        if (getstoreType.length > 0) {
                            isRideHailing = getstoreType[0].rideHailingSettings.status;
                            // isManageIndividualPoolTrip = getstoreType[0].isManageIndividualPoolTrip; when implementation will complete then uncomment it.
                            isEnableCarPool = getstoreType[0].isEnableCarPool;
                            multiStopsTripSettings = getstoreType[0].multiStopsTripSettings;
                            driverTripFareSettings = getstoreType[0].driverTripFareSettings;

                        }
                        if (Serviceprovider.length > 0) {
                            isServiceProvider = true
                        }
                    }
                    let isEnabledFaq = false;
                    if (helper.isValidHidethings(store, "isFaq")) {
                        isEnabledFaq = true;
                    };
                    resdata.set("driverTripFareSettings", driverTripFareSettings, { strict: false });
                    resdata.set("multiStopsTripSettings", multiStopsTripSettings, { strict: false });
                    resdata.set("isEnabledFaq", isEnabledFaq, { strict: false });
                    resdata.set("isEnableCarPool", isEnableCarPool, { strict: false });
                    resdata.set("isManageIndividualPoolTrip", isManageIndividualPoolTrip, { strict: false });
                    resdata.set("isRideHailing", isRideHailing, { strict: false });
                    resdata.set("isServiceProvider", isServiceProvider, { strict: false });
                    resdata.domain = 'https://' + resdata.domain;
                    resdata.set('tc', resdata.domain + '/app-terms-condition', { strict: false });
                    resdata.set('pc', resdata.domain + '/app-privacy-policy', { strict: false });
                    resdata.set('rp', resdata.domain + '/app-refund-policy', { strict: false });
                    resdata.set('faq', resdata.domain + '/appfaqs', { strict: false });
                    resdata.set('driversFaq', resdata.domain + '/appfaqs?ftype=drivers', { strict: false });
                    resdata.set('aboutus', resdata.domain + '/app-aboutus', { strict: false });
                    resdata.set('apiUrl', env.apiUrl, { strict: false });
                    resdata.set('socketUrl', env.socketUrl, { strict: false });
                    resdata.set("themeSettings.appLoginBanner", env.apiBaseUrl + "/images/Login-bg.png", { strict: false });

                    if (version && version >= env.version)
                        if (terminologyData) {
                            resdata.set('langJSON', terminologyData, { strict: false });
                        } else {
                            resdata.set('langJSON', driverTerminology.langJSON_arr, { strict: false });
                        }
                    else
                        resdata.set('langJSON', driverTerminology.langJSON, { strict: false });

                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("error ", error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreSettingForCustomerApp: async (req, res) => {
        try {
            let languageCode = req.get('Get-Language');
            let store = req.store;
            let terminologyData;
            let version = req.headers.version;
            let getstoreType = []
            let storeTypeFood = ["FOOD", "GROCERY", "MEDICINE", "MEAT", "PIZZA", "LIQUOR", "FLOWER"]
            let storeTypedata = ["TAXI", "SERVICEPROVIDER", "PICKUPDROP"]
            let productType = ""
            let categoryType = ""
            getstoreType = store.storeTypes.filter(storeType => {
                return storeType.status === 'active';
            });
            // console.log("store:--->", store)
            if (store.plan && store.plan.productType == "store") {
                productType = store.plan.productType.toUpperCase()
                categoryType = getstoreType[0].storeType
            }
            if (store.plan && store.plan.productType == "marketplace") {
                if (getstoreType.length == 1) {
                    if (!storeTypedata.includes(getstoreType[0].storeType)) {
                        productType = store.plan.productType.toUpperCase()
                        categoryType = "SINGLECATEGORY"
                    }
                    else {
                        productType = store.plan.productType.toUpperCase()
                        categoryType = "MULTITAXI"
                    }

                } else {
                    if (!storeTypeFood.includes(getstoreType[0].storeType)) {
                        productType = store.plan.productType.toUpperCase()
                        categoryType = "MULTITAXI"
                    }
                    productType = store.plan.productType.toUpperCase()
                    categoryType = "MULTICATEGORY"

                }
            }
            if (!getstoreType.length) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
            }


            if (languageCode) {
                let langcode = store.storeLanguage.find(i => i.code == languageCode);
                languageCode = langcode ? langcode.code : store.language.code;
            } else {
                languageCode = store.language.code;
            }

            let customerTerminology = require('../config/customer-lang-' + languageCode + '.json');

            let getTerminologyData = await terminologyModel.findOne({ store: store.storeId, lang: languageCode, type: "customers" });
            let staticTerminology = customerTerminology.langJSON_arr;

            if (getTerminologyData != null) {
                let storeTerminology = getTerminologyData.values;
                terminologyData = [...staticTerminology, ...storeTerminology];
            } else {
                let storeTerminology = customerTerminology.Insert_JSON_arr;
                terminologyData = [...staticTerminology, ...storeTerminology];
            }

            Store.getStoreSettingByIdForApps(store.storeId, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let isFacebookLogin = false;
                    let isGoogleLogin = false;
                    let isAppleLogin = false;

                    if (resdata.socialMediaLoginSignUp && resdata.socialMediaLoginSignUp.length > 0) {

                        resdata.socialMediaLoginSignUp.forEach(element => {

                            if (element.status && element.type === "facebook") {
                                isFacebookLogin = true;
                            }

                            if (element.status && element.type === "google") {
                                isGoogleLogin = true;
                            }

                            if (element.status && element.type === "apple") {
                                isAppleLogin = true;
                            }
                        });

                    }

                    resdata.set('isFacebookLogin', isFacebookLogin, { strict: false });
                    resdata.set('isGoogleLogin', isGoogleLogin, { strict: false });
                    resdata.set('isAppleLogin', isAppleLogin, { strict: false });

                    let isSingleVendor = false;
                    let isSingleCategory = false;
                    let singleVendorData = {};
                    let storeData = {};
                    if (resdata.plan && resdata.plan.billingPlan && resdata.plan.billingPlan.type && resdata.plan.billingPlan.type === "basic") {
                        isSingleVendor = true;
                    }

                    if (resdata.plan && resdata.plan.billingPlan && resdata.plan.billingPlan.type && resdata.plan.billingPlan.type === "premium") {
                        isSingleCategory = true;
                    }

                    resdata.set('isSingleVendor', isSingleVendor, { strict: false });
                    resdata.set('isSingleCategory', isSingleCategory, { strict: false });

                    if (isSingleVendor) {
                        let getSVD = await helper.getSingleVendorData(resdata.storeType, resdata.domain);
                        singleVendorData = getSVD;
                    }

                    if (categoryType == "SINGLECATEGORY") {
                        let getSVD = await helper.getSingleCategoryData(resdata.storeType);
                        storeData = getSVD;
                    }
                    if (isSingleCategory) {
                        let getSVD = await helper.getSingleCategoryData(resdata.storeType);
                        singleVendorData = getSVD;
                    }

                    resdata.set('singleVendorData', singleVendorData, { strict: false });
                    resdata.set('storeData', storeData, { strict: false });

                    let walletStatus = false;
                    resdata.paymentSettings.map((item) => {
                        if (item.payment_method === "wallet")
                            walletStatus = item.status;
                    });

                    //here getting taxi setting feild.... and updating in it.
                    await helper.getTaxiSetting(resdata);
                    await helper.getPickDropSetting(resdata);
                    let isEnabledFaq = false;
                    if (helper.isValidHidethings(store, "isFaq")) {
                        isEnabledFaq = true;
                    };
                    resdata.set('isEnabledFaq', isEnabledFaq, { strict: false });
                    resdata.set('isWalletEnabled', walletStatus, { strict: false });
                    resdata.domain = 'https://' + resdata.domain;
                    resdata.set('tc', resdata.domain + '/app-terms-condition', { strict: false });
                    resdata.set('pc', resdata.domain + '/app-privacy-policy', { strict: false });
                    resdata.set('rp', resdata.domain + '/app-refund-policy', { strict: false });
                    resdata.set('faq', resdata.domain + '/appfaqs', { strict: false });
                    resdata.set('customersFaq', resdata.domain + '/appfaqs?ftype=customers', { strict: false });
                    resdata.set('aboutus', resdata.domain + '/app-aboutus', { strict: false });
                    resdata.set('apiUrl', env.apiUrl, { strict: false });
                    resdata.set('socketUrl', env.socketUrl, { strict: false });

                    if (stortyp.includes(store.storeTypes.storeType)) {
                        let disputewith = Config.disputeWith.filter(element => element != "vendor")
                        resdata.set('disputeWith', disputewith, { strict: false });
                    }
                    else {
                        resdata.set('disputeWith', Config.disputeWith, { strict: false });
                    }
                    //resdata.set('langJSON', terminologyData, { strict: false });
                    if (version && version >= env.version)
                        resdata.set('langJSON', terminologyData, { strict: false });
                    else
                        resdata.set('langJSON', customerTerminology.langJSON, { strict: false });

                    resdata.set('isDemoStore', false, { strict: false });
                    resdata.set('trackingDistance', 20, { strict: false });
                    resdata.set('productType', productType, { strict: false });
                    resdata.set('categoryType', categoryType, { strict: false });
                    // console.log("resdata:====>", resdata);
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreTypeSetting: async (req, res) => {
        try {
            let data = req.body;
            data._id = req.params._id;

            storeType.getStoreTypeById(data._id, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    storeSetting: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data._id = store.storeId;

            if (data.storeType && data.storeType.length > 0) {
                await Promise.all(data.storeType.map(async element => {
                    await storeType.updateSettingsAsync(element);
                }));
            }

            delete data.storeType;

            if (data.logo) {
                data.logo = data.logo;
            } else {
                delete data.logo;
            }
            let twilioKey = data.twilio
            if (twilioKey) {
                let invalitwilio = false
                for (i in twilioKey) {
                    if (twilioKey[i].includes("*")) {
                        invalitwilio = true
                        break;
                    }
                }
                if (invalitwilio) {
                    delete data['twilio']
                }
            }
            // if (data.email.includes("*")) {
            //     delete data['email']
            // }
            /* if (data.removeBranding == true) {
               let checkPlan = await Store.findById(data._id).select('plan status')
                let today = new Date();
                let isExpired = false;
                today.setHours(0, 0, 0, 0);
                if (new Date(today).getTime() < new Date(checkPlan.plan.endDate).getTime() || ["active", "gracePeriod"].includes(checkPlan.status)) {
                    isExpired = false;
                } else {
                    isExpired = true;
                }

                if (checkPlan.plan.isTrial)
                    return res.json(helper.showValidationErrorResponse('YOU_ARE_ON_TRIAL_YOU_CAN_NOT_REMOVE_BRANDING'));
                else if (!checkPlan.plan.isTrial && isExpired) {
                    return res.json(helper.showValidationErrorResponse('YOUR_PLAN_IS_EXPIRED_YOU_CAN_NOT_REMOVE_BRANDING'));
                }
            }*/
            if (data.lat && data.lng) {
                const location = { type: "Point", coordinates: [Number(data.lng), Number(data.lat)] };

                data.userLocation = location;
            }

            Store.updateSettings(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));

                    if (resdata.plan && resdata.plan.billingPlan && resdata.plan.billingPlan.type === "basic") {
                        let vData = {};
                        vData.name = data.storeName;
                        if (data.logo) {
                            vData.profileImage = data.logo;
                        }
                        await User.findOneAndUpdate({ role: "VENDOR", store: data._id }, vData);
                    }

                    helper.updateConfigStoreSetting(resdata);
                    terminologyModel.getTerminologyByConditionAsync({ store: resdata._id, lang: resdata.language.code, type: "customers" }, async (err, langdata) => {
                        if (err) {
                            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            //return res.json(helper.showSuccessResponse('DATA_FOUND_SUCCESS', resdata));
                            if (langdata) {
                                delete langdata.store
                                let obj = { domain: resdata.domain, _id: resdata._id }
                                //langdata.set('store', obj, { strict: false })
                                langdata["store"] = obj
                                helper.updateTerminologyScript(langdata)
                            }
                        }
                    });
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    deleteStoreSetting: async (req, res) => {
        try {
            let store = req.store;
            let data = {};
            data._id = store.storeId;

            Store.findOneAndUpdate(data, { status: 'archived' }).then(resdata => {
                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
            }).catch(err => {
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            })
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    storeTypeStatus: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            storeType.updateSettings(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateVendorSetting: async (req, res) => {
        try {
            let data = req.body;
            console.log("data------->", data)
            let store = req.store;
            let user = req.user;
            let hideThings = store.hideThings
            let demo = hideThings.filter(element => element.type == "isDemo")
            let is_demo = demo.length ? demo[0]['value'] : false
            if (!data.vendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
            }
            if (!data.email) {
                return res.json(helper.showValidationErrorResponse('EMAIL_REQUIRED'));
            }
            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_REQUIRED'));
            }
            if (!data.mobileNumber) {
                return res.json(helper.showValidationErrorResponse('MOBILE_NUMBER_IS_REQUIRED'));
            }
            data._id = data.vendor;
            if (data.lat && data.lng) {
                const location = { type: "Point", coordinates: [Number(data.lng), Number(data.lat)] };

                data.userLocation = location;
            }
            let getVendor = await User.findById(data.vendor, 'email mobileNumber');
            if (getVendor.email) {
                if (user.role != 'VENDOR') {
                    if (data.email.includes("*")) {
                        delete data['email']
                    }
                }
                if (data.email && data.email.toString() != getVendor.email.toString()) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_EMAIL'));
                    }
                    const getUser = await User.findOne({ _id: { $ne: ObjectId(data.vendor) }, email: data.email, role: { $in: ["ADMIN", "VENDOR", "STAFF"] }, status: { $nin: ["archived", "temp"] } });
                    if (getUser != null) {
                        return res.json(helper.showValidationErrorResponse('EMAIL_ALREADY_EXISTS'));
                    }
                }
            }

            if (user.role != 'VENDOR') {
                if (data.mobileNumber.includes("*")) {
                    delete data['mobileNumber']
                }
            }
            if (getVendor.mobileNumber) {
                if (data.mobileNumber && data.mobileNumber.toString() != getVendor.mobileNumber.toString()) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_PHONE'));
                    }
                }
            }
            else {
                if (data.mobileNumber) {
                    if (is_demo) {
                        return res.json(helper.showValidationErrorResponse('DEMO_PHONE'));
                    }
                }
            }

            User.updateUserProfile(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (user.role != 'VENDOR') {
                        if (is_demo) {
                            resdata.email = resdata.email ? resdata.email.replace(/.(?=.{10})/g, '*') : resdata.email
                            resdata.mobileNumber = resdata.mobileNumber ? resdata.mobileNumber.replace(/.(?=.{2})/g, '*') : resdata.mobileNumber
                        }
                    }
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err--", error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getAccessList: async (req, res) => {
        try {
            let resdata = [];
            resdata = Config.ACCESS_LIST;

            res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));

        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStoreTypes: async (req, res) => {
        try {
            const resdata = Config.STORETYPES;
            res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getStoreTypeSettingForWeb: async (req, res) => {
        try {
            let data = req.body;
            data._id = req.params._id;

            storeType.getStoreTypeByIdAsync(data._id, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
}