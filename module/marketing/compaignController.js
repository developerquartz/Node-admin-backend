const compaignTemplate = require('./compaignTemplateTable');
const agenda = require('../../cron/agenda');
const ObjectId = require('objectid');
const analytics = require('./analytics')
const Campaign = require('./compaignTable');
const logTable = require('../../models/logTable');
const storeTable = require('../../models/storeTable');

module.exports = {

    addCompaignData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
            let user = req.user;
            data.user = user._id;

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!data.template) {
                return res.json(helper.showValidationErrorResponse('TEMPLATE_IS_REQUIRED'));
            };

            if (!data.audianceType) {
                return res.json(helper.showValidationErrorResponse('AUDIANCE_IS_REQUIRED'));
            };

            if (!data.audianceFilter) {
                return res.json(helper.showValidationErrorResponse('AUDIANCE_FILTER_IS_REQUIRED'));
            };

            if (!data.scheduledDate) {
                return res.json(helper.showValidationErrorResponse('SCHEDULE_DATE_IS_REQUIRED'));
            }

            if (!data.scheduledTime) {
                return res.json(helper.showValidationErrorResponse('SCHEDULE_TIME_IS_REQUIRED'));
            }

            if (!helper.isValidDate(data.scheduledDate, "YYYY-MM-DD")) {
                return res.json(helper.showValidationErrorResponse('CORRECT_DATE_FORMAT'));
            }

            const getScheduleData = helper.getScheduleData("YYYY-MM-DD", data.scheduledDate, data.scheduledTime, store.timezone);

            console.log("getSchedule Data Add Compaign", getScheduleData);

            if (getScheduleData.scheduled_utc.getTime() < getScheduleData.currentUTC.getTime()) {
                return res.json(helper.showValidationErrorResponse('BOOKING_NOT_ALLOWED'));
            }
            const getDocTemplate = await compaignTemplate.findById(ObjectId(data.template));

            let storeData;

            if (process.env.NODE_ENV === "production") {
                storeData = await storeTable.findById(data.store, 'domain twilio mailgun firebase')
                if (storeData.domain != "main.projectNamestore.com" && getDocTemplate.type === "sms" && storeData.twilio.authToken === env.twilio.authToken)
                    return res.json(helper.showValidationErrorResponse('PLEASE_ADD_TWILIO_KEYS'));
                if (storeData.domain != "main.projectNamestore.com" && getDocTemplate.type === "email" && storeData.mailgun.MAILGUN_API_KEY === env.mailgun.MAILGUN_API_KEY)
                    return res.json(helper.showValidationErrorResponse('PLEASE_ADD_MAILGUN_KEYS'));
                if (storeData.domain != "main.projectNamestore.com" && getDocTemplate.type === "push" && storeData.firebase.FCM_APIKEY === env.firebase.FCM_APIKEY)
                    return res.json(helper.showValidationErrorResponse('PLEASE_ADD_FIREBASE_KEYS'));
            }

            data.scheduledDate = getScheduleData.scheduledDate;
            data.scheduledTime = getScheduleData.scheduledTime;
            data.scheduled_utc = getScheduleData.scheduled_utc;
            data.date_created_utc = new Date();
            if (data.days)
                data.audianceFilterDate = data.days

            if (data.audianceFilter != "all" && !data.audianceFilterDate) {
                return res.json(helper.showValidationErrorResponse('FILTER_DATE_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            Campaign.addCompaign(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let cs = await agenda.schedule(resdata.scheduled_utc, 'store campaign', { id: resdata._id });
                    console.log("cs", cs);
                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addCompaignTemplateData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
            let user = req.user;
            data.user = user._id;

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            };

            if (!data.subject) {
                return res.json(helper.showValidationErrorResponse('SUBJECT_IS_REQUIRED'));
            };

            if (!data.body) {
                return res.json(helper.showValidationErrorResponse('BODY_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            compaignTemplate.addCompaignTemplate(data, (err, resdata) => {
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

    getCompaignTemplateDetailsById: async (req, res) => {
        try {
            var template = req.params._id;

            if (!template) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            let getDocTemplate = await compaignTemplate.findById(template);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            return res.json(helper.showSuccessResponse('DATA_SUCCESS', getDocTemplate));

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getCompaignDetailsById: async (req, res) => {
        try {
            var template = req.params._id;

            if (!template) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            let getDocTemplate = await Campaign.findById(template);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            Campaign.getCompaignById(template, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateCompaigntData: async (req, res) => {
        try {
            var data = req.body;
            let store = req.store;
            data.store = store.storeId;
            let user = req.user;
            data.user = user._id;

            let getDocTemplate = await Campaign.findById(data._id);

            const getDocTemplateData = await compaignTemplate.findById(getDocTemplate.template);

            let storeData;

            if (process.env.NODE_ENV === "production") {
                storeData = await storeTable.findById(data.store, 'domain twilio mailgun firebase')
                if (storeData.domain != "main.projectNamestore.com" && getDocTemplate.type === "sms" && storeData.twilio.authToken === env.twilio.authToken)
                    return res.json(helper.showValidationErrorResponse('PLEASE_ADD_TWILIO_KEYS'));
                if (storeData.domain != "main.projectNamestore.com" && getDocTemplate.type === "email" && storeData.mailgun.MAILGUN_API_KEY === env.mailgun.MAILGUN_API_KEY)
                    return res.json(helper.showValidationErrorResponse('PLEASE_ADD_MAILGUN_KEYS'));
                if (storeData.domain != "main.projectNamestore.com" && getDocTemplate.type === "push" && storeData.firebase.FCM_APIKEY === env.firebase.FCM_APIKEY)
                    return res.json(helper.showValidationErrorResponse('PLEASE_ADD_FIREBASE_KEYS'));
            }

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!data.template) {
                return res.json(helper.showValidationErrorResponse('TEMPLATE_IS_REQUIRED'));
            };

            if (!data.audianceType) {
                return res.json(helper.showValidationErrorResponse('AUDIANCE_IS_REQUIRED'));
            };

            if (!data.audianceFilter) {
                return res.json(helper.showValidationErrorResponse('AUDIANCE_FILTER_IS_REQUIRED'));
            };

            if (!data.scheduledDate) {
                return res.json(helper.showValidationErrorResponse('SCHEDULE_DATE_IS_REQUIRED'));
            }

            if (!data.scheduledTime) {
                return res.json(helper.showValidationErrorResponse('SCHEDULE_TIME_IS_REQUIRED'));
            }

            if (!helper.isValidDate(data.scheduledDate, "YYYY-MM-DD")) {
                return res.json(helper.showValidationErrorResponse('CORRECT_DATE_FORMAT'));
            }

            const getScheduleData = helper.getScheduleData("YYYY-MM-DD", data.scheduledDate, data.scheduledTime, store.timezone);

            // console.log("getScheduleData", getScheduleData);

            if (getScheduleData.scheduled_utc.getTime() < getScheduleData.currentUTC.getTime()) {
                return res.json(helper.showValidationErrorResponse('BOOKING_NOT_ALLOWED'));
            }

            data.scheduledDate = getScheduleData.scheduledDate;
            data.scheduledTime = getScheduleData.scheduledTime;
            data.scheduled_utc = getScheduleData.scheduled_utc;

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };
            if (data.days)
                data.audianceFilterDate = data.days

            if (data.audianceFilter != "all" && !data.audianceFilterDate) {
                return res.json(helper.showValidationErrorResponse('FILTER_DATE_IS_REQUIRED'));
            };

            Campaign.updateCompaign(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let jobCreated = await agenda.schedule(resdata.scheduled_utc, 'store campaign', { id: resdata._id });
                    console.log("jobCreated:",jobCreated)
                    res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
                }
            });
        } catch (error) {
            console.log("error :", error);

            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateCompaigntTemplateData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getDocTemplate = await compaignTemplate.findById(data._id);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            };

            if (!data.subject) {
                return res.json(helper.showValidationErrorResponse('SUBJECT_IS_REQUIRED'));
            };

            if (!data.body) {
                return res.json(helper.showValidationErrorResponse('BODY_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            compaignTemplate.updateCompaignTemplate(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removeCompaigntData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            Campaign.updateCompaign(data, (err, resdata) => {
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

    removeCompaigntTemplateData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            compaignTemplate.updateCompaignTemplate(data, (err, resdata) => {
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

    CompaignList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields, search } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            const store = req.store;
            let obj = {};
            obj.store = ObjectId(store.storeId);

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

            let count = await Campaign.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Campaign.geCompaignsWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    CompaignTemplateList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields, search } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            const store = req.store;
            let obj = {};
           
            obj.store = ObjectId(store.storeId);

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

            let count = await Campaign.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            compaignTemplate.getCompaignTemplatesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        } catch (error) {
            console.log("err", error);
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

            Campaign.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateStatusTemplate: async (req, res) => {
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
            // console.log("data :", data);
            // console.log("data :", data);

            compaignTemplate.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    smsCallback: async (req, res) => {
        try {
            let data = req.body;

            console.log("sms data", data);

        } catch (error) {
            console.log("err", error);
        }
    },
    getCampaignEmailStats: async (req, res) => {
        try {
            let data = req.body;

            if (!data.id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            var getCampaign = await Campaign.findById(ObjectId(data.id)).populate('template').populate({ path: 'store', select: 'storeName slug mailgun twilio firebase' }).exec();
            // console.log("getCampaign :", getCampaign);

            let logData = await logTable.findOne({ campaignId: data.id });
            if (logData && !logData.isLogCompleted)
                return res.json(helper.showSuccessResponse('SUCCESS', logData));
            else {
                let successCount = 0;
                let failureCount = 0;
                let totalCount = 0;
                let notProcessed = 0;
                let analyticsData = await analytics.getMailgunStats(getCampaign.store.mailgun, getCampaign)
                // console.log("analyticsData :", analyticsData.stats.stats);

                if (analyticsData.status && analyticsData.stats.stats.length > 0) {

                    await Promise.all(analyticsData["stats"].stats.map(item => {
                        if (item["accepted"]["total"] > 0) {
                            totalCount = item["accepted"]["total"];
                            successCount = item["delivered"]["total"];
                            failureCount = item["failed"]["temporary"]["total"] + item["failed"]["permanent"]["total"];
                        }

                    }))
                    let resData = { successCount: successCount, failureCount: failureCount, totalCount: totalCount }
                    let analytic = await analytics.addCampaignStat(getCampaign, resData, notProcessed)
                    if (analytic)
                        return res.json(helper.showSuccessResponse('SUCCESS', analytic));

                } else
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));

            }
        } catch (error) {
            console.log("error :", error);

            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
}