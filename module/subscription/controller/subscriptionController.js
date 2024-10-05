const Plans = require("../model/subscriptionPlansTable");
const Subscription = require("../model/subscriptionsTable");
let User = require("../../../models/userTable")
module.exports = {
    addSubscription: async (req, res) => {
        try {
            let data = req.body;

            Subscription.addSubscription(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    listplan: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields, search } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let store = req.store
            let obj = {}, user, isSub = "", isSubscriptionPlan = false;
            if (req.get('Authorization')) {
                let token = req.get('Authorization').replace('Bearer ', '');
                user = await User.findOne({ "tokens.token": token }, 'plan');
                if (user != null) {
                    if (user.plan && user.plan.isActive) {
                        isSubscriptionPlan = true;
                        isSub = user.plan.billingPlan
                    }
                }
            }
            obj.store = store.storeId
            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (!obj.hasOwnProperty("status")) {
                obj.status = "active"//{ $ne: "archived" };
            }

            if (search) {
                obj['$and'] = [];
                obj['$and'].push({ name: { $regex: search || '', $options: 'i' } })
            }

            let count = await Plans.countDocuments(obj);
            Plans.getPlansWithFilter(obj, isSub, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, count));
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.json(helper.showInternalServerErrorResponse('SomethingWentWrong'));
        }
    },
}