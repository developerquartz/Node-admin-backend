const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const contactController = require('./controller/emergencyContactController');
const { createEmergencyContact, getEmergencyContact, updateEmergencyContact, removeEmergencyContact } = require('./validation/emergencyContact')

router.get('/list', Auth.isApp, Auth.authUser, contactController.getUserContacts);
router.post('/add', Auth.isApp, Auth.authUser, createEmergencyContact, contactController.addContact);
router.post('/view', Auth.isApp, Auth.authUser, getEmergencyContact, contactController.getContactByContactId);
router.post('/update', Auth.isApp, Auth.authUser, updateEmergencyContact, contactController.updateContact);
router.post('/remove', Auth.isApp, Auth.authUser, removeEmergencyContact, contactController.removeUserContact);

module.exports = router;