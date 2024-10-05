const express = require('express');
const router = express.Router();
const documentTemplateController = require('../controller/documentTemplateController.js');

//Add Document Template
router.post('/add', documentTemplateController.addDocumentTemplateData);

//update Document Template
router.post('/update', documentTemplateController.updateDocumentTemplatetData);

//Get Document Template By Id
router.get('/view/:_id', documentTemplateController.getDocumentTemplateDetailsById);

//remove Document Template
router.post('/remove', documentTemplateController.removeDocumentTemplatetData);

module.exports = router;