const DocumentTemplate = require('../models/documentTemplate.js');
const User = require('../models/userTable.js');
const Document = require('../models/documentsTable');
const upload = require('../lib/awsimageupload.js');
const imageUpload = upload.any();
const ObjectId = require('objectid');
const formField = require('../models/formFieldsTable');
const Auth = require('../middleware/auth');
const terminology = require('../helper/terminology.js')

module.exports = {

    addDocumentTemplateData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!data.role) {
                return res.json(helper.showValidationErrorResponse('ROLE_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            DocumentTemplate.addDocumentTemplate(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                    terminology.addTerminologyByDocTemplate(resdata.store, resdata.role, resdata.name, "add");

                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    archiveDocumentTemplateData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('attributeTerm_ID_IS_REQUIRED'));
            }
            let getDoc = await DocumentTemplate.findById(data._id).populate("fields")
            data.status = "archived";

            DocumentTemplate.updateDocumentTemplate(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                    terminology.deleteTerminologyByDocTemplate(getDoc);
                }
            });
        } catch (error) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getDocumentTemplateDetailsById: async (req, res) => {
        try {
            var template = req.params._id;

            if (!template) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            let getDocTemplate = await DocumentTemplate.findById(template);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            formField.getFormFieldsByTemplate(template, (err, fields) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let resdata = {
                        template: getDocTemplate,
                        fields: fields
                    }
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateDocumentTemplatetData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getDocTemplate = await DocumentTemplate.findById(data._id);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!data.role) {
                return res.json(helper.showValidationErrorResponse('ROLE_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            DocumentTemplate.updateDocumentTemplate(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
                    terminology.addTerminologyByDocTemplate(getDocTemplate.store, getDocTemplate.role, data.name, "update", getDocTemplate.name)

                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removeDocumentTemplatetData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            DocumentTemplate.updateDocumentTemplate(data, (err, resdata) => {
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

    removeDocumentFieldData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";
            let getFormField = await formField.findById(data._id).populate("template")
            formField.updateFormField(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let refData = {
                        template: resdata.template,
                        ref: data._id
                    }
                    DocumentTemplate.removeRefToFields(refData);
                    res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                    terminology.addTerminologyByDocTemplate(getFormField.template.store, getFormField.template.role, getFormField.label, "remove")
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    DocumentTemplateList: async (req, res) => {
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

            let count = await DocumentTemplate.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            DocumentTemplate.geDocumentTemplatesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
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

    addDocumentTemplatetField: async (req, res) => {
        try {
            let data = req.body;

            if (!data.template) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getDocTemplate = await DocumentTemplate.findById(data.template);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            if (!data.label) {
                return res.json(helper.showValidationErrorResponse('LABEL_IS_REQUIRED'));
            }

            if (!data.validation) {
                return res.json(helper.showValidationErrorResponse('IS_REQUIRED'));
            }

            formField.addFormField(data, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let refData = {
                        template: data.template,
                        ref: resdata._id
                    }
                    DocumentTemplate.AddRefToFields(refData);
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                    await terminology.addTerminologyByDocTemplate(getDocTemplate.store, getDocTemplate.role, data.label, "add")

                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    editDocumentTemplatetField: async (req, res) => {
        try {
            let data = req.params;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getDocTemplate = await formField.findById(ObjectId(data._id));

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }
            return res.json(helper.showSuccessResponse('DATA_SUCCESS', getDocTemplate));
        } catch (error) {
            console.log("err----", error)
            return res.json(helper.showValidationErrorResponse(error.message));
            //return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    updateDocumentTemplatetField: async (req, res) => {
        try {
            let data = req.body;
            if (!data.id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            if (!data.template) {
                return res.json(helper.showValidationErrorResponse('TEMPLATE_ID_IS_REQUIRED'));
            }
            let getFormField = await formField.findById(data.id)
            let getDocTemplate = await DocumentTemplate.findById(data.template);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            if (!data.label) {
                return res.json(helper.showValidationErrorResponse('LABEL_IS_REQUIRED'));
            }

            if (!data.validation) {
                return res.json(helper.showValidationErrorResponse('IS_REQUIRED'));
            }
            let resdata = await formField.findOneAndUpdate({ _id: ObjectId(data.id), status: { $ne: "archived" } }, data, { new: true })
            res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
            terminology.addTerminologyByDocTemplate(getDocTemplate.store, getDocTemplate.role, data.label, "update", getFormField.label)

            // formField.addFormField(data, (err, resdata) => {
            //     if (err) {
            //         return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
            //     } else {
            //         let refData = {
            //             template: data.template,
            //             ref: resdata._id
            //         }
            //         DocumentTemplate.AddRefToFields(refData);

            //         return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
            //     }
            // });
        } catch (error) {
            console.log("err----", error)
            return res.json(helper.showValidationErrorResponse(error.message));
            //return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getDriverDocTemplate: async (req, res) => {
        try {
            const { orderBy, order, page, limit } = req.body
            var pageSize = limit || 50;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;

            if (!req.store) {
                return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
            }

            const store = req.store;
            let auth = req.get('Authorization');
            let doc = false;
            let getDoc = null;
            console.log("auth", auth);
            if (auth) {
                let authverify = await Auth.authVerify(req);

                if (authverify == null) {
                    return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
                }

                getDoc = await Document.findOne({ user: ObjectId(authverify._id) });

                if (getDoc != null) {
                    doc = true;
                }
            }
            let obj = {};
            obj.store = ObjectId(store.storeId);

            // if (!obj.hasOwnProperty("status")) {
            //     obj.status = { $ne: "archived" };
            // }

            obj.role = "DRIVER";
            obj.status = "active";
            console.log("obj :", obj);

            DocumentTemplate.getDriverDocumentTemplatesWithFilter(obj, async (err, resdata) => {
                if (err) {
                    console.log("err ", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    if (resdata.length > 0) {
                        await Promise.all(resdata.map(templates => {

                            if (doc && getDoc.complete) {
                                let getDocDatac = getDoc.complete.filter(ele => {
                                    return ele.template === templates._id.toString();
                                });
                                if (getDocDatac.length > 0) {
                                    templates.isComplete = getDocDatac[0].isComplete;
                                }
                            }

                            if (templates.fields.length > 0) {
                                templates.fields.forEach(element => {
                                    //console.log("element", element);
                                    let value = '';
                                    if (doc) {
                                        let getDocData = getDoc.values.filter(ele => {
                                            return ele.name === element.name;
                                        });
                                        if (getDocData.length > 0) {
                                            value = getDocData[0].value;

                                            if (element.type === 'checkbox') {
                                                element['options'] = getDocData[0].options;
                                            }
                                        }
                                    }
                                    element['value'] = value;
                                });
                            }
                        }));
                    }
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getVendorDocTemplate: async (req, res) => {
        try {
            const { orderBy, order, page, limit } = req.body
            var pageSize = limit || 50;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            const store = req.store;
            let auth = req.get('Authorization');
            let doc = false;
            let getDoc = null;
            console.log("auth", auth);
            if (auth) {
                let authverify = await Auth.authVerify(req);

                if (authverify == null) {
                    return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
                }

                getDoc = await Document.findOne({ user: ObjectId(authverify._id) });

                if (getDoc != null) {
                    doc = true;
                }
            }
            let obj = {};
            obj.store = ObjectId(store.storeId);
            obj.status = "active";
            obj.role = "VENDOR";

            DocumentTemplate.getDriverDocumentTemplatesWithFilter(obj, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {

                    if (resdata.length > 0) {
                        await Promise.all(resdata.map(templates => {

                            if (doc && getDoc.complete) {
                                let getDocDatac = getDoc.complete.filter(ele => {
                                    return ele.template === templates._id.toString();
                                });
                                if (getDocDatac.length > 0) {
                                    templates.isComplete = getDocDatac[0].isComplete;
                                }
                            }

                            if (templates.fields.length > 0) {
                                templates.fields.forEach(element => {
                                    //console.log("element", element);
                                    let value = '';
                                    if (doc) {
                                        let getDocData = getDoc.values.filter(ele => {
                                            return ele.name === element.name;
                                        });
                                        if (getDocData.length > 0) {
                                            value = getDocData[0].value;

                                            if (element.type === 'checkbox') {
                                                element['options'] = getDocData[0].options;
                                            }
                                        }
                                    }
                                    element['value'] = value;
                                });
                            }
                        }));
                    }
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    deleteDocTemplateFieldsData: async (req, res) => {
        try {
            let data = req.body;
            let ids = [];
            let update = {};

            if (data._id.constructor === Array) {
                if (data._id.length === 0) {
                    return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
                }

                if (!data.status) {
                    return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
                }

                data._id.forEach(element => {
                    ids.push(ObjectId(element));
                });

                update.status = data.status;

            } else {
                ids.push(ObjectId(data._id));
                update.status = 'archived';
            }

            data._id = ids;

            DocumentTemplate.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateDriverDoc: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getDocTemplate = await DocumentTemplate.findById(data._id);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (data.fields.length === 0) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            data.user = user._id;

            let values = [];

            await Promise.all(data.fields.map(field => {
                let obj = {
                    name: field.name,
                    value: field.value
                }
                if (field.type === 'checkbox') {
                    obj.options = field.options;
                }
                values.push(obj);
            }));

            console.log("values doc", values);

            let getDoc = await Document.findOne({ user: ObjectId(data.user) });

            // console.log("getDoc", getDoc);

            let output = [];
            let completeO = [];
            let complete = [];
            complete.push({ template: data._id.toString(), isComplete: data.isComplete });

            if (getDoc != null) {
                output = values.concat(
                    getDoc.values.filter(s =>
                        !values.find(t => t.name == s.name)
                    )//end filter 
                );//end concat

                if (getDoc.complete && getDoc.complete.length > 0) {
                    completeO = complete.concat(
                        getDoc.complete.filter(s =>
                            !complete.find(t => t.template == s.template)
                        )//end filter 
                    );//end concat
                } else {
                    completeO = complete;
                }
            } else {
                output = values;
                completeO = complete;
            }

            let doc = await Document.findOneAndUpdate({ user: ObjectId(data.user) }, { complete: completeO, values: output, date_created_utc: new Date() }, { upsert: true, new: true });

            console.log("doc", doc);

            res.json(helper.showSuccessResponse('DATA_SUCCESS', doc));

        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    updateOtherCumstomerDoc: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            let isComplete = data.isComplete != undefined ? data.isComplete : true;
            // if (!data._id) {
            //     return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            // }

            let getDocTemplate = await DocumentTemplate.findOne({ role: "USER", status: "active", store: store.storeId });

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (data.fields.length === 0) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            data.user = user._id;

            let values = [];

            await Promise.all(data.fields.map(field => {
                let obj = {
                    name: field.name,
                    value: field.value,
                    type: field.type,
                    options: field.options,
                    label: field.label
                }
                if (field.type === 'checkbox') {
                    obj.options = field.options;
                }
                values.push(obj);
            }));

            console.log("values doc", values);

            let getDoc = await Document.findOne({ user: ObjectId(data.user) });

            // console.log("getDoc", getDoc);

            let output = [];
            let completeO = [];
            let complete = [];
            complete.push({ template: getDocTemplate._id.toString(), isComplete: isComplete });

            if (getDoc != null) {
                output = values.concat(
                    getDoc.values.filter(s =>
                        !values.find(t => t.name == s.name)
                    )//end filter 
                );//end concat

                if (getDoc.complete && getDoc.complete.length > 0) {
                    completeO = complete.concat(
                        getDoc.complete.filter(s =>
                            !complete.find(t => t.template == s.template)
                        )//end filter 
                    );//end concat
                } else {
                    completeO = complete;
                }
            } else {
                output = values;
                completeO = complete;
            }
            let fieldarr = []
            let doc = await Document.findOneAndUpdate({ user: ObjectId(data.user) }, { complete: completeO, values: output, date_created_utc: new Date() }, { upsert: true, new: true });
            if (doc && doc.values && doc.values.length > 0) {
                fieldarr = doc.values
            }
            //console.log("doc", doc);

            res.json(helper.showSuccessResponse('UPDATE_SUCCESS', fieldarr));

        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addUserDocuments: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            if (req.documentDetails.values && req.documentDetails.values.length > 0) {
                let doc = await Document.create({
                    user: user._id,
                    values: req.documentDetails.values,
                    complete: req.documentDetails.complete,
                    date_created_utc: new Date(),
                });
                await User.findByIdAndUpdate(user._id, { $set: {} })
                res.json(helper.showSuccessResponse('UPDATE_SUCCESS', doc));
            } else {
                return res.json(
                    helper.showValidationErrorResponse("INVALID_TEMPLATE")
                );
            }
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateVendorDoc: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getDocTemplate = await DocumentTemplate.findById(data._id);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (data.fields.length === 0) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            data.user = user._id;

            let values = [];

            await Promise.all(data.fields.map(field => {
                let obj = {
                    name: field.name,
                    value: field.value
                }
                if (field.type === 'checkbox') {
                    obj.options = field.options;
                }
                values.push(obj);
            }));

            console.log("values doc", values);

            let getDoc = await Document.findOne({ user: ObjectId(data.user) });

            // console.log("getDoc", getDoc);

            let output = [];
            let completeO = [];
            let complete = [];
            complete.push({ template: data._id.toString(), isComplete: data.isComplete });

            if (getDoc != null) {
                output = values.concat(
                    getDoc.values.filter(s =>
                        !values.find(t => t.name == s.name)
                    )//end filter 
                );//end concat

                if (getDoc.complete && getDoc.complete.length > 0) {
                    completeO = complete.concat(
                        getDoc.complete.filter(s =>
                            !complete.find(t => t.template == s.template)
                        )//end filter 
                    );//end concat
                } else {
                    completeO = complete;
                }
            } else {
                output = values;
                completeO = complete;
            }

            let doc = await Document.findOneAndUpdate({ user: ObjectId(data.user) }, { complete: completeO, values: output, date_created_utc: new Date() }, { upsert: true, new: true });

            console.log("doc", doc);

            res.json(helper.showSuccessResponse('DATA_SUCCESS', doc));

        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    sortOrder: async (req, res) => {
        try {
            let data = req.body;

            if (data.sortOrder.length === 0) {
                return res.json(helper.showValidationErrorResponse('SORT_ORDER_IS_REQUIRED'));
            }

            await Promise.all(data.sortOrder.map(async element => {
                await formField.findOneAndUpdate({ _id: element._id }, { sortOrder: element.sortOrder });
            }));

            res.json(helper.showSuccessResponse('UPDATE_SUCCESS', {}));
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserDocuments: async (req, res) => {
        try {
            const { user, role, orderBy, order, page, limit } = req.body
            var pageSize = limit || 10;
            var sortByField = orderBy || "date_created_utc";
            var sortOrder = order || -1;
            var paged = page || 1;
            const store = req.store;

            if (!user) {
                return res.json(helper.showValidationErrorResponse('USER_ID_IS_REQUIRED'));
            }

            if (!role) {
                return res.json(helper.showValidationErrorResponse('ROLE_IS_REQUIRED'));
            }

            let obj = {};
            obj.store = ObjectId(store.storeId);

            if (!obj.hasOwnProperty("status")) {
                obj.status = { $ne: "archived" };
            }

            if (role) {
                obj.role = role;
                if (store.storeVersion > 1) {
                    obj.type = { $ne: "vehicleInfo" }
                }
            }

            DocumentTemplate.geDocumentTemplatesWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getUserDocumentView: async (req, res) => {
        try {
            let data = req.body;
            let doc = false;
            let getDoc = null;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.user) {
                return res.json(helper.showValidationErrorResponse('USER_ID_IS_REQUIRED'));
            }

            getDoc = await Document.findOne({ user: ObjectId(data.user) });

            if (getDoc != null) {
                doc = true;
            }

            let templates = await DocumentTemplate.findById(data._id).populate({ path: 'fields', options: { sort: { sortOrder: 1 } } }).exec();

            let _templates = { ...templates._doc }

            if (templates.fields.length > 0) {
                let _fields = []
                templates.fields.forEach(element => {
                    let el = JSON.parse(JSON.stringify(element))

                    //console.log("element", element);
                    let value = '';
                    if (doc) {
                        let getDocData = getDoc.values.filter(ele => {
                            return ele.name === element.name;
                        });
                        if (getDocData.length > 0) {
                            value = getDocData[0].value;

                            if (element.type === 'checkbox') {
                                el['options'] = getDocData[0].options;
                            }
                        }
                    }
                    el['value'] = value;
                    _fields.push(el)
                });

                _templates.fields = _fields
            }

            res.json(helper.showSuccessResponse('DATA_SUCCESS', _templates));

        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addOrUpdateUserDocument: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getDocTemplate = await DocumentTemplate.findById(data._id);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (!data.user) {
                return res.json(helper.showValidationErrorResponse('USER_ID_IS_REQUIRED'));
            }

            if (data.fields.length === 0) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            let values = [];

            await Promise.all(data.fields.map(field => {
                let obj = {
                    name: field.name,
                    value: field.value
                }
                if (field.type === 'checkbox') {
                    obj.options = field.options;
                }
                values.push(obj);
            }));

            console.log("values doc", values);

            let getDoc = await Document.findOne({ user: ObjectId(data.user) });

            // console.log("getDoc", getDoc);

            let output = [];

            if (getDoc != null) {
                output = values.concat(
                    getDoc.values.filter(s =>
                        !values.find(t => t.name == s.name)
                    )//end filter 
                );//end concat
            } else {
                output = values;
            }

            let doc = await Document.findOneAndUpdate({ user: ObjectId(data.user) }, { values: output, date_created_utc: new Date() }, { upsert: true, new: true });

            console.log("doc", doc);

            res.json(helper.showSuccessResponse('DATA_SUCCESS', doc));

        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    userRegisterDocumentTemplates: async (req, res) => {
        try {
            const store = req.store;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            obj.role = "USER";
            obj.status = "active";
            let isHostDoc = req.body.isHostDoc || false
            if (isHostDoc) {
                obj.role = "HOST";
            }
            let auth = req.get('Authorization');
            let doc = false;
            let getDoc = null;

            if (auth) {
                let authverify = await Auth.authVerifyUser(req);

                if (authverify == null) {
                    return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
                }

                getDoc = await Document.findOne({ user: ObjectId(authverify._id) });

                if (getDoc != null) {
                    doc = true;
                }
            }

            DocumentTemplate.getDriverDocumentTemplatesWithFilter(obj, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (resdata.length > 0) {
                        await Promise.all(resdata.map(templates => {

                            if (doc && getDoc.complete) {
                                let getDocDatac = getDoc.complete.filter(ele => {
                                    return ele.template === templates._id.toString();
                                });
                                if (getDocDatac.length > 0) {
                                    templates.isComplete = getDocDatac[0].isComplete;
                                }
                            }

                            if (templates.fields.length > 0) {
                                templates.fields.forEach(element => {
                                    //console.log("element", element);
                                    let value = '';
                                    if (doc) {
                                        let getDocData = getDoc.values.filter(ele => {
                                            return ele.name === element.name;
                                        });
                                        if (getDocData.length > 0) {
                                            value = getDocData[0].value;

                                            if (element.type === 'checkbox') {
                                                element['options'] = getDocData[0].options;
                                            }
                                        }
                                    }
                                    element['value'] = value;
                                });
                            }
                        }));
                    }
                    // checkother = resdata.filter(element => ["qualificationInfo"].includes(element.type))
                    // if (checkother.length) {
                    //     filetrdata = resdata.filter(element => !["qualificationInfo"].includes(element.type))
                    //     objdata = helper.showSuccessResponse('UPDATE_SUCCESS', filetrdata)
                    //     objdata['otherdocument'] = checkother
                    // }
                    // else {
                    //     objdata = helper.showSuccessResponse('UPDATE_SUCCESS', resdata)
                    // }
                    // res.json(objdata);
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    userOtherDocumentTemplates: async (req, res) => {
        try {
            const store = req.store;
            let obj = {};
            obj.store = ObjectId(store.storeId);
            obj.role = "USER";
            obj.status = "active";
            obj.type = 'qualificationInfo'
            obj.store = store.storeId

            let auth = req.get('Authorization');
            let doc = false;
            let getDoc = null;

            if (auth) {
                let authverify = await Auth.authVerifyUser(req);

                if (authverify == null) {
                    return res.json(helper.showUnathorizedErrorResponse('NOT_AUTHORIZED'));
                }

                getDoc = await Document.findOne({ user: ObjectId(authverify._id) });
                if (getDoc != null) {
                    console.log("getDoc--", getDoc)
                    doc = true;
                }
            }

            DocumentTemplate.getDriverDocumentTemplatesWithFilter(obj, async (err, resdata) => {
                if (err) {
                    console.log("bd err---", err)
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let filedarr = []
                    if (resdata.length == 1) {
                        await Promise.all(resdata.map(templates => {

                            if (doc && getDoc.complete) {
                                let getDocDatac = getDoc.complete.filter(ele => {
                                    return ele.template === templates._id.toString();
                                });
                                if (getDocDatac.length > 0) {
                                    templates.isComplete = getDocDatac[0].isComplete;
                                }
                            }

                            if (templates.fields.length > 0) {
                                templates.fields.forEach(element => {
                                    //console.log("element", element);
                                    let value = '';
                                    if (doc) {
                                        let getDocData = getDoc.values.filter(ele => {
                                            return ele.name === element.name;
                                        });
                                        if (getDocData.length > 0) {
                                            value = getDocData[0].value;

                                            if (element.type === 'checkbox') {
                                                element['options'] = getDocData[0].options;
                                            }
                                        }
                                    }
                                    element['value'] = value;
                                });
                            }
                        }));
                        if (resdata[0].fields && resdata[0].fields.length > 0) {
                            filedarr = resdata[0].fields
                        }
                    }
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', filedarr));
                    // checkother = resdata.filter(element => ["qualificationInfo"].includes(element.type))
                    // if (checkother.length) {
                    //     filetrdata = resdata.filter(element => !["qualificationInfo"].includes(element.type))
                    //     objdata = helper.showSuccessResponse('UPDATE_SUCCESS', filetrdata)
                    //     objdata['otherdocument'] = checkother
                    // }
                    // else {
                    //     objdata = helper.showSuccessResponse('UPDATE_SUCCESS', resdata)
                    // }
                    // res.json(objdata);
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}