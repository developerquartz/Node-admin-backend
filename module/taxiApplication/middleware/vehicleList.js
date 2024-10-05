let User = require("../../../models/userTable");
const Vehicle = require('../../delivery/models/vehicelTypesTable');
let getDeliveryVehicleList = async (req, res, next) => {
    try {
        let data = req.body;
        let storeTypeDetails = req.storeTypeDetails;
        let store = req.store;
        let rideType = data.rideType;
        if (req.get('Authorization')) {
            let token = req.get('Authorization').replace('Bearer ', '');
            let user = await User.findOne({ "tokens.token": token }, 'loyaltyPoints');
            req.user = user;
        }
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
        let getVehicleList = await Vehicle.getVehicleTypesList(obj);
        if (getVehicleList.length == 0) {
            return res.json(helper.showValidationErrorResponse("VEHICLE_TYPES_NOT_ADDED"))
        }
        req.body.vehicleTypesList = getVehicleList;
        next();

    } catch (error) {
        console.log(error);
        res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
    }
}
module.exports = getDeliveryVehicleList;