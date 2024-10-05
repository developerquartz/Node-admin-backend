const { Client } = require("@googlemaps/google-maps-services-js");

let getDistanceMatrixInfoByAddress = async (origins, destinations, gkey) => {
    try {
        if (gkey) {
            gkey = gkey.trim();
        } else {
            gkey = env.GOOGLE_MAP_API_KEY
        }

        const client = new Client({});

        let distanceMatrixDetails = client
            .distancematrix({
                params: {
                    origins: [origins], //"Washington, DC, USA"
                    destinations: [destinations], //"New York, NY, USA"
                    mode: "driving",
                    key: gkey,
                }
            })
            .then((response) => {
                return response.data;
            })
            .catch((err) => {
                return err.data;
            });

        let [distanceMatrix] = await Promise.all([distanceMatrixDetails]);

        if (!distanceMatrix) {
            throw new Error('Invalid Google Map Key');
        }

        if (distanceMatrix.status != "OK") {
            throw new Error(distanceMatrix.error_message);
        }

        if (distanceMatrix.rows[0].elements[0].status == "ZERO_RESULTS") {
            throw new Error("Your address is too far from source!");
        }

        let distance = distanceMatrix.rows[0].elements[0].distance.value;

        //convert distance meters to km
        distance = Math.round((distance / 1000) * 100) / 100 || 1; //default 1 km, if source and destination is same;
        let time = distanceMatrix.rows[0].elements[0].duration.value;
        time = Math.round((time / 60) * 100) / 100 || 1; //time in seconds convert to min ,default 1 min, if source and destination is same

        return {
            distance: distance,
            duration: time
        }
    } catch (error) {
        throw new Error('Invalid Google Map Key');
    }
}

let getLatLngFromAddress = async (gkey, address) => {
    if (gkey) {
        gkey = gkey.trim();
    } else {
        gkey = env.GOOGLE_MAP_API_KEY
    }

    const client = new Client({})

    let geoCodeDetails = client
        .geocode({
            params: {
                address: address,
                key: gkey
            }
        })
        .then((response) => {

            return response.data;
        })
        .catch((err) => {

            return err.response.data;
        });

    let [geoCodeData] = await Promise.all([geoCodeDetails]);
    let coordinates = {}

    if (geoCodeData.status == 'OK') {
        coordinates = geoCodeData.results[0].geometry.location;
        return coordinates;

    }
    else
        return coordinates;
}

module.exports = {
    getDistanceMatrixInfoByAddress,
    getLatLngFromAddress
}