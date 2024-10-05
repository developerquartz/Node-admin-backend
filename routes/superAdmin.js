const express = require("express");
const router = express.Router();
const superAdminController = require("../controller/superAdminController");

/** Store Login directly By Super Admin, APi call from Store Panel side */
router.post("/store/login",superAdminController.storeLogin);

module.exports = router;
