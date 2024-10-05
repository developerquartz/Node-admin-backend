const ContentSection = require('../models/contentSectionTable.js');
const ObjectId = require('objectid');
const Section = require('../models/sectionTable');
const Auth = require('../middleware/auth');
const ContentPages = require('../models/contentPagesTable.js');
const Initial = require('../initial/storeInitial');
const Store = require('../models/storeTable');

module.exports = {

    addContentSectionData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;
            console.log("data :", data);

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };
            let checkName = await ContentSection.findOne({ status: { $ne: "archived" }, name: data.name, store: data.store })
            if (checkName)
                return res.json(helper.showValidationErrorResponse('NAME_IS_ALREADY_EXIST'));

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            ContentSection.addContentSection(data, (err, resdata) => {
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

    getContentSectionDetailsById: async (req, res) => {
        try {
            var template = req.params._id;

            if (!template) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            let getDocTemplate = await ContentSection.findById(template);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            Section.getSectionsByTemplate(template, (err, fields) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let resdata = {
                        contentSection: getDocTemplate,
                        sections: fields
                    }
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateContentSectiontData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getDocTemplate = await ContentSection.findById(data._id);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };
            let checkName = await ContentSection.findOne({ status: { $ne: "archived" }, name: data.name, store: data.store, _id: { $ne: data._id } })
            if (checkName)
                return res.json(helper.showValidationErrorResponse('NAME_IS_ALREADY_EXIST'));

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            ContentSection.updateContentSection(data, (err, resdata) => {
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

    removeContentSectiontData: async (req, res) => {
        try {
            var data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            data.status = "archived";

            ContentSection.updateContentSection(data, (err, resdata) => {
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

            Section.updateSection(data, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let refData = {
                        contentSection: resdata.contentSection,
                        ref: data._id
                    }
                    console.log("refData :", refData);

                    ContentPages.removeRefToFields(refData);
                    return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getcontentSectionList: async (req, res) => {
        try {
            ContentSection.find({ status: "active" }, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    ContentSectionList: async (req, res) => {
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

            let count = await ContentSection.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            ContentSection.geContentSectionsWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
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

    addContentSectiontField: async (req, res) => {
        try {
            let data = req.body;
            console.log("data :", data);

            if (!data.contentSection) {
                return res.json(helper.showValidationErrorResponse('CONTENT_ID_IS_REQUIRED'));
            }

            let getDocTemplate = await ContentPages.findById(data.contentSection);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_SECTION'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }
            // let checkType = await Section.findOne({contentSection:data.contentSection,type:data.type,status:"active"})
            // if(checkType) {
            //     return res.json(helper.showValidationErrorResponse('TYPE_ALREADY_EXIST'));

            // }
            if (data.type === "banner") {

                if (!data.banner) {
                    return res.json(helper.showValidationErrorResponse('BANNER_IS_REQUIRED'));
                }

                // if (!data.heading) {
                //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
                // }

                if (!data.content) {
                    return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
                }

            }


            if (data.type === "contentImage") {

                // if (!data.heading) {
                //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
                // }

                // if (!data.subHeading) {
                //     return res.json(helper.showValidationErrorResponse('SUB_HEADING_IS_REQUIRED'));
                // }

                // if (!data.content) {
                //     return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
                // }

                // if (!data.buttonText) {
                //     return res.json(helper.showValidationErrorResponse('BUTTON_TEXT_IS_REQUIRED'));
                // }

                // if (!data.buttonLink) {
                //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
                // }

                // if (!data.banner) {
                //     return res.json(helper.showValidationErrorResponse('BANNER_IS_REQUIRED'));
                // }
                if (!data.imagePosition) {
                    data.imagePosition = "Right"
                }
                // if (!data.backgroundColor) {
                //     return res.json(helper.showValidationErrorResponse('BACKGROUND_COLOR_IS_REQUIRED'));
                // }

            }

            // if (data.type === "content") {

            // if (!data.heading) {
            //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
            // }

            // if (!data.subHeading) {
            //     return res.json(helper.showValidationErrorResponse('SUB_HEADING_IS_REQUIRED'));
            // }

            // if (!data.content) {
            //     return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
            // }
            // if (!data.buttonText) {
            //     return res.json(helper.showValidationErrorResponse('BUTTON_TEXT_IS_REQUIRED'));
            // }

            // if (!data.buttonLink) {
            //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
            // }
            // if (!data.backgroundColor) {
            //     return res.json(helper.showValidationErrorResponse('BACKGROUND_COLOR_IS_REQUIRED'));
            // }

            // }


            // if (["testimonial", "feature"].includes(data.type)) {
            // if(data.multipleContent.length == 0) {
            //     return res.json(helper.showValidationErrorResponse('MULTIPLE_CONTENT_IS_REQUIRED'));
            // }
            // if (!data.backgroundColor) {
            //     return res.json(helper.showValidationErrorResponse('BACKGROUND_COLOR_IS_REQUIRED'));
            // }
            // data.multipleContent.forEach(element => {
            //     if (!element.heading) {
            //         return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
            //     }

            //     if (!element.content) {
            //         return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
            //     }

            //     if (!element.banner) {
            //         return res.json(helper.showValidationErrorResponse('BANNER_IS_REQUIRED'));
            //     }
            // });


            // }

            Section.addSection(data, (err, resdata) => {
                if (err) {
                    console.log("err :", err);

                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let refData = {
                        contentSection: data.contentSection,
                        ref: resdata._id
                    }
                    ContentPages.AddRefToFields(refData);

                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("error :", error);

            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateContentSectiontField: async (req, res) => {
        try {
            let data = req.body;
            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('CONTENTE_SECTION_ID_IS_REQUIRED'));
            }
            if (!data.contentSection) {
                return res.json(helper.showValidationErrorResponse('CONTENT_ID_IS_REQUIRED'));
            }

            let getDocTemplate = await ContentPages.findById(data.contentSection);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_SECTION'));
            }

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            if (data.type === "banner") {

                // if (!data.banner) {
                //     return res.json(helper.showValidationErrorResponse('BANNER_IS_REQUIRED'));
                // }
                // if (!data.searchOption) {
                //     data.searchOption = true
                // }
                // if (!data.fullWidth) {
                //     data.fullWidth = true  
                // }
                // if (!data.heading) {
                //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
                // }
                // if (!data.content) {
                //     return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
                // }

            }


            if (data.type === "contentImage") {

                // if (!data.heading) {
                //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
                // }

                // if (!data.subHeading) {
                //     return res.json(helper.showValidationErrorResponse('SUB_HEADING_IS_REQUIRED'));
                // }

                // if (!data.content) {
                //     return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
                // }

                // if (!data.buttonText) {
                //     return res.json(helper.showValidationErrorResponse('BUTTON_TEXT_IS_REQUIRED'));
                // }

                // if (!data.buttonLink) {
                //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
                // }

                // if (!data.banner) {
                //     return res.json(helper.showValidationErrorResponse('BANNER_IS_REQUIRED'));
                // }
                // if (!data.imagePosition) {
                //     return res.json(helper.showValidationErrorResponse('BANNER_POSITION_IS_REQUIRED'));
                // }
                // if (!data.backgroundColor) {
                //     return res.json(helper.showValidationErrorResponse('BACKGROUND_COLOR_IS_REQUIRED'));
                // }

            }

            if (data.type === "content") {

                // if (!data.heading) {
                //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
                // }

                // if (!data.subHeading) {
                //     return res.json(helper.showValidationErrorResponse('SUB_HEADING_IS_REQUIRED'));
                // }

                // if (!data.content) {
                //     return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
                // }
                // if (!data.buttonText) {
                //     return res.json(helper.showValidationErrorResponse('BUTTON_TEXT_IS_REQUIRED'));
                // }

                // if (!data.buttonLink) {
                //     return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
                // }
                // if (!data.backgroundColor) {
                //     return res.json(helper.showValidationErrorResponse('BACKGROUND_COLOR_IS_REQUIRED'));
                // }

            }


            if (["testimonial", "feature"].includes(data.type)) {
                // if(data.multipleContent.length == 0) {
                //     return res.json(helper.showValidationErrorResponse('MULTIPLE_CONTENT_IS_REQUIRED'));
                // }
                // if (!data.backgroundColor) {
                //     return res.json(helper.showValidationErrorResponse('BACKGROUND_COLOR_IS_REQUIRED'));
                // }
                // data.multipleContent.forEach(element => {
                //     if (!element.heading) {
                //         return res.json(helper.showValidationErrorResponse('HEADING_IS_REQUIRED'));
                //     }

                //     if (!element.content) {
                //         return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
                //     }

                //     if (!element.banner) {
                //         return res.json(helper.showValidationErrorResponse('BANNER_IS_REQUIRED'));
                //     }
                // });


            }

            Section.updateSection(data, (err, resdata) => {
                if (err) {
                    console.log("err :", err);

                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("error :", error);

            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getContentSectionById: async (req, res) => {
        try {
            var id = req.params._id;

            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }

            Section.getSectionById(id, (err, resdata) => {
                // console.log("err, resdata :", err, resdata);

                if (err) {
                    console.log("err content page", err)
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("error", error)
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

            ContentSection.updateStatusByIds(data, update, (err, resdata) => {
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

            let getDocTemplate = await ContentSection.findById(data._id);

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

    updateVendorDoc: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            let getDocTemplate = await ContentSection.findById(data._id);

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
            console.log("data :", data);

            if (data.sortOrder.length === 0) {
                return res.json(helper.showValidationErrorResponse('SORT_ORDER_IS_REQUIRED'));
            }


            // await Promise.all(
            data.sortOrder.map(async element => {

                let resultData = await Section.findOneAndUpdate({ _id: element._id }, { sortOrder: element.sortOrder });
                console.log("resultData : ", resultData);

            })
            // );

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
            }

            ContentSection.geContentSectionsWithFilter(obj, sortByField, sortOrder, paged, pageSize, async (err, resdata) => {
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

            let templates = await ContentSection.findById(data._id).populate({ path: 'fields', options: { sort: { sortOrder: 1 } } }).exec();

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

            let getDocTemplate = await ContentSection.findById(data._id);

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

    rebuildContent: async (req, res) => {
        try {
            let getStore = await Store.find({ status: 'active' });

            if (getStore.length > 0) {

                await Promise.all(getStore.map(async store => {
                    Initial.processContentPagesByScript(store._id, store.owner);
                }));

            }

            let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', {});
            res.json(resdata);
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    rebuildContentSection: async (req, res) => {
        try {
            let getStore = await Store.find({ status: 'active' });

            if (getStore.length > 0) {

                await Promise.all(getStore.map(async store => {
                    let processContentPages = await ContentPages.find({ store: store._id });

                    if (processContentPages.length > 0) {
                        //console.log("getCp", processContentPages);

                        await Promise.all(processContentPages.map(async (item) => {
                            if (!["HOMEPAGE", "ABOUT_US", "PRIVACY_POLICY", "REFUND_POLICY", "TERMS_CONDITIONS"].includes(item.type))
                                return;

                            if (item.sections.length == 0) {
                                let objArr = []
                                objArr = await Initial.addContentPageDefaultData(item);

                                await Section.insertMany(objArr, async (err, result) => {
                                    console.log("result :", result);

                                    let ids = []
                                    result.map((item2) => {
                                        ids.push(item2._id)
                                    })
                                    console.log("ids :", ids);

                                    let refData = {
                                        contentSection: item._id,
                                        ref: ids
                                    }
                                    ContentPages.AddRefToFields(refData);
                                })
                            }
                        }))
                    }
                }));
            }


            let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', {});
            res.json(resdata);
        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }
}