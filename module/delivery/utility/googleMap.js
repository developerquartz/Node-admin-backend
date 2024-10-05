const { Client } = require("@googlemaps/google-maps-services-js");

let getDistanceMatrixInfoByAddress = async (origins, destinations, gkey) => {
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
        
    if (distanceMatrix.status != "OK") {
        return {
            status: false,
            message: distanceMatrix.error_message
        }
    }

    if (distanceMatrix.rows[0].elements[0].status == "ZERO_RESULTS") {
        return {
            status: true,
            distance: 0,
            time: 0,
            message: "Your address is too far from source!"
        }
    }

    let distance = distanceMatrix.rows[0].elements[0].distance.value;
    //convert distance meters to km
    distance = Math.round((distance / 1000) * 100) / 100;
    let time = distanceMatrix.rows[0].elements[0].duration.value;
    time = Math.round((time / 60) * 100) / 100; //time in seconds convert to min

    return {
        status: true,
        distance: distance,
        duration: time
    }
}

let getTimeZoneFromLocation = () => {

}

let getLatLngFromAddress = async (gkey, address) => {
console.log('data :',gkey, address);

    if (gkey) {
        gkey = gkey.trim();
    } else {
        gkey = env.GOOGLE_MAP_API_KEY
    }
    console.log("gkey :",gkey);
    

    const client = new Client({})

    let geoCodeDetails = client
    .geocode({ 
        params: {
            address: address,
            key: 'AIzaSyAjo7aS-HZMOyJhoCdCjOe5diEYZhvcAS4'
        } })
        .then((response) => {
            
            return response.data;
        })
        .catch((err) => {
            
            return err.response.data;
        });

    let [geoCodeData] = await Promise.all([geoCodeDetails]);
    let coordinates = {}

    console.log("geoCodeData :",geoCodeData);
    if(geoCodeData.status == 'OK') {
         coordinates = geoCodeData.results[0].geometry.location
        console.log("coordinates :",coordinates);
        return coordinates; 
        
    }
    else 
    return coordinates
       

    
}

module.exports = {
    getDistanceMatrixInfoByAddress,
    getTimeZoneFromLocation,
    getLatLngFromAddress
}