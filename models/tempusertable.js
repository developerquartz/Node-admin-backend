var mongoose = require('mongoose');
//var tripSchema = require('tripTable.js');

var userSchema = mongoose.Schema({
    mobileNumber: {type: Number},
    email: {type:String},
    OTP:{type:String},
    OTPexp:{type:Date},
    countryCode: {type:String,default:null},
    createdAt: {type: Date}
},
{
    versionKey: false // You should be aware of the outcome after set to false
});
 
const tempUser = module.exports = mongoose.model('tempUser', userSchema);

//get all Temp users
module.exports.getTempUsers = function(callback, limit) {
	tempUser.find(callback).limit(limit);
}

//get tempUser
module.exports.getTempUserOTP = function(data) {
	return tempUser.findOne({mobileNumber: data.mobileNumber, OTP: data.OTP}).limit(1);
}

// Updating Temp user
module.exports.updateTempUser = ( data, callback) => {
    var query = {mobileNumber: data.mobileNumber};
    var update = {
        mobileNumber : data.mobileNumber,
        OTP : data.OTP,
        OTPexp: data.OTPexp,
        countryCode:data.countryCode,
        createdAt: new Date()
    }
	tempUser.findOneAndUpdate(query, update, {upsert: true,new:true}, callback);
}

module.exports.updateTempUserEmail = ( data, callback) => {
    var query = {email: data.email};
    var update = {
        email : data.email,
        OTP : data.OTP,
        OTPexp: data.OTPexp,
        createdAt: new Date()
    }
	tempUser.findOneAndUpdate(query, update, {upsert: true,new:true}, callback);
}

// Delete temp user
module.exports.removeTempUser = (mobileNumber, callback) => {
	var query = {mobileNumber: mobileNumber};
	tempUser.remove(query, callback);
}

// add function to delete each registerd number after hour 