const axios = require('axios');

let deliveryApiCall = async (data) => {
    try {
        let deliveryApiUrl = getDeliveryApiUrl(data.apiType);
        // Send a POST request
        console.log("deliveryApiUrl----",deliveryApiUrl)
        let request = await axios({
            method: 'post',
            url: deliveryApiUrl,
            headers: {
                'cache-control': 'no-cache',
                "Content-Type": "application/json",
                "Authorization": data.token ? `Bearer ${data.token}` : '',
                "apikey": data.apiKey
            },
            data: data
        });

        return request;

    } catch (error) {
        error.error_description = 'Error in delivery api middleware!';
        throw new Error(error);
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