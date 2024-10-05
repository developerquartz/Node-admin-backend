const ObjectId = require('objectid');
module.exports = {
    vehiclequery: (data) => {
        let vehicleType = [data.vehicleType._id];
        vehicleType = vehicleType.map(vehicle => ObjectId(vehicle));
        let query;
        if (data.storeType.storeType != "TAXI")
            return query = { 'vehicles.vehicleType': { $in: vehicleType } };

        if (data.rideType == "pool")
            query = {
                "$or": [{ "enabledRideShare": true, "vehicleType.vehicle": "car" }, { "enabledRideShare": true, 'vehicles.vehicleType': { $in: vehicleType } }],
            }
        else
            query = {
                "$or": [
                    { "enabledRideShare": false, "vehicleType.type": "pool" },
                    {
                        $or: [{ "enabledRideShare": false }, { "enabledRideShare": { $exists: false } }],
                        'vehicles.vehicleType': { $in: vehicleType }
                    }
                ],
            }
        return query;
    },
};