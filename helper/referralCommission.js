const Transaction = require('../helper/transaction');
const User = require("../models/userTable");
const paymentLedger = require("../models/paymentLedgerTable");
let calculteReferredUserCommission = async (payment_to, store, userType, user) => {
    if (user) {
        const getUser = await User.findOne({
            referredBy: { $exists: true },
            store: store.storeId,
            $or: [{ mobileNumber: user.mobileNumber }, { email: user.email }],
            role: userType.toUpperCase(),
            status: "archived",
        });
        if (getUser != null) return;
    }

    let earningAmount = 0;
    console.log("referredUserCommission:===>", store.referredUserCommission[userType]);
    if (store.referredUserCommission && store.referredUserCommission[userType] && store.referredUserCommission[userType].status) {
        earningAmount = store.referredUserCommission[userType].referredEarningAmount;
        Transaction.addTransaction(
            null,
            null,
            userType.toUpperCase(),
            store.storeId,
            payment_to,
            earningAmount,
            "credit",
            `Referral Amount Credited in Wallet`,
            null,
            null,
            null,
            true,
            user._id
        );
    };
    return earningAmount;
}
let afterDeleteAccount = async (resdata, store) => {
    try {
        let userType = resdata.role == "USER" ? "User" : "Driver";
        if (store.referredUserCommission && store.referredUserCommission[userType] && store.referredUserCommission[userType].status) {
            let getDiffDay = helper.getTimeDifferenceInDay(new Date(), resdata.date_created_utc);
            let storeDiffDay = store.referredUserCommission.refereeAccountDeleteDays || 30;
            if (resdata.referredBy && getDiffDay <= storeDiffDay) {
                let query = { store: store.storeId, payment_to: resdata.referredBy, referee: resdata._id };
                let getReferrarAmount = await paymentLedger.findOne(query).populate("payment_to", "wallet");
                if (getReferrarAmount.payment_to && getReferrarAmount.payment_to.wallet >= getReferrarAmount.amount) {
                    Transaction.addTransaction(
                        null,
                        null,
                        resdata.role,
                        store.storeId,
                        resdata.referredBy,
                        getReferrarAmount.amount,
                        "debit",
                        `Referral Amount Retrieved`,
                        null,
                        null,
                        null,
                        false,
                    );
                }
            }
        }
    } catch (error) {
        console.log("error:", error)
    }
}

module.exports = {
    calculteReferredCommission: calculteReferredUserCommission,
    afterDeleteAccount
}
