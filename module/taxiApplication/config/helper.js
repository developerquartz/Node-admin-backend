async function sendSMS(twilioKey, userData, title, body) {
    let from = env.twilio.twilioFrom;
    let accountSid = env.twilio.accountSid;
    let authToken = env.twilio.authToken;

    if (twilioKey != undefined && twilioKey != {}) {
        accountSid = twilioKey.accountSid;
        authToken = twilioKey.authToken;
        from = twilioKey.twilioFrom
    }

    console.log("userData", userData);

    let numbers = [];
    let notProcessed = 0;

    userData.forEach(element => {
        if (element.countryCode && element.mobileNumber) {
            numbers.push(element.countryCode + element.mobileNumber);
        } 
        else
            notProcessed++;
    });

    if (numbers.length > 0) {
        if(process.env.NODE_ENV != "production" && numbers.length > 5) {
        numbers.length = 5 //fixed the array size
        }
        let client = require('twilio')(accountSid, authToken);
        //const service = await client.messaging.services.create({ friendlyName: title });
        let failureCount = 0;
        console.log("numbers :",numbers);
        //console.log("from :",from);

        let smsData = await Promise.all(
            numbers.map(async number => {
                try {
                    return await client.messages.create({
                        to: number,
                        from: from,
                        body: body
                    });
                } catch (error) {
                    console.log("error msg : ", error);

                    failureCount++;
                }

            })
        )
        if (smsData) {
            console.log("smsData :",smsData);
            
            let resData = { successCount: numbers.length - failureCount, failureCount: failureCount }
            resData.totalCount = numbers.length

            return resData;
        }
    }
}

module.exports = { 
    sendSMS
}