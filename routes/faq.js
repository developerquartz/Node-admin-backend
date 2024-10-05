const express = require('express');
const router = express.Router();
const faqController = require('../controller/faqController');
const Auth = require('../middleware/auth');

router.post('/', Auth.authAdminAndStaff, Auth.checkAccessLevel, faqController.getFAQList);

//Add FAQ
router.post('/add', Auth.authAdminAndStaff, Auth.checkAccessLevel, faqController.addFAQData);

//update faq
router.post('/update', Auth.authAdminAndStaff, Auth.checkAccessLevel, faqController.updateFAQtData);

//Get FAQ By Id
router.get('/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, faqController.getFAQDetailsById);

//remove FAQ
router.post('/remove', Auth.authAdminAndStaff, Auth.checkAccessLevel, faqController.removeFAQtData);

router.post('/updatestatus/all', Auth.authAdminAndStaff, Auth.checkAccessLevel, faqController.updateStatus);

module.exports = router;