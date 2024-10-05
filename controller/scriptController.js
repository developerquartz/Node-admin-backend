const terminlogyTable = require('../models/terminologyTable')
const fileTable = require("../models/fileTable");
const Store = require('../models/storeTable');
const Template = require('../models/templateTable');
const emailTemplate = require('../helper/emailTemplate');
const ObjectId = require("objectid");
const User = require("../models/userTable");
const Storetypes = require("../models/storeTypeTable");
const documentTemplate = require('../models/documentTemplate');
const storeInitial = require("../initial/storeInitial");
const vehicleTypeModel = require('../module/delivery/models/vehicelTypesTable')
const driverTerminology = require('../config/driverLang')
const customerTerminology = require('../config/customerLang')
const axiosRequest = require('../helper/request');
const { addDefaultMenuAndItem } = require('../initial/scriptHelper');
const paymentLedger = require('../models/paymentLedgerTable');
const orderTable = require('../models/ordersTable');
const categoryTable = require('../models/categoryTable');
const couponTable = require('../models/couponTable');
const productTable = require('../models/productsTable');
const translate = require('translate-google');
const Config = require('../config/constants.json')
const Vehicle = require('../module/delivery/models/driverVehicleTable');
const ContentPages = require('../models/contentPagesTable.js');
const DocumentTemplate = require('../models/documentTemplate.js');
const FormField = require('../models/formFieldsTable.js');
const Section = require('../models/sectionTable');
var randomstring = require("randomstring");
const Push = require("../helper/pushNotification");
const SocketHelper = require("../helper/socketHelper");
const planmodel = require("../models/billingPlansTable")
module.exports = {

  updateStoreTypeById: async (req, res) => {
    try {
      let data = req.body;

      if (!data.storeTypeId) {
        return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
      }

      let uST = await Storetypes.findOneAndUpdate({ _id: data.storeTypeId }, data);

      let response = helper.showSuccessResponse('DATA_SUCCESS', uST);
      res.json(response);

    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  updateStoreTypeByIdForNewKey: async (req, res) => {
    try {
      let data = req.body;
      if (!data.storeTypeId) {
        return res.json(helper.showValidationErrorResponse('STORE_TYPE_ID_IS_REQUIRED'));
      }
      let uST = await Storetypes.findOneAndUpdate({ _id: data.storeTypeId }, { $set: data });
      let response = helper.showSuccessResponse('DATA_SUCCESS', uST);
      res.json(response);

    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  removeTerminlogy: async (req, res) => {
    try {
      let constant = req.body.constant
      let label = req.body.label
      let value = req.body.value
      let type = req.body.type
      let lang = req.body.lang

      if (!constant || !label || !value || !lang)
        return res.json(helper.showValidationErrorResponse("DATA_IS_WRONG"));


      let data = await terminlogyTable.updateMany({ type: type, lang: lang }, {
        $pull: {
          values: {
            "constant": constant,
            "value": value,
            "label": label
          }
        }
      })
      if (data) {
        res.json(helper.showSuccessResponse('DATA_SUCCESS', data));
        if (type == "customers") {
          let terminologyData = await terminlogyTable.find({ type: "customers" }).populate('store', 'domain').lean()
          Promise.all(terminologyData.map(async (item) => {
            await helper.updateTerminologyScript(item)
          }))
        }
      } else {
        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));
      }
    } catch (error) {
      return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));

    }
  },
  addBatchTerminlogy: async (req, res) => {
    try {
      let body = req.body

      let ObjArr = body.JSON

      if (!body.lang)
        return res.json(helper.showValidationErrorResponse('LANG_IS_REQUIRED'));
      if (!env.terminologyLang.includes(body.lang))
        return res.json(helper.showValidationErrorResponse('LANG_IS_WRONG'));
      if (!body.type)
        return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
      if (!["order", "customers", "drivers", "vendors", "admin"].includes(body.type))
        return res.json(helper.showValidationErrorResponse('TYPE_IS_WRONG'));


      if (ObjArr.length == 0)
        return res.json(helper.showValidationErrorResponse("JSON_ARRAY_IS_REQUIRED"));

      let obj = { type: body.type, lang: body.lang }
      if (body.storeId)
        obj.store = ObjectId(body.storeId)

      var arr = []
      for (key in ObjArr) {
        arr.push({
          "constant": key,
          "value": ObjArr[key],
          "label": ObjArr[key]
        })
      }
      // return res.send({arr,length:arr.length})

      let data = await terminlogyTable.updateMany(obj, {
        $addToSet: {
          values: arr
        }
      })
      if (data) {
        res.json(helper.showSuccessResponse('DATA_SUCCESS', { data, arr }));
        if (obj.type == "customers") {
          let terminologyData = await terminlogyTable.find({ type: "customers" }).populate('store', 'domain').lean()
          Promise.all(terminologyData.map(async (item) => {
            await helper.updateTerminologyScript(item)
          }))
        }
      } else {
        res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));
      }
    } catch (error) {
      console.log("error :", error);

      return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));

    }
  },
  updateLinkInFile: async (req, res) => {
    try {
      let fileId = req.body.id
      let Link = req.body.link
      if (!fileId)
        return res.json(helper.showValidationErrorResponse("FILE_ID_IS_REQUIRED"));
      if (!Link)
        return res.json(helper.showValidationErrorResponse("FILE_LINK_IS_REQUIRED"));

      let updateFile = await fileTable.findByIdAndUpdate(fileId, { $set: { link: Link } }, { new: true });

      if (updateFile) {
        res.json(helper.showSuccessResponse('DATA_SUCCESS', updateFile));
      } else {
        return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));
      }
    }
    catch (err) {
      res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },

  addStoreTypes: async (req, res) => {
    try {

      let getStore = await Store.find({
        status: 'active'
      });

      let savedStore = []
      await Promise.all(getStore.map(async item => {
        let STa = [];

        const allStoreTypes = [
          {
            "storeType": "TAXI",
            "icon": "/images/taxi.png",
            "label": "Taxi"
          },
          {
            "storeType": "PICKUPDROP",
            "icon": "/images/courier.png",
            "label": "Courier"
          },
          {
            "storeType": "OTHER",
            "icon": "/images/Grocery.png",
            "label": "Other"
          }];

        allStoreTypes.forEach(storeTypeElement => {


          let defaultStoreTypeImage = '';
          let defaultStoreTypeImageId = '';
          let storeText = '';

          if (storeTypeElement.storeType === "TAXI") {
            defaultStoreTypeImage = '/images/taxi-bg.png';
            defaultStoreTypeImageId = "611390ccd96b4ad660ad678e";
            storeText = `<h1>Your Favourite Taxi</h1><p>The best places near you</p>`;

          } else if (storeTypeElement.storeType === "PICKUPDROP") {
            defaultStoreTypeImage = '/images/courier-bg.png';
            defaultStoreTypeImageId = "611390f8d96b4ad660ad678f";
            storeText = `<h1>Your Favourite Pick up and Drop</h1><p>The best places near you</p>`;

          } else if (storeTypeElement.storeType === "OTHER") {
            defaultStoreTypeImage = '/images/grocery-bg.png';
            defaultStoreTypeImageId = "61138fd0d96b4ad660ad6763";
            storeText = `<h1>Your Favourite Grocery<br>Delivered Fresh</h1><p>The best places near you</p>`;

          }

          let object = {
            store: item._id,
            storeType: storeTypeElement.storeType,
            storeTypeImage: defaultStoreTypeImageId,
            defaultStoreTypeImage: defaultStoreTypeImage,

            label: storeTypeElement.label,
            taxAmount: 2,
            storeText: storeText,
            deliveryAreaDriver: 20,
            noOfDriversPerRequest: 5,
            driverWaitTime: 2,
            "scheduled.status": false,
            codWalletLimit: 0,
            storeVendorType: "SINGLE",
            status: "inactive",
            date_created_utc: new Date()
          }
          if (storeTypeElement.storeType === 'OTHER') {

            object.deliveryType = ["TAKEAWAY", "DELIVERY"]
            object.deliveryPlatform = {
              platform: "self",
              deliveryProvider: [
                {
                  type: "postmates",
                  keys: {
                    authenticationKey: null,
                    customerId: null
                  }
                }
              ]
            }
            object.deliveryAreaVendor = 20;
            object.deliveryAreaVendorTakeaway = 30;
            object.vendorWaitTime = 1;
            object["commission.vendor"] = 80;
            object["commission.deliveryBoy"] = 15;
            object["scheduled.vendorRequestTime"] = 15;
            object["scheduled.vendorRequestTime"] = 15;
            object.deliveryFeeType = "unit";
            object["deliveryFeeSettings.base_price"] = 10;
            object["deliveryFeeSettings.per_unit_distance"] = 1.17;
            object["deliveryFeeSettings.per_unit_time"] = 0.17;
            object["deliveryFeeSettings.unit"] = "km"

          }

          STa.push(object);
        })
        let storeTypeData = await Storetypes.insertMany(STa)

        let StoretypesId = storeTypeData.map(item2 => {
          return item2._id
        })

        await Store.findByIdAndUpdate({
          _id: item._id
        }, {
          $addToSet: { storeType: StoretypesId }
        });
        if (item.owner)
          await User.findByIdAndUpdate({
            _id: item.owner
          }, {
            $addToSet: { storeType: StoretypesId }
          });

        savedStore.push(storeTypeData);

      }))
      let resdata = helper.showSuccessResponse('SUCCESS', savedStore);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  addAndUpdateDefaultDocument: async (req, res) => {
    try {
      await documentTemplate.updateMany({ type: "OTHER" }, { $set: { type: "personalInfo" } })

      let getStore = await Store.find({
        status: 'active'
      });

      let savedStore = []
      await Promise.all(getStore.map(async item => {
        let dataResp = await storeInitial.processDocumentTemplete(item._id)
        savedStore.push(dataResp)
      }))
      let resdata = helper.showSuccessResponse('SUCCESS', savedStore);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  removeStoreTypes: async (req, res) => {
    // fetch active store
    let getStore = await Store.find({
      status: 'active'
    });

    let storeArr = [];

    await Promise.all(getStore.map(async item => {
      let storeTypeId = await Storetypes.distinct('_id', {
        storeType: {
          $in: [
            "OTHER",
            "TAXI",
            "PICKUPDROP"]
        }, store: item._id
      })

      let storeData = await Store.findByIdAndUpdate(item._id, { $pull: { storeType: { $in: storeTypeId } } }, { new: true })
      await Storetypes.remove({ _id: { $in: storeTypeId } })
      if (item.owner)
        await User.findByIdAndUpdate(item.owner, { $pull: { storeType: { $in: storeTypeId } } })

      storeArr.push(storeData)
    }))
    let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', storeArr);
    return res.json(resdata);
  },
  addDefaultVehicleType: async (req, res) => {
    // fetch active store
    let getStore = await Store.find({
      status: 'active'
    });

    let storeArr = [];

    await Promise.all(getStore.map(async item => {
      let vehicalType = [{
        "features": [
          "Feature 1",
          "Feature 2"
        ],
        "image": "61237c3db311dce166239c1f",
        "unit": "km",
        "isSurgeTime": true,
        "type": "active",
        "status": "active",
        "name": "Bike",
        "maxPersons": 4,
        "basePrice": 10,
        "pricePerUnitDistance": 0.15,
        "pricePerUnitTimeMinute": 0.5,
        "driverPercentCharge": 90,
        "waitingTimeStartAfterMin": 1,
        "waitingTimePrice": 2,
        "info": "Lorem Ipsum",
        "surgeTimeList": [
          {
            "dayStatus": true,
            "startTime": "09:00",
            "endTime": "23:59",
            "surgeMultiplier": 2
          }
        ],
        "store": item._id,
        "date_created_utc": new Date(),
        "meta_data": []
      },
      {
        "features": [
          "Feature 1",
          "Feature 2"
        ],
        "image": "61237c72b311dce166239c20",
        "unit": "km",
        "isSurgeTime": true,
        "type": "active",
        "status": "active",
        "name": "Car",
        "maxPersons": 4,
        "basePrice": 10,
        "pricePerUnitDistance": 0.15,
        "pricePerUnitTimeMinute": 0.5,
        "driverPercentCharge": 90,
        "waitingTimeStartAfterMin": 1,
        "waitingTimePrice": 2,
        "info": "Lorem Ipsum",
        "surgeTimeList": [
          {
            "dayStatus": true,
            "startTime": "09:00",
            "endTime": "23:59",
            "surgeMultiplier": 2
          }
        ],
        "store": item._id,
        "date_created_utc": new Date(),
        "meta_data": []
      }]
      await vehicleTypeModel.remove({}); // remove all vehicle type
      let vehicleData = await vehicleTypeModel.insertMany(vehicalType); // insert vehicle type
      let bikeId = vehicleData.find(item => item.name === "Bike")._id; // getting bike vehicle id
      await Storetypes.bulkWrite([
        {
          updateMany: {
            "filter": { "store": item._id },
            "update": { $set: { "vehicleType": [] } }
          }
        },
        {
          updateMany: {
            "filter": { "store": item._id },
            "update": { $addToSet: { "vehicleType": bikeId } }
          }
        },
      ])
      // await Storetypes.updateMany({store:item._id},{$addToSet:{vehicleType:bikeId}})
      storeArr.push(vehicleData)
    }))
    let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', storeArr);
    return res.json(resdata);
  },
  addStoreTerminologyScript: async (req, res) => {
    try {
      let type = req.query.type

      var driverObjArr = driverTerminology.langJSON_arr
      var customerObjArr = customerTerminology.langJSON_arr
      var orderLangObjJarr = customerTerminology.orderLang_arr

      var storeData = await Store.find({
        status: "active"
      }, 'owner')

      await Promise.all(storeData.map(async (item) => {
        if (item._id && item.owner) {
          if (type == "customers") {
            let data = await terminlogyTable.findOneAndUpdate({ store: item._id, user: item.owner, type: "customers" },
              {
                user: item.owner,
                store: item._id,
                user: item.owner,
                type: "customers",
                lang: "en",
                values: customerObjArr,
                date_created: new Date()
              }
              , { upsert: true, new: true })
              .populate('store', 'domain')

            await helper.updateTerminologyScript(data)
          }

          if (type == "drivers")
            await terminlogyTable.findOneAndUpdate({ store: item._id, user: item.owner, type: "drivers" },
              {
                store: item._id,
                user: item.owner,
                type: "drivers",
                lang: "en",
                values: driverObjArr,
                date_created: new Date()
              }
              , { upsert: true, new: true })

          if (type == "order")
            await terminlogyTable.findOneAndUpdate({ store: item._id, user: item.owner, type: "order" },
              {
                store: item._id,
                user: item.owner,
                type: "order",
                lang: "en",
                values: orderLangObjJarr,
                date_created: new Date()
              }
              , { upsert: true, new: true })
        }
      }))
      res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS'));

    } catch (error) {
      console.log("error :", error);

      return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },

  addDefaultStoreTerminologyScript: async (req, res) => {
    try {

      var driverObjArr = driverTerminology.langJSON_arr
      var customerObjArr = customerTerminology.langJSON_arr
      var orderLangObjJarr = customerTerminology.orderLang_arr

      var storeData = await Store.find({
        status: "active"
      }, 'owner')

      await Promise.all(storeData.map(async (item) => {
        if (item._id && item.owner) {
          {
            let checkData = await terminlogyTable.findOne({ store: item._id, user: item.owner, type: "customers" })
            if (!checkData) {
              let data = await terminlogyTable.findOneAndUpdate({ store: item._id, user: item.owner, type: "customers" },
                {
                  user: item.owner,
                  store: item._id,
                  user: item.owner,
                  type: "customers",
                  lang: "en",
                  values: customerObjArr,
                  date_created: new Date()
                }
                , { upsert: true, new: true })
                .populate('store', 'domain')

              await helper.updateTerminologyScript(data)
            }
            let checkDriver = await terminlogyTable.findOne({ store: item._id, user: item.owner, type: "drivers" })
            if (!checkDriver) {
              await terminlogyTable.findOneAndUpdate({ store: item._id, user: item.owner, type: "drivers" },
                {
                  store: item._id,
                  user: item.owner,
                  type: "drivers",
                  lang: "en",
                  values: driverObjArr,
                  date_created: new Date()
                }
                , { upsert: true, new: true })
            }
            let checkOrder = await terminlogyTable.findOne({ store: item._id, user: item.owner, type: "order" })
            if (!checkOrder) {
              await terminlogyTable.findOneAndUpdate({ store: item._id, user: item.owner, type: "order" },
                {
                  store: item._id,
                  user: item.owner,
                  type: "order",
                  lang: "en",
                  values: orderLangObjJarr,
                  date_created: new Date()
                }
                , { upsert: true, new: true })
            }
          }
        }
      }))
      res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS'));


    } catch (error) {
      console.log("error :", error)
      return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },

  addStoreEmailTemplate: async (req, res) => {
    try {
      //store email template update
      let data = req.body;

      if (!data.storeId) {
        return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
      }

      if (!data.type) {
        return res.json(helper.showValidationErrorResponse('STORE_EMAIL_TYPE_IS_REQUIRED'));
      }

      let getStore = await Store.findById(data.storeId);

      if (getStore == null) {
        return res.json(helper.showValidationErrorResponse('INVALID_STORE'));
      }

      let templates = [];

      switch (data.type) {
        case 'users':
          templates = await emailTemplate.getCustomerTemplates(data.storeId, getStore.owner);
          data.type = 'customers'
          break;
        case 'vendors':
          templates = await emailTemplate.getVendorTemplates(data.storeId, getStore.owner);
          break;
        case 'drivers':
          templates = await emailTemplate.getDriverTemplates(data.storeId, getStore.owner);
          break;
        case 'admin':
          templates = await emailTemplate.getAdminTemplates(data.storeId, getStore.owner);
          break;
        default:
          break;
      }

      let update = null;

      if (templates.length > 0) {
        update = templates
        for (i in templates) {
          let constant = templates[i].constant
          await Template.findOneAndUpdate({ store: ObjectId(data.storeId), type: data.type, constant: constant }, templates[i], { upsert: true, new: true })
        }

        //update = await Template.insertMany(templates);
      }

      res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', update));

    } catch (error) {
      console.log("error :", error)
      res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  deleteupdateStoreEmailTemplate: async (req, res) => {
    try {
      //store email template update
      let data = req.body;

      if (!data.storeId) {
        return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
      }

      if (!data.type) {
        return res.json(helper.showValidationErrorResponse('STORE_EMAIL_TYPE_IS_REQUIRED'));
      }
      if (!data.constant) {
        return res.json(helper.showValidationErrorResponse('Store Constant required'));
      }
      if (!data.key) {
        return res.json(helper.showValidationErrorResponse('key should be delete or update'));
      }

      let getStore = await Store.findById(data.storeId);

      if (getStore == null) {
        return res.json(helper.showValidationErrorResponse('INVALID_STORE'));
      }

      let templates;


      if (data.key == 'delete') {
        templates = await Template.deleteOne({ store: ObjectId(data.storeId), constant: data.constant, type: data.type });
      }
      if (data.key == 'update') {
        if (!data.updateData) {
          return res.json(helper.showValidationErrorResponse('updateData key required'));
        }
        templates = await Template.updateOne({ store: ObjectId(data.storeId), constant: data.constant, type: data.type }, data.updateData);
      }
      res.json(helper.showSuccessResponse('DATA_UPDATE_SUCCESS', templates));

    } catch (error) {
      console.log("error :", error)
      res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },

  addDefaultMenuAndItemForAllStore: async (req, res) => {
    let storeData = await Store.find({})
    let menuData = []
    if (storeData && storeData.length > 0) {
      await Promise.all(storeData.map(async (element) => {
        menuData.push(await addDefaultMenuAndItem(element._id))
      }))
    }
    return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', menuData));

  },

  rebuildScript: async (req, res) => {
    try {
      let query = req.query;

      let skip = 0;
      let limit = 20;

      if (query.skip) {
        skip = Number(query.skip);
      }

      if (query.limit) {
        limit = Number(query.limit);
      }

      let getStore = await Store.find({
        status: 'active',
        domain: {
          $ne: "main." + env.DOMAIN
        }
      }, 'domain storeName slug').skip(skip).limit(limit);

      if (getStore.length > 0) {

        await Promise.all(getStore.map(async details => {
          let run = await axiosRequest.runScript(env.scriptUrlUpdate, details);
          run.type = "REBUILD_SCRIPT_UPDATE";
          run.notes = "Update customer website files";
          helper.createLogForScript(run);
        }));

      }

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', {});
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  rebuildSettingScript: async (req, res) => {
    try {

      let getStore = await Store.find({

      })
        .populate({
          path: 'storeType',
          select: 'label storeType storeVendorType status'
        })
        .populate({
          path: 'logo'
        })
        .populate({
          path: 'bannerImage'
        })
        .populate({
          path: 'favIcon'
        })
        .exec();

      if (getStore.length > 0) {

        await Promise.all(getStore.map(async store => {

          await helper.updateConfigStoreSetting(store);

        }));

      }

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', {});
      res.json(resdata);
    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  updateStore: async (req, res) => {
    try {
      let data = req.body;

      if (!data.storeId) {
        return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
      }

      let update = await Store.findOneAndUpdate({
        _id: ObjectId(data.storeId)
      }, data, {
        fields: {
          mailgun: 1,
          twillio: 1,
          mailgun: 1
        },
        "new": true
      });

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', update);
      res.json(resdata);
    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  updateAllStore: async (req, res) => {
    try {
      let data = req.body;
      console.log("data :", data);

      let getStore = await Store.find({
        status: 'active'
      });

      let update = {};

      if (getStore.length > 0) {

        await Promise.all(getStore.map(async store => {

          update = await Store.findOneAndUpdate({
            _id: ObjectId(store._id)
          }, data, {
            fields: {
              paymentSettings: 1,
              twillio: 1,
              mailgun: 1
            },
            "new": true
          });

        }));

      }

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', update);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  updateAllStoreType: async (req, res) => {
    try {
      let data = req.body;
      console.log("data :", data);
      console.log(data.query)
      if (!data.query) {
        return res.json(helper.showValidationErrorResponse("query data required"))
      }
      // data.query = {
      //   status: 'active'
      // }
      let getStore = await Storetypes.find(data.query);

      let update = {};
      delete data.query
      console.log("after delete query data")
      console.log(data)
      if (getStore.length > 0) {

        await Promise.all(getStore.map(async store => {

          update = await Storetypes.findOneAndUpdate({
            _id: ObjectId(store._id)
          }, data, {
            "new": true
          });

        }));

      }

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', update);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  unsetStoreCard: async (req, res) => {
    try {
      let update = await Store.updateMany({}, { "$unset": { "cardDetails": 1 } });
      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', update);
      res.json(resdata);
    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  updateAllUserByRole: async (req, res) => {
    try {
      let data = req.body;
      let role = req.body.role;
      console.log("data before:", data);
      delete data.role

      console.log("data after:", data, Array.isArray(role));


      if (!role || !Array.isArray(role)) {
        return res.json(helper.showValidationErrorResponse('ROLE_ARRAY_IS_REQUIRED'));
      }

      let update = {};

      update = await User.updateMany({
        role: { $in: role }
      }, data, {
        fields: {
          _id: 1
        },
        "new": true
      });

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', update);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  updateAllUserByRoleAndStoreId: async (req, res) => {
    try {
      let data = req.body;
      let role = req.body.role;
      console.log("data before:", data);
      delete data.role

      console.log("data after:", data, Array.isArray(role));


      if (!role || !Array.isArray(role)) {
        return res.json(helper.showValidationErrorResponse('ROLE_ARRAY_IS_REQUIRED'));
      }

      let update = {};

      update = await User.updateMany({
        store: ObjectId(data.storeId),
        role: { $in: role }
      }, data, {
        fields: {
          _id: 1
        },
        "new": true
      });

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', update);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  clearArchiveData: async (req, res) => {
    try {
      let data = req.body;

      if (!data.type) {
        return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
      }

      let update = {};

      if (data.type === "users") {

        update = await User.remove({
          status: "archived"
        });

      } else if (data.type === "products") {

        update = await productTable.remove({
          status: "archived"
        });

      }

      let resdata = helper.showSuccessResponse('DELETE_SUCCESS', update);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  updatePaymentMethods: async (req, res) => {
    try {
      let data = req.body;

      let getStore = await Store.find({
        status: 'active'
      });

      let update = {};
      const paystackCountriesList = ["GH", "NG", "ZA", "IN"];
      const pay360CountriesList = ["GB", "IN"];
      const orangeMoneyCountriesList = ["BW", "CM", "CI", "GN", "MG", "ML", "SN", "SL"];
      const razorpayCountriesList = ["IN"];
      const squareCountriesList = ["US", "AU", "CA", "JP", "GB", "IE", "FR", "ES"];

      const global_PM_Type = ["braintree", "cod", "wallet", "stripe"]
      if (getStore.length > 0) {

        await Promise.all(getStore.map(async store => {

          if ((data.payment_method == 'orangeMoney' && orangeMoneyCountriesList.includes(store.country))
            || (data.payment_method == 'razorpay' && razorpayCountriesList.includes(store.country))
            || (data.payment_method == 'square' && squareCountriesList.includes(store.country))
            || (data.payment_method == 'paystack' && paystackCountriesList.includes(store.country))
            || (data.payment_method == 'pay360' && pay360CountriesList.includes(store.country))
            || global_PM_Type.includes(data.payment_method)
          ) {

            update = await Store.findOneAndUpdate({
              _id: ObjectId(store._id)
            }, {
              $addToSet: {
                "paymentSettings": data
              }
            }, {
              fields: {
                paymentSettings: 1,
                twillio: 1,
                mailgun: 1
              },
              "new": true
            });

          }
        }));

      }

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', update);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  updatePaymentMethodsbyField: async (req, res) => {
    try {
      let data = req.body;
      let fields = data.fields

      let getStore = await Store.find({
        status: 'active'
      });

      let update = {};
      if (!data.hasOwnProperty("fields")) {
        return res.json(helper.showValidationErrorResponse('FIELDS KEY REQUIRED'));
      }
      if (!fields.length) {
        return res.json(helper.showValidationErrorResponse('AT LEAST ON OBJECT ADD IN FIELDS'));
      }
      const paystackCountriesList = ["GH", "NG", "ZA", "IN"];
      const pay360CountriesList = ["GB", "IN"];
      const orangeMoneyCountriesList = ["BW", "CM", "CI", "GN", "MG", "ML", "SN", "SL"];
      const razorpayCountriesList = ["IN"];
      const squareCountriesList = ["US", "AU", "CA", "JP", "GB", "IE", "FR", "ES"];
      const flutterWaveCountriesList = ["NG", "GH", "KE", "ZA", "UG", "TZ", "GB", "US", "EU"]

      const global_PM_Type = ["braintree", "cod", "wallet", "stripe"]
      if (fields && fields.length > 0) {
        fields.forEach(element => {
          if (element.fieldName && element.fieldValue) {
            element.fieldName = "paymentSettings.$." + element.fieldName
            update[element.fieldName] = element.fieldValue;
          }
        });
      }
      else {

      }
      if (getStore.length > 0) {

        await Promise.all(getStore.map(async store => {

          if ((data.payment_method == 'orangeMoney' && orangeMoneyCountriesList.includes(store.country))
            || (data.payment_method == 'razorpay' && razorpayCountriesList.includes(store.country))
            || (data.payment_method == 'square' && squareCountriesList.includes(store.country))
            || (data.payment_method == 'paystack' && paystackCountriesList.includes(store.country))
            || (data.payment_method == 'pay360' && pay360CountriesList.includes(store.country))
            || (data.payment_method == 'flutterwave' && flutterWaveCountriesList.includes(store.country))
            || global_PM_Type.includes(data.payment_method)
          ) {

            await Store.update({ _id: ObjectId(store._id), "paymentSettings.payment_method": data.payment_method }, { $set: update });

          }
        }));

      }

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS');
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  addupdatePaymentBystoreId: async (req, res) => {
    try {
      let data = req.body
      if (!data.storeId) {
        return res.json(helper.showValidationErrorResponse("storeId"))
      }
      if (!data.paymentdata) {
        return res.json(helper.showValidationErrorResponse("payment data object required"))
      }

      let storedata = await Store.findOne({ _id: ObjectId(data.storeId), "paymentSettings.payment_method": data.paymentdata.payment_method })
      if (storedata) {
        console.log("in set")
        let payment_method = data.paymentdata.payment_method
        for (key in data.paymentdata) {
          let keydata = key
          let assigndata = data.paymentdata[key]
          delete data.paymentdata[keydata]
          data.paymentdata["paymentSettings.$." + keydata] = assigndata
        }
        await Store.updateOne({ _id: ObjectId(data.storeId), "paymentSettings.payment_method": payment_method }, { $set: data.paymentdata })
      }
      else {
        console.log("in push")
        await Store.updateOne({ _id: ObjectId(data.storeId) }, { $push: { paymentSettings: data.paymentdata } })
      }
      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS');
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  removePaymentMethods: async (req, res) => {
    try {
      let data = req.body;

      if (!data.payment_method) {
        return res.json(helper.showValidationErrorResponse('PM_IS_REQUIRED'));
      }

      let getStore = await Store.find({
        status: 'active'
      });

      let update = {};

      if (getStore.length > 0) {

        await Promise.all(getStore.map(async store => {

          update = await Store.findOneAndUpdate({
            _id: ObjectId(store._id)
          }, {
            $pull: {
              "paymentSettings": { payment_method: data.payment_method }
            }
          }, {
            fields: {
              paymentSettings: 1,
              twillio: 1,
              mailgun: 1
            },
            "new": true
          });

        }));

      }

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', update);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  removePaymentMethodsByStore: async (req, res) => {
    try {
      let data = req.body;

      if (!data.payment_method) {
        return res.json(helper.showValidationErrorResponse('PM_IS_REQUIRED'));
      }

      if (!data.storeId) {
        return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
      }


      let update = await Store.findOneAndUpdate({
        _id: ObjectId(data.storeId)
      }, {
        $pull: {
          "paymentSettings": { payment_method: data.payment_method }
        }
      }, {
        fields: {
          paymentSettings: 1,
          twillio: 1,
          mailgun: 1
        },
        "new": true
      });

      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', update);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  getLogForSuperAdmin: async (req, res) => {
    try {
      let data = req.body
      if (!data.type)
        return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
      if (!Config.LOG_TYPE.includes(data.type))
        return res.json(helper.showValidationErrorResponse('TYPE_IS_WRONG'));

      const { orderBy, order, page, limit } = req.body;
      let pageSize = limit || 10;
      let sortByField = orderBy || "date_created_utc";
      let sortOrder = order || -1;
      let paged = page || 1;
      let obj = {};
      obj.type = data.type;

      let count = await logTable.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
      logTable.geLogWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
        if (err) {
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let countdata = count[0] ? count[0].count : 0;
          return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
        }
      });
    } catch (error) {
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  getLogForSuperAdminCheck: async (req, res) => {
    try {
      const { orderBy, order, page, limit, type } = req.query;
      if (!type)
        return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
      if (!Config.LOG_TYPE.includes(type))
        return res.json(helper.showValidationErrorResponse('TYPE_IS_WRONG'));

      let pageSize = limit || 10;
      let sortByField = orderBy || "date_created_utc";
      let sortOrder = order || -1;
      let paged = page || 1;
      let obj = {};
      obj.type = type;

      let count = await logTable.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
      logTable.geLogWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
        if (err) {
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          let countdata = count[0] ? count[0].count : 0;
          return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', resdata, countdata));
        }
      });
    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  clearLogsType: async (req, res) => {
    try {
      const { type } = req.query;
      if (!type)
        return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));

      if (!Config.LOG_TYPE.includes(type))
        return res.json(helper.showValidationErrorResponse('TYPE_IS_WRONG'));

      logTable.remove({ type: type }, (err, resdata) => {
        if (err) {
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          return res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
        }
      });

    } catch (error) {
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  clearDataByDynamicKey: async (req, res) => {
    try {
      const data = req.body;
      const store = req.store
      // const storeId = store.storeId 
      const storeId = data.storeId

      if (!data.type)
        return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
      if (!Array.isArray(data.type))
        return res.json(helper.showValidationErrorResponse('TYPE_MUST_BE_ARRAY'));

      await Promise.all(data.type.map(async (item) => {
        if (item === "DELETE_ORDER")
          await orderTable.remove({});
        await User.updateMany({
          $or: [
            { $expr: { $eq: ["$role", "DRIVER"] } },
            { $expr: { $eq: ["$role", "VENDOR"] } }
          ]
        }, { wallet: 0 })
        if (item === "DELETE_STORE_ORDER")
          await orderTable.remove({ store: ObjectId(storeId) })
        await User.updateMany({
          store: ObjectId(storeId), $or: [
            { $expr: { $eq: ["$role", "DRIVER"] } },
            { $expr: { $eq: ["$role", "VENDOR"] } }
          ]
        }, { wallet: 0 })
        if (item === "DELETE_STORE_TRANSACTION")
          await paymentLedger.remove({ store: ObjectId(storeId) })
        if (item === "DELETE_TERMINOLOGY")
          await terminlogyTable.remove({});
      }))

      return res.json(helper.showSuccessResponse('DELETE_SUCCESS'));


    } catch (error) {
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },

  removeTransactionById: async (req, res) => {
    try {
      const data = req.body;

      if (!data._id)
        return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));

      await paymentLedger.remove({ _id: ObjectId(data._id) });

      res.json(helper.showSuccessResponse('DELETE_SUCCESS'));

    } catch (error) {
      console.log("removeTransactionById err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  updateStoreVersion: async (req, res) => {
    try {
      const data = req.body;

      if (!data.storeVersion)
        return res.json(helper.showValidationErrorResponse('STORE_VERSION_IS_REQUIRED'));

      let resData = await Store.updateMany({}, {
        $set: {
          storeVersion: Number(data.storeVersion)
        }
      });

      res.json(helper.showSuccessResponse('SUCCESS', resData));

    } catch (error) {
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  deleteWrongCategory: async (req, res) => {
    try {

      let resData = await categoryTable.remove({ $or: [{ date_created_utc: null }, { vendor: null }, { storeType: null }] });

      res.json(helper.showSuccessResponse('SUCCESS', resData));

    } catch (error) {
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  paystackcardAdd: async (req, res) => {
    try {
      res.render('payStackCard', { title: "Card" })
    } catch (error) {
      console.log("err", error);
      res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }

  },
  paystackApplePay: async (req, res) => {
    try {
      res.render('applePay', { title: "Card" })
    } catch (error) {
      console.log("err", error);
      res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }

  },
  translateData: async (req, res) => {
    try {
      let data = req.body
      if (!data.hasOwnProperty('dataTranslate')) {
        return res.json(helper.showValidationErrorResponse('dataTranslate Object Is Required'));
      }
      let obj = req.body.dataTranslate
      let check_length = 0
      check_length = Object.keys(obj).length
      if (!data.lan) {
        return res.json(helper.showValidationErrorResponse('Language_IS_REQUIRED'));
      }
      let lan = data.lan
      if (!check_length) {
        return res.json({ Message: "At least one object required" })
      }
      if (check_length > 200) {
        return res.json({ Message: "translate data object lenght, cannot exceed upto two-hundred at one time" })
      }
      translate(obj, { to: lan }).then(result => {
        return res.json(result)
      }).catch(err => {
        console.error(err)
        return res.json(err)
      })

    } catch (error) {
      console.log("err", error);
      res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }

  },
  addPromoCodeTypeInOldStore: async (req, res) => {

    let couponData = await couponTable.updateMany({}, { $set: { type: "vendor" } })

    return res.json(couponData)
  },
  addPricingTypeInOldProduct: async (req, res) => {

    let productData = await productTable.updateMany({}, { $set: { pricingType: "unit" } })

    return res.json(productData)
  },
  storeStatusUpdatation: async (req, res) => {
    try {
      let data = req.body;

      if (!data.query) return res.json(helper.showValidationErrorResponse("QUERY_IS_REQUIRED"));
      if (!data.update) return res.json(helper.showValidationErrorResponse("UPDATE_FIELD_IS_REQUIRED"));


      let resData = await Store.updateMany(data.query, { $set: data.update }, { new: true });
      res.json(helper.showSuccessResponse('UPDATE_SUCCESS', resData));
    } catch (error) {
      console.log("err", error);
      res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }


  },
  createStoreTypes: async (req, res) => {
    try {

      let data = req.body;

      if (!data.store) {
        return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
      }
      if (!data.storeType) {
        return res.json(helper.showValidationErrorResponse('STORE_ID_IS_REQUIRED'));
      }

      if (data.storeType && !Config.SERVICES.includes(data.storeType.toUpperCase())) {
        return res.json(helper.showValidationErrorResponse('INVALID STORE TYPE'))

      }
      let getStoreTypes = await Storetypes.findOne({
        store: data.store,
        storeType: data.storeType
      })

      // console.log("getStoreTypes:",getStoreTypes)
      let getstore = await Store.findOne({ _id: data.store })

      if (getStoreTypes != null) return res.json(helper.showValidationErrorResponse('STORE_TYPE_EXISTS'));
      if (getstore == null) return res.json(helper.showValidationErrorResponse('INVALID_STORE'));


      let savedStore = await Storetypes.create(data);

      await Promise.all([
        Store.updateOne({ _id: data.store }, { $addToSet: { storeType: savedStore._id } }),
        User.updateOne({ _id: getstore.owner }, { $addToSet: { storeType: savedStore._id } })
      ])
      res.json(helper.showSuccessResponse('SUCCESS', savedStore));


    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  addVechileTypeDriver: async (req, res) => {
    try {
      let data = req.body;
      console.log("data :", data);
      if (!data.store) {
        return res.json(helper.showValidationErrorResponse('STRORE ID REQUIRED'));
      }
      if (!data.vehicledata) {
        return res.json(helper.showValidationErrorResponse('vehicledata REQUIRED'));
      }

      let getUser = await User.find({
        store: ObjectId(data.store),
        status: 'approved',
        role: "DRIVER"
      });

      let update = {};

      if (getUser.length > 0) {

        await Promise.all(getUser.map(async user => {
          data.vehicledata['user'] = user._id
          let savedVehicle = await Vehicle.create(data.vehicledata);

          await Promise.all([
            User.updateOne({ _id: user._id }, { $addToSet: { vehicle: savedVehicle._id } })
          ])

        }));

      }
      let userdata = await User.find({
        store: ObjectId(data.store),
        status: 'approved',
        role: "DRIVER"
      });
      let resdata = helper.showSuccessResponse('UPDATE_SUCCESS', userdata);
      res.json(resdata);

    } catch (error) {
      console.log("err", error);
      return res.json(
        helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR")
      );
    }
  },
  capitalizeFirstLetter: async (req, res) => {
    try {
      let data = req.body;

      if (data.capitalizeArrays && data.capitalizeArrays.constructor === Array) {
        for (let index in data.capitalizeArrays) {

          let element = data.capitalizeArrays[index];
          if (typeof element === 'object' && element.value !== null) {
            let trans = await helper.capitalize(element.value);
            element.value = trans;

          } else {
            let trans = await helper.capitalize(element);
            data.capitalizeArrays[index] = trans;
            //console.log(element)
          }
        }

      } else {
        for (let index in data) {

          let element = data[index];
          let trans = await helper.capitalize(element);
          data[index] = trans;
          //console.log(element);


        }
      }

      res.json(helper.showSuccessResponse("DATA_SUCCESS", data));

    } catch (error) {
      console.log("err", error);
      return res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
    }


  },
  addcontantpage: async (req, res) => {
    try {
      let data = req.body;
      // let store = req.store;
      // data.store = store.storeId;
      // let user = req.user;
      // data.user = user._id;
      if (!data.title) {
        return res.json(helper.showValidationErrorResponse('Titile is required'));
      }
      if (!data.type) {
        return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
      };

      if (!data.deviceType) {
        return res.json(helper.showValidationErrorResponse('DEVICE_TYPE_IS_REQUIRED'));
      };
      if (!["web", "mobile"].includes(data.deviceType.toLocaleLowerCase()))
        return res.json(helper.showValidationErrorResponse('DEVICE_TYPE_IS_WRONG'));



      if (!data.status) {
        return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
      };
      if (data.updateallstore) {
        if (!data.productType) {
          return res.json(helper.showValidationErrorResponse('PRODUCTTYPE_IS_REQUIRED'));
        }
        if (!data.productstatus) {
          return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
        }
        let getStore = await Store.find({
          status: data.productstatus,
          "plan.productType": data.productType
        });
        if (getStore.length > 0) {

          await Promise.all(getStore.map(async store => {
            let contentobj = {
              "type": "form",
              "status": "active",
              "templateType": "form1"
            }
            data.store = store._id
            if (store.owner) {
              data.user = store.owner
              ContentPages.addContentPages(data, (err, pageres) => {
                if (err) {
                  console.log("err--", err)
                }
                else {
                  Section.addSection(contentobj, (err, resdata) => {
                    if (err) {
                      console.log("err :", err);
                    } else {
                      let refData = {
                        contentSection: pageres._id,
                        ref: resdata._id
                      }
                      ContentPages.AddRefToFields(refData);
                    }
                  });
                }
              });
            }
          }));

        }
        return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS'));
      }
      else {
        if (!data.store) {
          return res.json(helper.showValidationErrorResponse('Store Id Required'));
        };
        if (!data.user) {
          return res.json(helper.showValidationErrorResponse('Owner Id Required'));
        };
        let contentobj = {
          "type": "form",
          "status": "active",
          "templateType": "form1"
        }
        ContentPages.addContentPages(data, (err, pageres) => {
          if (err) {
            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
          } else {
            Section.addSection(contentobj, (err, resdata) => {
              if (err) {
                console.log("err :", err);

                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
              } else {
                let refData = {
                  contentSection: pageres._id,
                  ref: resdata._id
                }
                ContentPages.AddRefToFields(refData);
              }
            });
            return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS'));
          }
        });
      }
    } catch (error) {
      console.log("error", error)
      return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  checksessiondata: async (req, res) => {
    console.log(req.session.start)
    if (req.session.start) {
      return res.send("Please wait already  request in progress")
      //res.send({ session: req.session.views })
    }
    // else {
    req.session.start = true
    res.send({ session: req.session.start })
    //}
    // req.session.views = "12123"
    // if()
    // function myfunction(a, b) {
    //     console.log("a--", a, "b--", b)
    // }
    // myfunction(1, 2)
    //res.send({ session: req.session.views })
  },
  addDocumentTemplateData: async (req, res) => {
    try {
      let data = req.body;
      if (!data.storeId) {
        return res.json(helper.showValidationErrorResponse('STORE_IS_REQUIRED'));
      }
      data.store = ObjectId(data.storeId)
      if (!data.name) {
        return res.json(helper.showValidationErrorResponse('NAME_IS_REQUIRED'));
      };

      if (!data.role) {
        return res.json(helper.showValidationErrorResponse('ROLE_IS_REQUIRED'));
      };

      if (!data.status) {
        return res.json(helper.showValidationErrorResponse('STATUS_IS_REQUIRED'));
      };
      if (!data.type) {
        return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
      }
      DocumentTemplate.addDocumentTemplate(data, (err, resdata) => {
        if (err) {
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', resdata));
        }
      })

    } catch (error) {
      console.log("error----", error)
      return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  getresponse: async (req, res) => {
    console.log("re---", req.query)
    console.log("check log---")
    res.send("Success---")
  },
  createReferralCodeForAllUsers: async (req, res) => {
    try {
      let data = req.body;
      if (!data.store) {
        return res.json(helper.showValidationErrorResponse('STRORE ID REQUIRED'));
      }
      if (!data.type) {
        return res.json(helper.showValidationErrorResponse('TYPE_IS_REQUIRED'));
      }
      let role = "USER";
      if (data.type == "drivers")
        role = "DRIVER";

      if (data.type == "VENDORS")
        role = "VENDOR";

      let getUser = await User.find({
        store: ObjectId(data.store),
        status: { $ne: "archived" },
        referralCode: { $exists: false },
        role
      }, "name");

      if (getUser.length > 0) {

        await Promise.all(getUser.map(async user => {
          let referralCode = user.name.charAt(0).toUpperCase() + user.name.charAt(1).toUpperCase() + randomstring.generate(10).toUpperCase();
          user["referralCode"] = referralCode;
          await User.updateOne({ _id: user._id }, { referralCode });

        }));

      }
      res.json(helper.showSuccessResponse('UPDATE_SUCCESS', getUser));


    } catch (error) {
      console.log(error)
      res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }

  },
  sendOrderPlacedNotificationToStore: async (req, res) => {
    try {
      let { title, body, userId, firebaseTokens, storeId, listen } = req.body;
      let store = await Store.findById(storeId, "firebase");

      if (!store) {
        return res.json(helper.showValidationErrorResponse("INVALID_STORE_ID"))
      }
      let keys = env.firebase;
      if (store.firebase) {
        keys = store.firebase;
      }

      if (userId) {
        let getUser = await User.findById(userId, "firebaseTokens").lean();
        if (!getUser) {
          return res.json(helper.showValidationErrorResponse("INVALID_USER_ID"))
        }
        firebaseTokens = getUser ? getUser.firebaseTokens : [];
      }
      if (firebaseTokens && firebaseTokens.length) {
        let messages = [];
        firebaseTokens.map(nElement => {
          if (nElement.token) {
            messages.push({
              notification: {
                title: title,
                body: body,
                // sound: "default"
              },
              token: nElement.token,
            });
          }
        });
        if (messages.length > 0) {
          Push.sendBatchNotification(messages, "TEST", keys);
          console.log("sent test notification...")
        }
        SocketHelper.singleSocket(store._id, "Store", { storeId: store._id, title, body }, listen ? listen : 'storeNotification');
      }
      return res.json({ message: "Notification sent success", status: true })

    } catch (error) {
      console.log(error)
    }
  },
  updateFormField: async (req, res) => {
    try {
      let data = req.body;
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse('FORM_FIELD_ID_REQUIRED'));
      }
      if (!data.valueType) {
        return res.json(helper.showValidationErrorResponse('VALUETYPE_REQUIRED'));
      }
      if (!["pricePerUnitTime", "basePrice", "pricePerUnitDisatance"].includes(data.valueType)) {
        return res.json(helper.showValidationErrorResponse('INVALID_VALUETYPE'));
      }
      let getFormField = await FormField.findById(data._id)
      if (getFormField == null) {
        return res.json(helper.showValidationErrorResponse('INVALID_FORM_FIELD'));
      }
      let result = await FormField.findByIdAndUpdate(getFormField._id, { $set: { valueType: data.valueType } }, { new: true })
      res.json(helper.showSuccessResponse('UPDATE_SUCCESS', result));
    } catch (error) {
      console.log(error)
      res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }

  },
  addplan: async (req, res) => {
    let plan = req.body.plan
    if (!plan) {
      return res.json(helper.showValidationErrorResponse("paln requried"))
    }
    let productData = await planmodel.create(plan)
    return res.json(helper.showSuccessResponse("SUCCESS", productData))
  },
}