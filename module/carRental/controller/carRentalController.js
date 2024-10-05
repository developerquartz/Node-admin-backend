const ObjectId = require('objectid');
const Order = require('../../../models/ordersTable');
const geofencingFun = require('../../../helper/geofencing')
const User = require('../../../models/userTable.js');
const userAddress = require('../../../models/addressTable')
const storeType = require('../../../models/storeTypeTable');
const ServiceMiddleware = require('../middleware/servicerequest')
const utilityFunc = require('../utility/functions');
const helperFunc = require('../utility/helperFunction');
const categoryTable = require('../../../models/categoryTable');
const brandTable = require('../../../models/cuisinesTable')
const orderService = require('../services/orderService');
const checkdriver = require('../services/sendRequest')
const productTable = require('../../../models/productsTable')
const Promotion = require('../../../models/promotionTable');
const Pricing = require('../../../helper/pricing');
const Product = require('../../../models/productsTable');
const settingService = require('../../../helper/settingService');
const moment = require('moment');
const paymentMiddleware = require('../../../middleware/payments');


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
            //let brandata = await brandTable.find(obj)
            let brandata = await brandTable.aggregate([{ $match: obj }, { $addFields: { isSelected: false } }]);
            obj.parent = "none";

            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ catName: { $regex: search || '', $options: 'i' } })
                obj['$or'].push({ catDesc: { $regex: search || '', $options: 'i' } })
            }
            let count = await categoryTable.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);

            categoryTable.getCategories(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    console.log("errr+++", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    countdata += brandata.length
                    await Promise.all(resdata.map(async element => {
                        element.isSelected = false;
                        if (element.subcategories.length > 0) {
                            //console.log("element.subcategories1", element.subcategories);
                            element.subcategories = await module.exports.getSubCategories(element.subcategories);
                        }

                    }));
                    let finalData = {
                        brand: brandata,
                        category: resdata
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
            let { orderBy, order, page, limit, storeTypeId, categoryId, search, customerLocation, checkInDate, checkOutDate, brand } = req.body
            let pageSize = parseInt(limit) || 10;
            let sortByField = orderBy || "date_created_utc";
            let store = req.store
            let storeTypeDetails = req.storeTypeDetails;
            let sortOrder = order || -1;
            let paged = parseInt(page) || 1;
            let obj = {};
            req.body.storeType = storeTypeDetails._id;

            const getCheckOutData = req.getCheckOutData;
            const getcheckInData = req.getcheckInData;
            if (storeTypeId) {
                obj.storeType = storeTypeDetails._id
            }
            if (brand && brand.length) {
                brand = brand.map(element => ObjectId(element));
                obj.brandId = { $in: brand }
            }
            if (categoryId && categoryId.length) {

                categoryId = categoryId.map(element => ObjectId(element));
                obj.categories = { $in: categoryId }
            }
            obj.status = "active";
            if (search) {

                obj.name = { $regex: search, $options: 'i' }

            }

            checkInDate = getcheckInData.scheduledDate;
            checkOutDate = getCheckOutData.scheduledDate;
            req.body.checkInDate_utc = getcheckInData.scheduled_utc;
            req.body.checkOutDate_utc = getCheckOutData.scheduled_utc;


            if (!customerLocation || !Object.keys(customerLocation).length)
                return res.json(helper.showValidationErrorResponse('USER LOCATION REQUIRED'));

            //console.log("body==>:", req.body);


            let source = { type: "Point", coordinates: [Number(customerLocation.lng), Number(customerLocation.lat)] };
            let radius = storeTypeDetails.deliveryAreaVendor ? storeTypeDetails.deliveryAreaVendor : Number(env.SEARCH_RADIUS);
            let unit = store.distanceUnit ? store.distanceUnit : 'km';
            let maxDistance = helper.getDeliveryArea(radius, unit);
            let getUnavailabilityProducts = await Order.getUnavailabilityProductsBycheckInCheckOut(req.body);
            console.log("getUnavailabilityProducts:", getUnavailabilityProducts);
            console.log("radius:", radius)

            if (getUnavailabilityProducts.length) obj._id = { $nin: getUnavailabilityProducts[0]._ids };
            console.log("obj==>", obj)

            User.getProductsListVendor(obj, pageSize, sortByField, sortOrder, paged, store.storeId, source, maxDistance, async (err, resdata) => {

                if (err) {
                    console.log("DB err:==>", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    /*
                    for (let index = 0; index < resdata.length; index++) {
                        if (resdata[index].bestSeller && resdata[index].bestSeller === true)
                            resdata[index].bestSeller = "yes"
                        else
                            resdata[index].bestSeller = "no"
            
                    }
                    */

                    return res.json(helper.showSuccessResponseCount('ITEM_DATA', resdata, resdata.length));
                }
            });

        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    userCartMiddleware: async (req, res) => {
        try {
            let data = req.body;
            let storeTypeDetails = req.storeTypeDetails;
            const getVendor = req.vendor;

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

            // console.log("items:", data.items)
            if (!data.items) {
                return res.json(helper.showValidationErrorResponse('ITEMS_IS_REQUIRED'));
            }

            /*if (!data.items.length) {
                return res.json(helper.showValidationErrorResponse('ITEMS_IS_REQUIRED'));
            }*/


            let lineData = await orderService.generateCarRentalLineItems(data.items, data);
            console.log("line_items:", lineData)

            if (lineData.isValidItem) {
                return res.json(helper.showValidationErrorResponse('INVALID_ITEMS'));
            }
            if (lineData.validVendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR_IS_INVALID'));
            }
            data.line_items = lineData.line_items;
            data.subTotal = helper.roundNumber(lineData.itemTotal);

            let today = new Date();
            today.setHours(0, 0, 0, 0);


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
            /*
            if (!customerLocation || !Object.keys(customerLocation).length)
                return res.json(helper.showValidationErrorResponse('USER LOCATION REQUIRED'));
                
              
            */
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

            data.pickUp = {
                address: getVendor.address,
                location: getVendor.userLocation
            }

            //calculate tax
            const getTax = Pricing.taxCalculation(storeTypeDetails.taxSettings, getVendor.taxAmount, data.subTotal);
            data.tax = getTax.tax;
            data.taxAmount = getTax.taxAmount;


            data.orderTotal = helper.roundNumber(data.subTotal + data.tax);

            let response = helper.showSuccessResponse('USER_CART', data);
            res.json(response);

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
            const getVendor = req.vendor;

            data.user = user._id;
            let getStoreType = req.storeTypeDetails;
            const getCheckOutData = req.getCheckOutData;
            const getcheckInData = req.getcheckInData;
            data.timezone = store.timezone;
            console.log("getCheckOutData:", getCheckOutData);
            console.log("getcheckInData:", getcheckInData);
            data.customOrderId = helper.generatorRandomNumber(6).toLowerCase();

            if (!data.scheduledType) {
                // return res.json(helper.showValidationErrorResponse('SCHEDULE_TYPE_IS_REQUIRED'));
            }

            if (!data.deliveryType) {
                // return res.json(helper.showValidationErrorResponse('DELIVERY_TYPE_IS_REQUIRED'));
            }

            if (!data.payment_method) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_METHOD_IS_REQUIRED'));
            }


            let payment_method = data.payment_method;
            data.paymentMethod = data.payment_method;

            if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
                payment_method = 'braintree';
            }

            if (!data.paymentSourceRef) {
                return res.json(helper.showValidationErrorResponse('PAYMENT_ID_IS_REQUIRED'));
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
            data.currency = store.currency.code;
            console.log("data:", data)


            if (!data.vendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR_IS_REQUIRED'));
            }

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
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');

            let verifyAvailbityService = await Order.getCheckAvailabilityService(data);
            //console.log("verifyAvailbityService:", verifyAvailbityService)
            if (verifyAvailbityService.length) {
                return res.json(helper.showValidationErrorResponse('SERVICE_IS_NOT_AVAILABLE'));
            }

            let lineData = await orderService.generateCarRentalLineItems(data.items, data);

            if (lineData.isValidItem) {
                return res.json(helper.showValidationErrorResponse('INVALID_ITEMS'));
            }
            if (lineData.validVendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR_IS_INVALID'));
            }


            data.pickUp = {
                address: getVendor.address,
                location: getVendor.userLocation
            }


            data.line_items = [lineData.line_items];
            data.subTotal = helper.roundNumber(lineData.itemTotal);
            //check coupon code
            if (data.coupon) {
                // let checkLimit = await module.exports.checkProcode(getVendor._id, getStoreType._id, user, data.date_created, data.date_created_utc)
                // console.log("check---", checkLimit)
                // if (checkLimit) {
                //     return res.json(helper.showValidationResponseWithData('Promo Code Max Limit exceeded'));
                // }
                const couponCost = await Pricing.couponDiscountCalculation(getStoreType._id, getVendor._id, data.coupon, data.subTotal);

                data.discountTotal = couponCost.discountTotal;
                data.couponType = couponCost.couponType;
                data.couponBy = couponCost.couponBy;
                data.couponAmount = couponCost.couponAmount;
                data.subTotal = couponCost.itemTotal;
            }

            //calculate tax
            console.log("getStoreType.taxSettings---")
            console.log(getStoreType.taxSettings)
            console.log("getVendor.taxAmount----")
            console.log(getVendor.taxAmount)
            console.log("data.subTotal")
            console.log(data.subTotal)
            const getTax = Pricing.taxCalculation(getStoreType.taxSettings, getVendor.taxAmount, data.subTotal);
            console.log("getTax--------")

            console.log(getTax)
            data.tax = getTax.tax;
            data.taxAmount = getTax.taxAmount;


            data.orderTotal = helper.roundNumber(data.subTotal + data.tax);

            if (data.orderStatus) {
                data.orderStatus = data.orderStatus;
            } else {
                data.orderStatus = "pending";
            }

            //calculate earning
            let vendorCommission = getVendor.commisionType && getVendor.commisionType === "override" ? getVendor.commission : getStoreType.commission;
            data.commission = {
                vendor: vendorCommission.vendor,
                // deliveryBoy: driverCommission
            }


            const getEarning = await Pricing.caculateEarning(getStoreType.taxSettings, data.subTotal, data.tax, data.tipAmount, data.deliveryFee, data.commission, store.isSingleVendor, data.discountTotal, data.couponBy);
            data.vendorEarning = getEarning.vendorEarning;
            data.adminEarning = getEarning.adminEarning;
            data.adminVendorEarning = getEarning.adminVendorEarning;

            if (data.isLoyaltyPointsUsed) {

                if (!data.pointsToRedeem) {
                    return res.json(helper.showValidationErrorResponse('PLEASE_ENTER_REDEEM_POINTS'));
                }

                let aLp = helper.calculateLoyalityPointsValue(data.pointsToRedeem, getStore.loyaltyPoints);

                data.orderTotal = helper.roundNumber(data.orderTotal - aLp.redemptionValue);

                data.redemptionValue = aLp.redemptionValue;
            }

            let orderSuccessMsg = await helper.getTerminologyData({ lang: "en", storeId: data.store, constant: "ORDER_ADDED_SUCCESS", type: "order" })
            if (data.payment_method === "stripe") {

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
                                res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                            }
                        });
                    }
                });

            } else if (data.payment_method === "paystack") {

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
                                    res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                    orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                                }
                            });
                        }
                    }
                })

            }
            else if (data.payment_method === "square") {

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
                                res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
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

            }
            else if (data.payment_method === "dpo") {

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

            }
            else if (data.payment_method === "pay360") {

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

            }
            else if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {

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
                                res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                                orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
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
                        res.json(helper.showSuccessResponse(orderSuccessMsg, { orderId: resdata._id }));
                        orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
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
    nearByVendors: async (req, res) => {
        try {
            let data = req.body;
            let storeTypeDetails = req.storeTypeDetails;
            let store = req.store;

            if (!data.customerLocation) {
                return res.json(helper.showValidationErrorResponse('CUSTOMER_LOCATION_IS_REQUIRED'));
            }

            const customerLocation = { type: "Point", coordinates: [Number(data.customerLocation.lng), Number(data.customerLocation.lat)] }

            if (!data.storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }

            const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
            }

            let radius = storeTypeDetails.deliveryAreaVendor ? storeTypeDetails.deliveryAreaVendor : Number(env.SEARCH_RADIUS);
            let unit = store.distanceUnit ? store.distanceUnit : 'km';
            radius = helper.getDeliveryArea(radius, unit);


            let query = {
                store: ObjectId(store.storeId),
                //onlineStatus: 'online',
                status: "approved",
                role: 'VENDOR'
            };

            query.storeType = { $in: [getStoreType._id] };

            /*  let limit = storeTypeDetails.noOfDriversPerRequest ? storeTypeDetails.noOfDriversPerRequest : 10;
              let pageOptions = {
                  page: parseInt(data.page) || 1,
                  limit: parseInt(data.limit) || limit
              }
  
              let skip = (pageOptions.page - 1) * pageOptions.limit;
  
              let sortByField = { avgRating: -1, _id: -1 };
              */

            let vendorQuery = {
                source: customerLocation,
                radius: radius,
                unit: unit,
                query: query,
            };

            module.exports.findNearByVenders(vendorQuery, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = resdata.length || 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        } catch (error) {
            utilityFunc.sendErrorResponse(error, res);
        }
    },
    findNearByVenders: async (data, callback) => {
        try {
            let source = data.source;
            let maxDistance = data.radius;
            let query = data.query;

            console.log("data--")
            console.log(data)
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
                    }
                ]).exec(callback)
        } catch (error) {
            console.log("nearByVendorsForCarrental", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    productDetails: async (req, res) => {
        let productId = req.params._id;
        if (!productId) return res.json(helper.showValidationErrorResponse("PRODUCT_ID_IS_REQUIRED"));

        Product.getProductByIdCarRental(productId, (err, resdata) => {
            if (err) {
                console.log("err", err);
                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {

                if (resdata === null) {
                    res.json(helper.showSuccessResponse('NO_DATA_FOUND', {}));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            }

        })
    }
}