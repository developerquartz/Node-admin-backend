const express = require('express');
const router = express.Router();
const attController = require('../controller/attributeTermController.js');

router.post('/', attController.getAttributeTermList);

//Add attribute term
router.post('/add', attController.addattributeTermData);

//get attribute by id
router.get('/view/:_id', attController.getattributeTermDetailsById);

//update attribute
router.post('/update', attController.updateattributeTermtData);

//remove attribute
router.post('/remove', attController.removeattributeTermtData);

router.post('/archive', attController.archiveAttributeTermData);

router.post('/updatestatus/all', attController.updateStatus);

module.exports = router;