const axios = require('axios');
const utilityFunc = require('../utility/functions');

let deliveryApiCall = async (data, res) => {
    try {
        let deliveryApiUrl = getDeliveryApiUrl(data.apiType);
        // Send a POST request
        let request = await axios({
            method: 'post',
            url: deliveryApiUrl,
            headers: {
                'cache-control': 'no-cache',
                "Content-Type": "application/json",
                "Authorization": `Bearer ${data.token}`,
                "apikey": data.apiKey
            },
            data: data
        });

        return request;

    } catch (error) {
        console.log("error :", error);

        error.error_description = 'Error in delivery api middleware!';
        utilityFunc.sendErrorResponse(error, res);
    }
}

let getDeliveryApiUrl = (apiType) => {
    let apiUrl = '';

    switch (apiType) {
        case 'nearByDrivers':
            apiUrl = env.deliveryApiUrl + '/nearby';
            break;
        case 'vehicleTypes':
            apiUrl = env.deliveryApiUrl + '/user/vehicleTypes';
            break;
        case 'sendRequest':
            apiUrl = env.deliveryApiUrl + '/request';
            break;

        default:
            break;
    }

    return apiUrl;
}

module.exports = {
    deliveryApiCall
}