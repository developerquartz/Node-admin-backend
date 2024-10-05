const FAQ = require('../models/faqTable.js');
const ObjectId = require('objectid');

module.exports = {

    getFAQList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, search, fields } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            const store = req.store;
            let obj = {};
            obj.store = store.storeId;

            if (fields && fields.fieldName && fields.fieldValue) {
                console.log("fields", fields);
                obj[fields.fieldName] = fields.fieldValue;
            }

            if (!obj.hasOwnProperty("status")) {
                obj.status = { $ne: "archived" };
            }

            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ question: { $regex: search || '', $options: 'i' } })
                obj['$or'].push({ answer: { $regex: search || '', $options: 'i' } })
            }

            let count = await FAQ.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            FAQ.geFAQsWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
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

    getFAQListF: async (req, res) => {
        try {
            const store = req.store;
            let obj = {};
            obj.store = store.storeId;
            let { type } = req.query;
            if (type) {
                obj.type = type;
            }
            console.log(req.query)
            obj.status = 'active';

            FAQ.find(obj, 'question answer', (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        }
        catch (err) {
            console.log(err)
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addFAQData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
            let user = req.user;
            data.user = user._id;

            if (!data.question) {
                return res.json(helper.showValidationErrorResponse('QUESTION_NAME_IS_REQUIRED'));
            };

            if (!data.answer) {
                return res.json(helper.showValidationErrorResponse('ANSWER_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            FAQ.addFAQ(data, (err, resdata) => {
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

    getFAQDetailsById: async (req, res) => {
        try {
            let id = req.params._id;

            if (!id) {
                return res.json(helper.showValidationErrorResponse('FAQ_ID_REQUIRED'));
            }

            FAQ.getFAQById(id, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('FAQ_DETAIL', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateFAQtData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('FAQ_ID_IS_REQUIRED'));
            }

            if (!data.question) {
                return res.json(helper.showValidationErrorResponse('QUESTION_NAME_IS_REQUIRED'));
            };

            if (!data.answer) {
                return res.json(helper.showValidationErrorResponse('ANSWER_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            FAQ.updateFAQ(data, (err, resdata) => {
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

    removeFAQtData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('FAQ_ID_IS_REQUIRED'));
            }

            data.status = "archived";

            FAQ.updateFAQ(data, (err, resdata) => {
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

            FAQ.updateStatusByIds(data, update, (err, resdata) => {
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