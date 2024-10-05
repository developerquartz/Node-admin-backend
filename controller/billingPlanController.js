const Plans = require('../models/billingPlansTable');
const Store = require('../models/storeTable');
const Subscription = require('../models/subscriptionsTable');
const ObjectId = require('objectid');

module.exports = {

    getPlansList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields, search } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let obj = {};

            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (!obj.hasOwnProperty("status")) {
                obj.status = { $ne: "archived" };
            }

            if (search) {
                obj['$and'] = [];
                obj['$and'].push({ name: { $regex: search || '', $options: 'i' } })
            }

            let count = await Plans.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Plans.getPlansWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            console.log("err", err);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getStorePlansList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields, search } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || 1;
            let paged = page || 1;
            let store = req.store;
            let getCard = await Store.findById(store.storeId, 'cardDetails').populate({ path: "cardDetails" });
            let cardDetails = null;
            if (getCard.cardDetails) {
                cardDetails = getCard.cardDetails;
            }
            let obj = {};

            if (fields && fields.length > 0) {
                fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (!obj.hasOwnProperty("status")) {
                obj.status = { $ne: "archived" };
            }

            if (search) {
                obj['$and'] = [];
                obj['$and'].push({ name: { $regex: search || '', $options: 'i' } })
            }

            Plans.getStorePlanssWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    /* const getSubscription = await Subscription.find({ store: ObjectId(store.storeId), status: 'active' });

                    await Promise.all(resdata.map(element => {
                        if (getSubscription.length > 0) {
                            if (element.plans.length > 0) {

                                element.plans.forEach(plan => {
                                    let isActive = false;
                                    let getSub = getSubscription.filter(ele => {
                                        return ele.billingPlan.toString() === plan._id.toString();
                                    });

                                    if (getSub.length > 0) {
                                        isActive = true;
                                    }

                                    plan['isActive'] = isActive;
                                });
                            }
                        }
                    })); */

                    let result = helper.showSuccessResponse('DATA_SUCCESS', resdata);
                    result.cardDetails = cardDetails;
                    return res.json(result);
                }
            });
        }
        catch (err) {
            console.log("err", err);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addPlansData: async (req, res) => {
        try {
            let data = req.body;

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            };

            if (!data.interval) {
                return res.json(helper.showValidationErrorResponse('INTERVAL_IS_REQUIRED'));
            };

            if (!data.price) {
                return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
            };

            if (Number(data.price) < 0) {
                return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
            }

            if (!data.description) {
                return res.json(helper.showValidationErrorResponse('DESCRIPTION_IS_REQUIRED'));
            };

            if (data.features.length === 0) {
                return res.json(helper.showValidationErrorResponse('FEATURES_IS_REQUIRED'));
            }

            if (!data.planId) {
                return res.json(helper.showValidationErrorResponse('STRIPE_PLAN_ID_IS_REQUIRED'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            Plans.addPlans(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getPlansDetailsById: async (req, res) => {
        try {
            var attribute_id = req.params._id;

            if (!attribute_id) {
                return res.json(helper.showValidationErrorResponse('CUISINE_ID_REQUIRED'));
            }

            Plans.getPlansById(attribute_id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('CUISINE_DETAIL', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updatePlanstData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            };

            if (!data.interval) {
                return res.json(helper.showValidationErrorResponse('INTERVAL_IS_REQUIRED'));
            };

            if (!data.price) {
                return res.json(helper.showValidationErrorResponse('PRICE_IS_REQUIRED'));
            };

            if (Number(data.price) < 0) {
                return res.json(helper.showValidationErrorResponse('PRICE_MUST_BE_POSITIVE'));
            }

            if (!data.description) {
                return res.json(helper.showValidationErrorResponse('DESCRIPTION_IS_REQUIRED'));
            };

            if (data.features.length === 0) {
                return res.json(helper.showValidationErrorResponse('FEATURES_IS_REQUIRED'));
            }

            if (!data.planId) {
                return res.json(helper.showValidationErrorResponse('STRIPE_PLAN_ID_IS_REQUIRED'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            Plans.updatePlans(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removePlanstData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            Plans.removePlans(data._id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    archivePlans: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            Plans.updatePlans(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateStatus: async (req, res) => {
        try {
            let data = req.body;
            let ids = [];
            let update = {};

            if (data._id.constructor === Array) {
                if (data._id.length === 0) {
                    return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
                }

                if (!data.status) {
                    return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
                }

                data._id.forEach(element => {
                    ids.push(ObjectId(element));
                });

                update.status = data.status;

            } else {
                ids.push(ObjectId(data._id));
                update.status = 'archived';
            }

            data._id = ids;

            Plans.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}