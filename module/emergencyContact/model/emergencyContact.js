const mongoose = require('mongoose');

const ContactSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    mobileNumber: { type: String },
    createdAt: { type: Date, default: new Date() },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    countryCode: { type: String, trim: true }
},
    {
        versionKey: false // You should be aware of the outcome after set to false
    });

const Contact = module.exports = mongoose.model('emergencyContact', ContactSchema);


//add contact 
module.exports.addContact = function (contact, callback) {
    contact.createdAt = new Date();

    Contact.create(contact, callback);
}

//get contact by userID
module.exports.getContactByUserId = function (userId, callback) {
    var where = { userId: userId }
    return Contact.find(where, callback);
}

module.exports.getContactByUserIdCallback = function (condition, callback) {
   console.log("condition :",condition);
   
    Contact.find(condition, callback);
}
module.exports.getContactById = function (data, cb) {
    var where = { _id: data._id }
    Contact.findOne(where, cb);
}
//
module.exports.searchForContact = function (data) {
    var where = { userId: data.userId, mobileNumber: data.mobileNumber }
    return Contact.findOne(where);
}

//update emergency contact
module.exports.updateContact = function (data, cb) {
    console.log("data :", data);

    var where = { _id: data._id }
    Contact.findOneAndUpdate(where, data, { upsert: true, new: true }, cb);
}


//remove contact
module.exports.removeContact = (id, callback) => {
    var query = { _id: id };
    Contact.remove(query, callback);
}