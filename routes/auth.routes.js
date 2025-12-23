const express = require("express");
const router = express.Router();

const hrmsController = require("../controllers/hrms.controller");

router.post("/login", hrmsController.login);
router.post("/logout", hrmsController.logout);

module.exports = router;