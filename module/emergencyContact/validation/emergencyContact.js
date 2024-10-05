const { addContact } = require('./rules');
const { validateRule } = require('./validator');
const utilityFunc = require('../utility/functions');

let createEmergencyContact = async (req,res,next) => {
    try {

        req.logType = {
         module: 'taxi',
         function: 'createEmergencyContact'
         }
         let payload = req.body;
         let addContactRules = addContact();
         let validateAddContactRules = validateRule(addContactRules, payload);

         if (validateAddContactRules) {
            next();
         }
    } catch (error) {         
        
        utilityFunc.sendErrorResponse(error, res);
    }

}
let getEmergencyContact = async (req,res,next) => {
    try {
        let payload = req.body

        if (!payload._id) throw "ID_IS_REQUIRED"
       next();

    } catch (error) {         
        
        utilityFunc.sendErrorResponse(error, res);
    }

}
let updateEmergencyContact = async (req,res,next) => {
    try {
        let payload = req.body

        if (!payload._id) throw "ID_IS_REQUIRED"
        if (!payload.mobileNumber) throw "MOBILE_NUMBER_IS_REQUIRED"

       next();

    } catch (error) {         
        
        utilityFunc.sendErrorResponse(error, res);
    }

}
let removeEmergencyContact = async (req,res,next) => {
    try {
        let payload = req.body

        if (!payload._id) throw "ID_IS_REQUIRED"

       next();

    } catch (error) {         
        
        utilityFunc.sendErrorResponse(error, res);
    }

}
module.exports = {
    createEmergencyContact,
    getEmergencyContact,
    updateEmergencyContact,
    removeEmergencyContact
}