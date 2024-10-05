const Package = require("../model/packageTable");
const ObjectId = require('objectid');
module.exports = {
    addPackage: (req, res) => {
        try {
            let data = req.body;
            Package.addPackage(data, (err, resdata) => {
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
    updatePackage: (req, res) => {
        try {
            let data = req.body;
            Package.updatePackage(data, (err, resdata) => {
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
    viewPackage: (req, res) => {
        try {
            let _id = req.params._id;
            Package.viewPackage({ _id }, (err, resdata) => {
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
    viewPackageWithFilter: async (req, res) => {
        try {
            const { orderBy, order, page, limit, search, fields } = req.body;
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            let obj = {};
            let user = req.user;
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
            if (user.role === "USER")
                obj.status = "active";

            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ name: { $regex: search || '', $options: 'i' } })
            }

            let count = await Package.countDocuments(obj);
            Package.getPackageWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
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
    removePackage: (req, res) => {
        try {
            let _id = req.params._id;
            Package.removePackage({ _id }, (err, resdata) => {
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

            Package.updateStatusByIds(data, update, (err, resdata) => {
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