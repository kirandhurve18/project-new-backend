const express = require("express");
const router = express.Router();

const mainMiddleware = require("../middlewares/main.middleware");
const designationController = require('../controllers/designation.controller');

router.post('/add_designation', mainMiddleware.protect, designationController.addDesignation);
router.get('/get_all_designation', designationController.getAllDesignation);
router.get('/get_designation/:_id', designationController.getDesignationById);
router.post('/update_designation', mainMiddleware.protect, designationController.updateDesignation);
// router.post('/delete_designation', designationController.deleteDesignation);

module.exports = router;
