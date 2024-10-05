const ObjectId = require('objectid');
const emailService = require('../utility/emailService')
const disputeService = require('../services/disputeQuery');
const Order = require('../../../models/ordersTable')
const File = require('../../../models/fileTable')

module.exports = {

    addDispute: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user
            let store = req.store
            data.store = store.storeId;
            data.user = user._id;
            data.date_created_utc = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(data.date_created_utc, store.timezone);
            data.date_created = CurrentCityTime.format('MM-DD-YYYY');
            data.time_created = CurrentCityTime.format('LT');
            if (!data.orderId) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_REQUIRED'));
            }
            console.log("Dispute data===>", data)
            Order.getOrderById(ObjectId(data.orderId), async (error, result) => {
                if (error) {
                    console.log(error)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", error));
                }
                else {
                    data.storeType = result.storeType._id
                    if (!result.disputeId) {
                        disputeService.addDispute(data, async (err, resdata) => {
                            if (err) {
                                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                await Order.updateOne({ _id: ObjectId(data.orderId) }, { disputeId: resdata._id })
                                //await File.find({_id:{$in:resdata.}})
                                emailService.createDisputeEmail(user, data, store, result)
                                return res.json(helper.showSuccessResponse('Dispute successfully added', resdata));
                            }
                        })
                    }
                    else {
                        return res.json(helper.showDatabaseErrorResponse("Dispute Already added"));
                    }
                }
            })

        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getDisputeWithFilter: async (req, res) => {
        try {
            let data = req.body
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let obj = {};
            obj.store = req.store.storeId
            if (data.fields && data.fields.length > 0) {
                data.fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (data.search) {
                obj['$or'] = [];
                obj['$or'].push({ label: { $regex: data.search || '', $options: 'i' } });
            }
            let count = await disputeService.countdata(obj)
            let totalcount = count.length > 0 ? count[0].count : 0;
            disputeService.getPastDispute(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    console.log(err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, totalcount));
                }
            })
        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getDisputeWithFilterbyUser: async (req, res) => {
        try {
            let data = req.body
            let user = req.user
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || "date_created_utc";
            const sortOrder = data.order || -1;
            const paged = data.page || 1;
            let obj = {};
            obj.user = user._id
            if (data.fields && data.fields.length > 0) {
                data.fields.forEach(element => {
                    if (element.fieldName && element.fieldValue) {
                        obj[element.fieldName] = element.fieldValue;
                    }
                });
            }

            if (data.search) {
                obj['$or'] = [];
                obj['$or'].push({ label: { $regex: data.search || '', $options: 'i' } });
            }
            let count = await disputeService.countdata(obj)
            let totalcount = count.length > 0 ? count[0].count : 0;
            disputeService.getPastDispute(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    console.log(err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata, totalcount));
                }
            })
        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addDisputeReply: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user
            let store = req.store
            console.log("profile")
            console.log(user.profileImage)
            let current_date = new Date();
            let CurrentCityTime = helper.getDateAndTimeInCityTimezone(current_date, store.timezone);
            let date_created = CurrentCityTime.format('MM-DD-YYYY');
            let time_created = CurrentCityTime.format('LT');
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('Dispute id is required'));
            }
            if (data.replyId) {
                data.date_modified_utc = current_date;
                data['$set'] = { "reply.$.message": data.message, "reply.$.replyBy": user.role, "reply.$.date_created": date_created, "reply.$.time_created": time_created, "reply.$.date_created_utc": current_date }
            }
            else if (data.message) {
                let obj = {}
                obj.date_created = date_created;
                obj.time_created = time_created;
                obj.message = data.message
                obj.replyBy = user.role,
                    obj.date_created_utc = current_date
                obj.user = user._id
                obj.image = user.profileImage ? user.profileImage.link : ""
                data['$push'] = { reply: obj, $sort: { date_created_utc: 1 } }
            }
            else {
                return res.json(helper.showValidationErrorResponse('MESSAGE_IS_REQUIRED'));
            }
            disputeService.addDisputeReply(data, (err, resdata) => {
                if (err) {
                    console.log(err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata) {
                        return res.json(helper.showSuccessResponse('Reply Added', resdata));
                    }
                    else {
                        return res.json(helper.showDatabaseErrorResponse('Not available to edit', {}));
                    }
                }
            })
        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateDispute: async (req, res) => {
        try {
            var data = req.body;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('DISPUTE_ID_IS_REQUIRED'));
            }
            disputeService.updateDisputeById(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('Update Successfuly', resdata));
                }
            })
        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getDisputeById: async (req, res) => {
        try {
            let data = {
                disputeId: req.params._id
            }
            if (!data.disputeId) {
                return res.json(helper.showValidationErrorResponse('Dispute id is required'));
            }
            disputeService.getDisputeById(ObjectId(data.disputeId), (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('Dispute Detail', resdata));
                }
            })
        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    deleteDisputeReply: async (req, res) => {
        try {
            var data = req.body;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('Dispute id is required'));
            }
            if (!data.replyId) {
                return res.json(helper.showValidationErrorResponse('REPLYID_IS_REQUIRED'));
            }
            data['$pull'] = { reply: { _id: ObjectId(data.replyId) } }
            disputeService.addDisputeReply(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata) {
                        return res.json(helper.showSuccessResponse('Reply Deleted', resdata));
                    }
                    else {
                        return res.json(helper.showValidationErrorResponse('Already Deleted', {}));
                    }
                }
            })
        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    deleteDispute: async (req, res) => {
        try {
            let data = req.body;
            if (!data.orderId) {
                return res.json(helper.showValidationErrorResponse('ORDER_ID_REQUIRED'));
            }
            Order.getOrderById(ObjectId(data.orderId), async (error, result) => {
                if (error) {
                    console.log(error)
                    return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
                }
                else {
                    if (result.disputeId) {
                        disputeService.removedispute(result.disputeId, async (err, resdata) => {
                            if (err) {
                                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                            } else {
                                await Order.updateOne({ _id: ObjectId(data.orderId) }, { disputeId: null })
                                return res.json(helper.showSuccessResponse('Dispute successfully deleted'));
                            }
                        })
                    }
                    else {
                        return res.json(helper.showDatabaseErrorResponse("Dispute Not found on particular order"));
                    }
                }
            })

        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }

}