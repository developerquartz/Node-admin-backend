const contactService = require('../services/emergencyContact');

module.exports = {
    
    addContact: async (req, res) => {
        try {
            var data = req.body;
            var user = req.user;
            var contactData = {
                userId: user._id,
                name: data.name,
                mobileNumber: data.mobileNumber,
                countryCode: data.countryCode,
                status:data.status
            }
            var check = await contactService.getEmergencyContact(contactData);
            if (check) throw "CONTACT_NUMBER_EXISTS" 

            contactService.saveEmergencyContact(contactData, (err, contact) => {
                if (err) throw err
                else {
                    return res.json(helper.showSuccessResponse('CONTACT_ADD_SUCCESS', contact));
                }
            });

        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse(error));
        }
    },
    updateContact: async (req, res) => {
        try {
            var data = req.body;
            var user = req.user;
            var contactData = {
                _id:data._id,
                userId: user._id,
                name: data.name,
                mobileNumber: data.mobileNumber,
                countryCode: data.countryCode,
                status:data.status
            }

            contactService.updateEmergencyContact(contactData, (err, contact) => {
                if (err) throw err
                else {
                    return res.json(helper.showSuccessResponse('SUCCESS', contact));
                }
            });

        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse(error));
        }
    },   
    getContactByContactId: async (req, res) => {
        try {
            var data = req.body;
          
            contactService.getEmergencyContactById(data, (err, contact) => {
                if (err) throw err
                else {
                    return res.json(helper.showSuccessResponse('SUCCESS', contact));
                }
            });

        } catch (error) {
            return res.json(helper.showInternalServerErrorResponse(error));
        }
    },
    removeUserContact: async (req, res) => {
        try {
            var data = req.body;
            var id = data._id;
        
            contactService.removeContactById(id, (err, contact) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    return res.json(helper.showSuccessResponse('CONTACT_REMOVE_SUCCESS'));
                }
            });

        } catch (e) {
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }

    },
    getUserContacts: async (req, res) => {
        try {
            let user = req.user

            contactService.getContactByUserIdCallback({userId:user._id}, (err, contacts) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    if (contacts.length === 0) {
                        return res.json(helper.showSuccessResponse('NO_DATA_FOUND', contacts));
                    }

                    return res.json(helper.showSuccessResponse('DATA_SUCCESS', contacts));
                }
            });
        }
        catch{
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
}