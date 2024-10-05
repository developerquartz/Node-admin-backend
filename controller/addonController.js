const Addon = require('../models/addonTable.js');
const storeType = require('../models/storeTypeTable');
const ObjectId = require('objectid');
const checkaddon = ["SERVICEPROVIDER", "AIRBNB"];
module.exports = {

    getAddonsList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, storeTypeId, vendor, fields, search } = req.body
            var pageSize = limit || 10;
            let storeType = req.body.storeTypeName
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            let obj = {};
            if (!storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }
            if (!checkaddon.includes(storeType)) {
                if (!vendor) {
                    return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
                }

                if (vendor) {
                    obj.vendor = ObjectId(vendor);
                }
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
            let count = await Addon.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Addon.geAddonsWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    console.log("err----", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            console.log("err", err);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addAddonData: async (req, res) => {
        try {
            let data = req.body;

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!["CARRENTAL"].includes(data.storeTypeName) && !data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            };

            if (!["CARRENTAL"].includes(data.storeTypeName) && data.options.length === 0) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            Addon.addAddon(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getAddonDetailsById: async (req, res) => {
        try {
            var addon_id = req.params._id;

            if (!addon_id) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            Addon.getAddonById(addon_id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_DETAILS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateAddontData: async (req, res) => {
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

            if (data.options.length === 0) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };
            Addon.updateAddon(data, (err, resdata) => {
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

    archiveAddontData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            Addon.updateAddon(data, (err, resdata) => {
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

    removeAddontData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            Addon.removeAddon(data._id, (err, resdata) => {
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

            Addon.updateStatusByIds(data, update, (err, resdata) => {
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