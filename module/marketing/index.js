const express = require('express');
const router = express.Router();
const Auth = require('../../middleware/auth');
const compaignController = require('./compaignController');

router.post('/', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.CompaignList);
router.post('/add', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.addCompaignData);
router.get('/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.getCompaignDetailsById);
router.post('/update', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.updateCompaigntData);
router.post('/remove', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.removeCompaigntData);
router.post('/updatestatus/all', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.updateStatus);

router.post('/email', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.CompaignTemplateList);
router.post('/email/add', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.addCompaignTemplateData);
router.get('/email/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.getCompaignTemplateDetailsById);
router.post('/email/update', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.updateCompaigntTemplateData);
router.post('/email/remove', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.removeCompaigntTemplateData);
router.post('/email/updatestatus/all', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.updateStatusTemplate);

router.post('/sms', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.CompaignTemplateList);
router.post('/sms/add', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.addCompaignTemplateData);
router.get('/sms/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.getCompaignTemplateDetailsById);
router.post('/sms/update', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.updateCompaigntTemplateData);
router.post('/sms/remove', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.removeCompaigntTemplateData);
router.post('/sms/updatestatus/all', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.updateStatusTemplate);
router.post('/sms/callback', Auth.authAdminAndStaff, Auth.checkAccessLevel, compaignController.smsCallback);

//get campaign email stats
router.post('/getCampaignEmailStats', Auth.authAdmin, Auth.checkAccessLevel, compaignController.getCampaignEmailStats);

module.exports = router;