const express = require("express");
const router = express.Router();

const mainMiddleware = require("../middlewares/main.middleware");
const departmentController = require('../controllers/department.controller');

router.post('/add_department', mainMiddleware.protect, departmentController.addDepartment);
router.get('/get_all_departments', departmentController.getAllDepartments);
router.get('/get_department/:_id', departmentController.getDepartmentById);
router.post('/update_department', mainMiddleware.protect, departmentController.updateDepartments);

module.exports = router;
