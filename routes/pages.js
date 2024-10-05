const express = require('express');
const router = express.Router();
const faqController = require('../controller/faqController');
const ContentPagesController = require('../controller/contentPagesController');
const Auth = require('../middleware/auth');

//FRONTEND PAGES
router.get('/aboutus', Auth.isApp, ContentPagesController.getContentByConstant);
router.get('/homepage', Auth.isApp, ContentPagesController.getContentByConstant);
router.get('/privacypolicy', Auth.isApp, ContentPagesController.getContentByConstant);
router.get('/refundpolicy', Auth.isApp, ContentPagesController.getContentByConstant);
router.get('/tac', Auth.isApp, ContentPagesController.getContentByConstant);
router.get('/contactus', Auth.isApp, ContentPagesController.getContentByConstant);
router.get('/faq', Auth.isApp, faqController.getFAQListF);
router.post('/support', Auth.isApp, ContentPagesController.sendEmailToStoreAdmin);
router.post('/support', Auth.isApp, ContentPagesController.sendEmailToStoreAdmin);
router.get('/other/:slug', Auth.isApp, ContentPagesController.getContentByParms);
module.exports = router;