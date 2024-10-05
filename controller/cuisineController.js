const Cuisine = require('../models/cuisinesTable.js');
const storeType = require('../models/storeTypeTable');
const ObjectId = require('objectid');
const User = require('../models/userTable');

module.exports = {

    getCuisineList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, storeTypeId, search, fields } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let obj = {};

            if (!storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }

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

            if (!obj.hasOwnProperty("status")) {
                obj.status = { $ne: "archived" };
            }

            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ name: { $regex: search || '', $options: 'i' } })
            }

            let count = await Cuisine.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Cuisine.geCuisinesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
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

    addCuisineData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
            let plan = store.plan
            if (!data.storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }
            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };
            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };
            if (data.image && data.image != '') {
                data.image = data.image;
            } else {
                delete data.image;
            }
            Cuisine.addCuisine(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (plan && plan.type && plan.type === "basic")
                        await User.findOneAndUpdate({ storeType: { $in: [ObjectId(data.storeTypeId)] }, role: "VENDOR", status: "approved" }, { $addToSet: { cuisines: resdata._id } })
                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getCuisineDetailsById: async (req, res) => {
        try {
            var attribute_id = req.params._id;
            let store = req.store

            if (!attribute_id) {
                return res.json(helper.showValidationErrorResponse('CUISINE_ID_REQUIRED'));
            }
            let Cuisine_obj = { _id: ObjectId(attribute_id), store: store.storeId }
            Cuisine.getCuisineByStoreId(Cuisine_obj, (err, resdata) => {
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

    updateCuisinetData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('CUISINE_NAME_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            if (data.image && data.image != '') {
                data.image = data.image;
            } else {
                delete data.image;
            }

            Cuisine.updateCuisine(data, (err, resdata) => {
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

    removeCuisinetData: async (req, res) => {
        try {
            var data = req.body;
            let store = req.store;
            data.store = store.storeId;
            let plan = store.plan

            console.log("plan :", plan);

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('CUISINE_ID_IS_REQUIRED'));
            }

            Cuisine.removeCuisine(data._id, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (plan && plan.type && plan.type === "basic")
                        await User.findOneAndUpdate({ storeType: { $in: [ObjectId(data.storeTypeId)] }, role: "VENDOR", status: "approved" }, { $addToSet: { cuisines: resdata._id } })

                    return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    archiveCuisine: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            Cuisine.updateCuisine(data, (err, resdata) => {
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

            Cuisine.updateStatusByIds(data, update, (err, resdata) => {
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