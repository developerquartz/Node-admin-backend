const Coupon = require('../../models/couponTable');
//const Promotion = require("../../models/promotionTable")

module.exports = (agenda) => {
    agenda.define("checkerExpirePromocode", async (job, done) => {
        try {
            //console.log("---------- check coupon expire------")
            let qry = {
                status: { $nin: ["archived", "expired"] },
                date_expires: { $lt: new Date() }
            }
            let coupondata = await Coupon.find(qry);
            //let promotion = await Promotion.find(qry)
            coupondata.forEach(async (coupon) => {
                await Coupon.findByIdAndUpdate(coupon._id, { $set: { status: "expired" } })
            })
            // promotion.forEach(async (promo) => {
            //     await Promotion.findByIdAndUpdate(promo._id, { $set: { status: "expired" } })
            // })
            done()
        } catch (error) {
            console.log("errror", error)
        }
    });
};