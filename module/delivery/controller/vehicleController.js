const Vehicle = require('../models/vehicelTypesTable');
const driverVehicle = require('../models/driverVehicleTable');
const storeType = require('../../../models/storeTypeTable')
const ObjectId = require('objectid');
const User = require('../../../models/userTable');
const utilityCalculation = require('../utility/calculation')
const DocumentTemplate = require('../../../models/documentTemplate');
const Auth = require('../middleware/auth');
const Document = require('../../../models/documentsTable');
const store = require('../../../middleware/validation/store');
const ordersTable = require('../../../models/ordersTable');

module.exports = {

    getVehicleList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, search, fields } = req.body
            let pageSize = limit || 10;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let store = req.store;
            let obj = {};
            obj.store = ObjectId(store.storeId);

            if (process.env.NODE_ENV == "production") {
                //obj.type = "normal";

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

            let count = await Vehicle.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            Vehicle.geVehiclesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
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

    driverVehiclTypes: async (req, res) => {
        try {
            const { orderBy, order, page, limit } = req.body
            let pageSize = limit || 9999999;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let store = req.store;
            let obj = {};
            obj.store = store.storeId;
            obj.status = "active";

            Vehicle.geVehiclesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getVehicleTypesForCustomer: async (req, res) => {
        try {
            const { orderBy, order, page, limit, rideType } = req.body
            let pageSize = 9999999;
            let sortByField = orderBy || "date_created_utc";
            let sortOrder = order || -1;
            let paged = page || 1;
            let store = req.store;
            let storeTypeDetails = req.storeTypeDetails;
            if (!storeTypeDetails.vehicleType) {
                return res.json(helper.showValidationErrorResponse('PLEASE_ASSIGN_VEHICLE_TYPE_IN_SETTINGS'));
            };
            let obj = {};
            if (storeTypeDetails.storeType == "TAXI") {
                if (rideType && !["hourly", "pool", "normal"].includes(rideType)) {
                    return res.json(helper.showValidationErrorResponse('INVALID_RIDE_TYPE'));
                }
                if (rideType && rideType != "hourly") {
                    obj["type"] = rideType
                }

                if (!storeTypeDetails.isEnableCarPool) {
                    obj["type"] = { $ne: "pool" }
                }
                if (rideType == "hourly") {
                    obj["hourly.status"] = true;
                }
            }

            obj._id = { $in: storeTypeDetails.vehicleType };
            obj.store = store.storeId;
            obj.status = "active";
            Vehicle.geVehiclesWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addVehicleData: async (req, res) => {
        try {
            let data = req.body;
            let store = req.store;
            data.store = store.storeId;

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };
            // if (!data.vehicle) {
            //     return res.json(helper.showValidationErrorResponse('VEHICLE_REQUIRED'));
            // }
            if (!data.maxPersons) {
                return res.json(helper.showValidationErrorResponse('MAX_PERSONS_IS_REQUIRED'));
            };

            if (!data.basePrice) {
                return res.json(helper.showValidationErrorResponse('BASE_PRICE_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            if (!data.image) {
                return res.json(helper.showValidationErrorResponse('IMAGE_IS_REQUIRED'));
            };

            if (!ObjectId.isValid(data.image)) {
                return res.json(helper.showValidationErrorResponse('IMAGE_ID_IS_NOT_VALID_OBJECTID'));
            }

            //data.type = "normal";
            data.type = data.type ? data.type : "normal";

            Vehicle.addVehicle(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getVehicleDetailsById: async (req, res) => {
        try {
            let id = req.params._id;
            let store = req.store
            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!ObjectId.isValid(id)) {
                return res.json(helper.showValidationErrorResponse('ID_IS_NOT_VALID_OBJECTID'));
            }
            vechilTypeObj = { _id: ObjectId(id), store: store.storeId }
            Vehicle.getVehicleByStoreId(vechilTypeObj, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('CUISINE_DETAIL', resdata));
                }
            });

        } catch (error) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateVehicletData: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            // if (!data.vehicle) {
            //     return res.json(helper.showValidationErrorResponse('VEHICLE_REQUIRED'));
            // }
            if (!ObjectId.isValid(data._id)) {
                return res.json(helper.showValidationErrorResponse('ID_IS_NOT_VALID_OBJECTID'));
            }

            if (!data.name) {
                return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
            };

            if (!data.maxPersons) {
                return res.json(helper.showValidationErrorResponse('MAX_PERSONS_IS_REQUIRED'));
            };

            if (!data.basePrice) {
                return res.json(helper.showValidationErrorResponse('BASE_PRICE_IS_REQUIRED'));
            };

            if (!data.status) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            };

            if (data.image && data.image != '') {
                data.image = data.image;
            } else {
                delete data.image;
            }

            Vehicle.updateVehicle(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    removeVehicletData: async (req, res) => {
        try {
            var data = req.body;
            let store = req.store;
            data.store = store.storeId;
            let plan = store.plan

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('CUISINE_ID_IS_REQUIRED'));
            }

            Vehicle.removeVehicle(data._id, async (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (plan && plan.type && plan.type === "basic")
                        await User.findOneAndUpdate({ storeType: { $in: [ObjectId(data.storeTypeId)] }, role: "VENDOR", status: "approved" }, { $addToSet: { cuisines: resdata._id } })

                    return res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                }
            });

        } catch (error) {
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    archiveVehicle: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!ObjectId.isValid(data._id)) {
                return res.json(helper.showValidationErrorResponse('ID_IS_NOT_VALID_OBJECTID'));
            }

            data.status = "archived";

            Vehicle.updateVehicle(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let query = { vehicleType: ObjectId(data._id) };
                    await driverVehicle.remove(query);
                    await User.updateMany({ vehicle: ObjectId(data._id) }, { vehicle: null })
                    await storeType.updateMany({ vehicleType: { $in: [ObjectId(data._id)] } }, { $pull: { vehicleType: ObjectId(data._id) } })
                    res.json(helper.showSuccessResponse('DELETED_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
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

            Vehicle.updateStatusByIds(data, update, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateDriverStatus: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data._id = user._id;

            if (user.isFoundFraud) {
                return res.json(helper.showValidationErrorResponse('BLOCKED_FOR_FOUND_FRAUD'));
            }
            if (!data.onlineStatus) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }

            data.onlineStatus = data.onlineStatus.toLowerCase();
            const validStatus = ["online", "offline"];

            if (!validStatus.includes(data.onlineStatus)) {
                return res.json(helper.showValidationErrorResponse('INVALID_STATUS_ENUM_VALUE'));
            }

            User.updateUserProfile(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
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

            let getDoc = await Document.findOne({ user: ObjectId(data.user) });

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
            console.log("data-", data)
            console.log("outpuit----", output)
            console.log("completeO--", completeO)
            let doc = await Document.findOneAndUpdate({ user: ObjectId(data.user) }, { complete: completeO, values: output, date_created_utc: new Date() }, { upsert: true, new: true });

            res.json(helper.showSuccessResponse('UPDATE_SUCCESS', doc));

        } catch (error) {
            console.log("err", error);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    driverRegisterDocumentTemplates: async (req, res) => {
        try {
            const store = req.store;
            let obj = {}, checkother, filetrdata, objdata;
            obj.store = ObjectId(store.storeId);
            obj.role = "DRIVER";
            obj.status = "active";
            let isHostDoc = req.body.isHostDoc || false
            if (isHostDoc) {
                obj.role = "HOST";
            }
            let auth = req.get('Authorization');
            let doc = false;
            let getDoc = null;
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
                    checkother = resdata.filter(element => ["qualificationInfo"].includes(element.type))
                    if (checkother.length) {
                        filetrdata = resdata.filter(element => !["qualificationInfo"].includes(element.type))
                        objdata = helper.showSuccessResponse('UPDATE_SUCCESS', filetrdata)
                        objdata['otherdocument'] = checkother
                    }
                    else {
                        objdata = helper.showSuccessResponse('UPDATE_SUCCESS', resdata)
                    }
                    res.json(objdata);
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addOrEditDriverVehicle: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            const store = req.store;

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            let getVehicleTemplate = await DocumentTemplate.findOne({ store: store.storeId, status: "active", type: "vehicleInfo", role: "DRIVER" }).populate({ path: 'fields', match: { status: 'active' } }).exec();

            if (getVehicleTemplate == null) {
                return res.json(helper.showValidationErrorResponse('PLEASE_ADD_VEHICLE_TEMPLATE'));
            }

            if (getVehicleTemplate.fields.length === 0) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            if (data.type === "edit") {

                if (!data._id) {
                    return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
                }

                getVehicleTemplate.set('vehicleId', data._id.toString(), { strict: false });

                let getDriverVehicle = await driverVehicle.findById(data._id, 'vehicleType values')
                    .populate(
                        {
                            path: 'vehicleType',
                            match: { status: "active" },
                            select: 'name image',
                            populate: {
                                path: 'image',
                                select: 'link'
                            }
                        }
                    )
                    .exec();

                if (getDriverVehicle == null) {
                    return res.json(helper.showValidationErrorResponse('INVALID_VEHICLE_ID'));
                }

                getVehicleTemplate.set('vehicleType', getDriverVehicle.vehicleType, { strict: false });

                await Promise.all(getVehicleTemplate.fields.map(element => {
                    let value = '';

                    let getDocData = getDriverVehicle.values.filter(ele => {
                        return ele.name === element.name;
                    });
                    if (getDocData.length > 0) {
                        value = getDocData[0].value;

                        if (element.type === 'checkbox') {
                            element['options'] = getDocData[0].options;
                        }
                    }

                    element.set('value', value, { strict: false });

                }));

            }

            res.json(helper.showSuccessResponse('UPDATE_SUCCESS', getVehicleTemplate));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    addOrUpdateDriverVehicle: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            let getVehicle = null;
            let newVehicle = null;

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.vehicleType) {
                return res.json(helper.showValidationErrorResponse('PLEASE_SELECT_VEHICLE_TYPE'));
            }
            let getDocTemplate = await DocumentTemplate.findById(data._id);

            if (getDocTemplate == null) {
                return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
            }

            if (data.fields.length === 0) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            let fields = data.fields;

            let values = [];
            let message = '';
            let flag = false;
            let newVehicleObj = {}
            for (let index2 = 0; index2 < fields.length; index2++) {
                let required = fields[index2].validation.required;
                let name = fields[index2].name;
                let value = fields[index2].value;
                let type = fields[index2].type;
                let label = fields[index2].label;
                let valueType = fields[index2].valueType

                if (required && type != 'checkbox') {
                    if (!value) {
                        flag = true;
                        message = fields[index2].label + ' is required';
                        break;
                    }
                }

                let obj = {
                    label: label,
                    name: name,
                    value: value,
                    type: type
                }
                if (valueType) {
                    obj.valueType = valueType
                }
                if (type === 'checkbox') {
                    let options = fields[index2].options;
                    obj.options = options;
                }

                values.push(obj);
            }

            if (flag) {
                return res.json(helper.showParamsErrorResponse(message));
            }

            let output = [];
            let completeO = [];
            let complete = [];
            complete.push({ template: data._id.toString(), isComplete: data.isComplete });
            let resMessage = 'DATA_ADDED_SUCCESS';
            let getVehicleType = await Vehicle.findOne({ _id: data.vehicleType });
            if (data.type === 'update') {

                if (getVehicleType.type == "pool") {
                    newVehicleObj["enabledRideShare"] = true;
                } else {
                    newVehicleObj["enabledRideShare"] = false;
                }

                resMessage = 'UPDATE_SUCCESS';

                if (!data.vehicleId) {
                    return res.json(helper.showValidationErrorResponse('VEHICLE_ID_IS_REQUIRED'));
                }

                getVehicle = await driverVehicle.findById(data.vehicleId);

                if (getVehicle == null) {
                    return res.json(helper.showValidationErrorResponse('INVALID_VEHICLE'));
                }

                output = values.concat(
                    getVehicle.values.filter(s =>
                        !values.find(t => t.name == s.name)
                    )//end filter 
                );//end concat

                if (getVehicle.complete && getVehicle.complete.length > 0) {
                    completeO = complete.concat(
                        getVehicle.complete.filter(s =>
                            !complete.find(t => t.template == s.template)
                        )//end filter 
                    );//end concat
                } else {
                    completeO = complete;
                }

                let vehicleObj = {
                    template: data._id,
                    vehicleType: data.vehicleType,
                    values: output,
                    complete: completeO,
                }

                newVehicle = await driverVehicle.findOneAndUpdate({ _id: ObjectId(data.vehicleId) }, vehicleObj, { new: true });

            } else {

                if (getVehicleType.type == "pool")
                    newVehicleObj["enabledRideShare"] = true;
                else
                    newVehicleObj["enabledRideShare"] = false;
                output = values;
                completeO = complete;

                let vehicleObj = {
                    user: user._id,
                    template: data._id,
                    vehicleType: data.vehicleType,
                    values: output,
                    complete: completeO,
                    date_created_utc: new Date(),
                }

                newVehicle = await driverVehicle.create(vehicleObj);
            }
            newVehicleObj["vehicle"] = newVehicle._id;

            await User.findByIdAndUpdate(user._id, newVehicleObj);

            res.json(helper.showSuccessResponse(resMessage, newVehicle));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    deleteDriverVehicle: async (req, res) => {
        try {
            let data = req.body;

            if (!data.vehicleId) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            driverVehicle.remove({ _id: data.vehicleId }, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    defaultDriverVehicle: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            data._id = user._id;

            if (!data.vehicleId) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }
            data.enabledRideShare = false;
            let getVehicle = await driverVehicle.findById(data.vehicleId).populate("vehicleType", "type");
            if (getVehicle.vehicleType && getVehicle.vehicleType.type == "pool") {
                data.enabledRideShare = true;
            }

            data.vehicle = data.vehicleId;

            User.updateProfileDeliveryBoy(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    driverVehiclesList: async (req, res) => {
        try {
            let user = req.user;
            let obj = {};
            obj.user = ObjectId(user._id);

            driverVehicle.getDriverVehiclesList(obj, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', resdata));
                }
            });
        }
        catch (err) {
            console.log("err", err);
            return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getFareForVehicleTypes: async (req, res) => {
        try {
            let data = req.body
            let results = {}
            let vechicleList = []
            let store = req.store;
            let user = req.user;
            let storeType = store.storeTypes.filter(element => element.storeType == "TAXI")
            if (!data.pickUp.location || !data.dropOff.location) {
                return res.json(helper.showValidationErrorResponse('Location not found'));
            }
            vechicleList.push(user.vehicle.vehicleType)
            data.vehicleTypesList = vechicleList
            results = await utilityCalculation.estimatedCostCalculation(store, data);
            if (results.length) {
                results.map(addData => {
                    let typeid = storeType.length ? storeType[0]._id : null
                    addData.set('storeType', typeid, { strict: false })
                    addData.set('rideType', 'rideHailing', { strict: false })
                })
            }
            res.json(helper.showSuccessResponse('DATA_SUCCESS', results.length ? results[0] : {}));
        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    addOrUpdateDriverVehicleByAdmin: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            let store = req.store;
            let getVehicle = null;
            let newVehicle = null;

            if (!data.type) {
                return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
            }

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            if (!data.vehicleType) {
                return res.json(helper.showValidationErrorResponse('PLEASE_SELECT_VEHICLE_TYPE'));
            }

            /* let getDocTemplate = await DocumentTemplate.findById(data._id);
 
             if (getDocTemplate == null) {
                 return res.json(helper.showValidationErrorResponse('INVALID_TEMPLATE'));
             }
             */
            if (data.fields.length === 0) {
                return res.json(helper.showValidationErrorResponse('FIELDS_IS_REQUIRED'));
            }

            let fields = data.fields;

            let values = [];
            let message = '';
            let flag = false;

            for (let index2 = 0; index2 < fields.length; index2++) {
                let required = fields[index2].validation.required;
                let name = fields[index2].name;
                let value = fields[index2].value;
                let type = fields[index2].type;
                let label = fields[index2].label;

                if (required && type != 'checkbox') {
                    if (!value) {
                        flag = true;
                        message = fields[index2].label + ' is required';
                        break;
                    }
                }

                let obj = {
                    label: label,
                    name: name,
                    value: value,
                    type: type
                }
                if (type === 'checkbox') {
                    let options = fields[index2].options;
                    obj.options = options;
                }

                values.push(obj);
            }

            if (flag) {
                return res.json(helper.showParamsErrorResponse(message));
            }

            let output = [];
            let completeO = [];
            let complete = [];
            complete.push({ template: data._id.toString(), isComplete: data.isComplete });
            let resMessage = 'DATA_ADDED_SUCCESS';

            if (data.type === 'update') {

                resMessage = 'UPDATE_SUCCESS';

                if (!data.vehicleId) {
                    return res.json(helper.showValidationErrorResponse('VEHICLE_ID_IS_REQUIRED'));
                }

                getVehicle = await driverVehicle.findById(data.vehicleId);

                if (getVehicle == null) {
                    return res.json(helper.showValidationErrorResponse('INVALID_VEHICLE'));
                }

                output = values.concat(
                    getVehicle.values.filter(s =>
                        !values.find(t => t.name == s.name)
                    )//end filter 
                );//end concat

                if (getVehicle.complete && getVehicle.complete.length > 0) {
                    completeO = complete.concat(
                        getVehicle.complete.filter(s =>
                            !complete.find(t => t.template == s.template)
                        )//end filter 
                    );//end concat
                } else {
                    completeO = complete;
                }

                let vehicleObj = {
                    template: data._id,
                    vehicleType: data.vehicleType,
                    values: output,
                    complete: completeO
                }

                newVehicle = await driverVehicle.findOneAndUpdate({ _id: ObjectId(data.vehicleId) }, vehicleObj, { new: true });

            } else {
                output = values;
                completeO = complete;

                let vehicleObj = {
                    user: user._id,
                    template: data._id,
                    vehicleType: data.vehicleType,
                    values: output,
                    complete: completeO,
                    date_created_utc: new Date()
                }

                newVehicle = await driverVehicle.create(vehicleObj);
            }

            await User.findByIdAndUpdate(user._id, { vehicle: newVehicle._id });

            res.json(helper.showSuccessResponse(resMessage, newVehicle));

        } catch (error) {
            console.log("err", error);
            res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    updateDriverVehicleForPoolAndNormal: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;
            console.log("data:", data)
            data._id = user._id;
            let enabledRideShareStatus = user.enabledRideShare ? user.enabledRideShare : false;

            let getDriverCurrent = await ordersTable.getDriverCurrentTrips(user._id);
            if (getDriverCurrent.length) {
                return res.json(helper.showValidationErrorResponse('COMPLETE_PENDING_ORDER'));
            }

            if (!data.hasOwnProperty("enabledRideShare")) {
                return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
            }
            if (!user.vehicle) {
                return res.json(helper.showValidationErrorResponse('FIRST_ADD_VEHICLE'));
            }


            let getCurrentVehicle = user.vehicle.vehicleType;

            if (data.enabledRideShare && !["car"].includes(getCurrentVehicle.vehicle)) {
                return res.json(helper.showValidationErrorResponse('INVALID_CURRENT_VEHICLE'));
            };
            if (enabledRideShareStatus == data.enabledRideShare) {
                return res.json(helper.showValidationErrorResponse('ALREADY_STATUS_IS_SAME_STATE'));
            };

            /* let updateVehicleObj = { vehicleType: getCurrentVehicle._id };
             let type = data.enabledRideShare ? "pool" : "normal";
 
             let getVehicleType = await Vehicle.findOne({ type, vehicle: "car" });
             if (data.enabledRideShare) {
                 updateVehicleObj["vehicleType"] = getVehicleType._id;
                 data.primary_vehicleType = getCurrentVehicle._id;
             } else {
                 updateVehicleObj["vehicleType"] = user.primary_vehicleType;
             }
 
             newVehicle = await driverVehicle.findOneAndUpdate({ _id: user.vehicle._id }, updateVehicleObj, { new: true });*/
            User.updateUserProfile(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resdata));
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

}