const ContentPages = require('../models/contentPagesTable.js');
const User = require('../models/userTable');
const mailgunSendEmail = require('../lib/mailgunSendEmail');
const Store = require('../models/storeTable');

const ObjectId = require('objectid');

module.exports = {

    getContentPagesList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, search, fields } = req.body
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
            if (obj.hasOwnProperty("deviceType") && obj.deviceType === "mobile") {
                obj['$or'] = [];
                obj['$or'].push({ deviceType: { $eq: "mobile" } })

                delete obj.deviceType
            }
            else {
                obj['$or'] = [];
                obj['$or'].push({ deviceType: { $eq: "web" } })
                obj['$or'].push({ deviceType: { $eq: null } })

                delete obj.deviceType
            }

            {
                $or: [{ deviceType: { $eq: "web" } }, { deviceType: { $eq: null } }]
            }

            if (search) {
                obj['$or'] = [];
                obj['$or'].push({ type: { $regex: search || '', $options: 'i' } })
                obj['$or'].push({ content: { $regex: search || '', $options: 'i' } })
            }

            let count = await ContentPages.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            ContentPages.geContentPagessWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let countdata = count[0] ? count[0].count : 0;
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
                }
            });
        }
        catch (err) {
            console.log("err :", err);

            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addContentPagesData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
            let user = req.user;
            data.user = user._id;

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            };

            if (!data.deviceType) {
                return res.json(helper.showValidationErrorResponse('DEVICE_TYPE_IS_REQUIRED'));
            };
            if (!["web", "mobile"].includes(data.deviceType.toLocaleLowerCase()))
                return res.json(helper.showValidationErrorResponse('DEVICE_TYPE_IS_WRONG'));

            if (!data.content) {
                return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            ContentPages.addContentPages(data, (err, resdata) => {
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

    getContentPagesDetailsById: async (req, res) => {
        try {
            let id = req.params._id;

            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            ContentPages.getContentPagesById(id, (err, resdata) => {
                if (err) {
                    console.log("err", err);
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_DETAIL', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateContentPagestData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.content) {
                return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            ContentPages.updateContentPages(data, (err, resdata) => {
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

    removeContentPagestData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ContentPages_ID_IS_REQUIRED'));
            }

            data.status = "archived";

            ContentPages.updateContentPages(data, (err, resdata) => {
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

            ContentPages.updateStatusByIds(data, update, (err, resdata) => {
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
    },

    getContentByConstant: async (req, res) => {
        try {
            let store = req.store;
            console.log("path--data", req.path)
            let path = req.path.replace('/', '').trim();
            let obj = {};
            obj.store = ObjectId(store.storeId);
            console.log("path--", path)
            switch (path) {
                case 'aboutus':
                    obj.type = 'ABOUT_US';
                    break;
                case 'tac':
                    obj.type = 'TERMS_CONDITIONS';
                    break;
                case 'privacypolicy':
                    obj.type = 'PRIVACY_POLICY';
                    break;
                case 'refundpolicy':
                    obj.type = 'REFUND_POLICY';
                    break;
                case 'contactus':
                    obj.type = 'CONTACT_US';
                    break;
                case 'homepage':
                    obj.type = 'HOMEPAGE';
                    break;
                case 'drivercontent':
                    obj.type = 'DRIVERPAGE';
                    break;
                case 'vendorcontent':
                    obj.type = 'VENDORPAGE';
                    break;
                default:
                    obj.type = 'OTHER';
                    break;
            }
            ContentPages.getContentPagesByType(obj, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_DETAIL', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getContentByParms: async (req, res) => {
        try {
            let store = req.store;
            let path = req.params.slug
            let obj = {}
            obj.store = ObjectId(store.storeId);
            switch (path) {
                case 'aboutus':
                    obj.type = 'ABOUT_US';
                    break;
                case 'tac':
                    obj.type = 'TERMS_CONDITIONS';
                    break;
                case 'privacypolicy':
                    obj.type = 'PRIVACY_POLICY';
                    break;
                case 'refundpolicy':
                    obj.type = 'REFUND_POLICY';
                    break;
                case 'contactus':
                    obj.type = 'CONTACT_US';
                    break;
                case 'homepage':
                    obj.type = 'HOMEPAGE';
                    break;
                case 'drivercontent':
                    obj.type = 'DRIVERPAGE';
                    break;
                case 'vendorcontent':
                    obj.type = 'VENDORPAGE';
                    break;
                default:
                    obj.type = 'OTHER';
                    break;
            }
            ContentPages.getContentPagesByType(obj, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_DETAIL', resdata));
                }
            });
        } catch (error) {
            console.log("error--", error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    sendEmailToStoreAdmin: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            }

            if (!data.email) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            }

            if (!data.mobileNumber) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            }

            if (!data.msg) {
                return res.json(helper.showValidationErrorResponse('MESSAGE_IS_REQUIRED'));
            }

            let getStore = await Store.findById(store.storeId, 'mailgun')
            let mailgunKey = {}
            if (getStore && getStore.mailgun)
                mailgunKey = getStore.mailgun
            let to = '';

            if (store.supportEmail) {
                to = store.supportEmail;
            }

            if (to == '') {
                return res.json(helper.showValidationErrorResponse('SOMETHING_WRONG'));
            }

            let subject = store.storeName + ' Contact Us Form'

            let body = '';

            body += '<p>Name: ' + data.name + '</p>';
            body += '<p>Email: ' + data.email + '</p>';
            body += '<p>Mobile Number: ' + data.mobileNumber + '</p>';
            body += '<p>Message: ' + data.msg + '</p>';
            var senemail = await mailgunSendEmail.sendSupportEmail(mailgunKey, to, subject, body);

            res.json(helper.showSuccessResponse('MESSAGE_SENT', {}));

        } catch (error) {
            console.log("error", error)
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}