const mongoose = require("mongoose");
// const Schema = mongoose.Schema;
let OtpSchema = mongoose.Schema({
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store' },
    otp: {
        type: String
    },
    mobileNumber: {
        type: String
    },
    countryCode: {
        type: String
    },
    email: {
        type: String
    }
}, {
    timestamps: true
});
let Otp = mongoose.model('Otp', OtpSchema);
module.exports = Otp;