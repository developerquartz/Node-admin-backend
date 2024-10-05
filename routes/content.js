const express = require('express');
const router = express.Router();
const ContentPagesController = require('../controller/contentPagesController');
const Auth = require('../middleware/auth');
const sectionController = require('../controller/sectionController');

router.post('/', Auth.authAdminAndStaff, Auth.checkAccessLevel, ContentPagesController.getContentPagesList);
//Add Content
router.post('/add', Auth.authAdminAndStaff, Auth.checkAccessLevel, ContentPagesController.addContentPagesData);
//update Content
router.post('/update', Auth.authAdminAndStaff, Auth.checkAccessLevel, ContentPagesController.updateContentPagestData);
//Get Content By Id
router.get('/view/:_id', Auth.authAdminAndStaff, Auth.storeGrantAccess('contentView'), Auth.checkAccessLevel, ContentPagesController.getContentPagesDetailsById);
//remove Content
router.post('/remove', Auth.authAdminAndStaff, Auth.checkAccessLevel, ContentPagesController.removeContentPagestData);
router.post('/updatestatus/all', Auth.authAdminAndStaff, Auth.checkAccessLevel, ContentPagesController.updateStatus);


//content sections
router.post('/addfield', Auth.authAdminAndStaff, Auth.checkAccessLevel, sectionController.addContentSectiontField);
router.post('/updatefield', Auth.authAdminAndStaff, Auth.checkAccessLevel, sectionController.updateContentSectiontField);
router.post('/archivefield', Auth.authAdminAndStaff, Auth.checkAccessLevel, sectionController.removeDocumentFieldData);
// router.get('/field/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, sectionController.getContentSectionDetailsById);
router.get('/field/view/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, sectionController.getContentSectionById);

router.post('/updatecontentfield/all', Auth.authAdminAndStaff, Auth.checkAccessLevel, sectionController.deleteDocTemplateFieldsData);
router.post('/fields/sortorder', Auth.authAdminAndStaff, sectionController.sortOrder);

router.post('/rebuild', sectionController.rebuildContent);

router.post('/sectionrebuild', sectionController.rebuildContentSection);

module.exports = router;