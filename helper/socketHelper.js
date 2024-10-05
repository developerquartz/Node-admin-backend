const axios = require('axios');

let nearByDriverSocket = async (users, resdata) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/nearby/socket';

        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                users: users,
                resdata: resdata
            }
        });
    } catch (error) {
        console.log("nearByDriverSocket err", error);
    }
}

let singleSocket = async (channelId, userType, resdata, listen) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/single/socket';

        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                channelId: channelId,
                userType: userType,
                resdata: resdata,
                listen: listen ? listen : ''
            }
        });
    } catch (error) {
        console.log("singleSocket err", error);
    }
}

module.exports = {
    nearByDriverSocket,
    singleSocket
}