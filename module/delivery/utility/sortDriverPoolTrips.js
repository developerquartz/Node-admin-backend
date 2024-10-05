let googleMap = require("../../../helper/googleMap");
let orderTable = require("../../../models/ordersTable");
let sortDriverPoolTrips = async (driverId, userLocation, store) => {
    return new Promise(async (resolve, reject) => {


        let fromLocation = { lat: userLocation.coordinates[1], lng: userLocation.coordinates[0] };
        var getDriverTrips = await orderTable.getDriverCurrentPoolTrips(driverId);

        if (getDriverTrips.length === 0) {
            return resolve(getDriverTrips);
        }
        await Promise.all(getDriverTrips.map(async element => {
            if (element.orderStatus === "inroute") {
                let toLocationEnd = element.dropOff.location.coordinates;
                let toLocationEndObj = { lat: toLocationEnd[1], lng: toLocationEnd[0] };
                let getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(fromLocation, toLocationEndObj, store.googleMapKey.server);
                console.log("getDistanceAndTime", getDistanceAndTime);
                var distance = 0;
                if (!getDistanceAndTime.status || getDistanceAndTime.distance == 0) {
                    distance = await helper.getDistanceFromTwoLocation(userLocation.coordinates, toLocationEnd);
                } else {
                    distance = getDistanceAndTime.distance;
                }

                //element.set("distance", helper.roundNumber(distance), { strict: false });
                element["distance"] = helper.roundNumber(distance);

            } else {

                let toLocationStart = element.pickUp.location.coordinates;
                let toLocationStartObj = { lat: toLocationStart[1], lng: toLocationStart[0] };
                let getDistanceAndTime = await googleMap.getDistanceMatrixInfoByAddress(fromLocation, toLocationStartObj, store.googleMapKey.server);

                console.log("getDistanceAndTime1", getDistanceAndTime);

                var distance = 0;
                if (!getDistanceAndTime.status || getDistanceAndTime.distance == 0) {
                    distance = await helper.getDistanceFromTwoLocation(userLocation.coordinates, toLocationStart);
                } else {
                    distance = getDistanceAndTime.distance;
                }
                element["distance"] = helper.roundNumber(distance);

                //element.set("distance", helper.roundNumber(distance), { strict: false });

            }
        }));

        getDriverTrips.sort(function (a, b) {
            return a.distance - b.distance;
        });

        resolve(getDriverTrips);
    });

}
module.exports = { sortDriverPoolTrips } 