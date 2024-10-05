const geoTable = require('../models/geofenceTable')
const helper = require("../../../helper/helper");
const ObjectId = require('objectid');

module.exports = {

  addgeofenceData: async (req, res) => {
    try {
      let store = req.store;
      let user = req.user
      let coordinate = []
      let data = req.body;
      coordinate = data.coordinate ? data.coordinate : []
      data.store = store.storeId;

      if (!data.label) {
        return res.json(helper.showValidationErrorResponse('LABEL_REQUIRED'));
      }
      if (!data.moduleType) {
        return res.json(helper.showValidationErrorResponse('MODULE TYPE REQUIRED'));
      }
      if (!data.type) {
        return res.json(helper.showValidationErrorResponse('TYPE_REQUIRED'));
      }
      if (user.role == "VENDOR") {
        data.vendor = user._id
      }
      if (data.moduleType == "taxi") {
        if (data.isvehicle) {
          if (!data.hasOwnProperty('vehicleType')) {
            return res.json(helper.showValidationErrorResponse('VECHILE TYPE REQUIRED'));
          }

          if (!data.pricePerUnitDistance && Number(data.pricePerUnitDistance) < 0) {
            return res.json(helper.showValidationErrorResponse('DISTANCE_UNIT_PRICE_IS_REQUIRED'));
          };
          if (!data.pricePerUnitTimeMinute && Number(data.pricePerUnitTimeMinute) < 0) {
            return res.json(helper.showValidationErrorResponse('TIME_UNIT_PRICE_IS_REQUIRED'));
          };

          if (!data.basePrice && Number(data.basePrice) < 0) {
            return res.json(helper.showValidationErrorResponse('BASE_PRICE_IS_REQUIRED'));
          };
        }
      }
      if (coordinate.length > 0 && data.hasOwnProperty('coordinate')) {

        if (data.type == 'radius') {
          if (parseInt(data.radius) > 0) {
            data.radius = Number(data.radius)
            data.location = { type: "Point", coordinates: data.coordinate }
          }
          else {
            return res.json(helper.showValidationErrorResponse('RADIUS_REQUIRED'));
          }
        }
        else if (data.type == 'geofence') {
          data.location = { type: "Polygon", coordinates: data.coordinate }
        }
        geoTable.addGeofence(data, (err, resdata) => {
          if (err) {
            console.log(err)
            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
          } else {
            return res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
          }
        });
      }
      else {
        return res.json(helper.showDatabaseErrorResponse("LOCATION_NOT_FOUND"));
      }
    }
    catch (error) {
      console.log("err :", error);
      return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  getgeofencById: async (req, res) => {
    try {
      let gf_id = req.params._id;
      let user = req.user
      let obj = { _id: ObjectId(gf_id) }
      if (user.role == "VENDOR") {
        obj = { _id: ObjectId(gf_id), vendor: user._id }
      }
      if (!gf_id) {
        return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
      }

      geoTable.getGeofenceById(obj, (err, resdata) => {
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

  updategeofencData: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
      }
      if (user.role == "VENDOR") {
        data.vendor = user._id
      }
      if (data.moduleType == "taxi") {
        if (data.isvehicle) {
          if (!data.hasOwnProperty('vehicleType')) {
            return res.json(helper.showValidationErrorResponse('VECHILE TYPE REQUIRED'));
          }
          if (!data.pricePerUnitDistance && Number(data.pricePerUnitDistance) < 0) {
            return res.json(helper.showValidationErrorResponse('DISTANCE_UNIT_PRICE_IS_REQUIRED'));
          };
          if (!data.pricePerUnitTimeMinute && Number(data.pricePerUnitTimeMinute) < 0) {
            return res.json(helper.showValidationErrorResponse('TIME_UNIT_PRICE_IS_REQUIRED'));
          };

          if (!data.basePrice && Number(data.basePrice) < 0) {
            return res.json(helper.showValidationErrorResponse('BASE_PRICE_IS_REQUIRED'));
          };
        }
      }

      if (data.coordinate.length > 0) {
        if (data.type == 'radius') {
          if (parseInt(data.radius) > 0) {
            data.radius = Number(data.radius)
            data.location = { type: "Point", coordinates: data.coordinate }
          }
          else {
            return res.json(helper.showValidationErrorResponse('RADIUS_REQUIRED'));
          }
        }
        else if (data.type == 'geofence') {
          data.location = { type: "Polygon", coordinates: data.coordinate }
        }
      }
      geoTable.updateGeofenc(data, (err, resdata) => {
        if (err) {
          console.log(err)
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          return res.json(helper.showSuccessResponse('DATA_UPDATED', resdata));
        }
      });
    }
    catch (error) {
      console.log(error)
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"))
    }
  },
  getgeofencList: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user
      let store = req.store;
      let pageSize = data.limit || 10;
      let sortByField = data.orderBy || "date_created_utc";
      let sortOrder = data.order || -1;
      let paged = data.page || 1;
      let obj = {};
      obj.store = store.storeId;

      if (data.fields && data.fields.length > 0) {
        data.fields.forEach(element => {
          if (element.fieldName && element.fieldValue) {
            obj[element.fieldName] = element.fieldValue;
          }
        });
      }

      if (!obj.hasOwnProperty("status")) {
        obj.status = 'active'//{ $ne: "archived" };
      }
      // if (!obj.hasOwnProperty("moduleType")) {
      //   obj.moduleType = { $ne: "taxi" }
      // }
      if (user.role != "VENDOR") {

        obj["$or"] = [{ vendor: { $eq: null } }, { vendor: { $eq: "" } }, { vendor: { $exists: false } }]
      }
      if (user.role == "VENDOR") {
        obj.vendor = user._id
      }
      if (data.search) {
        obj['$or'] = [];
        obj['$or'].push({ label: { $regex: data.search || '', $options: 'i' } });
      }

      let count = await geoTable.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
      let totalcount = count.length > 0 ? count[0].count : 0;
      geoTable.getGeofencWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
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

  removeGeofenc: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user
      if (!data._id) {
        return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
      }
      let obj = { _id: ObjectId(data._id) }
      if (user.role == "VENDOR") {
        obj = { _id: ObjectId(data._id), vendor: user._id }
      }
      let findTemp = await geoTable.findOneAndUpdate(obj, { status: "archived" })
      if (findTemp) {
        res.json(helper.showSuccessResponseCount('DELETE_SUCCESS'));
      }
      else {
        res.json(helper.showParamsErrorResponse("NOT_FOUND"))
      }
    }
    catch (error) {
      console.log(error)
      res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"))
    }
  },

  updateStatus: async (req, res) => {
    try {
      let data = req.body;
      let user = req.user
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
      if (user.role == "VENDOR") {
        data.vendor = user._id
      }
      geoTable.updateStatusByIds(data, update, (err, resdata) => {
        if (err) {
          return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
        } else {
          res.json(helper.showSuccessResponse('DELETE_SUCCESS', resdata));
        }
      });
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  },
  checklocaton: async (req, res) => {
    try {
      let data = req.body
      let store = req.store.storeId
      if (!data.location.length) {
        return res.json(helper.showValidationErrorResponse('LOCATION IS REQUIRED'));
      }
      if (!data.moduleType) {
        return res.json(helper.showValidationErrorResponse('MODULE TYPE REQUIRED'));
      }
      if (!data.type) {
        return res.json(helper.showValidationErrorResponse('TYPE REQUIRED'));
      }
      if (data.moduleType == "taxi") {
        let dataSet = {
          lctionArray: data.location,
          store: store,
          type: data.type,
          moduleType: data.moduleType
        }
        geoTable.checkbylocation(dataSet, (err, resdata) => {
          if (err) {
            return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
          } else {
            res.json(helper.showSuccessResponse('SUCCESS', resdata));
          }
        })
      }
      else {
        return res.json(helper.showValidationErrorResponse('INVALID MODULE TYPE'));
      }
    } catch (error) {
      console.log("error", error);
      res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
  }
}