const express = require("express");
const router = express.Router();
const terminologyController = require("../controller/terminologyController");
const Auth = require('../middleware/auth');

router.get("/getData", terminologyController.getjsonData);
router.get("/deleteAllTerminology", terminologyController.deleteAllTerminology);

//get store terminology for admin
router.post("/getStoreTerminologyByStoreId", Auth.authAdminAndStaff, Auth.checkAccessLevel, terminologyController.getStoreTerminologyByStoreId);
//get store terminology for website
router.post("/getStoreTerminologyByStoreId", Auth.isApp, Auth.checkAccessLevel, terminologyController.getStoreTerminologyByStoreId);
//update terminology
router.post("/updateStoreTerminologyById", Auth.authAdminAndStaff, Auth.checkAccessLevel, terminologyController.updateStoreTerminologyById);

module.exports = router;
