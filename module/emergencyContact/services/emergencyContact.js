const emergencyContact = require('../model/emergencyContact')

let saveEmergencyContact = async (data,cb) => {
    return await emergencyContact.create(data,cb)
}
let getEmergencyContact = async (data) => {
   return await emergencyContact.searchForContact(data)
}
let updateEmergencyContact = async (data,cb) => {
    emergencyContact.updateContact(data,cb)
 }
 let getEmergencyContactById = async (data,cb) => {
    emergencyContact.getContactById(data,cb)
 }
 let removeContactById = async (data,cb) => {
    emergencyContact.removeContact(data,cb)
 }
 let getContactByUserIdCallback = async (data,cb) => {
    emergencyContact.getContactByUserIdCallback(data,cb)
 }
module.exports = {
    saveEmergencyContact,
    getEmergencyContact,
    updateEmergencyContact,
    getEmergencyContactById,
    removeContactById,
    getContactByUserIdCallback
}