const ObjectId = require('objectid');
const Order = require('../../../models/ordersTable');
const geofencingFun = require('../../../helper/geofencing')
const User = require('../../../models/userTable.js');
const userAddress = require('../../../models/addressTable')
const storeType = require('../../../models/storeTypeTable');
const ServiceMiddleware = require('../middleware/servicerequest')
const utilityFunc = require('../utility/functions');
const helperFunc = require('../utility/helperFunction');
const Product = require('../../../models/productsTable');
const orderService = require('../services/orderService');
const checkdriver = require('../services/sendRequest')
const productTable = require('../../../models/productsTable')
const Promotion = require('../../../models/promotionTable');
const Category = require('../../../models/categoryTable.js');
const settingService = require('../../../helper/settingService');
const paymentMiddleware = require('../../../middleware/payments');
const Auth = require('../middleware/auth');
const DocumentTemplate = require('../../../models/documentTemplate');
const scheduleRideReminderAgenda = require("../../../helper/cronSetupForCarRental.js");
const Document = require('../../../models/documentsTable');
const helper = require('../../../helper/helper');
const Pricing = require('../../../helper/pricing');
const moment = require('moment');

module.exports = {
    userlistcategory: async (req, res) => {
        try {
            const { orderBy, order, page, limit, storeTypeId, fields, search } = req.body
            let store = req.store;
            let pageSize = parseInt(limit) || 10;
            let sortByField = orderBy || "sortOrder";
            let sortOrder = order || 1;
            let paged = parseInt(page) || 1;
            let obj = {};
            if (storeTypeId) {
                obj.storeType = ObjectId(storeTypeId);
            }
            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }


            obj.status = "active"

            obj.parent = "none";

            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ catName: { $regex: search || '', $options: 'i' } })
                obj['$or'].push({ catDesc: { $regex: search || '', $options: 'i' } })
            }
            let count = await Category.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let promotionData = await Promotion.find({ store: ObjectId(store.storeId), storeTypeId: ObjectId(storeTypeId), status: "active" })
                .populate({ path: 'storeTypeId', select: 'storeType label' })
                .populate('vendor', 'name')
                .populate('promotionImage')
                .exec()

            if (promotionData.length > 0) {
                promotionData.map(item => {
                    let webViewUrl = null;
                    if (item.vendor) {
                        webViewUrl = "https://" + store.domain + "/listingview?&type=" + item.storeTypeId.storeType.toLowerCase() + "&store=" + item.storeTypeId._id.toString() + "&id=" + item.vendor._id;
                    }
                    item.set("webViewUrl", webViewUrl, { strict: false })
                });
            }
            Category.getCategoriesbydetails(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    console.log("errr+++", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;

                    await Promise.all(resdata.map(async element => {

                        if (element.subcategories.length > 0) {
                            //console.log("element.subcategories1", element.subcategories);
                            element.subcategories = await module.exports.getSubCategories(element.subcategories);
                        }

                    }));
                    let finalData = {
                        promotionData,
                        resdata
                    }
                    res.json(helper.showSuccessResponseCount('CATEGORY_DATA', finalData, countdata));
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getSubCategories: async (subcategory) => {
        subcategory = subcategory.filter(ele => {
            return ele.status != 'archived'
        });
        await Promise.all(subcategory.map(async element2 => {

            if (element2.subcategories && element2.subcategories.length > 0) {
                element2.subcategories = await module.exports.getMidCategory(element2.subcategories);
            }

        }));

        subcategory.sort(function (a, b) {
            return a.sortOrder - b.sortOrder;
        });

        return subcategory;
    },
    getMidCategory: async (midcate) => {
        //console.log("midcate", midcate);
        let newCate = [];
        await Promise.all(midcate.map(async element => {
            let nCat = await module.exports.getSubCategoryById(element._id);
            newCate.push(nCat);
        }));

        newCate = newCate.filter(ele => {
            return ele.status != 'archived'
        });

        newCate.sort(function (a, b) {
            return a.sortOrder - b.sortOrder;
        });

        return newCate;
    },

    getSubCategoryById: async (id) => {

        let getCategory = await Category.findById(id);

        if (getCategory.subcategories && getCategory.subcategories.length > 0) {
            getCategory.subcategories = await module.exports.getMidCategory(getCategory.subcategories);
        }

        return getCategory;
    },

    userlstproduct: async (req, res) => {
        try {
            let { orderBy, order, page, limit, storeTypeId, categoryId, search, customerLocation } = req.body
            let pageSize = parseInt(limit) || 10;
            let sortByField = orderBy || "date_created_utc";
            let store = req.store
            let storeTypeDetails = req.storeTypeDetails
            let sortOrder = order || -1;
            let paged = parseInt(page) || 1;
            let obj = {};
            if (storeTypeId) {
                obj.storeType = ObjectId(storeTypeId);
            }
            if (categoryId) {
                obj.categories = ObjectId(categoryId)
            }
            else {
                obj["category.status"] = { $ne: "inactive" }
            }
            obj.status = "active";
            if (search) {
                //obj['$or'] = [];
                //obj['$or'].push({ name: { $regex: search || '', $options: 'i' } })
                obj.name = { $regex: search, $options: 'i' }
                //obj.name = new RegExp('^' +search , 'i')//{ $regex: search, $options: 'i' }
                //obj.name = { $regex: '^' + search, $options: 'i' }
            }
            if (!customerLocation || !Object.keys(customerLocation).length) {
                return res.json(helper.showValidationErrorResponse('USER LOCATION REQUIRED'));
            }
            else {
                let source = { type: "Point", coordinates: [Number(customerLocation.lng), Number(customerLocation.lat)] };
                console.log("locatio--", { type: "Point", coordinates: [Number(customerLocation.lng), Number(customerLocation.lat)] })
                let radius = storeTypeDetails.deliveryAreaDriver ? storeTypeDetails.deliveryAreaDriver : 20;
                let unit = store.distanceUnit ? store.distanceUnit : 'km';
                let maxDistance = helper.getDeliveryArea(radius, unit);
                productTable.getProductsListServiceProvider(obj, pageSize, sortByField, sortOrder, paged, store.storeId, source, maxDistance, async (err, resdata) => {
                    if (err) {
                        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        for (let index = 0; index < resdata.length; index++) {
                            if (resdata[index].bestSeller && resdata[index].bestSeller === true)
                                resdata[index].bestSeller = "yes"
                            else
                                resdata[index].bestSeller = "no"

                        }
                        return res.json(helper.showSuccessResponseCount('ITEM_DATA', resdata, resdata.length));
                    }
                });
            }
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    driverlstproduct: async (req, res) => {
        try {
            const { categoryId, search } = req.body
            let obj = {};
            let sortByField = {}
            let store = req.store;
            let storeType = store.storeTypes.filter(element => element.storeType == "SERVICEPROVIDER")
            if (!storeType.length) {
                return res.json(helper.showSuccessResponseCount('ITEM_DATA', [], 0));
            }
            // if (categoryId) {
            //     obj.categories = ObjectId(categoryId)
            // }
            obj.storeType = storeType[0]._id;
            obj.categories = { $gt: [{ $size: "$categories" }, 0] }
            obj.status = "active";
            if (search) {
                obj.name = { $regex: search, $options: 'i' };
            }

            //obj.name = { $regex: '^' + search, $options: 'i' }
            sortByField = { $sort: { date_created_utc: -1 } }

            let count = await productTable.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let countdata = count[0] ? count[0].count : 0;
            productTable.getProductsDriver(obj, sortByField, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    for (let index = 0; index < resdata.length; index++) {
                        if (resdata[index].bestSeller && resdata[index].bestSeller === true)
                            resdata[index].bestSeller = "yes"
                        else
                            resdata[index].bestSeller = "no"

                    }

                    return res.json(helper.showSuccessResponseCount('ITEM_DATA', resdata, countdata));
                }
            });

        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    driverupdateService: async (req, res) => {
        try {
            let data = req.body
            let user = req.user
            if (!data.hasOwnProperty('serviceId')) {
                return res.json(helper.showValidationErrorResponse('SERVICEID FIELD REQUIRED'));
            }
            await User.updateOne({ _id: user._id }, { serviceId: data.serviceId })
            res.json(helper.showSuccessResponse('DATA_UPDATED_SUCCESS'));
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getdriverServiceById: async (req, res) => {
        try {
            let user = req.user
            User.getProductsDriver(user._id, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    createService: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let user = req.user;
            let storeTypeDetails = req.storeTypeDetails;
            data.user = user._id;
            data.customOrderId = utilityFunc.generatorRandomNumber(6).toLowerCase();
            data.otp = utilityFunc.generateOTP(4);
            data.googleMapKey = store.googleMapKey.server;
            data.timezone = store.timezone;
            data.paymentMode = store.paymentMode;
            data.currency = store.currency.code;

            data.orderStatus = "pending";
            data.paymentStatus = "pending";
            console.log("data:==>", data)

            if (!data.paymentMethod) {
                return res.json(helper.showValidationErrorResponse('PAYMENT METHOD REQUIRED'));
            }

            // if (!["cod", "wallet"].includes(data.paymentMethod) && !data.paymentSourceRef) {
            //     return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_REQUIRED'));
            // }

            // if (!["cod", "wallet", "paystack", "stripe"].includes(data.paymentMethod)) {
            //     return res.json(helper.showValidationErrorResponse('PAYMENT_IS_NOT_SUPPORT'));
            // }

            if (!data.addressId) {
                return res.json(helper.showValidationErrorResponse('USER ADDRESS REQUIRE'));
            }
            const getaddress = await userAddress.getAddressByIdAsync(data.addressId);

            let billingDetails = getaddress;
            // let getaddress = await userAddress.findById(ObjectId(data.addressId))
            if (getaddress == null) {
                return res.json(helper.showValidationErrorResponse('INVALID USER ADDRESS'));
            }
            data.pickUp = { location: getaddress.addressLocation }
            data.billingDetails = billingDetails;
            //{ type: "Point", coordinates: getaddress.addressLocation.coordinates }

            if (data.paymentMethod == "braintree")
                data.paymentMethod = "paypal";

            const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
            }
            data.scheduledType = "scheduled"
            if (data.scheduledType && data.scheduledType === "scheduled") {

                if (!data.scheduledDate) {
                    return res.json(helper.showValidationErrorResponse('SCHEDULE_DATE_IS_REQUIRED'));
                }

                if (!data.scheduledTime) {
                    return res.json(helper.showValidationErrorResponse('SCHEDULE_TIME_IS_REQUIRED'));
                }

                if (!helper.isValidDate(data.scheduledDate, "YYYY-MM-DD")) {
                    return res.json(helper.showValidationErrorResponse('CORRECT_DATE_FORMAT'));
                }
                let current_date = new Date();
                const getScheduleData = helper.getScheduleData("YYYY-MM-DD", data.scheduledDate, data.scheduledTime, data.timezone);
                let CurrentCityTime = helper.getDateAndTimeInCityTimezone(current_date, store.timezone);
                if (getScheduleData.scheduled_utc.getTime() < getScheduleData.currentUTC.getTime()) {
                    return res.json(helper.showValidationErrorResponse('BOOKING_NOT_ALLOWED'));
                }

                data.scheduledDate = getScheduleData.scheduledDate;
                data.scheduledTime = getScheduleData.scheduledTime;
                data.scheduled_utc = getScheduleData.scheduled_utc;
                data.date_created = CurrentCityTime.format('MM-DD-YYYY');
                data.time_created = CurrentCityTime.format('LT');
                data.date_created_utc = getScheduleData.currentUTC;

            } else {
                return res.json(helper.showValidationErrorResponse('INVALID SCHEDULED TYPE'));
                //data.date_created_utc = new Date();
                // let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
                // data.date_created = CurrentCityTime.format('MM-DD-YYYY');
                // data.time_created = CurrentCityTime.format('LT');
            }
            let requestType = getStoreType.requestType
            let check_driver = []
            // if (requestType == "Manual") {
            //     if (!data.driver) {
            //         return res.json(helper.showValidationErrorResponse('PROVIDER ID REQUIRED'));
            //     }
            //     const getuser = await User.findOne({ _id: ObjectId(data.driver) })
            //     if (getuser) {
            //         check_driver.push(getuser)
            //     }

            // }
            // if (!check_driver.length) {
            //     return res.json(helper.showValidationErrorResponse('UNABLE TO FIND SERVICE PROVIDER FOR GIVEN LOCATION'));
            // }
            data.storeType = getStoreType._id;
            data.store = getStoreType.store._id;

            if (data.deliveryType === 'DELIVERY') {
                data.deliveryFee = 0;
            } else {
                data.deliveryFee = 0;
            }

            if (!data.items.length) {
                return res.json(helper.showValidationErrorResponse('ITEMS_IS_REQUIRED'));
            }
            let lineData = await orderService.generateLineItems(data.items, getStoreType.storeType);
            if (lineData.isValidItem || !lineData.line_items.length) {
                return res.json(helper.showValidationErrorResponse('INVALID_ITEMS'));
            }
            let deliveryType = await module.exports.checkdeliveryType(data.items)
            data.serviceId = lineData.service_id
            data.deliveryType = deliveryType
            data.line_items = lineData.line_items;
            data.subTotal = helper.roundNumber(lineData.itemTotal);
            console.log("data.serviceId---", data.serviceId)

            if (requestType == "Random") {
                if (!data.hasOwnProperty("serviceId")) {
                    return res.json(helper.showValidationErrorResponse('SERVICE ID REQUIRED'));
                }
                if (!data.serviceId.length) {
                    return res.json(helper.showValidationErrorResponse('AT LEAST ONE SERVICE ADD'));
                }
                let obj_send = {
                    pickUp: data.pickUp,
                    unit: store.distanceUnit ? store.distanceUnit : 'km',
                    radius: getStoreType.deliveryAreaDriver ? getStoreType.deliveryAreaDriver : 20,
                    limit: getStoreType.noOfDriversPerRequest,
                    storeId: store.storeId,
                    serviceId: data.serviceId,
                    paymentMethod: data.paymentMethod,
                    codWalletLimit: store.codWalletLimit
                }
                check_driver = await checkdriver.checkDrivers(obj_send)
                //console.log("obj_send", obj_send)
            }
            // console.log("check_driver----")
            // console.log(check_driver)
            // console.log("total driver found---")
            // console.log(check_driver.length)
            //check coupon code
            if (data.coupon) {
                const couponCost = await helperFunc.couponDiscountCalculation(getStoreType._id, data.coupon, data.subTotal);
                if (couponCost.discountTotal) {
                    data.discountTotal = couponCost.discountTotal;
                    data.couponType = couponCost.couponType;
                    data.couponBy = couponCost.couponBy;
                    data.couponAmount = couponCost.couponAmount;
                    data.subTotal = couponCost.itemTotal;
                }
                else {
                    return res.json(helper.showValidationErrorResponse('COUPAN IS NOT VALID'));
                }
            }
            data.orderTotal = helper.roundNumber(data.subTotal + data.deliveryFee);
            if (data.paymentMethod === "wallet" && user.wallet < data.orderTotal) {
                return res.json(helper.showValidationErrorResponse('WALLET_AMOUNT_IS_INSUFFICIENT'));
            }
            let orderSuccessMsg = await helper.getTerminologyData({ lang: "en", storeId: data.store, constant: "ORDER_ADDED_SUCCESS", type: "order" })
            let getStore = await settingService.chekStoreSetting(store.storeId, data.paymentMethod);
            data.paymentMode = getStore.paymentMode;
            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }

            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }

            if (!getStore.googleMapKey) {
                return res.json(helper.showValidationErrorResponse('GOOGLEMAP_KEY_NOT_SETUP'));
            }

            if (!getStore.googleMapKey.server) {
                return res.json(helper.showValidationErrorResponse('GOOGLEMAP_KEY_NOT_SETUP'));
            }
            if (data.paymentMethod === "stripe") {

                if (!ObjectId.isValid(data.paymentSourceRef)) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                }

                if (data.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    cost: data.orderTotal,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: data.currency
                }

                paymentMiddleware.paymentByStripe(chargeData, (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        Order.addOrder(data, async (err, resdata) => {
                            if (err) {
                                console.log(err)
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                // resdata.driver = driver
                                // resdata.serviceId = data.serviceId
                                //resdata.driverdata = check_driver
                                ServiceMiddleware.sndrquestSrviceProvider(resdata, check_driver);
                            }
                        });
                    }
                });

            } else if (data.paymentMethod === "paystack") {
                let isDriectPayment = data.isDriectPayment
                if (!isDriectPayment || isDriectPayment == 'false') {

                    if (!ObjectId.isValid(data.paymentSourceRef)) {
                        return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                    }
                    if (data.paymentMode === 'sandbox') {
                        data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                    } else {
                        data.secretKey = getStore.paymentSettings.liveSecretKey;
                    }
                    if (!data.secretKey) {
                        return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                    }
                    let chargeData = {
                        cost: data.orderTotal,
                        paymentSourceRef: data.paymentSourceRef,
                        secretKey: data.secretKey,
                        currency: data.currency
                    }
                    paymentMiddleware.paymentChargebyPaystack(chargeData, (response) => {
                        if (!response.status) {
                            res.json(helper.showStripeErrorResponse(response.message, response.status));
                        } else {
                            console.log("response.status provider", response.response.status)
                            if (response.response.status != "success") {
                                console.log("Payment failed")
                                res.json(helper.showStripeErrorResponse(response.response.gateway_response, response.response.status));

                            }
                            else {
                                data.transactionDetails = response.response;
                                data.paymentStatus = "success";
                                Order.addOrder(data, async (err, resdata) => {
                                    if (err) {
                                        console.log(err)
                                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                    } else {
                                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                        // resdata.driver = driver
                                        // resdata.serviceId = data.serviceId
                                        //resdata.driverdata = check_driver
                                        ServiceMiddleware.sndrquestSrviceProvider(resdata, check_driver);
                                    }
                                });
                            }
                        }
                    })
                }
                else {

                    data.paymentStatus = "pending";
                    data.orderStatus = "archived";
                    data.nearByTempDrivers = check_driver
                    Order.addOrder(data, async (err, resdata) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            let returnUrl = env.apiUrl + "card/paystack/return?id=" + resdata.customOrderId + "&payment_method=paystack&from=checkout&amount=" + data.orderTotal
                            let sendData = { orderId: resdata._id.toString(), id: resdata.customOrderId.toString(), payment_method: "paystack", from: "checkout", amount: data.orderTotal, returnUrl: returnUrl }
                            res.json(helper.showSuccessResponse(orderSuccessMsg, sendData));
                        }
                    });
                }

            }
            else if (data.paymentMethod === "flutterwave") {
                let isDriectPayment = data.isDriectPayment
                if (!isDriectPayment || isDriectPayment == 'false') {
                    if (!ObjectId.isValid(data.paymentSourceRef)) {
                        return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
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
                    let chargeData = {
                        cost: data.orderTotal,
                        paymentSourceRef: data.paymentSourceRef,
                        secretKey: data.secretKey,
                        pubKey: data.pubKey,
                        enckey: data.enckey,
                        currency: data.currency
                    }
                    paymentMiddleware.paymentChargebyFlutterwave(chargeData, (response) => {
                        if (!response.status) {
                            return res.json(helper.showValidationErrorResponse(response.message))
                        } else {
                            console.log("response.status delivery", response.response.status)
                            if (response.response.status != "successful") {
                                console.log("Payment failed")
                                return res.json(helper.showValidationErrorResponse(response.message))
                            }
                            else {
                                data.transactionDetails = response.response;
                                data.paymentStatus = "success";
                                Order.addOrder(data, async (err, resdata) => {
                                    if (err) {
                                        console.log("err db", err);
                                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                    } else {
                                        console.log("Order Created:", resdata._id);
                                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                        ServiceMiddleware.sndrquestSrviceProvider(resdata, check_driver);
                                    }
                                });
                            }
                        }
                    });
                }
                else {

                    data.paymentStatus = "pending";
                    data.orderStatus = "archived";
                    data.nearByTempDrivers = check_driver;
                    Order.addOrder(data, async (err, resdata) => {
                        if (err) {
                            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                        } else {
                            let returnUrl = env.apiUrl + "card/flutterwave/return?id=" + resdata.customOrderId + "&payment_method=flutterwave&from=checkout&amount=" + data.orderTotal
                            let sendData = { orderId: resdata._id.toString(), id: resdata.customOrderId.toString(), payment_method: "flutterwave", from: "checkout", amount: data.orderTotal, returnUrl: returnUrl }
                            res.json(helper.showSuccessResponse(orderSuccessMsg, sendData));
                        }
                    });
                }
            }
            else if (data.paymentMethod === "square") {

                if (!ObjectId.isValid(data.paymentSourceRef)) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                }

                if (data.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    cost: data.orderTotal,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: data.currency
                }

                paymentMiddleware.paymentBySquare(chargeData, (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        Order.addOrder(data, async (err, resdata) => {
                            if (err) {
                                console.log(err)
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                // resdata.driver = driver
                                // resdata.serviceId = data.serviceId
                                //resdata.driverdata = check_driver
                                //ServiceMiddleware.sndrquestSrviceProvider(resdata, check_driver);
                            }
                        });
                    }
                });

            } else if (data.paymentMethod === "razorpay" || data.paymentMethod === "orangeMoney") {

                data.paymentStatus = "pending";
                data.orderStatus = "archived";
                data.nearByTempDrivers = check_driver
                Order.addOrder(data, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let webViewUrl = env.apiUrl + "/order/webview?id=" + resdata.customOrderId + "&payment_method=" + data.paymentMethod + "&from=checkout";

                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id.toString(), payment_method: data.paymentMethod, webViewUrl: webViewUrl }));
                    }
                });

            } else if (data.paymentMethod === "moncash") {

                data.paymentStatus = "pending";
                data.orderStatus = "archived";
                data.nearByTempDrivers = check_driver
                Order.addOrder(data, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let webViewUrl = env.apiUrl + "/card/webview?id=" + resdata.customOrderId + "&payment_method=" + data.paymentMethod + "&from=checkout";
                        console.log("fdfdf", orderSuccessMsg, { orderId: resdata._id.toString(), payment_method: data.paymentMethod, webViewUrl: webViewUrl })
                        return res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id.toString(), payment_method: data.paymentMethod, webViewUrl: webViewUrl }));
                    }
                });

            }
            else if (data.paymentMethod === "paypal" || data.paymentMethod === "googlepay" || data.paymentMethod === "applepay") {

                if (!ObjectId.isValid(data.paymentSourceRef)) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                }

                if (getStore.paymentSettings.merchantId == null || getStore.paymentSettings.publicKey == null || getStore.paymentSettings.privateKey == null) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    cost: data.orderTotal,
                    paymentSourceRef: data.paymentSourceRef,
                    merchantId: getStore.paymentSettings.merchantId,
                    publicKey: getStore.paymentSettings.publicKey,
                    privateKey: getStore.paymentSettings.privateKey,
                    paymentMode: data.paymentMode,
                    currency: data.currency
                }

                paymentMiddleware.paymentByBraintreeByCustomer(chargeData, (response) => {
                    if (!response.status) {
                        res.json(helper.showBraintreeErrorResponse(response.message, response.code));
                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        Order.addOrder(data, async (err, resdata) => {
                            if (err) {
                                console.log(err)
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                // resdata.driver = driver
                                // resdata.serviceId = data.serviceId
                                //resdata.driverdata = check_driver
                                ServiceMiddleware.sndrquestSrviceProvider(resdata, check_driver);
                            }
                        });
                    }
                });

            } else if (data.paymentMethod === "wallet") {

                if (!user.wallet) {
                    return res.json(helper.showValidationErrorResponse('PLEASE_ADD_MONEY_TO_WALLET'));
                }

                if (user.wallet < data.orderTotal) {
                    return res.json(helper.showValidationErrorResponse('WALLET_BALANCE_IS_LOW'));
                }

                let wallet = helper.roundNumber(user.wallet - data.orderTotal);
                User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {

                        data.transactionDetails = {};
                        data.paymentStatus = "success";
                        Order.addOrder(data, async (err, resdata) => {
                            if (err) {
                                console.log(err)
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                // resdata.driver = driver
                                // resdata.serviceId = data.serviceId
                                //resdata.driverdata = check_driver
                                ServiceMiddleware.sndrquestSrviceProvider(resdata, check_driver);
                            }
                        });
                    }
                });

            } else if (data.paymentMethod === "cod") {

                data.transactionDetails = {};
                data.paymentStatus = "success";
                Order.addOrder(data, async (err, resdata) => {
                    if (err) {
                        console.log(err)
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                        // resdata.driver = driver
                        // resdata.serviceId = data.serviceId
                        //resdata.driverdata = check_driver
                        ServiceMiddleware.sndrquestSrviceProvider(resdata, check_driver);
                    }
                });

            } else {
                return res.json(helper.showValidationErrorResponse('INVALID_PAYMENT_METHOD'));
            }
















            ///////////////////////////////////////////////////////////////////
            // Order.addOrder(data, async (err, resdata) => {
            //     if (err) {
            //         console.log(err)
            //         res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            //     } else {
            //         res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
            //         // resdata.driver = driver
            //         // resdata.serviceId = data.serviceId
            //         //resdata.driverdata = check_driver
            //         ServiceMiddleware.sndrquestSrviceProvider(resdata, check_driver);
            //     }
            // });
            //res.json(helper.showSuccessResponse(orderSuccessMsg));

        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    userOrderMiddleware: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            let user = req.user;
            data.user = user._id;
            let getStoreType = req.storeTypeDetails;
            let storeTypeDetails = req.storeTypeDetails;
            const getCheckOutData = req.getCheckOutData;
            const getcheckInData = req.getcheckInData;
            data.timezone = store.timezone;
            data.currency = store.currency.code;
            console.log("getCheckOutData:", getCheckOutData);
            console.log("getcheckInData:", getcheckInData);
            console.log("data.currency:", data.currency);
            data.customOrderId = helper.generatorRandomNumber(6).toLowerCase();
            if (!data.payment_method) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_IS_REQUIRED'));
            }
            if (!data.addressId) {
                return res.json(helper.showValidationErrorResponse('USER ADDRESS REQUIRE'));
            }
            const getaddress = await userAddress.getAddressByIdAsync(data.addressId);
            let billingDetails = getaddress;
            // let getaddress = await userAddress.findById(ObjectId(data.addressId))
            if (getaddress == null) {
                return res.json(helper.showValidationErrorResponse('INVALID USER ADDRESS'));
            }
            if (!data.vendor) {
                return res.json(helper.showValidationErrorResponse("VENDOR_IS_REQUIRED"));
            }
            const getVendor = await User.getUserByIdAsync(data.vendor);
            if (getVendor === null) {
                return res.json(helper.showValidationErrorResponse("VENDOR_IS_INVALID"));
            }
            data.pickUp = { location: getaddress.addressLocation }
            data.billingDetails = billingDetails;
            let payment_method = data.payment_method;
            data.paymentMethod = data.payment_method;
            if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
                payment_method = 'braintree';
            }
            data.storeType = getStoreType._id;
            data.store = store.storeId;
            let getStore = await settingService.chekStoreSetting(data.store, payment_method);
            if (!getStore.flag) {
                return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
            }
            if (getStore.flag && !getStore.paymentSettings.status) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_DISABLE'));
            }
            data.paymentMode = store.paymentMode;
            if (!data.items) {
                return res.json(helper.showValidationErrorResponse('ITEMS_IS_REQUIRED'));
            }
            data.items = ObjectId(data.items);
            data.checkInDate = getcheckInData.scheduledDate;
            data.checkOutDate = getCheckOutData.scheduledDate;
            data.checkInTime = getcheckInData.scheduledTime;
            data.checkOutTime = getcheckInData.scheduledTime;
            data.checkInDate_utc = getcheckInData.scheduled_utc;
            data.checkOutDate_utc = getCheckOutData.scheduled_utc;
            data.date_created_utc = new Date();
            data.created_utc_at = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');
            let verifyAvailbityService = await Order.getCheckAvailabilityService(data);
            //console.log("verifyAvailbityService:", verifyAvailbityService)
            if (verifyAvailbityService.length) {
                return res.json(helper.showValidationErrorResponse('SERVICE_IS_NOT_AVAILABLE'));
            }
            if (!data.items) {
                return res.json(helper.showValidationErrorResponse('ITEMS_IS_REQUIRED'));
            }
            let lineData = await orderService.generateCarRentalLineItems(data.items, data);
            if (lineData.isValidItem) {
                return res.json(helper.showValidationErrorResponse('INVALID_ITEMS'));
            }
            data.pricingTypeCount = lineData.line_items.pricingTypeCount
            data.line_items = lineData.line_items;
            data.subTotal = helper.roundNumber(lineData.itemTotal);
            //calculate tax
            const getTax = Pricing.taxCalculation(getStoreType.taxSettings, 1, data.subTotal);
            data.tax = getTax.tax;
            data.taxAmount = getTax.taxAmount;
            //check coupon code
            if (data.coupon) {
                const couponCost = await helperFunc.couponDiscountCalculation(getStoreType._id, data.coupon, data.subTotal);
                data.discountTotal = couponCost.discountTotal;
                data.couponType = couponCost.couponType;
                data.couponBy = couponCost.couponBy;
                data.couponAmount = couponCost.couponAmount;
                data.subTotal = couponCost.itemTotal;
            }
            data.orderTotal = helper.roundNumber(data.subTotal + data.tax);
            if (data.orderStatus) {
                data.orderStatus = data.orderStatus;
            } else {
                data.orderStatus = "pending";
            }
            //calculate earning
            data.adminEarning = data.orderTotal;
            if (data.isLoyaltyPointsUsed) {
                if (!data.pointsToRedeem) {
                    return res.json(helper.showValidationErrorResponse('PLEASE_ENTER_REDEEM_POINTS'));
                }
                let aLp = helper.calculateLoyalityPointsValue(data.pointsToRedeem, getStore.loyaltyPoints);
                data.orderTotal = helper.roundNumber(data.orderTotal - aLp.redemptionValue);
                data.redemptionValue = aLp.redemptionValue;
            }
            let orderSuccessMsg = await helper.getTerminologyData({ lang: "en", storeId: data.store, constant: "ORDER_ADDED_SUCCESS", type: "trip" })
            if (data.payment_method === "stripe") {
                if (!data.paymentSourceRef) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_REQUIRED'));
                }
                if (!ObjectId.isValid(data.paymentSourceRef)) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                }
                if (data.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }
                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                let chargeData = {
                    cost: data.orderTotal,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: data.currency
                }
                paymentMiddleware.paymentByStripe(chargeData, (response) => {
                    if (!response.status) {
                        console.log("strip Error response:", response)
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        Order.addOrder(data, async (err, resdata) => {
                            if (err) {
                                console.log("err db", err);
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("Order Created:", resdata._id);
                                res.json(helper.showSuccessResponse(orderSuccessMsg, resdata));
                                orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, user);
                                scheduleRideReminderAgenda(resdata);
                                tripMiddleware.addstopsArray(data, resdata._id);
                            }
                        });
                    }
                });
            } else if (data.payment_method === "paystack") {
                if (!data.paymentSourceRef) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_REQUIRED'));
                }
                if (!ObjectId.isValid(data.paymentSourceRef)) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                }
                if (data.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }
                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }
                let chargeData = {
                    cost: data.orderTotal,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: data.currency
                }
                paymentMiddleware.paymentChargebyPaystack(chargeData, (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.status));
                    } else {
                        console.log("response.status!!!", response.response.status)
                        if (response.response.status != "success") {
                            console.log("Payment failed")
                            res.json(helper.showStripeErrorResponse(response.response.gateway_response, response.response.status));

                        }
                        else {
                            data.transactionDetails = response.response;
                            data.paymentStatus = "success";
                            Order.addOrder(data, async (err, resdata) => {
                                if (err) {
                                    console.log("err db", err);
                                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                                } else {
                                    console.log("Order Created:", resdata._id);
                                    res.json(helper.showSuccessResponse(orderSuccessMsg, resdata));
                                    orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, user);
                                    scheduleRideReminderAgenda(resdata);
                                }
                            });
                        }
                    }
                })
            } else if (data.payment_method === "square") {

                if (!ObjectId.isValid(data.paymentSourceRef)) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                }

                if (data.paymentMode === 'sandbox') {
                    data.secretKey = getStore.paymentSettings.sandboxSecretKey;
                } else {
                    data.secretKey = getStore.paymentSettings.liveSecretKey;
                }

                if (!data.secretKey) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    cost: data.orderTotal,
                    paymentSourceRef: data.paymentSourceRef,
                    secretKey: data.secretKey,
                    currency: data.currency
                }

                paymentMiddleware.paymentBySquare(chargeData, (response) => {
                    if (!response.status) {
                        res.json(helper.showStripeErrorResponse(response.message, response.code));
                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        Order.addOrder(data, async (err, resdata) => {
                            if (err) {
                                console.log("err db", err);
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("Order Created:", resdata._id);
                                res.json(helper.showSuccessResponse(orderSuccessMsg, resdata));
                                orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, user);
                                scheduleRideReminderAgenda(resdata);
                            }
                        });
                    }
                });

            } else if (data.payment_method === "razorpay" || data.payment_method === "orangeMoney") {
                data.paymentStatus = "pending";
                data.orderStatus = "archived";
                Order.addOrder(data, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let webViewUrl = env.apiUrl + "/order/webview?id=" + resdata.customOrderId + "&payment_method=" + data.payment_method + "&from=checkout";

                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id.toString(), webViewUrl: webViewUrl }));
                    }
                });

            } else if (data.payment_method === "moncash") {

                data.paymentStatus = "pending";
                data.orderStatus = "archived";

                Order.addOrder(data, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let webViewUrl = env.apiUrl + "card/webview?id=" + resdata.customOrderId + "&payment_method=" + data.payment_method + "&from=checkout";
                        console.log("fdfdf", orderSuccessMsg, { orderId: resdata._id.toString(), payment_method: data.paymentMethod, webViewUrl: webViewUrl })
                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id.toString(), payment_method: data.payment_method, webViewUrl: webViewUrl }));
                    }
                });

            } else if (data.payment_method === "dpo") {

                data.paymentStatus = "pending";
                data.orderStatus = "archived";

                Order.addOrder(data, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let webViewUrl = env.apiUrl + "card/webview?id=" + resdata.customOrderId + "&payment_method=" + data.payment_method + "&from=checkout";
                        console.log("fdfdf", orderSuccessMsg, { orderId: resdata._id.toString(), payment_method: data.paymentMethod, webViewUrl: webViewUrl })
                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id.toString(), payment_method: data.payment_method, webViewUrl: webViewUrl }));

                    }
                });

            } else if (data.payment_method === "pay360") {

                if (!ObjectId.isValid(data.paymentSourceRef)) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                }

                data.paymentStatus = "pending";
                data.orderStatus = "archived";

                Order.addOrder(data, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        let webViewUrl = env.apiUrl + "/card/webview?id=" + resdata.customOrderId + "&payment_method=" + data.payment_method + "&from=checkout&ref=" + data.paymentSourceRef;

                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id.toString(), webViewUrl: webViewUrl }));
                    }
                });

            } else if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {

                if (!ObjectId.isValid(data.paymentSourceRef)) {
                    return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_NOT_VALID_OBJECTID'));
                }

                if (getStore.paymentSettings.merchantId == null || getStore.paymentSettings.publicKey == null || getStore.paymentSettings.privateKey == null) {
                    return res.json(helper.showValidationErrorResponse('SETUP_PAYMENT_SETTING_FIRST'));
                }

                let chargeData = {
                    cost: data.orderTotal,
                    paymentSourceRef: data.paymentSourceRef,
                    merchantId: getStore.paymentSettings.merchantId,
                    publicKey: getStore.paymentSettings.publicKey,
                    privateKey: getStore.paymentSettings.privateKey,
                    paymentMode: data.paymentMode,
                    currency: data.currency
                }

                paymentMiddleware.paymentByBraintreeByCustomer(chargeData, (response) => {
                    if (!response.status) {
                        res.json(helper.showBraintreeErrorResponse(response.message, response.code));
                    } else {
                        data.transactionDetails = response.response;
                        data.paymentStatus = "success";
                        Order.addOrder(data, async (err, resdata) => {
                            if (err) {
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("Order Created:", resdata._id);
                                res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                            }
                        });
                    }
                });

            } else if (data.payment_method === "wallet") {
                if (!user.wallet) {
                    return res.json(helper.showValidationErrorResponse('PLEASE_ADD_MONEY_TO_WALLET'));
                }
                if (user.wallet < data.orderTotal) {
                    return res.json(helper.showValidationErrorResponse('WALLET_BALANCE_IS_LOW'));
                }
                let wallet = helper.roundNumber(user.wallet - data.orderTotal);
                User.updateUserProfile({ _id: user._id, wallet: wallet }, (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        data.transactionDetails = {};
                        data.paymentStatus = "success";
                        Order.addOrder(data, async (err, resdata) => {
                            if (err) {
                                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                console.log("Order Created:", resdata._id);
                                res.json(helper.showSuccessResponse(orderSuccessMsg, resdata));
                                orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, user);
                                scheduleRideReminderAgenda(resdata);
                                tripMiddleware.addstopsArray(data, resdata._id);
                            }
                        });
                    }
                });

            } else if (data.payment_method === "cod") {
                data.transactionDetails = {};
                data.paymentStatus = "success";
                Order.addOrder(data, async (err, resdata) => {
                    if (err) {
                        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                    } else {
                        console.log("Order Created:", resdata._id);
                        res.json(helper.showSuccessResponse(orderSuccessMsg, resdata));
                        orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, user);
                        scheduleRideReminderAgenda(resdata);
                    }
                });

            } else {
                return res.json(helper.showValidationErrorResponse('INVALID_PAYMENT_METHOD'));
            }
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    userCartMiddleware: async (req, res) => {
        try {
            let data = req.body;
            let storeTypeDetails = req.storeTypeDetails;
            // const getVendor = req.vendor;
            data.deliveryFee = 0;
            data.orderTotal = 0;
            let store = req.store;
            let isLoyaltyPointsEnabled = false;
            let isLoggedIn = false;
            const getCheckOutData = req.getCheckOutData;
            const getcheckInData = req.getcheckInData;
            data.checkInDate = getcheckInData.scheduledDate;
            data.checkOutDate = getCheckOutData.scheduledDate;
            data.checkInDate_utc = getcheckInData.scheduled_utc;
            data.checkOutDate_utc = getCheckOutData.scheduled_utc;
            let user = null;
            if (req.get('Authorization')) {
                let token = req.get('Authorization').replace('Bearer ', '');
                user = await User.findOne({ "tokens.token": token }, 'loyaltyPoints');
                if (user != null) {
                    isLoggedIn = true;
                    if (store.loyaltyPoints.status) {
                        data.loyaltyPoints = user.loyaltyPoints;
                        isLoyaltyPointsEnabled = true;
                    }
                }
            }
            data.isLoyaltyPointsEnabled = isLoyaltyPointsEnabled;
            if (!data.items) {
                return res.json(helper.showValidationErrorResponse('ITEMS_IS_REQUIRED'));
            }
            let lineData = await orderService.generateCarRentalLineItems(data.items, data);
            if (lineData.isValidItem) {
                return res.json(helper.showValidationErrorResponse('INVALID_ITEMS'));
            }
            data.line_items = lineData.line_items;
            data.subTotal = helper.roundNumber(lineData.itemTotal);
            //calculate tax
            const getTax = Pricing.taxCalculation(storeTypeDetails.taxSettings, 1, data.subTotal);
            console.log("getTax----", getTax)
            data.tax = getTax.tax || 0;
            data.taxAmount = getTax.taxAmount;
            let today = new Date();
            let unit = store.distanceUnit ? store.distanceUnit : 'km';
            data.discountTotal = 0
            //check coupon code
            if (data.coupon) {
                const couponCost = await helperFunc.couponDiscountCalculation(storeTypeDetails._id, data.coupon, data.subTotal);
                if (couponCost.discountTotal) {
                    data.discountTotal = couponCost.discountTotal;
                    data.couponType = couponCost.couponType;
                    data.couponBy = couponCost.couponBy;
                    data.couponAmount = couponCost.couponAmount;
                    data.subTotal = couponCost.itemTotal;
                }
                else {
                    return res.json(helper.showValidationErrorResponse('COUPAN IS NOT VALID'));
                }
            }
            if (data.addressId) {
                const getaddress = await userAddress.getAddressByIdAsync(data.addressId);
                data.billingDetails = getaddress;
                let billingDetails = getaddress;
                data.promoCodes = []
                if (billingDetails) {
                    let promoCodeObj = {
                        customerLocation: billingDetails.addressLocation.coordinates,
                        unit: unit
                    }
                    query = {
                        '$or': [{ type: "global", storeType: storeTypeDetails._id }],
                        status: "active", start_date: { $lte: new Date(today) }, date_expires: { $gte: new Date(today) }
                    };
                    let project = 'code discount_type amount description geoFence';
                    data.promoCodes = await geofencingFun.globalPromoCode(promoCodeObj, query, project)
                }
            }
            data.orderTotal = helper.roundNumber(data.subTotal + data.tax);
            let response = helper.showSuccessResponse('USER_CART', data);
            res.json(response);
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    checkdeliveryType: async (items) => {
        let element = items[0]
        let getItem = await Product.getProductForDelivery(element._id);
        if (getItem && getItem.categories.length) {
            let category = getItem.categories[0]
            if (category.parent != "none" && Object.keys(category.parent).length) {
                return category.parent.catName
            }
            else if (category.parent == "none") {
                return category.catName
            }
        }
        return ""
    },
    compareStrings: (a, b) => {
        // Assuming you want case-insensitive comparison
        a = a.toLowerCase();
        b = b.toLowerCase();

        return (a < b) ? -1 : (a > b) ? 1 : 0;
    },
    nearByDrivers: async (req, res) => {
        try {
            let data = req.body;
            let storeTypeDetails = req.storeTypeDetails;
            let store = req.store;
            let radius = storeTypeDetails.deliveryAreaDriver ? storeTypeDetails.deliveryAreaDriver : 20;
            let unit = store.distanceUnit ? store.distanceUnit : 'km';
            if (!data.addressId) {
                return res.json(helper.showValidationErrorResponse('USER ADDRESS REQUIRE'));
            }
            if (!data.hasOwnProperty('serviceId')) {
                return res.json(helper.showValidationResponseWithData('SERVICE ID REQUIRED'));
            }
            if (!data.serviceId.length) {
                return res.json(helper.showValidationResponseWithData('AT LEAST ONE SERVICE ADD'));
            }
            const getaddress = await userAddress.getAddressByIdAsync(data.addressId);
            if (!getaddress) {
                return res.json(helper.showValidationResponseWithData('USER LOCATION CANNOT FETCH, TRY ANOTHER LOCATION'));
            }
            data.source = { location: getaddress.addressLocation }
            let query = {
                store: ObjectId(store.storeId),
                onlineStatus: 'online',
                status: "approved",
                role: 'DRIVER'
            };

            let limit = storeTypeDetails.noOfDriversPerRequest ? storeTypeDetails.noOfDriversPerRequest : 10;

            let driverQuery = {
                apiType: 'nearByDrivers',
                source: data.source,
                radius: radius,
                unit: unit,
                query: query,
                limit: limit,
                serviceId: data.serviceId
            };

            module.exports.checkDrivers(driverQuery, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            utilityFunc.sendErrorResponse(error, res);
        }
    },
    checkDrivers: async (data, callback) => {
        try {
            let source = data.source.location//{ type: "Point", coordinates: [Number(data.source.lng), Number(data.source.lat)] };
            let radius = data.radius;
            let query = data.query;
            // for(fixid in data.serviceId)
            // {
            //     data.serviceId[fixid] = ObjectId(data.serviceId[fixid])
            // }
            let serviceId = data.serviceId.map(element => element = ObjectId(element))
            query.serviceId = { $all: serviceId }
            let unit = data.unit;
            let limit = data.limit || 10;
            let maxDistance = helperFunc.getDeliveryArea(radius, unit);
            await User.aggregate(
                [
                    {
                        "$geoNear": {
                            "near": source,
                            "distanceField": "distance",
                            key: "userLocation",
                            "spherical": true,
                            "maxDistance": maxDistance,
                            query: query,
                        }
                    },
                    {
                        $lookup:
                        {
                            from: "products",
                            localField: "serviceId",
                            foreignField: "_id",
                            as: "productdata"
                        }
                    },
                    {
                        $lookup:
                        {
                            from: "files",
                            localField: "profileImage",
                            foreignField: "_id",
                            as: "image"
                        }
                    },
                    {
                        $unwind:
                        {
                            path: "$image",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    { $limit: limit },
                    { $project: { _id: 1, name: 1, productdata: 1, onlineStatus: 1, image: { $cond: { if: "$profileImage", then: "$image", else: null } }, userLocation: 1, firebaseTokens: 1, angle: 1 } }
                ]).exec(callback)
        } catch (error) {
            console.log("nearByDrivers", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

}