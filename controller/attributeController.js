const Attribute = require('../models/attributeTable.js');
const AttributeTerm = require('../models/attributeTermsTable');
const storeType = require('../models/storeTypeTable');
const ObjectId = require('objectid');

module.exports = {

    getAttributeList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, storeTypeId, vendor, search, fields } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            let obj = {};

            if (!storeTypeId) {
                return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
            }

            if (!vendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
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
            
            let count = await Attribute.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Attribute.getAttributes(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
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

    addAttributeData: async (req, res) => {
        try {
            let data = req.body;
            
            if (!data.vendor) {
                return res.json(helper.showValidationErrorResponse('VENDOR_ID_IS_REQUIRED'));
            }

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('ATTRIBUTE_NAME_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            if (data.terms && data.terms.length > 0) {
                data.terms = data.terms;
                let terms = [];
                for(element in data.terms)
                {
                    let getTerm = await AttributeTerm.findOneAndUpdate({storeType:ObjectId(data.storeTypeId),name:data.terms[element] }, { name: data.terms[element], status: 'active' }, {upsert: true,new: true});
                    if (getTerm != null) {
                        if (!terms.includes(getTerm._id.toString())) {
                            terms.push(getTerm._id.toString());
                        }
                    }
                }
                data.terms = terms;
            } else {
                return res.json(helper.showValidationErrorResponse('OPTIONS_IS_REQUIRED'));
            }

            Attribute.addAttribute(data, (err, resdata) => {
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

    getAttributeDetailsById: async (req, res) => {
        try {
            var attribute_id = req.params._id;

            if (!attribute_id) {
                return res.json(helper.showValidationErrorResponse('ATTRIBUTE_ID_REQUIRED'));
            }

            Attribute.getAttributeById(attribute_id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('ATTRIBUTE_DETAIL', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateAttributetData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ATTRIBUTE_ID_IS_REQUIRED'));
            }

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('ATTRIBUTE_NAME_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            if (data.terms && data.terms.length > 0) {
                data.terms = data.terms;
                let terms = [];
                for(element in data.terms)
                {
                    let getTerm = await AttributeTerm.findOneAndUpdate({storeType:ObjectId(data.storeTypeId),name:data.terms[element] }, { name: data.terms[element], status: 'active' }, {upsert: true,new: true});
                    if (getTerm != null) {
                        if (!terms.includes(getTerm._id.toString())) {
                            terms.push(getTerm._id.toString());
                        }
                    }
                }
                data.terms = terms;
            } else {
                return res.json(helper.showValidationErrorResponse('OPTIONS_IS_REQUIRED'));
            }

            Attribute.updateAttribute(data, (err, resdata) => {
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

    removeAttributetData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ATTRIBUTE_ID_IS_REQUIRED'));
            }

            Attribute.removeAttribute(data._id, (err, resdata) => {
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

    archiveAttribute: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            Attribute.updateAttribute(data, (err, resdata) => {
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

            Attribute.updateStatusByIds(data, update, (err, resdata) => {
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