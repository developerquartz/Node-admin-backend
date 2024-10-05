const express = require('express');
const router = express.Router();
const disputeController = require('./controller/disputeController.js');
const Auth = require('./middleware/auth');
const { addDisputeValidate } = require('./validation/dispute')

//Add Order
router.post('/add', Auth.isApp, Auth.authUser, addDisputeValidate, disputeController.addDispute);

//Update by id
router.post('/update', Auth.authAdminAndStaff, Auth.checkAccessLevel, disputeController.updateDispute);

//edit and reply by admin
router.post('/admin/reply', Auth.authAdminAndStaff, Auth.checkAccessLevel, disputeController.addDisputeReply)

//edit and reply by vendor
router.post('/vendor/reply', Auth.isApp, Auth.authVendor, disputeController.addDisputeReply)

//edit and reply by driver
router.post('/driver/reply', Auth.isApp, Auth.authUser, disputeController.addDisputeReply)

//edit and reply by customer
router.post('/user/reply', Auth.isApp, Auth.authUser, disputeController.addDisputeReply)

//delete by admin
router.post('/admin/delete/reply', Auth.authAdminAndStaff, Auth.checkAccessLevel, disputeController.deleteDisputeReply)

//delete by vendor
router.post('/vendor/delete/reply', Auth.isApp, Auth.authVendor, disputeController.deleteDisputeReply)

//delete by driver
router.post('/driver/delete/reply', Auth.isApp, Auth.authUser, disputeController.deleteDisputeReply)

//delete by customer
router.post('/user/delete/reply', Auth.isApp, Auth.authUser, disputeController.deleteDisputeReply)

//List by filter
router.post('/', Auth.authAdminAndStaff, Auth.checkAccessLevel, disputeController.getDisputeWithFilter);

router.post('/user/delete/dispuet', Auth.authUser, disputeController.deleteDispute)

//List by user
//router.post('/user', Auth.isApp, Auth.authUser, disputeController.getDisputeWithFilterbyUser);

//List By id to admin
router.get('/:_id', Auth.authAdminAndStaff, Auth.checkAccessLevel, disputeController.getDisputeById);
module.exports = router;