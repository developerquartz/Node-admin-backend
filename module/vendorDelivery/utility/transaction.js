const paymentLedger = require("../../../models/paymentLedgerTable");
const User = require("../../../models/userTable");
const ObjectId = require('objectid');

let transactionForFoodOrGrocerType = async (order) => {
  try {
    //earning for admin, vendor and driver after order completion
    addEarningTransaction(order);

    //loyalty points if enabled from store admin
    addLoyaltyPoinst(order);
  } catch (error) {
    console.log("afterOrderCompletion", error);
  }
};

let addEarningTransaction = async (order) => {

  if (order.deliveryType === "DELIVERY") {
    driverEarning(order);
  }

  if (order.vendorEarning) {
    vendorEarning(order);
  }

  adminEarning(order);
}

let driverEarning = async (order) => {
  try {
    //add driver earning
    await addTransaction(
      order._id,
      order.storeType._id,
      "DRIVER",
      order.store._id,
      order.driver._id,
      order.deliveryBoyEarning,
      "credit",
      `Credit with Ref: ${order.customOrderId}`,
      null,
      null,
      null,
      false
    );

    if (order.paymentMethod === "cod") {
      addTransaction(
        order._id,
        order.storeType._id,
        "DRIVER",
        order.store._id,
        order.driver._id,
        order.orderTotal,
        "debit",
        `Debit with Ref: ${order.customOrderId}`,
        null,
        null,
        null,
        false
      );

    }

  } catch (error) {
    console.log("driver transaction", error);
  }
}

let vendorEarning = async (order) => {
  try {
    //add vendor earning
    addTransaction(
      order._id,
      order.storeType._id,
      "VENDOR",
      order.store._id,
      order.vendor._id,
      order.vendorEarning,
      "credit",
      `Credit with Ref: ${order.customOrderId}`,
      null,
      null,
      null,
      false
    );
  } catch (error) {
    console.log("vendor transaction", error);
  }
}

let adminEarning = async (order) => {
  try {
    //add admin earniing
    let vendor = order.vendor ? order.vendor._id : null;
    let adminVendorEarning = order.adminVendorEarning ? order.adminVendorEarning : 0;
    let adminDeliveryBoyEarning = order.adminDeliveryBoyEarning ? order.adminDeliveryBoyEarning : 0;
    addAdminTransaction(
      order._id,
      order.storeType,
      order.store._id,
      order.adminEarning,
      adminVendorEarning,
      adminDeliveryBoyEarning,
      "credit",
      `Credit with Ref: ${order.customOrderId}`,
      vendor
    );
  } catch (error) {
    console.log("admin transaction", error);
  }
}

let addTransaction = async (
  orderId,
  storeType,
  userType,
  store,
  payment_to,
  amount,
  type,
  description,
  charge_id,
  meta,
  refund_id,
  isPay
) => {
  let balance = await getBalance(payment_to);
  if (type === "credit") {
    balance = Number(balance) + Number(amount);
  } else if (type === "debit") {
    balance = Number(balance) - Number(amount);
  }

  let obj = {};
  obj.store = store;
  obj.isPay = isPay;
  if (orderId) {
    obj.order = orderId;
  }

  if (storeType) {
    obj.storeType = storeType;
  }
  if (charge_id) {
    obj.charge_id = charge_id;
  }
  if (refund_id) {
    obj.refund_id = refund_id;
  }
  if (meta) {
    obj.meta_data = meta;
  }
  if (obj.type === "credit") {
    obj.refund = 0;
  }

  obj.userType = userType;
  obj.payment_to = payment_to;
  obj.type = type;
  obj.amount = Number(amount);
  obj.balance = Number(helper.roundNumber(balance));
  obj.description = description;
  obj.date_created_utc = new Date();

  //update balance
  await User.findOneAndUpdate({ _id: payment_to }, { wallet: obj.balance });

  return await paymentLedger.create(obj);
};

let getBalance = async (user) => {

  let getBalance = await paymentLedger
    .find({ payment_to: user })
    .sort({ date_created_utc: -1 })
    .limit(1);

  let balance = 0;
  if (getBalance.length > 0) {
    balance = getBalance[0].balance;
  }
  return Number(balance);
};

let addAdminTransaction = async (
  orderId,
  storeType,
  store,
  amount,
  adminVendorEarning,
  adminDeliveryBoyEarning,
  type,
  description,
  vendor
) => {

  let balance = await getStoreBalance(store);

  if (type === "credit") {
    balance = Number(balance) + Number(amount);
  } else if (type === "debit") {
    balance = Number(balance) - Number(amount);
  }

  let obj = {};
  obj.store = store;
  obj.order = orderId;
  obj.storeType = storeType;
  obj.userType = "ADMIN";
  obj.type = type;
  obj.amount = Number(amount);

  if (adminVendorEarning) {
    obj.adminVendorEarning = adminVendorEarning;
  }

  if (vendor) {
    obj.vendor = vendor;
  }

  if (adminDeliveryBoyEarning) {
    obj.adminDeliveryBoyEarning = adminDeliveryBoyEarning;
  }

  obj.balance = Number(helper.roundNumber(balance));
  obj.description = description;
  obj.date_created_utc = new Date();

  return await paymentLedger.create(obj);
};

let getStoreBalance = async (store) => {
  let getBalance = await paymentLedger
    .find({ userType: "ADMIN", type: { $ne: "charge" }, store: ObjectId(store) })
    .sort({ date_created_utc: -1 })
    .limit(1);

  let balance = 0;

  if (getBalance.length > 0) {

    if (getBalance[0].balance) {
      balance = getBalance[0].balance;
    }

  }

  return Number(balance);
};

let addLoyaltyPoinst = async (order) => {
  try {
    //loyalty points
    let status = store.loyaltyPoints ? store.loyaltyPoints.status : false
    console.log("in loyalty points", status);
    if (status) {
      let Lp = helper.calculateLoyalityPoints(order.orderTotal, order.store.loyaltyPoints);
      let nLP = Lp.points + order.user.loyaltyPoints.points;
      let nLPV = helper.roundNumber(Lp.value + order.user.loyaltyPoints.value);

      if (order.isLoyaltyPointsUsed && order.pointsToRedeem && order.redemptionValue) {
        nLP = nLP - order.pointsToRedeem;
        nLPV = helper.roundNumber(nLPV - order.redemptionValue);
        try {
          //add admin earniing
          addAdminTransaction(
            order._id,
            order.storeType,
            order.store._id,
            order.redemptionValue,
            0,
            0,
            "debit",
            `Debit with Ref: ${order.customOrderId}`
          );
        } catch (error) {
          console.log("loyalty admin transaction", error);
        }
      }

      await User.findOneAndUpdate({ _id: order.user._id }, { "loyaltyPoints.points": nLP, "loyaltyPoints.value": nLPV });
    }
  } catch (error) {
    console.log("addLoyaltyPoinst err", error);
  }
}

let transactionForTaxi = (order) => {
  adminEarning(order);
  driverEarning(order);
}

module.exports = {
  transactionForFoodOrGrocerType,
  transactionForTaxi
};
