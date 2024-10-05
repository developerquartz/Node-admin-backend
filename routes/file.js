const express = require('express');
const router = express.Router();
const fileController = require('../controller/fileController.js');

//Add Category
router.post('/add', fileController.addFileData);

//update category
router.post('/update', fileController.updateFileData);

//Get Category By Id
router.get('/view/:_id', fileController.getFileDetailsById);

//remove Category
router.post('/remove', fileController.removeFileData);

router.post('/updateStatus', fileController.updateStatus);

module.exports = router;