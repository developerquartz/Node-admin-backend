const express = require('express');
const router = express.Router();
const cartController = require('../controller/cartController.js');

router.get('/:cart_key', Auth.isApp, cartController.getCartList);

//Add Category
router.post('/add', Auth.isApp, cartController.addcartData);

//update category
router.post('/update', Auth.isApp, cartController.updatecartData);

//Get Category By Id
router.get('/view/:_id', Auth.isApp, cartController.getcartDetailsById);

//remove Category
router.post('/remove', Auth.isApp, cartController.removecartData);

module.exports = router;