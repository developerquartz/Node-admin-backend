const Order = require("../models/ordersTable");
const User = require("../models/userTable");
const storeType = require("../models/storeTypeTable");
const Store = require("../models/storeTable");
const File = require("../models/fileTable");
const Review = require("../models/reviewTable");
const Config = require("../config/constants.json");
const ObjectId = require("objectid");
const Pricing = require("../helper/pricing");
const paymentMiddleware = require("../middleware/payments");
const deliveryRequest = require("../helper/deliveryRequest");
const Transaction = require("../helper/transaction");
const emailService = require("../helper/emailService");
const orderService = require("../helper/orderService");
const settingService = require("../helper/settingService");
const promoUse = require("../models/promoCodeuseTable");
const stortyp = ["TAXI", "PICKUPDROP"];
const geofencingFun = require("../helper/geofencing");
const momentz = require("moment-timezone");
const {
  sortDriverPoolTrips
} = require('./../module/delivery/utility/sortDriverPoolTrips');
const agenda = require("../cron/agenda");
const Card = require('../models/cardTable');
module.exports = {
  userOrderMiddleware: async (req, res) => {
    try {
      let data = req.body;
      console.log("data---", JSON.stringify(data))
      let store = req.store;
      let user = req.user;
      data.user = user._id;
      let isDriectPayment = data.isDriectPayment;
      data.customOrderId = helper.generatorRandomNumber(6).toLowerCase();
      if (!data.scheduledType) {
        return res.json(helper.showValidationErrorResponse("SCHEDULE_TYPE_IS_REQUIRED"));
      }
      if (!data.deliveryType) {
        return res.json(helper.showValidationErrorResponse("DELIVERY_TYPE_IS_REQUIRED"));
      }
      if (!data.payment_method) {
        return res.json(helper.showValidationErrorResponse("PAYMENT_METHOD_IS_REQUIRED"));
      }
      let payment_method = data.payment_method;
      data.paymentMethod = data.payment_method;
      if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
        payment_method = "braintree";
      }
      if (!isDriectPayment) {
        if (!data.paymentSourceRef) {
          return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_REQUIRED"));
        }
      }
      if (!data.storeTypeId) {
        return res.json(helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED"));
      }
      const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);
      if (getStoreType === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_STORE_TYPE"));
      }
      data.storeType = getStoreType._id;
      data.store = getStoreType.store._id;
      let getStore = await settingService.chekStoreSetting(data.store, payment_method);
      if (!getStore.flag) {
        return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
      }
      if (getStore.flag && !getStore.paymentSettings.status) {
        return res.json(helper.showValidationErrorResponse("PAYMENT_METHOD_DISABLE"));
      }
      if (!getStore.googleMapKey) {
        return res.json(helper.showValidationErrorResponse("GOOGLEMAP_KEY_NOT_SETUP"));
      }
      if (!getStore.googleMapKey.server) {
        return res.json(helper.showValidationErrorResponse("GOOGLEMAP_KEY_NOT_SETUP"));
      }
      data.googleMapKey = getStore.googleMapKey.server;
      data.timezone = getStore.timezone;
      data.paymentMode = getStore.paymentMode;
      data.currency = getStore.currency.code;
      if (!data.vendor) {
        return res.json(helper.showValidationErrorResponse("VENDOR_IS_REQUIRED"));
      }
      const getVendor = await User.getUserByIdAsync(data.vendor);
      if (getVendor === null) {
        return res.json(helper.showValidationErrorResponse("VENDOR_IS_INVALID"));
      }
      if (data.scheduledType && data.scheduledType === "scheduled") {
        if (!data.scheduledDate) {
          return res.json(helper.showValidationErrorResponse("SCHEDULE_DATE_IS_REQUIRED"));
        }
        if (!data.scheduledTime) {
          return res.json(helper.showValidationErrorResponse("SCHEDULE_TIME_IS_REQUIRED"));
        }
        if (!helper.isValidDate(data.scheduledDate, "YYYY-MM-DD")) {
          return res.json(helper.showValidationErrorResponse("CORRECT_DATE_FORMAT"));
        }
        const getScheduleData = helper.getScheduleData("YYYY-MM-DD", data.scheduledDate, data.scheduledTime, data.timezone);
        if (getScheduleData.scheduled_utc.getTime() < getScheduleData.currentUTC.getTime()) {
          return res.json(helper.showValidationErrorResponse("BOOKING_NOT_ALLOWED"));
        }
        data.scheduledDate = getScheduleData.scheduledDate;
        data.scheduledTime = getScheduleData.scheduledTime;
        data.scheduled_utc = getScheduleData.scheduled_utc;
        data.date_created = data.scheduledDate;
        data.time_created = data.scheduledTime;
        data.date_created_utc = data.scheduled_utc;
        data.IST_date_created = getScheduleData.scheduledDateIST;
        data.time24_created = getScheduleData.scheduledTime24
        console.log(data.IST_date_created, data.time24_created)
      } else {
        data.date_created_utc = new Date();
        let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
        data.date_created = CurrentCityTime.format("MM-DD-YYYY");
        data.time_created = CurrentCityTime.format("LT");
        data.IST_date_created = CurrentCityTime.format("DD-MM-YYYY");
        data.time24_created = CurrentCityTime.format('HH:mm');
      }
      let vendorOpenClose;
      if (data.scheduledType && data.scheduledType === "scheduled") {
        vendorOpenClose = helper.getVendorOpenCloseStatusForScheduleOrder(getVendor.isVendorAvailable, getVendor.timeSlot, data.date_created_utc, data.timezone);
        if (vendorOpenClose.status == "Close") {
          return res.json(helper.showValidationErrorResponse("NOT_TAKING_ORDER_FOR_SCHEDULE"));
        }
      } else {
        vendorOpenClose = helper.getVendorOpenCloseStatus(getVendor.isVendorAvailable, getVendor.timeSlot, data.date_created_utc, data.timezone);
      }
      if (data.deliveryType === "DELIVERY" && helper.getDeliveryTimeSlot(getVendor, data.timezone)) {
        let vendorDeliverySlot = helper.getVendorDeliveryTypeStatusForNewFeatures(getVendor, new Date(), data.timezone);
        if (!vendorDeliverySlot.isDeliveryTypeAvailable) {
          return res.json(helper.showValidationResponseWithData("NOT_TAKING_DELIVERY_ORDER", data));
        }
        if (vendorDeliverySlot.status == "Close") {
          vendorOpenClose.status = vendorDeliverySlot.status;
        }
      }
      if (vendorOpenClose.status == "Close") {
        return res.json(helper.showValidationErrorResponse("NOT_TAKING_ORDER"));
      }
      if (!data.items.length === 0) {
        return res.json(helper.showValidationErrorResponse("ITEMS_IS_REQUIRED"));
      }
      let lineData = await orderService.generateLineItems(data.items, getStoreType.storeType, store.storeVersion);
      if (lineData.isValidItem) {
        return res.json(helper.showValidationErrorResponse("INVALID_ITEMS"));
      }
      if (lineData.stock_status) {
        let messagdat = helper.showValidationResponseWithData("OUT_OF_STOCK", data);
        messagdat.message = messagdat.message.replace("{productname}", "");
        messagdat.message = messagdat.message.replace("{stock}", "");
        return res.json(messagdat);
        //return res.json(helper.showValidationErrorResponse('OUT_OF_STOCK'));
      }
      if (
        ["GROCERY"].includes(getStoreType.storeType) && lineData.totalWeight) {
        data.totalWeight = lineData.totalWeight;
      }
      data.line_items = lineData.line_items;
      data.subTotal = helper.roundNumber(lineData.itemTotal);
      let unit = store.distanceUnit ? store.distanceUnit : "km";
      if (getVendor.minOrderAmont > data.subTotal) {
        return res.json({
          status: "failure",
          message: __("CART_MINIMUM_ORDER_AMOUNT", getVendor.minOrderAmont),
        });
      }
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
      console.log("-----------deleityyyyyy------------")
      if (data.deliveryType === "DELIVERY") {
        const getDeliveryFee = await Pricing.deliveryFeeCalculation(data, getStoreType, getVendor, unit);
        if (getDeliveryFee.message != null) {
          return res.json(helper.showValidationResponseWithData(getDeliveryFee.message, data));
        }
        UserObj = {
          customerLocation: getDeliveryFee.billingDetails.addressLocation.coordinates,
          unit: unit,
        };
        if (getVendor.geoFence.length) {
          let geofence = await geofencingFun.globalVenderCheck(UserObj, getVendor);
          if (geofence && !geofence.isAccepteOrder) {
            return res.json(helper.showValidationErrorResponse("RESTAURANT_NOT_TAKE_ORDER_ADDRESS"));
          }
        }
        if (
          ["GROCERY"].includes(getStoreType.storeType) && lineData.totalWeight) { }
        data = {
          ...data,
          ...getDeliveryFee
        };
      } else {
        data.deliveryFee = 0;
      }
      //calculate tax
      const getTax = Pricing.taxCalculation(getStoreType.taxSettings, getVendor.taxAmount, data.subTotal);
      data.tax = getTax.tax;
      data.taxAmount = getTax.taxAmount;
      //calculate tip
      if (data.tip) {
        console.log("in tip--");
        const getTip = Pricing.tipCalculation(Number(data.tip), data.subTotal, store.tipType);
        data.tip = getTip.tip;
        data.tipAmount = getTip.tipAmount;
      } else {
        data.tipAmount = 0;
      }
      data.orderTotal = helper.roundNumber(data.subTotal + data.tax + data.tipAmount + data.deliveryFee);
      if (data.orderStatus) {
        data.orderStatus = data.orderStatus;
      } else {
        data.orderStatus = "pending";
      }
      //calculate earning
      let vendorCommission = getVendor.commisionType && getVendor.commisionType === "override" ? getVendor.commission : getStoreType.commission;
      let driverCommission = getStoreType.commission.deliveryBoy;
      data.commission = {
        vendor: vendorCommission.vendor,
        deliveryBoy: driverCommission,
      };
      const getEarning = await Pricing.caculateEarning(getStoreType.taxSettings, data.subTotal, data.tax, data.tipAmount, data.deliveryFee, data.commission, store.isSingleVendor, data.discountTotal, data.couponBy);
      data.vendorEarning = getEarning.vendorEarning;
      data.deliveryBoyEarning = getEarning.deliveryBoyEarning;
      data.adminEarning = getEarning.adminEarning;
      data.adminVendorEarning = getEarning.adminVendorEarning;
      data.adminDeliveryBoyEarning = getEarning.adminDeliveryBoyEarning;
      if (data.isLoyaltyPointsUsed) {
        if (!data.pointsToRedeem) {
          return res.json(helper.showValidationErrorResponse("PLEASE_ENTER_REDEEM_POINTS"));
        }
        let aLp = helper.calculateLoyalityPointsValue(data.pointsToRedeem, getStore.loyaltyPoints);
        data.orderTotal = helper.roundNumber(data.orderTotal - aLp.redemptionValue);
        data.redemptionValue = aLp.redemptionValue;
      }
      let orderSuccessMsg = await helper.getTerminologyData({
        lang: "en",
        storeId: data.store,
        constant: "ORDER_ADDED_SUCCESS",
        type: "order",
      });
      let orderResData = {
        scheduledType: data.scheduledType,
        paymentStatus: "success",
        paymentMethod: data.paymentMethod,
        paymentSourceRef: data.paymentSourceRef,
        orderStatus: "pending",
        journeyType: data.journeyType,
        rideType: data.rideType,
      };
      console.log("-----------last------------")
      if (data.payment_method === "stripe") {
        if (!ObjectId.isValid(data.paymentSourceRef)) {
          return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
        }
        if (data.paymentMode === "sandbox") {
          data.secretKey = getStore.paymentSettings.sandboxSecretKey;
        } else {
          data.secretKey = getStore.paymentSettings.liveSecretKey;
        }
        if (!data.secretKey) {
          return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        let chargeData = {
          cost: data.orderTotal,
          paymentSourceRef: data.paymentSourceRef,
          secretKey: data.secretKey,
          currency: data.currency,
        };
        paymentMiddleware.paymentByStripe(chargeData, (response) => {
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
                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                  orderId: resdata._id,
                  ...orderResData
                }));
                orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                orderService.manageProductStock(resdata.line_items, false);
              }
            });
          }
        });
      } else if (data.payment_method === "paystack") {
        if (!isDriectPayment || isDriectPayment == "false") {
          if (!ObjectId.isValid(data.paymentSourceRef)) {
            return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
          }
          if (data.paymentMode === "sandbox") {
            data.secretKey = getStore.paymentSettings.sandboxSecretKey;
          } else {
            data.secretKey = getStore.paymentSettings.liveSecretKey;
          }
          if (!data.secretKey) {
            return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
          }
          let chargeData = {
            cost: data.orderTotal,
            paymentSourceRef: data.paymentSourceRef,
            secretKey: data.secretKey,
            currency: data.currency,
          };
          paymentMiddleware.paymentChargebyPaystack(chargeData, (response) => {
            if (!response.status) {
              return res.json(helper.showValidationErrorResponse(response.message));
            } else {
              console.log("response.status!", response.response.status);
              if (response.response.status != "success") {
                console.log("Payment failed");
                return res.json(helper.showValidationErrorResponse(response.message));
              } else {
                data.transactionDetails = response.response;
                data.paymentStatus = "success";
                Order.addOrder(data, async (err, resdata) => {
                  if (err) {
                    console.log("err db", err);
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                  } else {
                    console.log("Order Created:", resdata._id);
                    res.json(helper.showSuccessResponse(orderSuccessMsg, {
                      orderId: resdata._id,
                      ...orderResData
                    }));
                    orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                    orderService.manageProductStock(resdata.line_items, false);
                  }
                });
              }
            }
          });
        } else {
          data.paymentStatus = "pending";
          data.orderStatus = "archived";
          Order.addOrder(data, async (err, resdata) => {
            if (err) {
              res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
              let returnUrl = env.apiUrl + "card/paystack/return?id=" + resdata.customOrderId + "&payment_method=paystack&from=checkout&amount=" + data.orderTotal;
              let sendData = {
                orderId: resdata._id.toString(),
                id: resdata.customOrderId.toString(),
                payment_method: "paystack",
                from: "checkout",
                amount: data.orderTotal,
                returnUrl: returnUrl,
              };
              res.json(helper.showSuccessResponse(orderSuccessMsg, sendData));
            }
          });
        }
      } else if (data.paymentMethod === "flutterwave") {
        let isDriectPayment = data.isDriectPayment;
        if (!isDriectPayment || isDriectPayment == "false") {
          if (!ObjectId.isValid(data.paymentSourceRef)) {
            return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
          }
          if (getStore.paymentMode === "sandbox") {
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
            currency: data.currency,
          };
          paymentMiddleware.paymentChargebyFlutterwave(chargeData, (response) => {
            if (!response.status) {
              return res.json(helper.showValidationErrorResponse(response.message));
            } else {
              console.log("response.status delivery", response.response.status);
              if (response.response.status != "successful") {
                console.log("Payment failed");
                return res.json(helper.showValidationErrorResponse(response.message));
              } else {
                data.transactionDetails = response.response;
                data.paymentStatus = "success";
                Order.addOrder(data, async (err, resdata) => {
                  if (err) {
                    console.log("err db", err);
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                  } else {
                    console.log("Order Created:", resdata._id);
                    res.json(helper.showSuccessResponse(orderSuccessMsg, {
                      orderId: resdata._id,
                      ...orderResData
                    }));
                    orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                    orderService.manageProductStock(resdata.line_items, false);
                  }
                });
              }
            }
          });
        } else {
          data.paymentStatus = "pending";
          data.orderStatus = "archived";
          Order.addOrder(data, async (err, resdata) => {
            if (err) {
              res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            } else {
              let returnUrl = env.apiUrl + "card/flutterwave/return?id=" + resdata.customOrderId + "&payment_method=flutterwave&from=checkout&amount=" + data.orderTotal;
              let sendData = {
                orderId: resdata._id.toString(),
                id: resdata.customOrderId.toString(),
                payment_method: "flutterwave",
                from: "checkout",
                amount: data.orderTotal,
                returnUrl: returnUrl,
              };
              res.json(helper.showSuccessResponse(orderSuccessMsg, sendData));
            }
          });
        }
      } else if (data.payment_method === "square") {
        if (!ObjectId.isValid(data.paymentSourceRef)) {
          return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
        }
        if (data.paymentMode === "sandbox") {
          data.secretKey = getStore.paymentSettings.sandboxSecretKey;
        } else {
          data.secretKey = getStore.paymentSettings.liveSecretKey;
        }
        if (!data.secretKey) {
          return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        let chargeData = {
          cost: data.orderTotal,
          paymentSourceRef: data.paymentSourceRef,
          secretKey: data.secretKey,
          currency: data.currency,
        };
        paymentMiddleware.paymentBySquare(chargeData, (response) => {
          if (!response.status) {
            return res.json(helper.showValidationErrorResponse(response.message));
          } else {
            data.transactionDetails = response.response;
            data.paymentStatus = "success";
            Order.addOrder(data, async (err, resdata) => {
              if (err) {
                console.log("err db", err);
                res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
              } else {
                console.log("Order Created:", resdata._id);
                res.json(helper.showSuccessResponse(orderSuccessMsg, {
                  orderId: resdata._id,
                  ...orderResData
                }));
                orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                orderService.manageProductStock(resdata.line_items, false);
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
            res.json(helper.showSuccessResponse(orderSuccessMsg, {
              orderId: resdata._id.toString(),
              payment_method: data.payment_method,
              webViewUrl: webViewUrl,
            }));
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
            console.log("fdfdf", orderSuccessMsg, {
              orderId: resdata._id.toString(),
              payment_method: data.paymentMethod,
              webViewUrl: webViewUrl,
            });
            res.json(helper.showSuccessResponse(orderSuccessMsg, {
              orderId: resdata._id.toString(),
              payment_method: data.payment_method,
              webViewUrl: webViewUrl,
            }));
          }
        });
      } else if (data.payment_method === "dpo") {
        if (getStore.paymentMode === "sandbox") {
          data.companytoken = getStore.paymentSettings.companytoken;
          data.endpoint = getStore.paymentSettings.endpoint;
          data.servicetype = getStore.paymentSettings.servicenumber;
        } else {
          data.companytoken = getStore.paymentSettings.livecompanytoken;
          data.endpoint = getStore.paymentSettings.liveendpoint;
          data.servicetype = getStore.paymentSettings.liveservicenumber;
        }
        if (!data.companytoken) {
          return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        if (!data.endpoint) {
          return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        if (!data.servicetype) {
          return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        let todaydate = Date.now();
        let servicedate = momentz.tz(todaydate, getStore.timezone).format("YYYY/MM/DD HH:mm");
        chargeData = {
          companytoken: data.companytoken,
          currency: getStore.currency.code,
          amount: data.orderTotal,
          endpoint: data.endpoint,
          servicetype: data.servicetype,
          servicedescription: "User create order amount",
          servicedate: servicedate,
        };
        paymentMiddleware.dpoCreatePayment(chargeData, async (response) => {
          if (!response.status) {
            return res.json(helper.showValidationErrorResponse(response.message));
          } else {
            //console.log("response---wallet", response)
            let carddata = {
              companytoken: data.companytoken,
              endpoint: data.endpoint,
              transactiontoken: response.data.TransToken,
              paymentSourceRef: data.paymentSourceRef,
            };
            paymentMiddleware.chargebycard(carddata, async (cdres) => {
              if (!cdres.status) {
                let cancelrequest = {
                  companytoken: data.companytoken,
                  endpoint: data.endpoint,
                  transactiontoken: response.data.TransToken,
                };
                paymentMiddleware.dpoCancelPayment(cancelrequest, async (cancelres) => {
                  if (!cancelres.status) {
                    console.log("order dpo cancel request error  message---", cancelres.message);
                    //return res.json(helper.showValidationErrorResponse(response.message));
                  } else {
                    console.log("order dpo request cancelled", cancelres);
                  }
                });
                return res.json(helper.showValidationErrorResponse(cdres.message));
              } else {
                console.log("order charge by card data---", cdres);
                let transactiondta = {
                  transactionId: response.data.TransToken,
                  refundDetails: data.orderTotal + " amount has been creatdited of " + data.customOrderId + " order",
                };
                data.transactionDetails = transactiondta;
                data.paymentStatus = "success";
                Order.addOrder(data, async (err, orderresdata) => {
                  if (err) {
                    console.log("err db", err);
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                  } else {
                    console.log("Order Created:", orderresdata._id);
                    res.json(helper.showSuccessResponse(orderSuccessMsg, {
                      orderId: orderresdata._id,
                      ...orderResData
                    }));
                    orderService.beforeRequestSendToVendor(getStore, getStoreType, orderresdata, getVendor, user);
                    orderService.manageProductStock(orderresdata.line_items, false);
                  }
                });
              }
            });
          }
        });
      } else if (data.payment_method === "pay360") {
        if (!getVendor.pay360Split || !getVendor.pay360Split.status || !getVendor.pay360Split.accountId || !getVendor.pay360Split.merchantId) {
          return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST_VENDOR"));
        }
        if (!ObjectId.isValid(data.paymentSourceRef)) {
          return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
        }
        data.paymentStatus = "pending";
        data.orderStatus = "archived";
        Order.addOrder(data, async (err, resdata) => {
          if (err) {
            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
          } else {
            let webViewUrl = env.apiUrl + "/card/webview?id=" + resdata.customOrderId + "&payment_method=" + data.payment_method + "&from=checkout&ref=" + data.paymentSourceRef;
            res.json(helper.showSuccessResponse(orderSuccessMsg, {
              orderId: resdata._id.toString(),
              payment_method: data.payment_method,
              webViewUrl: webViewUrl,
            }));
          }
        });
      } else if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
        if (!ObjectId.isValid(data.paymentSourceRef)) {
          return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_NOT_VALID_OBJECTID"));
        }
        if (getStore.paymentSettings.merchantId == null || getStore.paymentSettings.publicKey == null || getStore.paymentSettings.privateKey == null) {
          return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        let chargeData = {
          cost: data.orderTotal,
          paymentSourceRef: data.paymentSourceRef,
          merchantId: getStore.paymentSettings.merchantId,
          publicKey: getStore.paymentSettings.publicKey,
          privateKey: getStore.paymentSettings.privateKey,
          paymentMode: data.paymentMode,
          currency: data.currency,
        };
        paymentMiddleware.paymentByBraintreeByCustomer(chargeData,
          (response) => {
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
                  res.json(helper.showSuccessResponse(orderSuccessMsg, {
                    orderId: resdata._id,
                  }));
                  orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                  orderService.manageProductStock(resdata.line_items, false);
                }
              });
            }
          });
      } else if (data.payment_method === "wallet") {
        if (!user.wallet) {
          return res.json(helper.showValidationErrorResponse("PLEASE_ADD_MONEY_TO_WALLET"));
        }
        if (user.wallet < data.orderTotal) {
          return res.json(helper.showValidationErrorResponse("WALLET_BALANCE_IS_LOW"));
        }
        let wallet = helper.roundNumber(user.wallet - data.orderTotal);
        User.updateUserProfile({
          _id: user._id,
          wallet: wallet
        },
          (err, resdata) => {
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
                  Transaction.userTransaction(resdata, user, store, data.orderTotal, wallet);
                  res.json(helper.showSuccessResponse(orderSuccessMsg, {
                    orderId: resdata._id,
                    ...orderResData
                  }));
                  orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
                  orderService.manageProductStock(resdata.line_items, false);
                }
              });
            }
          });
      } else if (data.payment_method === "cod") {
        data.transactionDetails = {};
        data.paymentStatus = "success";
        Order.addOrder(data, async (err, resdata) => {
          if (err) {
            console.log("cod---", err);
            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
          } else {
            console.log("Order Created:", resdata._id);
            res.json(helper.showSuccessResponse(orderSuccessMsg, {
              orderId: resdata._id,
              ...orderResData
            }));
            orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
            orderService.manageProductStock(resdata.line_items, false);
          }
        });
      } else if (data.payment_method === "cardOnDelivery") {
        data.transactionDetails = {};
        data.paymentStatus = "success";
        Order.addOrder(data, async (err, resdata) => {
          if (err) {
            console.log("cod---", err);
            res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
          } else {
            console.log("Order Created:", resdata._id);
            res.json(helper.showSuccessResponse(orderSuccessMsg, {
              orderId: resdata._id,
              ...orderResData
            }));
            orderService.beforeRequestSendToVendor(getStore, getStoreType, resdata, getVendor, user);
            orderService.manageProductStock(resdata.line_items, false);
          }
        });
      } else {
        return res.json(helper.showValidationErrorResponse("INVALID_PAYMENT_METHOD"));
      }
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  newOrderMiddleware: async (req, res, next) => {
    try {
      let data = req.body;
      let store = req.store;
      let user = req.user;
      data.user = user._id;
      let isDriectPayment = data.isDriectPayment;
      data.customOrderId = helper.generatorRandomNumber(6).toLowerCase();
      if (!data.scheduledType) {
        return res.json(helper.showValidationErrorResponse("SCHEDULE_TYPE_IS_REQUIRED"));
      }
      if (!data.deliveryType) {
        return res.json(helper.showValidationErrorResponse("DELIVERY_TYPE_IS_REQUIRED"));
      }
      if (!data.payment_method) {
        return res.json(helper.showValidationErrorResponse("PAYMENT_METHOD_IS_REQUIRED"));
      }
      let payment_method = data.payment_method;
      data.paymentMethod = data.payment_method;
      if (data.payment_method === "paypal" || data.payment_method === "googlepay" || data.payment_method === "applepay") {
        payment_method = "braintree";
      }
      if (!isDriectPayment) {
        if (!data.paymentSourceRef) {
          return res.json(helper.showValidationErrorResponse("PAYMENT_ID_IS_REQUIRED"));
        }
      }
      if (!data.storeTypeId) {
        return res.json(helper.showValidationErrorResponse("STORE_TYPE_ID_IS_REQUIRED"));
      }
      const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);
      if (getStoreType === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_STORE_TYPE"));
      }
      data.storeType = getStoreType._id;
      data.store = getStoreType.store._id;
      let getStore = await settingService.chekStoreSetting(data.store, payment_method);
      if (!getStore.flag) {
        return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
      }
      if (getStore.flag && !getStore.paymentSettings.status) {
        return res.json(helper.showValidationErrorResponse("PAYMENT_METHOD_DISABLE"));
      }
      if (!getStore.googleMapKey) {
        return res.json(helper.showValidationErrorResponse("GOOGLEMAP_KEY_NOT_SETUP"));
      }
      if (!getStore.googleMapKey.server) {
        return res.json(helper.showValidationErrorResponse("GOOGLEMAP_KEY_NOT_SETUP"));
      }
      data.googleMapKey = getStore.googleMapKey.server;
      data.timezone = getStore.timezone;
      data.paymentMode = getStore.paymentMode;
      data.currency = getStore.currency.code;
      if (!data.vendor) {
        return res.json(helper.showValidationErrorResponse("VENDOR_IS_REQUIRED"));
      }
      const getVendor = await User.getUserByIdAsync(data.vendor);
      if (getVendor === null) {
        return res.json(helper.showValidationErrorResponse("VENDOR_IS_INVALID"));
      }
      if (data.scheduledType && data.scheduledType === "scheduled") {
        if (!data.scheduledDate) {
          return res.json(helper.showValidationErrorResponse("SCHEDULE_DATE_IS_REQUIRED"));
        }
        if (!data.scheduledTime) {
          return res.json(helper.showValidationErrorResponse("SCHEDULE_TIME_IS_REQUIRED"));
        }
        if (!helper.isValidDate(data.scheduledDate, "YYYY-MM-DD")) {
          return res.json(helper.showValidationErrorResponse("CORRECT_DATE_FORMAT"));
        }
        const getScheduleData = helper.getScheduleData("YYYY-MM-DD", data.scheduledDate, data.scheduledTime, data.timezone);
        if (getScheduleData.scheduled_utc.getTime() < getScheduleData.currentUTC.getTime()) {
          return res.json(helper.showValidationErrorResponse("BOOKING_NOT_ALLOWED"));
        }
        data.scheduledDate = getScheduleData.scheduledDate;
        data.scheduledTime = getScheduleData.scheduledTime;
        data.scheduled_utc = getScheduleData.scheduled_utc;
        data.date_created = data.scheduledDate;
        data.time_created = data.scheduledTime;
        data.date_created_utc = data.scheduled_utc;
        data.IST_date_created = getScheduleData.scheduledDateIST;
        data.time24_created = getScheduleData.scheduledTime24
        console.log(data.IST_date_created, data.time24_created)
      } else {
        data.date_created_utc = new Date();
        let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, data.timezone);
        data.date_created = CurrentCityTime.format("MM-DD-YYYY");
        data.time_created = CurrentCityTime.format("LT");
        data.IST_date_created = CurrentCityTime.format("DD-MM-YYYY");
        data.time24_created = CurrentCityTime.format('HH:mm');
      }
      let vendorOpenClose;
      if (data.scheduledType && data.scheduledType === "scheduled") {
        vendorOpenClose = helper.getVendorOpenCloseStatusForScheduleOrder(getVendor.isVendorAvailable, getVendor.timeSlot, data.date_created_utc, data.timezone);
        if (vendorOpenClose.status == "Close") {
          return res.json(helper.showValidationErrorResponse("NOT_TAKING_ORDER_FOR_SCHEDULE"));
        }
      } else {
        vendorOpenClose = helper.getVendorOpenCloseStatus(getVendor.isVendorAvailable, getVendor.timeSlot, data.date_created_utc, data.timezone);
      }
      if (data.deliveryType === "DELIVERY" && helper.getDeliveryTimeSlot(getVendor, data.timezone)) {
        let vendorDeliverySlot = helper.getVendorDeliveryTypeStatusForNewFeatures(getVendor, new Date(), data.timezone);
        if (!vendorDeliverySlot.isDeliveryTypeAvailable) {
          return res.json(helper.showValidationResponseWithData("NOT_TAKING_DELIVERY_ORDER", data));
        }
        if (vendorDeliverySlot.status == "Close") {
          vendorOpenClose.status = vendorDeliverySlot.status;
        }
      }
      if (vendorOpenClose.status == "Close") {
        return res.json(helper.showValidationErrorResponse("NOT_TAKING_ORDER"));
      }
      if (!data.items.length === 0) {
        return res.json(helper.showValidationErrorResponse("ITEMS_IS_REQUIRED"));
      }
      let lineData = await orderService.generateLineItems(data.items, getStoreType.storeType, store.storeVersion);
      if (lineData.isValidItem) {
        return res.json(helper.showValidationErrorResponse("INVALID_ITEMS"));
      }
      if (lineData.stock_status) {
        let messagdat = helper.showValidationResponseWithData("OUT_OF_STOCK", data);
        messagdat.message = messagdat.message.replace("{productname}", "");
        messagdat.message = messagdat.message.replace("{stock}", "");
        return res.json(messagdat);
      }
      if (["GROCERY"].includes(getStoreType.storeType) && lineData.totalWeight) {
        data.totalWeight = lineData.totalWeight;
      }
      data.line_items = lineData.line_items;
      data.subTotal = helper.roundNumber(lineData.itemTotal);
      let unit = store.distanceUnit ? store.distanceUnit : "km";
      if (getVendor.minOrderAmont > data.subTotal) {
        return res.json({
          status: "failure",
          message: __("CART_MINIMUM_ORDER_AMOUNT", getVendor.minOrderAmont),
        });
      }
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
      if (data.deliveryType === "DELIVERY") {
        const getDeliveryFee = await Pricing.deliveryFeeCalculation(data, getStoreType, getVendor, unit);
        if (getDeliveryFee.message != null) {
          return res.json(helper.showValidationResponseWithData(getDeliveryFee.message, data));
        }
        UserObj = {
          customerLocation: getDeliveryFee.billingDetails.addressLocation.coordinates,
          unit: unit,
        };
        if (getVendor.geoFence.length) {
          let geofence = await geofencingFun.globalVenderCheck(UserObj, getVendor);
          if (geofence && !geofence.isAccepteOrder) {
            return res.json(helper.showValidationErrorResponse("RESTAURANT_NOT_TAKE_ORDER_ADDRESS"));
          }
        }
        if (["GROCERY"].includes(getStoreType.storeType) && lineData.totalWeight) { }
        data = {
          ...data,
          ...getDeliveryFee
        };
      } else {
        data.deliveryFee = 0;
      }
      //calculate tax
      const getTax = Pricing.taxCalculation(getStoreType.taxSettings, getVendor.taxAmount, data.subTotal);
      data.tax = getTax.tax;
      data.taxAmount = getTax.taxAmount;
      //calculate tip
      if (data.tip) {
        console.log("in tip--");
        const getTip = Pricing.tipCalculation(Number(data.tip), data.subTotal, store.tipType);
        data.tip = getTip.tip;
        data.tipAmount = getTip.tipAmount;
      } else {
        data.tipAmount = 0;
      }
      data.orderTotal = helper.roundNumber(data.subTotal + data.tax + data.tipAmount + data.deliveryFee);
      if (data.orderStatus) {
        data.orderStatus = data.orderStatus;
      } else {
        data.orderStatus = "pending";
      }
      //calculate earning
      let vendorCommission = getVendor.commisionType && getVendor.commisionType === "override" ? getVendor.commission : getStoreType.commission;
      let driverCommission = getStoreType.commission.deliveryBoy;
      data.commission = {
        vendor: vendorCommission.vendor,
        deliveryBoy: driverCommission,
      };
      const getEarning = await Pricing.caculateEarning(getStoreType.taxSettings, data.subTotal, data.tax, data.tipAmount, data.deliveryFee, data.commission, store.isSingleVendor, data.discountTotal, data.couponBy);
      data.vendorEarning = getEarning.vendorEarning;
      data.deliveryBoyEarning = getEarning.deliveryBoyEarning;
      data.adminEarning = getEarning.adminEarning;
      data.adminVendorEarning = getEarning.adminVendorEarning;
      data.adminDeliveryBoyEarning = getEarning.adminDeliveryBoyEarning;
      if (data.isLoyaltyPointsUsed) {
        if (!data.pointsToRedeem) {
          return res.json(helper.showValidationErrorResponse("PLEASE_ENTER_REDEEM_POINTS"));
        }
        let aLp = helper.calculateLoyalityPointsValue(data.pointsToRedeem, getStore.loyaltyPoints);
        data.orderTotal = helper.roundNumber(data.orderTotal - aLp.redemptionValue);
        data.redemptionValue = aLp.redemptionValue;
      }
      data.paymentStatus = "pending";
      data.orderStatus = "archived";
      Order.addOrder(data, async (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          req.body.customOrderId = resdata.currentOrderId
          req.body.orderId = resdata._id
          req.body.user = user
          req.body.getStore = getStore
          req.body.getStoreType = getStoreType
          req.body.getVendor = getVendor
          next()
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  checkProcode: async (getVendor, getStoreType, user, date_created, date_created_utc) => {
    try {
      let getCoupon = await Coupon.findOne({
        code: code,
        status: "active",
        $or: [{
          type: "vendor",
          vendor: getVendor
        }, {
          type: "global",
          storeType: getStoreType
        },],
      });
      if (getCoupon) {
        if (getCoupon.maxUse) {
          let checkPomoUsedCount = await promoUse.findOneAndUpdate({
            user: user._id,
            code: getCoupon.code
          }, {
            user: user._id,
            code: getCoupon.code
          }, {
            upsert: true,
            new: true
          });
          if (checkPomoUsedCount) {
            if (checkPomoUsedCount.count < getCoupon.maxUse) {
              await promoUse.updateOne({
                user: user._id,
                code: getCoupon.code
              }, {
                $inc: {
                  count: 1
                },
                date_modified: date_created,
                date_modified_utc: date_created_utc,
              });
              return false;
            } else {
              return true;
            }
          }
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  },
  orderNotifyPingFromPaymentGateway: async (req, res) => {
    try {
      let data = req.body;
      let {
        payment_method,
        id,
        from,
        amount
      } = req.query;
      console.log("OM Notify", data);
      console.log("OM Notify query", req.query);
      if (from === "checkout" && payment_method === "orangeMoney") {
        if (data.status === "SUCCESS") {
          orderService.afterWebviewPaymentSuccess({
            id
          });
        }
      } else if (from === "wallet" && payment_method === "orangeMoney") {
        if (data.status === "SUCCESS") {
          let getData = await User.findOne({
            _id: ObjectId(id)
          }, "wallet");
          let wallet = helper.roundNumber(getData.wallet + Number(amount));
          User.updateUserProfile({
            _id: id,
            wallet: wallet
          },
            (err, resdata) => {
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
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  orderReturnPingFromPaymentGateway: async (req, res) => {
    try {
      let {
        payment_method,
        id,
        from,
        amount
      } = req.query;
      let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from + "&type=CANCELLED";
      //deliveryRequest.afetrPaymentNotify(id, "CANCELLED", from);
      res.render("webViewError", {
        title: "Payment Cancelled",
        data: "No Content Added",
        message: "Payment Cancelled",
        url: cancelurl,
      });
    } catch (error) {
      res.render("webViewError", {
        title: "Payment Cancelled",
        data: "No Content Added",
        message: "Payment Cancelled",
        url: cancelurl,
      });
    }
  },
  getOrderDetailsById: async (req, res) => {
    try {
      let id = req.params._id;
      if (!id) {
        return res.json(helper.showValidationErrorResponse("ID_REQUIRED"));
      }
      Order.getOrderById(id, async (err, resdata) => {
        if (err) {
          console.log("err--", err);
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          if (resdata == null) {
            return res.json(helper.showValidationErrorResponse("INVALID_ORDER_ID"));
          }
          if (resdata.storeType.storeType === "SERVICEPROVIDER") {
            let disfor = Config.disputefor.filter(
              (element) => element.value == "serviceProvider");
            resdata.set("disputefor", disfor, {
              strict: false
            });
          } else if (stortyp.includes(resdata.storeType.storeType)) {
            let disfor = Config.disputefor.filter(
              (element) => element.value == "driver");
            resdata.set("disputefor", disfor, {
              strict: false
            });
          } else {
            if (resdata.deliveryType == "TAKEAWAY") {
              let disfor = Config.disputefor.filter((element) => element.value == "vendor");
              resdata.set("disputefor", disfor, {
                strict: false
              });
            } else {
              let disfor = Config.disputefor.filter((element) => element.value != "serviceProvider");
              resdata.set("disputefor", disfor, {
                strict: false
              });
            }
          }
          let check_dipute = resdata.store.hideThings.filter(
            (element) => element.type == "isDispute");
          let isdispute = check_dipute.length ? check_dipute[0]["value"] : false;
          resdata.set("isdispute", isdispute, {
            strict: false
          });
          let reviews = {
            customerToVendor: null,
            customerToDriver: null,
            driverToCustomer: null,
          };
          try {
            let Rating = await Review.aggregate([{
              $match: {
                order: ObjectId(resdata._id)
              }
            }, {
              $group: {
                _id: "$order",
                reviews: {
                  $push: "$$ROOT"
                }
              }
            },]);
            if (Rating.length > 0) {
              if (Rating[0].reviews.length > 0) {
                //console.log("Rating.reviews", Rating[0].reviews);
                let getReviews = Rating[0].reviews;
                let customerToVendor = getReviews.filter((element) => {
                  return (element.reviewed_by.toString() === resdata.user._id.toString() && element.reviewed_to.toString() === (resdata.vendor && resdata.vendor._id.toString()));
                });
                //console.log("customerToVendor", customerToVendor);
                if (customerToVendor.length > 0) {
                  reviews.customerToVendor = customerToVendor[0];
                }
                if (resdata.driver) {
                  let customerToDriver = getReviews.filter((element) => {
                    return (element.reviewed_by.toString() === resdata.user._id.toString() && element.reviewed_to.toString() === resdata.driver._id.toString());
                  });
                  //console.log("customerToDriver", customerToDriver);
                  if (customerToDriver.length > 0) {
                    reviews.customerToDriver = customerToDriver[0];
                  }
                  let driverToCustomer = getReviews.filter((element) => {
                    return (element.reviewed_by.toString() === resdata.driver._id.toString() && element.reviewed_to.toString() === resdata.user._id.toString());
                  });
                  //console.log("driverToCustomer", driverToCustomer);
                  if (driverToCustomer.length > 0) {
                    reviews.driverToCustomer = driverToCustomer[0];
                  }
                }
              }
            }
            if (resdata.rideType == "pool" && ["confirmed", "inroute"].includes(resdata.orderStatus) && resdata.isDriverAssign) {
              let getCurrentPoolTrips = await module.exports.getCustomerPoolTripsBySorting(req, resdata);
              resdata.set("currentPoolTrips", getCurrentPoolTrips, {
                strict: false
              });
            }
          } catch (error) {
            console.log("err", error);
          }
          let selectedPaymentMethod = resdata.paymentMethod;
          if (!["cod", "wallet", "cardOnDelivery"].includes(resdata.paymentMethod) && resdata.paymentSourceRef && ObjectId.isValid(resdata.paymentSourceRef)) {
            const getCard = await Card.getCardByIdAsync(resdata.paymentSourceRef);
            selectedPaymentMethod = 'Card XXXXXX' + getCard.last4digit;
          }
          resdata.set("selectedPaymentMethod", selectedPaymentMethod, {
            strict: false
          });
          resdata.set("reviews", reviews, {
            strict: false
          });
          res.json(helper.showSuccessResponse("ORDER_DETAIL", resdata));
        }
      });
    } catch (error) {
      console.log("errr", error);
      res.status(500).json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  updateOrdertData: async (req, res) => {
    try {
      let data = req.body;
      if (!data.orderId) {
        return res.json(helper.showValidationErrorResponse("Order_ID_IS_REQUIRED"));
      }
      Order.updateOrder(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse("DATA_UPDATED", resdata));
        }
      });
    } catch (error) {
      return res.status(500).json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  removeOrdertData: async (req, res) => {
    try {
      let data = req.body;
      if (!data.orderId) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      Order.removeOrder(data.orderId, (err, resdata) => {
        if (err) {
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          return res.json(helper.showSuccessResponse("DELETED_SUCCESS", resdata));
        }
      });
    } catch (error) {
      return res.status(500).json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getUserUpcomingOrderList: async (req, res) => {
    try {
      const data = req.body;
      let user = req.user;
      const store = req.store;
      const storeTypes = await storeType.find({
        status: "active",
        store: store.storeId
      }, "label storeType");
      if (storeTypes.length > 0) {
        await Promise.all(storeTypes.map((stt) => {
          stt.set("isSelected", false, {
            strict: false
          });
        }));
      }
      const pageSize = data.limit || 10;
      const sortByField = data.orderBy || "date_created_utc";
      const sortOrder = data.order || -1;
      const paged = data.page || 1;
      const storeTypeId = data.storeTypeId || null;
      let obj = {};
      if (storeTypeId) {
        obj.storeType = ObjectId(storeTypeId);
      }
      obj.user = ObjectId(user._id);
      obj.orderStatus = {
        $in: ["pending", "confirmed", "packed", "inroute", "inprocess"],
      };
      let count = await Order.aggregate([{
        $match: obj
      }, {
        $group: {
          _id: null,
          count: {
            $sum: 1
          }
        }
      },]);
      let totalcount = count.length > 0 ? count[0].count : 0;
      Order.getOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          await Promise.all(resdata.map(async (element) => {
            if (element.vendorDetails && element.vendorDetails.profileImage) {
              element.vendorDetails.profileImage = await File.getFileByIdAsync(element.vendorDetails.profileImage);
            }
          }));
          let resData = helper.showSuccessResponseCount("DATA_SUCCESS", resdata, totalcount);
          resData["totaPage"] = Math.ceil(totalcount / pageSize);
          resData["storeTypes"] = storeTypes;
          res.json(resData);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getUserPastOrderList: async (req, res) => {
    try {
      const data = req.body;
      let user = req.user;
      const store = req.store;
      const storeTypes = await storeType.find({
        status: "active",
        store: store.storeId
      }, "label storeType");
      if (storeTypes.length > 0) {
        await Promise.all(storeTypes.map((stt) => {
          stt.set("isSelected", false, {
            strict: false
          });
        }));
      }
      const pageSize = data.limit || 10;
      const sortByField = data.orderBy || "date_created_utc";
      const sortOrder = data.order || -1;
      const paged = data.page || 1;
      const storeTypeId = data.storeTypeId || null;
      let obj = {};
      obj.user = ObjectId(user._id);
      if (storeTypeId) {
        obj.storeType = ObjectId(storeTypeId);
      }
      obj.orderStatus = {
        $in: ["completed", "cancelled", "rejected"]
      };
      let count = await Order.aggregate([{
        $match: obj
      }, {
        $group: {
          _id: null,
          count: {
            $sum: 1
          }
        }
      },]);
      let totalcount = count.length > 0 ? count[0].count : 0;
      Order.getOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          await Promise.all(resdata.map(async (element) => {
            if (element.vendorDetails) {
              if (element.vendorDetails.profileImage) {
                element.vendorDetails.profileImage = await File.getFileByIdAsync(element.vendorDetails.profileImage);
              }
            }
          }));
          let resData = helper.showSuccessResponseCount("DATA_SUCCESS", resdata, totalcount);
          resData["totaPage"] = Math.ceil(totalcount / pageSize);
          resData["storeTypes"] = storeTypes;
          res.json(resData);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getDriverUpcomingOrderList: async (req, res) => {
    try {
      const data = req.body;
      let user = req.user;
      const store = req.store;
      const storeTypes = await storeType.find({
        status: "active",
        store: store.storeId
      }, "label storeType");
      if (storeTypes.length > 0) {
        await Promise.all(storeTypes.map((stt) => {
          stt.set("isSelected", false, {
            strict: false
          });
        }));
      }
      const pageSize = data.limit || 10;
      const sortByField = data.orderBy || "date_created_utc";
      const sortOrder = data.order || -1;
      const paged = data.page || 1;
      const storeTypeId = data.storeTypeId || null;
      let obj = {};
      if (storeTypeId) {
        obj.storeType = ObjectId(storeTypeId);
      }
      obj.driver = ObjectId(user._id);
      obj.orderStatus = {
        $in: ["pending", "confirmed", "packed", "inroute", "inprocess"],
      };
      let count = await Order.aggregate([{
        $match: obj
      }, {
        $group: {
          _id: null,
          count: {
            $sum: 1
          }
        }
      },]);
      let totalcount = count.length > 0 ? count[0].count : 0;
      Order.getOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          await Promise.all(resdata.map(async (element) => {
            if (element.vendorDetails && element.vendorDetails.profileImage) {
              element.vendorDetails.profileImage = await File.getFileByIdAsync(element.vendorDetails.profileImage);
            }
          }));
          let resData = helper.showSuccessResponseCount("DATA_SUCCESS", resdata, totalcount);
          resData["totaPage"] = Math.ceil(totalcount / pageSize);
          resData["storeTypes"] = storeTypes;
          res.json(resData);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getDriverPastOrderList: async (req, res) => {
    try {
      const data = req.body;
      let user = req.user;
      const store = req.store;
      const storeTypes = await storeType.find({
        status: "active",
        store: store.storeId
      }, "label storeType");
      if (storeTypes.length > 0) {
        await Promise.all(storeTypes.map((stt) => {
          stt.set("isSelected", false, {
            strict: false
          });
        }));
      }
      const pageSize = data.limit || 10;
      const sortByField = data.orderBy || "date_created_utc";
      const sortOrder = data.order || -1;
      const paged = data.page || 1;
      const storeTypeId = data.storeTypeId || null;
      let obj = {};
      obj.driver = ObjectId(user._id);
      if (storeTypeId) {
        obj.storeType = ObjectId(storeTypeId);
      }
      obj.orderStatus = {
        $in: ["completed", "cancelled", "rejected"]
      };
      let count = await Order.aggregate([{
        $match: obj
      }, {
        $group: {
          _id: null,
          count: {
            $sum: 1
          }
        }
      },]);
      let totalcount = count.length > 0 ? count[0].count : 0;
      Order.getOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          await Promise.all(resdata.map(async (element) => {
            if (element.vendorDetails) {
              if (element.vendorDetails.profileImage) {
                element.vendorDetails.profileImage = await File.getFileByIdAsync(element.vendorDetails.profileImage);
              }
            }
          }));
          let resData = helper.showSuccessResponseCount("DATA_SUCCESS", resdata, totalcount);
          resData["totaPage"] = Math.ceil(totalcount / pageSize);
          resData["storeTypes"] = storeTypes;
          res.json(resData);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  acceptRequestByRestaurant: async (req, res) => {
    try {
      let data = req.body;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsyncForRes(data._id);
      if (getOrder === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_ORDER_ID"));
      }
      if (getOrder.orderStatus === "cancelled") {
        return res.json(helper.showValidationErrorResponse("ORDER_CANCELLED"));
      }
      data.orderStatus = "confirmed";
      data.isScheduleProcess = getOrder.scheduledType === "now" ? true : false;
      data.date_vendor_confirmed_utc = new Date();
      let nearByTempDrivers = [];
      data.nearByTempDrivers = [];
      data.isDriverFound = "no";
      if (getOrder.deliveryType == "DELIVERY" && getOrder.scheduledType === "now") {
        let radius = getOrder.storeType.deliveryAreaDriver ? getOrder.storeType.deliveryAreaDriver : 20;
        let unit = getOrder.store.distanceUnit ? getOrder.store.distanceUnit : "km";
        radius = deliveryRequest.getDeliveryArea(radius, unit);
        let vehicleTypeQuery = {};
        let query = {
          store: ObjectId(getOrder.store._id),
          onlineStatus: "online",
          status: "approved",
          role: "DRIVER",
        };
        if (getOrder.store.codWalletLimit) {
          if (getOrder.paymentMethod === "cod") {
            query["wallet"] = {
              $exists: true,
              $gt: getOrder.storeType.codWalletLimit,
            };
          }
        }
        if (
          ["GROCERY"].includes(getOrder.storeType.storeType) && getOrder.totalWeight) {
          vehicleTypeQuery = {
            "vehicleType.weight": {
              $exists: true
            },
            "vehicleType.weight.minWeight": {
              $lte: getOrder.totalWeight
            },
            "vehicleType.weight.maxWeight": {
              $gte: getOrder.totalWeight
            },
          };
        }
        let limit = getOrder.storeType.noOfDriversPerRequest ? getOrder.storeType.noOfDriversPerRequest : 5;
        let results = await deliveryRequest.getNearByUsers(getOrder.vendor.userLocation, radius, query, limit, vehicleTypeQuery);
        if (results.length > 0) {
          results.forEach((element) => {
            nearByTempDrivers.push(element._id);
          });
          data.nearByTempDrivers = nearByTempDrivers;
          data.isDriverFound = "yes";
        }
      }
      Order.updateOrderVendor(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let orderResponseData = {
            orderId: resdata._id,
            success: true,
            type: resdata.orderStatus,
          };
          res.json(helper.showSuccessResponse("UPDATE_SUCCESS", orderResponseData));
          deliveryRequest.afterAcceptRequest(resdata);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  rejectRequest: async (req, res) => {
    try {
      let data = req.body;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_ORDER_ID"));
      }
      await module.exports.checkorderstatus(getOrder);
      data.orderStatus = "rejected";
      data.date_vendor_rejected_utc = new Date();
      data.adminEarning = 0;
      data.vendorEarning = 0;
      data.deliveryBoyEarning = 0;
      Order.updateOrderVendor(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let orderResponseData = {
            orderId: resdata._id,
          };
          res.json(helper.showSuccessResponse("UPDATE_SUCCESS", orderResponseData));
          deliveryRequest.afterRejectRequest(resdata);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  markOrderReadyByRestaurant: async (req, res) => {
    try {
      let data = req.body;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsyncForRes(data._id);
      if (getOrder === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_ORDER_ID"));
      }
      data.isOrderMarkReady = true;
      data.date_vendor_ready_utc = new Date();
      Order.updateOrderVendor(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let orderResponseData = {
            orderId: resdata._id,
            success: true,
            type: resdata.orderStatus,
          };
          res.json(helper.showSuccessResponse("UPDATE_SUCCESS", orderResponseData));
          deliveryRequest.afterMarkReady(resdata);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  inProcessOrderByRestaurant: async (req, res) => {
    try {
      let data = req.body;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsyncForRes(data._id);
      if (getOrder === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_ORDER_ID"));
      }
      data.isScheduleProcess = true;
      let nearByTempDrivers = [];
      data.nearByTempDrivers = [];
      data.isDriverFound = "no";
      if (getOrder.deliveryType == "DELIVERY") {
        let radius = getOrder.storeType.deliveryAreaDriver ? getOrder.storeType.deliveryAreaDriver : 20;
        let unit = getOrder.store.distanceUnit ? getOrder.store.distanceUnit : "km";
        radius = deliveryRequest.getDeliveryArea(radius, unit);
        let query = {
          store: ObjectId(getOrder.store._id),
          onlineStatus: "online",
          status: "approved",
          role: "DRIVER",
        };
        if (getOrder.store.codWalletLimit) {
          if (getOrder.paymentMethod === "cod") {
            query["wallet"] = {
              $exists: true,
              $gt: getOrder.storeType.codWalletLimit,
            };
          }
        }
        let limit = getOrder.storeType.noOfDriversPerRequest ? getOrder.storeType.noOfDriversPerRequest : 5;
        let results = await deliveryRequest.getNearByUsers(getOrder.vendor.userLocation, radius, query, limit);
        if (results.length > 0) {
          results.forEach((element) => {
            nearByTempDrivers.push(element._id);
          });
          data.nearByTempDrivers = nearByTempDrivers;
          data.isDriverFound = "yes";
        }
      }
      Order.updateOrderVendor(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let orderResponseData = {
            orderId: resdata._id,
            success: true,
            type: resdata.orderStatus,
          };
          res.json(helper.showSuccessResponse("UPDATE_SUCCESS", orderResponseData));
          deliveryRequest.afterScheduleProcess(resdata);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  completeOrderByVendor: async (req, res) => {
    try {
      let data = req.body;
      console.log("data--------", data)
      let user = req.user;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder == null) {
        return res.json(helper.showValidationErrorResponse("NOT_A_VALID_ORDER"));
      }
      data.orderStatus = "completed";
      data.date_driver_delivered_utc = new Date();
      Order.updateOrderDriver(data, async (err, resdata) => {
        if (err) {
          console.log("err--------", err)
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let orderResponseData = {
            success: true,
            driverStatus: "online",
            orderId: resdata._id,
            type: resdata.orderStatus,
          };
          if (!["CARRENTAL", "AIRBNB", "SERVICEPROVIDER"].includes(resdata.storeType.storeType)) {
            if (resdata.deliveryType !== "TAKEAWAY") {
              orderResponseData.driverLocation = resdata.driver.userLocation;
            }
          }
          res.json(helper.showSuccessResponse("ORDER_DELIVERED_SUCCESS", orderResponseData));
          Transaction.afterOrderCompletion(resdata);
          deliveryRequest.afterVendorDeliveredRequest(resdata);
          emailService.userOrderDeliveredEmail(resdata);
        }
      });
    } catch (error) {
      console.log(error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  acceptRequestByDriver: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user;
      data.driver = user._id;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_ORDER_ID"));
      }
      data.date_driver_confirmed_utc = new Date();
      data.isDriverAssign = true;
      let updateStatus = await User.findOneAndUpdate({
        _id: ObjectId(data.driver)
      }, {
        onlineStatus: "pickupInroute"
      }, {
        new: true
      });
      Order.updateOrderDriver(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let orderResponseData = {
            success: true,
            driverStatus: resdata.orderStatus,
            orderStatus: resdata.orderStatus,
            orderId: resdata._id,
            type: resdata.orderStatus,
            driverLocation: resdata.driver.userLocation,
          };
          res.json(helper.showSuccessResponse("UPDATE_SUCCESS", orderResponseData));
          deliveryRequest.afterDriverAcceptRequest(resdata);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  assignDriverFromBirdEyeView: async (req, res) => {
    try {
      let data = req.body;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_ORDER_ID"));
      }
      if (!["TAXI", "PICKUPDROP", "SERVICEPROVIDER", "CARRENTAL", "AIRBNB",].includes(getOrder.storeType.storeType)) {
        if (getOrder.orderStatus != "confirmed") {
          return res.json(helper.showValidationErrorResponse("YOU_CAN_ONLY_ASSIGN_CONFIRM_ORDER"));
        }
      }
      if (getOrder.isDriverAssign == true) {
        return res.json(helper.showValidationErrorResponse("ALREADY_ASSIGNED_DRIVER"));
      }
      if (!data.driverId) {
        return res.json(helper.showValidationErrorResponse("DRIVER_ID_IS_REQUIRED"));
      }
      let getUser = await User.findById(data.driverId, "onlineStatus");
      if (getUser === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_DRIVER_ID"));
      }
      if (getUser.onlineStatus === "pickupInroute" || getUser.onlineStatus === "pickupArrived" || getUser.onlineStatus === "destinationInroute") {
        return res.json(helper.showValidationErrorResponse("DRIVER_IS_BUSY"));
      }
      if (getUser.onlineStatus === "offline") {
        return res.json(helper.showValidationErrorResponse("DRIVER_IS_OFFLINE"));
      }
      // data.date_driver_confirmed_utc = new Date();
      // data.isDriverAssign = true;
      // data.driver = data.driverId
      // let updateStatus = await User.findOneAndUpdate({ _id: ObjectId(data.driverId) }, { currentOrderId: getOrder._id, onlineStatus: "pickupInroute" }, { "new": true });
      data.nearByTempDrivers = [data.driverId];
      Order.updateOrderVendor(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse("UPDATE_SUCCESS", resdata));
          deliveryRequest.afterBirdEyeViewOrderAssign(resdata);
        }
      });
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  rejectRequestByDriver: async (req, res) => {
    try {
      let data = req.body;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder === null) {
        return res.json(helper.showValidationErrorResponse("INVALID_ORDER_ID"));
      }
      res.json(helper.showSuccessResponse("UPDATE_SUCCESS", data));
    } catch (error) {
      console.log(">>>>>>>>>>>>>", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  driverArrivedAtVendor: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user;
      data.driver = user._id;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder == null) {
        return res.json(helper.showValidationErrorResponse("NOT_A_VALID_ORDER"));
      }
      data.date_driver_arrived_utc = new Date();
      data.isDriverArrivedAtPickup = true;
      let updateStatus = await User.findOneAndUpdate({
        _id: ObjectId(data.driver)
      }, {
        onlineStatus: "pickupArrived"
      }, {
        new: true
      });
      Order.updateOrderDriver(data, async (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let orderResponseData = {
            success: true,
            driverStatus: resdata.orderStatus,
            orderStatus: resdata.orderStatus,
            orderId: resdata._id,
            type: resdata.orderStatus,
            driverLocation: resdata.driver.userLocation,
          };
          res.json(helper.showSuccessResponse("ORDER_ARRIVED_SUCCESS", orderResponseData));
          deliveryRequest.afterDriverArrivedRequest(resdata);
        }
      });
    } catch (error) {
      console.log(error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  pickupOrderByDriver: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user;
      data.driver = user._id;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder == null) {
        return res.json(helper.showValidationErrorResponse("NOT_A_VALID_ORDER"));
      }
      data.orderStatus = "inroute";
      data.date_driver_picked_utc = new Date();
      let updateStatus = await User.findOneAndUpdate({
        _id: ObjectId(data.driver)
      }, {
        onlineStatus: "destinationInroute"
      }, {
        new: true
      });
      Order.updateOrderDriver(data, async (err, resdata) => {
        if (err) {
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let orderResponseData = {
            success: true,
            driverStatus: resdata.orderStatus,
            orderStatus: resdata.orderStatus,
            orderId: resdata._id,
            type: resdata.orderStatus,
            driverLocation: resdata.driver.userLocation,
          };
          res.json(helper.showSuccessResponse("ORDER_PICKED_SUCCESS", orderResponseData));
          deliveryRequest.afterDriverPickedRequest(resdata);
        }
      });
    } catch (error) {
      console.log(error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  deliveredOrderByDriver: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user;
      data.driver = user._id;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder == null) {
        return res.json(helper.showValidationErrorResponse("NOT_A_VALID_ORDER"));
      }
      data.orderStatus = "completed";
      data.date_driver_delivered_utc = new Date();
      let updateStatus = await User.findOneAndUpdate({
        _id: ObjectId(data.driver)
      }, {
        onlineStatus: "online"
      }, {
        new: true
      });
      if (user.commisionType && user.commisionType === "override") {
        let getDeliveryBoyOverrideEarning = Pricing.calculateDeliveryBoyOverrideEarning(getOrder.deliveryFee, getOrder.deliveryBoyEarning, getOrder.adminDeliveryBoyEarning, getOrder.adminEarning, user.commission);
        data = {
          ...data,
          ...getDeliveryBoyOverrideEarning
        };
      }
      Order.updateOrderDriver(data, async (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let orderResponseData = {
            success: true,
            driverStatus: "online",
            orderId: resdata._id,
            type: resdata.orderStatus,
            driverLocation: resdata.driver.userLocation,
          };
          res.json(helper.showSuccessResponse("ORDER_DELIVERED_SUCCESS", orderResponseData));
          Transaction.afterOrderCompletion(resdata);
          emailService.userOrderDeliveredEmail(getOrder);
          deliveryRequest.afterDriverDeliveredRequest(resdata);
        }
      });
    } catch (error) {
      console.log(error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  deliveredOrderByDriverEmailcheck: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user;
      // data.driver = user._id;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder == null) {
        return res.json(helper.showValidationErrorResponse("NOT_A_VALID_ORDER"));
      } else {
        res.json(helper.showSuccessResponse("ORDER_DELIVERED_SUCCESS", getOrder));
        emailService.userOrderDeliveredEmail(getOrder);
      }
    } catch (error) {
      console.log(error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getDriverOrderDetails: async (req, res) => {
    try {
      let id = req.params._id;
      let user = req.user;
      if (!id) {
        return res.json(helper.showValidationErrorResponse("ID_REQUIRED"));
      }
      Order.getOrderByIdForDriver(id, (err, resdata) => {
        if (err) {
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          return res.json(helper.showSuccessResponse("ORDER_DETAIL", resdata));
        }
      });
    } catch (error) {
      console.log(error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getRequest: async (req, res) => {
    try {
      let userId = req.params.driverId;
      let user = await User.findById(userId).populate({
        path: "store",
        select: "themeSettings"
      }).exec();
      let data = {};
      let themeSettings = {
        primaryColor: user.store.themeSettings.primaryColor,
        secondaryColor: user.store.themeSettings.secondaryColor,
      };
      if (user.onlineStatus === "pickupInroute" || user.onlineStatus === "pickupArrived" || user.onlineStatus === "destinationInroute") {
        //console.log("getDriverCurrentOrder", getDriverCurrentOrder);
        if (user.currentOrderId) {
          let getOrder = await Order.findById(user.currentOrderId);
          if (getOrder != null) {
            if (!["completed", "archived", "cancelled", "rejected"].includes(getOrder.orderStatus)) {
              let updateOrder = await Order.findOne({
                _id: ObjectId(user.currentOrderId),
              }).populate({
                path: "user",
                select: "name fireBaseToken"
              }).populate({
                path: "vendor",
                select: "name fireBaseToken address userLocation",
              }).populate({
                path: "driver",
                select: "name fireBaseToken userLocation",
              }).exec();
              let type = "";
              if (user.onlineStatus === "pickupInroute") {
                type = "orderAcceptedByDriver";
              } else if (user.onlineStatus === "pickupArrived") {
                type = "orderArrivedAtRestaurant";
              } else if (user.onlineStatus === "destinationInroute") {
                type = "orderPickedByDriver";
              }
              let driverOrderResponseData = {
                orderId: updateOrder._id,
                orderStatus: updateOrder.orderStatus,
                isDriverAssign: updateOrder.isDriverAssign,
                isDriverArrivedAtPickup: updateOrder.isDriverArrivedAtPickup,
                isOrderMarkReady: updateOrder.isOrderMarkReady,
                type: type,
              };
              data = driverOrderResponseData;
            } else {
              let updateStatus = await User.findOneAndUpdate({
                _id: ObjectId(userId)
              }, {
                onlineStatus: "online"
              }, {
                new: true
              });
            }
          } else {
            let updateStatus = await User.findOneAndUpdate({
              _id: ObjectId(userId)
            }, {
              onlineStatus: "online"
            }, {
              new: true
            });
          }
        } else {
          let updateStatus = await User.findOneAndUpdate({
            _id: ObjectId(userId)
          }, {
            onlineStatus: "online"
          }, {
            new: true
          });
        }
      }
      res.render("driverRequest", {
        title: "",
        data: "New Request",
        userId: userId,
        onlineStatus: user.onlineStatus,
        drivers: data,
        themeSettings: themeSettings,
        socketUrl: env.socketUrl,
      });
    } catch (error) {
      let data = {};
      console.log("errr", error);
      res.render("driverRequest", {
        title: "",
        data: "No Content Added",
        drivers: data,
        themeSettings: {},
        socketUrl: env.socketUrl,
      });
    }
  },
  driverTrack: async (req, res) => {
    try {
      let userId = req.params.driverId;
      let user = await User.getUserByIdAsync(userId);
      res.render("driverTrack", {
        title: "",
        data: "No Content Added",
        userId: userId,
        onlineStatus: user.onlineStatus,
        socketUrl: env.socketUrl,
      });
    } catch (error) {
      res.render("driverTrack", {
        title: "",
        data: "No Content Added"
      });
    }
  },
  customerTrack: async (req, res) => {
    try {
      let userId = req.params.userId;
      let user = await User.getUserByIdAsync(userId);
      res.render("customerTrack", {
        title: "",
        data: "No Content Added",
        userId: userId,
        onlineStatus: user.onlineStatus,
        socketUrl: env.socketUrl,
      });
    } catch (error) {
      res.render("customerTrack", {
        title: "",
        data: "No Content Added"
      });
    }
  },
  webViewPaymentForWebsiteAndApp: async (req, res) => {
    try {
      let title = "";
      let message = "";
      let chargeData = {};
      let data = {};
      let {
        payment_method,
        from,
        id,
        amount
      } = req.query;
      title = "Process Payment";
      message = "";
      let getData = null;
      let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from;
      if (from === "checkout") {
        getData = await Order.findOne({
          customOrderId: id
        }, "store user customOrderId orderTotal deliveryType billingDetails").populate({
          path: "user",
          select: "name email mobileNumber"
        }).exec();
        data.name = getData.user.name;
        data.email = getData.user.email;
        data.mobileNumber = getData.user.countryCode + getData.user.mobileNumber;
        data.address = getData.deliveryType && getData.deliveryType === "DELIVERY" ? getData.billingDetails.address : null;
        data.amount = getData.orderTotal;
        data.customOrderId = id;
      } else if (from === "wallet") {
        getData = await User.findOne({
          _id: ObjectId(id)
        }, "store name email mobileNumber address");
        data.name = getData.name;
        data.email = getData.email;
        data.mobileNumber = getData.countryCode + getData.mobileNumber;
        data.address = getData.address ? getData.address : "";
        data.amount = amount ? amount : 0;
        data.customOrderId = Date.now();
      }
      if (!getData) {
        cancelurl += "&type=FAILED";
        return res.render("webViewError", {
          title: title,
          data: "User detail not found",
          message: "Invalid Data",
          url: cancelurl,
        });
      }
      if (!data.amount) {
        cancelurl += "&type=FAILED";
        return res.render("webViewError", {
          title: title,
          data: "Params not  found",
          message: "Amount is required",
          url: cancelurl,
        });
      }
      data.storeId = getData.store;
      let getStore = await settingService.chekStoreSetting(data.storeId, payment_method);
      if (!getStore) {
        cancelurl += "&type=FAILED";
        return res.render("webViewError", {
          title: title,
          data: "Store detail not found",
          message: "Store detail not found",
          url: cancelurl,
        });
      }
      data.storeName = getStore.storeName;
      data.paymentMode = getStore.paymentMode;
      data.currency = getStore.currency.code;
      data.logo = getStore.logo ? getStore.logo.link : "";
      data.theme = getStore.theme;
      if (payment_method === "razorpay") {
        data.callback_url = env.apiUrl + "order/webview/callback?id=" + id + "&payment_method=" + payment_method.toLowerCase() + "&from=" + from + "&amount=" + data.amount;
        if (getStore.paymentMode === "sandbox") {
          data.secretKey = getStore.paymentSettings.sandboxKey_secret;
          data.Key_id = getStore.paymentSettings.sandboxKey_id;
        } else {
          data.secretKey = getStore.paymentSettings.liveKey_secret;
          data.Key_id = getStore.paymentSettings.liveKey_id;
        }
        chargeData = {
          callback_url: data.callback_url,
          return_url: env.apiUrl + "order/return?id=" + id + "&from=" + from + "&payment_method=" + payment_method + "&amount=" + data.amount,
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
          C_address: data.address,
        };
        paymentMiddleware.razorPayCreateOrder(chargeData, (response) => {
          if (!response.status) {
            cancelurl += "&type=FAILED";
            return res.render("webViewError", {
              title: title,
              data: "No Content Added",
              message: response.message,
              url: cancelurl,
            });
          } else {
            res.render("razorPayIndex", {
              title: title,
              data: "No Content Added",
              message: "",
              razorpay_response: response.data,
              chargeData,
            });
          }
        });
      } else if (payment_method === "orangeMoney") {
        if (getStore.paymentSettings.consumerKey == null || getStore.paymentSettings.merchantKey == null) {
          return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
        }
        const OMData = {
          consumerKey: getStore.paymentSettings.consumerKey,
        };
        paymentMiddleware.authByorangeMoney(OMData, (response) => {
          if (!response.status) {
            cancelurl += "&type=FAILED";
            res.render("webViewError", {
              title: title,
              data: "No Content Added",
              message: response.response.error_description,
              url: cancelurl,
            });
          } else {
            console.log("response2", response);
            data.access_token = response.response.access_token;
            data.merchantKey = getStore.paymentSettings.merchantKey;
            data.return_url = env.apiUrl + "order/return?id=" + id + "&from=" + from + "&payment_method=" + payment_method + "&amount=" + data.amount;
            data.notif_url = env.apiUrl + "order/notify?id=" + id + "&from=" + from + "&payment_method=" + payment_method + "&amount=" + data.amount;
            paymentMiddleware.paymentByorangeMoney(data, (response) => {
              if (!response.status) {
                cancelurl += "&type=FAILED";
                res.render("webViewError", {
                  title: title,
                  data: "No Content Added",
                  message: response.response.message,
                  url: cancelurl,
                });
              } else {
                console.log("response3", response);
                res.redirect(response.response.payment_url);
              }
            });
          }
        });
      } else {
        cancelurl += "&type=FAILED";
        res.render("webViewError", {
          title: "Wrong Payment method",
          data: "No Content Added",
          message: "Internal server error",
          url: cancelurl,
        });
      }
    } catch (error) {
      console.log("err", error);
      cancelurl += "&type=FAILED";
      res.render("webViewError", {
        title: "Internal server error",
        data: "No Content Added",
        message: "Internal server error",
        url: cancelurl,
      });
    }
  },
  webViewCallbackForWebsiteAndApp: async (req, res) => {
    try {
      let data = req.body;
      let {
        payment_method,
        from,
        id,
        amount
      } = req.query;
      console.log("req.query", req.query);
      console.log("data", data);
      let getData = null;
      let cancelurl = env.apiUrl + "card/pagecancel?id=" + id + "&from=" + from;
      if (from === "checkout") {
        getData = await Order.findOne({
          customOrderId: id
        }, "store orderTotal scheduledType");
        data.amount = getData.orderTotal;
        data.scheduledType = getData.scheduledType;
      } else if (from === "wallet") {
        getData = await User.findOne({
          _id: ObjectId(id)
        }, "store wallet");
        data.amount = amount ? amount : 0;
        data.wallet = getData.wallet;
        data.scheduledType = "";
      }
      data.storeId = getData.store;
      let getStore = await settingService.chekStoreSetting(data.storeId, payment_method);
      data.storeName = getStore.storeName;
      data.paymentMode = getStore.paymentMode;
      if (data.paymentMode === "sandbox") {
        data.secretKey = getStore.paymentSettings.sandboxKey_secret;
        data.Key_id = getStore.paymentSettings.sandboxKey_id;
      } else {
        data.secretKey = getStore.paymentSettings.liveKey_secret;
        data.Key_id = getStore.paymentSettings.liveKey_id;
      }
      if (!data.razorpay_payment_id) {
        cancelurl += "&type=FAILED";
        return res.render("webViewError", {
          title: "Payment Failed",
          data: "No Content Added",
          message: "Payment Failed",
          url: cancelurl,
        });
      }
      let chargeData = {
        amount: data.amount,
        payment_id: data.razorpay_payment_id,
        KEY_SECRET: data.secretKey,
        KEY_ID: data.Key_id,
      };
      paymentMiddleware.razorPayCapture(chargeData, async (response) => {
        if (!response.status) {
          deliveryRequest.afetrPaymentNotify(id, "FAILED", from);
        } else {
          if (from === "checkout") {
            orderService.afterWebviewPaymentSuccess({
              id,
              transactionDetails: response.data,
            });
          }
          deliveryRequest.afetrPaymentNotify(id, "SUCCESS", from);
          if (from === "wallet") {
            let wallet = helper.roundNumber(Number(data.amount) + data.wallet);
            User.updateUserProfile({
              _id: id,
              wallet: wallet
            },
              (err, resdata) => {
                if (err) {
                  console.log("wallet rp err", err);
                } else {
                  console.log("wallet rp success", data.amount);
                }
              });
          }
        }
      });
      res.render("webViewSuccess", {
        title: "Payment Successful",
        msg: "Payment Successful",
        data: "No Content Added",
        message: "Thank you",
        from: from,
        id: getData._id,
        scheduledType: data.scheduledType,
        screen: "",
        paymentStatus: "",
        payment_method: "razorpay",
      });
    } catch (error) {
      console.log("err", error);
      cancelurl += "&type=FAILED";
      res.render("webViewError", {
        title: "Internal server error",
        data: "No Content Added",
        message: "Internal server error",
        url: cancelurl,
      });
    }
  },
  deliveryFeeQuote: async (req, res) => {
    try {
      let data = req.body;
      deliveryApi.postmatesDeliveryFeeQuote(data, (response) => {
        if (!response.status) {
          res.json(helper.showApiErrorResponse(response.message, response.code));
        } else {
          res.json(helper.showSuccessResponse("DATA_SUCCESS", response.response));
        }
      });
    } catch (error) {
      console.log("deliveryFeeQuote err", error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  updateOrder: async (req, res) => {
    try {
      let data = req.body;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ID_REQUIRED"));
      }
      if (!data.orderStatus) {
        return res.json(helper.showValidationErrorResponse("ORDER_STATUS_REQUIRED"));
      }
      let getOrder = await Order.findById(data._id);
      if (getOrder == null) {
        return res.json(helper.showValidationErrorResponse("INVALID_ORDER"));
      }
      if (data.orderStatus === "confirmed") {
        data.isScheduleProcess = true;
      }
      Order.updateOrder(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse("DATA_UPDATED", resdata));
          if (resdata.orderStatus === "cancelled" || resdata.orderStatus === "rejected") {
            module.exports.orderStatusMiddleWare(resdata);
            orderService.manageProductStock(resdata.line_items, true);
          }
        }
      });
    } catch (error) {
      res.status(500).json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  orderStatusMiddleWare: async (data) => {
    try {
      console.log("is working-: 1");
      switch (data.orderStatus) {
        case "cancelled":
          deliveryRequest.afterOrderCancelled(data);
          break;
        case "rejected":
          deliveryRequest.afterRejectRequest(data);
          break;
        default:
          break;
      }
    } catch (error) {
      console.log("orderStatusMiddleWare err", error);
    }
  },
  orderStatusMiddleWareV2: async (data, isAutoCancel) => {
    try {
      switch (data.orderStatus) {
        case "cancelled":
          if (isAutoCancel)
            deliveryRequest.afterAutoOrderCancelled(data);
          else
            deliveryRequest.afterOrderCancelledNew(data);
          break;
        case "rejected":
          deliveryRequest.afterRejectRequest(data);
          break;
        default:
          break;
      }
    } catch (error) {
      console.log("orderStatusMiddleWare err", error);
    }
  },
  cancelOrderByCustomerMiddleware: async (req, res) => {
    try {
      let store = req.store;
      if (store.storeVersion > 1) {
        module.exports.cancelOrderByCustomerV2(req, res);
      } else {
        module.exports.cancelOrderByCustomer(req, res);
      }
    } catch (error) {
      console.log(error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  refundamountTouser: async function (refundAmount, getOrder) {
    const data = {};
    data.storeId = getOrder.storeType.store;
    const getStoreType = await Store.getStorePaymentSettingAsync(data.storeId);
    const getGatewaySetting = getStoreType.paymentSettings.filter((payment) => {
      return payment.payment_method === getOrder.paymentMethod;
    });
    if (getOrder.paymentMethod === "stripe") {
      if (getStoreType.paymentMode === "sandbox") {
        data.secretKey = getGatewaySetting[0].sandboxSecretKey;
      } else {
        data.secretKey = getGatewaySetting[0].liveSecretKey;
      }
      if (!data.secretKey) {
        return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
      }
      let chargeData = {
        secretKey: data.secretKey,
        chargeId: getOrder.transactionDetails.id,
        amount: refundAmount,
      };
      paymentMiddleware.processStripeRefund(chargeData, (response) => {
        if (response.status) {
          console.log("Stripe Refund Successfull ress!");
        } else {
          console.log("Stripe Error In Refund!");
        }
      });
    } else if (getOrder.paymentMethod === "paystack") {
      if (getStoreType.paymentMode === "sandbox") {
        data.secretKey = getGatewaySetting[0].sandboxSecretKey;
      } else {
        data.secretKey = getGatewaySetting[0].liveSecretKey;
      }
      let refundObj = {
        chargeId: getOrder.transactionDetails.id,
        secretKey: data.secretKey,
        cost: refundAmount,
        currency: getOrder.transactionDetails.currency,
      };
      paymentMiddleware.refundAmountByPaystack(refundObj, (response) => {
        if (response.status) {
          console.log(response.message);
        } else {
          console.log("Error In Refund!");
          console.log(response.message);
        }
      });
    } else if (getOrder.paymentMethod === "square") {
      if (getStoreType.paymentMode === "sandbox") {
        data.secretKey = getGatewaySetting[0].sandboxSecretKey;
      } else {
        data.secretKey = getGatewaySetting[0].liveSecretKey;
      }
      let chargeData = {
        secretKey: data.secretKey,
        paymentId: getOrder.transactionDetails.id,
        amount: refundAmount,
      };
      paymentMiddleware.refundAmountBySquare(chargeData, async (presponse) => {
        if (presponse.status) {
          console.log("square Refund Successfull ress!");
        } else {
          console.log("square Error In Refund!");
        }
      });
    } else if (getOrder.paymentMethod === "razorpay") {
      if (getStoreType.paymentMode === "sandbox") {
        data.secretKey = getGatewaySetting[0].sandboxKey_secret;
        data.Key_id = getGatewaySetting[0].sandboxKey_id;
      } else {
        data.secretKey = getGatewaySetting[0].liveKey_secret;
        data.Key_id = getGatewaySetting[0].liveKey_id;
      }
      if (data.secretKey && data.Key_id) {
        return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
      }
      let refundData = {
        payment_id: getOrder.transactionDetails.id,
        amount: refundAmount,
        KEY_SECRET: data.secretKey,
        KEY_ID: data.Key_id,
      };
      paymentMiddleware.razorPayrefundPayment(refundData, async (presponse) => {
        if (presponse.status) {
          console.log("razorpay Refund Successfull ress!");
        } else {
          console.log("razorpay Error In Refund!");
        }
      });
    } else if (getOrder.paymentMethod === "braintree") {
      if (getStoreType.paymentMode === "sandbox") {
        data.merchantId = getGatewaySetting[0].merchantId;
        data.publicKey = getGatewaySetting[0].publicKey;
        data.privateKey = getGatewaySetting[0].privateKey;
      } else {
        data.merchantId = getGatewaySetting[0].liveKey_merchantId;
        data.publicKey = getGatewaySetting[0].liveKey_publicKey;
        data.privateKey = getGatewaySetting[0].liveKey_privateKey;
      }
      if (data.merchantId && data.publicKey && data.privateKey) {
        return res.json(helper.showValidationErrorResponse("SETUP_PAYMENT_SETTING_FIRST"));
      }
      let refundData = {
        transactionId: getOrder.transactionDetails.id,
        merchantId: data.merchantId,
        publicKey: data.publicKey,
        privateKey: data.privateKey,
      };
      paymentMiddleware.processRefundByBraintree(refundData, async (presponse) => {
        if (presponse.status) {
          console.log("Braintree Refund Successfull ress!");
        } else {
          console.log("Braintree Error In Refund!");
        }
      });
    } else if (getOrder.paymentMethod === "flutterwave") {
      if (getStoreType.paymentMode === "sandbox") {
        data.secretKey = getGatewaySetting[0].sandboxSecretKey;
        data.pubKey = getGatewaySetting[0].sandboxPublishabelKey;
      } else {
        data.secretKey = getGatewaySetting[0].liveSecretKey;
        data.pubKey = getGatewaySetting[0].livePublishabelKey;
      }
      let refundObj = {
        secretKey: data.secretKey,
        pubKey: data.pubKey,
        transactionId: getOrder.transactionDetails.id,
        cost: refundAmount,
      };
      if (data.secretKey && data.pubKey) {
        paymentMiddleware.refundAmountByFlutterwave(refundObj, async (response2) => {
          console.log("response2:===>", response2);
          if (!response2.status) {
            console.log("In flutterwave refund-- erorr customer cancle");
            await helper.createSchedule("flutterwave refund", getOrder._id);
          } else {
            console.log("In flutterwave refund-- success customer cancle");
          }
        });
      }
    } else if (getOrder.paymentMethod === "wallet") {
      body = "Your refund amount added in your wallet";
      let wallet = helper.roundNumber(getOrder.user.wallet + refundAmount);
      User.updateUserProfile({
        _id: getOrder.user._id,
        wallet: wallet
      },
        (err, resdata) => {
          if (err) {
            console.log("Wallet Error In Refund!");
          } else {
            Transaction.userTransaction(getOrder, getOrder.user, {
              storeId: getOrder.store._id
            }, refundAmount, wallet, true);
            console.log("Wallet Refund Successfull!");
          }
        });
    }
  },
  checkorderstatus: async function (getOrder) {
    let refundAmount = 0;
    let refundType = null;
    const cancellationArray = getOrder.storeType.cancellationPolicy;
    const status = getOrder.orderStatus;
    const cancelRfundamount = getOrder.storeType.cancellationPartialRefundAmount;
    const found = cancellationArray.find(
      (element) => element.orderStatus == status && element.status);
    if (found) {
      if (found.refundType == "partial" && cancelRfundamount > 0) {
        refundAmount = helper.roundNumber(
          (getOrder.orderTotal * cancelRfundamount) / 100);
      } else if (found.refundType === "full") {
        refundAmount = getOrder.orderTotal;
      }
      refundType = found.refundType;
    }
    if (refundAmount && getOrder.paymentStatus === "success") {
      module.exports.refundamountTouser(refundAmount, getOrder);
    }
    return {
      refundAmount: refundAmount,
      refundType: refundType
    };
  },
  cancelOrderByCustomerV2: async function (req, res) {
    try {
      let data = req.body;
      console.log("data:===>", data);
      let cancelledFor = data.cancelledFor && data.cancelledFor == "beforeTrip" ? true : false; // it's for customer end
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ORDER_ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder == null) {
        return res.json(helper.showValidationErrorResponse("ORDER_ID_IS_NOT_VALID"));
      }
      if (cancelledFor && getOrder.isDriverAssign) {
        return res.json(helper.showValidationErrorResponse("ALREADY_ASSIGNED"));
      }
      module.exports.checkorderstatus(getOrder);
      data.orderStatus = "cancelled";
      Order.updateOrderCancelled(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse("DATA_UPDATED", resdata));
          if (!cancelledFor && (resdata.orderStatus === "cancelled" || resdata.orderStatus === "rejected")) {
            module.exports.orderStatusMiddleWareV2(resdata, data.isAutoCancel);
            module.exports.validateOrderCancelledForFraud(req, resdata);
          } else if (cancelledFor) {
            deliveryRequest.afterOrderCancelledForBeforeTrip(resdata);
          }
          orderService.manageProductStock(resdata.line_items, true);
        }
      });
    } catch (error) {
      console.log(error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  cancelOrderByCustomer: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse("ORDER_ID_IS_REQUIRED"));
      }
      const getOrder = await Order.getOrderByIdAsync(data._id);
      if (getOrder == null) {
        return res.json(helper.showValidationErrorResponse("ORDER_ID_IS_NOT_VALID"));
      }
      if (getOrder.orderStatus === "inroute") {
        return res.json(helper.showValidationErrorResponse("YOU_CAN_NOT_CANCEL_INROUTE_ORDER"));
      }
      data.orderStatus = "cancelled";
      Order.updateOrder(data, (err, resdata) => {
        if (err) {
          res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse("DATA_UPDATED", resdata));
          if (resdata.orderStatus === "cancelled" || resdata.orderStatus === "rejected") {
            module.exports.orderStatusMiddleWare(resdata);
          }
        }
        orderService.manageProductStock(resdata.line_items, true);
      });
    } catch (error) {
      console.log(error);
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }
  },
  getCustomerPoolTripsBySorting: async (req, getOrder) => {
    try {
      let store = req.store;
      let location = getOrder.dropOff.location;
      if (getOrder.orderStatus === "inroute") {
        location = getOrder.pickUp.location;
      }
      let getTrips = await sortDriverPoolTrips(getOrder.driver._id, location, store);
      getTrips = getTrips.filter(i => i._id.toString() != getOrder._id.toString()); // should not be current order in pool trip;
      // calculating way points;
      getTrips = getTrips.filter(i => {
        if (helper.isPointInLine(i.wayPoints.location.coordinates, getOrder.driver.userLocation.coordinates, location.coordinates)) return i;
      });
      return getTrips;
    } catch (error) {
      console.log("errr:", error);
    }
  },
  validateOrderCancelledForFraud: async (req, getOrder) => {
    try {
      let user = req.user;
      let store = req.store;
      let avoidFraudSetting = store.avoidFraudSetting;
      if (!user || user.role !== "USER") return;
      if (getOrder.rideType === "pool" || !getOrder.isDriverAssign || !avoidFraudSetting || !avoidFraudSetting.status) return;
      let getDriver = await User.findById(getOrder.driver._id);
      let query = {
        driver: getOrder.driver._id,
        store: store.storeId
      };
      if (getDriver.fraud_found_date_utc) {
        query["date_created_utc"] = {
          $gte: new Date(getDriver.fraud_found_date_utc)
        };
      }
      let NumOfCancle = avoidFraudSetting.numOfOrderCancel || 3;
      let getLastCanceled = await Order.find(query).limit(NumOfCancle).sort({
        _id: -1
      });
      let getLastOrderCancle = getLastCanceled.filter(i => i.orderStatus == "cancelled");
      let lastNumOfCancle = getLastOrderCancle.length;
      if (lastNumOfCancle >= NumOfCancle) {
        deliveryRequest.afterFoundFraudDriver(getOrder);
      }
    } catch (error) {
      console.log(error);
    }
  }
};