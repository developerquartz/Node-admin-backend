const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const dispatchController = require('./controller/dispatchController');

router.get('/', Auth.authAdminAndStaff, Auth.checkAccessLevel, dispatchController.dispatcherDashboard);
router.post('/request/list', Auth.authAdminAndStaff, Auth.checkAccessLevel, dispatchController.dispatcherRequestList);
router.get('/request/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, dispatchController.viewbyId);
router.post('/request/fare', Auth.authAdminAndStaff, Auth.checkAccessLevel, Auth.isStoreType, dispatchController.getEastimatedPrice);
router.post('/request/create', Auth.authAdminAndStaff, Auth.checkAccessLevel, Auth.isStoreType, dispatchController.createrequest);
router.post('/request/nearbydrivers', Auth.authAdminAndStaff, Auth.checkAccessLevel, dispatchController.requestNearByDrivers);
router.put('/request/assign/driver/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, dispatchController.assignDriver);

module.exports = router;