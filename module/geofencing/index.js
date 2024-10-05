const express = require('express');
const router = express.Router();
const Auth = require('../../middleware/auth');
const gfController = require('./controller/gfController');

router.post('/', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, gfController.getgeofencList);
router.post('/add', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, gfController.addgeofenceData);
router.get('/view/:_id', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, gfController.getgeofencById);
router.post('/update', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, gfController.updategeofencData);
router.post('/archive', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, gfController.removeGeofenc)
router.post('/updatestatus/all', Auth.authAdminAndStaffAndVendor, Auth.checkAccessLevel, gfController.updateStatus);
router.post('/location/check', Auth.authAdminAndStaff, Auth.checkAccessLevel, gfController.checklocaton)

module.exports = router;