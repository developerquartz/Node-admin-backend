const paymentLedger = require("../models/paymentLedgerTable");
const User = require("../models/userTable");
const ObjectId = require('objectid');

let afterOrderCompletion = async (order) => {
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
      order.storeType,
      "DRIVER",
      order.store._id,
      order.driver._id,
      order.deliveryBoyEarning,
      "credit",
      __('Credit with Ref', order.customOrderId),
      null,
      null,
      null,
      false
    );

    if (order.paymentMethod === "cod") {
      addTransaction(
        order._id,
        order.storeType,
        "DRIVER",
        order.store._id,
        order.driver._id,
        order.orderTotal,
        "debit",
        __('Debit with Ref', order.customOrderId),
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

let tipTransactionByCystomerToDriver = async (tipAmount, order) => {
  try {
    //add driver tip
    await addTransaction(
      order._id,
      order.storeType._id,
      "DRIVER",
      order.store,
      order.driver._id,
      tipAmount,
      "credit",
      __('Tip By Customer with Ref', order.customOrderId),
      null,
      null,
      null,
      false
    );
  } catch (error) {
    console.log("tipTransactionByCystomerToDriver transaction", error);
  }
}
let userTransaction = async (order, user, store, wallet, balance, refund) => {
  if (refund) {
    addTransactionUser(
      order._id,
      order.storeType,
      "USER",
      store.storeId,
      user._id,
      wallet,
      balance,
      "credit",
      __('Refund with Ref', order.customOrderId),
      null,
      null,
      null,
      false
    );
  }
  else {
    addTransactionUser(
      order._id,
      order.storeType,
      "USER",
      store.storeId,
      user._id,
      wallet,
      balance,
      "debit",
      __('Debit with Ref', order.customOrderId),
      null,
      null,
      null,
      false
    );
  }
}
let vendorEarning = async (order) => {
  try {
    //add vendor earning
    addTransaction(
      order._id,
      order.storeType,
      "VENDOR",
      order.store._id,
      order.vendor._id,
      order.vendorEarning,
      "credit",
      __('Credit with Ref', order.customOrderId),
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
    addAdminTransaction(
      order._id,
      order.storeType,
      order.store._id,
      order.adminEarning,
      order.adminVendorEarning,
      order.adminDeliveryBoyEarning,
      "credit",
      __('Credit with Ref', order.customOrderId),
      order.vendor._id
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
  isPay,
  referee
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
  if (referee && ObjectId.isValid(referee)) {
    obj.referee = referee;
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
let addTransactionUser = async (
  orderId,
  storeType,
  userType,
  store,
  payment_to,
  amount,
  balance,
  type,
  description,
  charge_id,
  meta,
  refund_id,
  isPay
) => {
  // let balance = await getBalance(payment_to);
  // if (type === "credit") {
  //   balance = Number(balance) + Number(amount);
  // } else if (type === "debit") {
  //   balance = Number(balance) - Number(amount);
  // }
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
  //await User.findOneAndUpdate({ _id: payment_to }, { wallet: obj.balance });

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

let addStoreBillingTransaction = async (
  store,
  amount,
  charge_id,
  meta,
  description
) => {

  let obj = {};
  obj.store = store;
  obj.userType = "ADMIN";
  obj.type = "charge";
  obj.amount = Number(amount);
  obj.charge_id = charge_id;
  obj.description = description;
  obj.meta_data = meta;
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
    let status = order.store.loyaltyPoints ? order.store.loyaltyPoints.status ? order.store.loyaltyPoints.status : false : false
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
            __('Debit with Ref', order.customOrderId),
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

module.exports = {
  afterOrderCompletion,
  getBalance,
  addTransaction,
  addAdminTransaction,
  addStoreBillingTransaction,
  tipTransactionByCystomerToDriver,
  addTransactionUser,
  userTransaction
};
