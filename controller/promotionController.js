const Promotion = require('../models/promotionTable');
const storeTable = require('../models/storeTable');

const ObjectId = require('objectid');
const store = require('../middleware/validation/store');
const User = require("../models/userTable");

module.exports = {

    getPromotionList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields, search, vendor } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let storeId = req.store.storeId;
            let obj = {};

            if (!storeId) {
                return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
            }
            else
                obj.store = storeId

            if (vendor) {
                obj.vendor = ObjectId(vendor);
            }

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
                obj['$and'].push({ promotionName: { $regex: search || '', $options: 'i' } })
            }
            console.log("obj :", obj);

            let count = await Promotion.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Promotion.getPromotionWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addPromotionData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
            // if (data.type == "singleVendor") {
            //     let storeData = await storeTable.findById(ObjectId(data.store))
            //     data.vendor = storeData.owner
            // }
            if (data.type == "multiVendor" && data.vendor) {
                let getVendor = await User.findOne({ _id: data.vendor, storeType: data.storeTypeId, status: "approved" });
                if (!getVendor) {
                    return res.json(helper.showValidationErrorResponse('VENDOR_NOT_EXIST_ON_STORETYPE'));
                }
            };

            Promotion.addPromotion(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("error", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getPromotionDetailsById: async (req, res) => {
        try {
            let id = req.params._id;
            let store = req.store
            if (!id) {
                return res.json(helper.showValidationErrorResponse('PROMOCODE_ID_REQUIRED'));
            }
            let promotion_obj = { _id: ObjectId(id), store: store.storeId }

            Promotion.getPromotionByStoreId(promotion_obj, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('PROMOCODE_DETAIL', resdata));
                }
            });
        } catch (error) {
            console.log("error", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updatePromotionData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('Promotion_ID_IS_REQUIRED'));
            }
            if (data.type == "multiVendor" && data.vendor) {
                let getVendor = await User.findOne({ _id: data.vendor, storeType: data.storeTypeId, status: "approved" });
                if (!getVendor) {
                    return res.json(helper.showValidationErrorResponse('VENDOR_NOT_EXIST_ON_STORETYPE'));
                }
            };
            Promotion.updatePromotion(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
                }
            });
        } catch (error) {
            console.log("error", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removePromotionData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('Promotion_ID_IS_REQUIRED'));
            }

            data.status = "archived";

            Promotion.updatePromotion(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("error", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateStatus: async (req, res) => {
        try {
            let data = req.body;

            if (data._id.length === 0) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            let ids = [];
            data._id.forEach(element => {
                ids.push(ObjectId(element));
            });

            data._id = ids;
            let update = {};
            update.status = data.status;

            Promotion.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}

function validateVendor(data) {

}