const express = require('express');
const router = express.Router();
const addressController = require('../controller/addressController.js');
const Auth = require('../middleware/auth');

router.get('/', Auth.isApp, Auth.authUser, addressController.getUserAddressList);

//Add Address
router.post('/add', Auth.isApp, Auth.authUser, addressController.userAddAddress);

//update category
router.post('/update', Auth.isApp, Auth.authUser, addressController.userUpdateAddress);

//Get Address By Id
router.get('/view/:_id', Auth.isApp, Auth.authUser, addressController.userGetAddressDetails);

//remove Address
router.post('/remove', Auth.isApp, Auth.authUser, addressController.userRemoveAddress);

router.post('/default', Auth.isApp, Auth.authUser, addressController.userUpdateDefaultAddress);

module.exports = router;