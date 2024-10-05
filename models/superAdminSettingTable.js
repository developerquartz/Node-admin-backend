const mongoose = require('mongoose');

let SettingSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    twilio: {
        accountSid: { type: String, default: null },
        authToken: { type: String, default: null },
        twilioFrom: { type: String, default: null }

    },
    mailgun: {
        MAILGUN_API_KEY: { type: String, default: null },
        MAILGUN_DOMAIN: { type: String, default: null },
        MAILGUN_FROM: { type: String, default: null }
    },
    aws: { 
        SECRET_ACCESS_KEY: { type: String, default: null },
        SECRET_ACCESS_ID: { type: String, default: null },
        REGION_NAME: { type: String, default: null },
        BUCKET_NAME: { type: String, default: null }
    },
    date_created: { type: Date },
    date_created_utc: { type: Date },
    date_modified: { type: Date },
    date_modified_utc: { type: Date },
    meta_data: [
        {
            key: { type: String },
            value: { type: String }
        }
    ]
},
    {
        versionKey: false // You should be aware of the outcome after set to false
    });

const SettingTable = module.exports = mongoose.model('Setting', SettingSchema);

module.exports.addSetting = (data, callback) => {
    SettingTable.create(data, callback);
}

module.exports.getTwillioSetting = (callback) => {
    SettingTable.findOne({}, 'twilio', callback);
}

module.exports.getAWSSetting = (callback) => {
    SettingTable.findOne({}, 'AWS', callback);
}

module.exports.getMailgunSetting = (callback) => {
    SettingTable.findOne({}, 'mailgun', callback);
}