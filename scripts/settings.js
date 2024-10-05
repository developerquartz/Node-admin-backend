const configModel = require('../models/superAdminSettingTable');
// const env = require('../config/env');
let mongoose = require('mongoose');
const async = require('async');
const mongoAtlasUri = env.mongoAtlasUri;
mongoose.Promise = global.Promise;
mongoose.connect(mongoAtlasUri, () => {
    //console.log('you are connected to MongoDb');
    insertConfigInfo();
});
mongoose.connection.on('error', (err) => {
    //console.log('Mongdb connection failed due to error : ', err);
});
function insertConfigInfo() {
    async.waterfall([
        function (callback) {
            configModel.create({

                "twilio.accountSid": env.twilio.accountSid,
                'twilio.authToken': env.twilio.authToken,
                'twilio.twilioFrom': env.twilio.twilioFrom,

                'mailgun.MAILGUN_API_KEY': env.mailgun.MAILGUN_API_KEY,
                'mailgun.MAILGUN_DOMAIN': env.mailgun.MAILGUN_DOMAIN,
                'mailgun.MAILGUN_FROM': env.mailgun.MAILGUN_FROM,

                'aws.SECRET_ACCESS_KEY': env.aws.SECRET_ACCESS_KEY,
                'aws.SECRET_ACCESS_ID': env.aws.SECRET_ACCESS_ID,
                'aws.REGION_NAME': env.aws.REGION_NAME,
                'aws.BUCKET_NAME': env.aws.BUCKET_NAME

            }, function (err, data) {
                if (err) {
                    //console.log("Error in inserting config.");
                    process.exit();
                }
                else {
                    callback(null, data)
                }
            });
        },

    ], function (err, data) {
        //console.log("successfully saved config Info.");
        process.exit();
    });
}