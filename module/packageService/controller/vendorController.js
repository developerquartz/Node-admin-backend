const Vendor = require("../model/vendorTable");
const ObjectId = require('objectid');
module.exports = {
    addVendor: async (req, res) => {
        try {
            let data = req.body;
            if (data.location) {
                data.userLocation = { type: "Point", coordinates: [data.location.lng, data.location.lat] };
            };
            const getVendor = await Vendor.getVendor({
                store: ObjectId(data.store),
                $or: [{ mobileNumber: data.mobileNumber }, { email: data.email }],
                status: { $ne: "archived" },
            });
            if (getVendor != null) {
                return res.json(helper.showValidationErrorResponse("EMAIL_OR_MOBILE_NUMBER_ALREADY_EXISTS"));
            }
            Vendor.addVendor(data, (err, resdata) => {
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
    updateVendor: (req, res) => {
        try {
            let data = req.body;
            if (data.location) {
                data.userLocation = { type: "Point", coordinates: [data.location.lng, data.location.lat] };
            };
            Vendor.updateVendor(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_UPDATED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    viewVendor: (req, res) => {
        try {
            let _id = req.params._id;
            Vendor.viewVendor({ _id }, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    viewVendorWithFilter: async (req, res) => {
        try {
            const { orderBy, order, page, limit, search, fields } = req.body;
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            let obj = {};
            obj.store = req.store.storeId;

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

            let count = await Vendor.countDocuments(obj);
            Vendor.getVendorWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    console.log(err)
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, count));
                }
            });
        } catch (error) {
            console.log(error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    removeVendor: (req, res) => {
        try {
            let _id = req.params._id;
            Vendor.removeVendor({ _id }, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS'));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    updateStatusAll: async (req, res) => {
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

            Vendor.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_UPDATED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
}