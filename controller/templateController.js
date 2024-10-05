const Template = require('../models/templateTable.js');
const ObjectId = require('objectid');
const emailTemplate = require('../helper/emailTemplate');

module.exports = {

    addTemplateData: async (req, res) => {
        try {
            let data = req.body;

            if (!data.subject) {
                return res.json(helper.showValidationErrorResponse('SUBJECT_IS_REQUIRED'));
            };

            if (!data.body) {
                return res.json(helper.showValidationErrorResponse('BODY_IS_REQUIRED'));
            };

            Template.addTemplate(data, (err, resdata) => {
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

    getTemplateDetailsById: async (req, res) => {
        try {
            var Template_id = req.params._id;

            if (!Template_id) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            Template.getTemplateById(Template_id, (err, resdata) => {
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

    updateTemplatetData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.subject) {
                return res.json(helper.showValidationErrorResponse('SUBJECT_IS_REQUIRED'));
            };

            if (!data.body) {
                return res.json(helper.showValidationErrorResponse('BODY_IS_REQUIRED'));
            };

            Template.updateTemplate(data, (err, resdata) => {
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

    revertTemplatetData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            Template.getTemplateById(data._id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    const getDefaultTemplate = emailTemplate.getDefaultTemplate(resdata.constant);
                    return res.json(helper.showSuccessResponse('DATA_DETAILS', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getTemplatesList: async (req, res) => {
        try {
            const data = req.body;
            const store = req.store;
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let obj = {};
            obj.store = ObjectId(store.storeId);

            if (data.fieldName && data.fieldValue) obj[data.fieldName] = { $regex: data.fieldValue || '', $options: 'i' };

            let count = await Template.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            let totalcount = count.length > 0 ? count[0].count : 0;
            Template.getTemplatesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount));
                }
            });
        } catch (err) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removeTemplatetData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            Template.updateTemplate(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}