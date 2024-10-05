const Promocode = require('../models/couponTable');
const storeType = require('../models/storeTypeTable');
const ObjectId = require('objectid');
const store = require('../middleware/validation/store');

module.exports = {

    getPromocodeList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields, search, storeTypeId, vendor } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let store = req.store;

            let obj = {};

            if (storeTypeId) {
                obj.storeType = ObjectId(storeTypeId);
            }

            if (vendor) {
                obj.vendor = ObjectId(vendor);
            } else {
                obj.store = store.storeId;
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
                obj['$and'].push({ code: { $regex: search || '', $options: 'i' } })
            }

            let count = await Promocode.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Promocode.gePromocodesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
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

    addPromocodeData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;

            if (!data.storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }

            const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
            }

            data.storeType = getStoreType._id;

            if (!data.code) {
                return res.json(helper.showValidationErrorResponse('PROMOCODE_REQUIRED'));
            }

            const getCode = await Promocode.findOne({ storeType: data.storeType, code: data.code, status: { $ne: "archived" } });

            if (getCode != null) {
                return res.json(helper.showValidationErrorResponse('PROMOCODE_NAME_ALREADY_EXISTS'));
            }

            if (!data.discount_type) {
                return res.json(helper.showValidationErrorResponse('TYPE_NOT_MATCHED'));
            }

            if (!data.amount) {
                return res.json(helper.showValidationErrorResponse('AMOUNT_REQUIRED'));
            }

            if (!data.description) {
                return res.json(helper.showValidationErrorResponse('DESCRIPTION_IS_REQUIRED'));
            };

            let today = new Date();
            //today.setHours(0, 0, 0, 0);

            if (!data.start_date) {
                return res.json(helper.showValidationErrorResponse('START_DATE_IS_REQUIRED'));
            };

            // if (!helper.isValidDate(data.start_date, "YYYY-MM-DD")) {
            //     return res.json(helper.showValidationErrorResponse('INVALID_DATE_FORMAT'));
            // }

            if (new Date(data.start_date).getTime() < today.getTime()) {
                return res.json(helper.showValidationErrorResponse('START_DATE_MUST_GREATER_FROM_CURRENT_DATE'));
            }

            //data.start_date = new Date(new Date(new Date(data.start_date).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();

            if (!data.date_expires) {
                return res.json(helper.showValidationErrorResponse('EXPIRE_DATE_IS_REQUIRED'));
            };

            // if (!helper.isValidDate(data.date_expires, "YYYY-MM-DD")) {
            //     return res.json(helper.showValidationErrorResponse('INVALID_DATE_FORMAT'));
            // }

            // data.date_expires = new Date(new Date(new Date(data.date_expires).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();

            if (new Date(data.date_expires).getTime() < today.getTime()) {
                return res.json(helper.showValidationErrorResponse('EXPIRE_DATE_MUST_GREATER_FROM_CURRENT_DATE'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };
            if (data.restrictArea == "none") {
                data.geoFence = []
            }
            else {
                if (!data.geoFence.length) {
                    return res.json(helper.showValidationErrorResponse('Please select at least one Geofence'));
                }
            }
            delete data._id;

            Promocode.addCoupon(data, (err, resdata) => {
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

    getPromocodeDetailsById: async (req, res) => {
        try {
            let id = req.params._id;
            let store = req.store
            if (!id) {
                return res.json(helper.showValidationErrorResponse('PROMOCODE_ID_REQUIRED'));
            }
            let promo_obj = { _id: ObjectId(id), store: store.storeId }

            Promocode.getCouponByStoreId(promo_obj, (err, resdata) => {
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

    updatePromocodetData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('Promocode_ID_IS_REQUIRED'));
            }

            if (!data.storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }

            const getStoreType = await storeType.getStoreTypeByIdAsync(data.storeTypeId);

            if (getStoreType === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_STORE_TYPE'));
            }

            data.storeType = getStoreType._id;

            if (!data.code) {
                return res.json(helper.showValidationErrorResponse('PROMOCODE_REQUIRED'));
            }

            const getCode = await Promocode.findOne({ storeType: data.storeType, code: data.code, status: { $ne: "archived" } });
            if (getCode != null) {
                if (getCode._id.toString() != data._id.toString()) {
                    return res.json(helper.showValidationErrorResponse('PROMOCODE_NAME_ALREADY_EXISTS'));
                }
            }
            if (getCode.status == "expired") {
                return res.json(helper.showValidationErrorResponse('PROMOCODE_EXPIRED'));
            }

            if (!data.discount_type) {
                return res.json(helper.showValidationErrorResponse('TYPE_NOT_MATCHED'));
            }

            if (!data.amount) {
                return res.json(helper.showValidationErrorResponse('AMOUNT_REQUIRED'));
            }

            if (!data.description) {
                return res.json(helper.showValidationErrorResponse('DESCRIPTION_IS_REQUIRED'));
            };


            let today = new Date();
            //today.setHours(0, 0, 0, 0);

            if (!data.start_date) {
                return res.json(helper.showValidationErrorResponse('START_DATE_IS_REQUIRED'));
            };

            // if (!helper.isValidDate(data.start_date, "YYYY-MM-DD")) {
            //     return res.json(helper.showValidationErrorResponse('INVALID_DATE_FORMAT'));
            // }

            if (new Date(data.start_date).getTime() < today.getTime()) {
                return res.json(helper.showValidationErrorResponse('START_DATE_MUST_GREATER_FROM_CURRENT_DATE'));
            }

            //data.start_date = new Date(new Date(new Date(data.start_date).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();

            if (!data.date_expires) {
                return res.json(helper.showValidationErrorResponse('EXPIRE_DATE_IS_REQUIRED'));
            };

            // if (!helper.isValidDate(data.date_expires, "YYYY-MM-DD")) {
            //     return res.json(helper.showValidationErrorResponse('INVALID_DATE_FORMAT'));
            // }

            //data.date_expires = new Date(new Date(new Date(data.date_expires).setHours(0, 0, 0, 0)).toString().split('GMT')[0] + ' UTC').toISOString();

            if (new Date(data.date_expires).getTime() < today.getTime()) {
                return res.json(helper.showValidationErrorResponse('EXPIRE_DATE_MUST_GREATER_FROM_CURRENT_DATE'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };
            if (data.restrictArea == "none") {
                data.geoFence = []
            }
            else {
                if (!data.geoFence.length) {
                    return res.json(helper.showValidationErrorResponse('Please select at least one Geofence'));
                }
            }
            Promocode.updateCoupon(data, (err, resdata) => {
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

    removePromocodetData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('Promocode_ID_IS_REQUIRED'));
            }

            data.status = "archived";

            Promocode.updateCoupon(data, (err, resdata) => {
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

            Promocode.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (data.status == "active") {
                        return res.json(helper.showSuccessResponse('ACTIVE_SUCCESsFULL', resdata));
                    } else if (data.status == "inactive") {
                        return res.json(helper.showSuccessResponse('INACTIVE_SUCCESsFULL', resdata));
                    } else if (data.status == "archived") {
                        return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                    } else {
                        return res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                    }
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}