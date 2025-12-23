const express = require("express");
const router = express.Router();

const mainMiddleware = require("../middlewares/main.middleware");
const adminSettingsController = require("../controllers/adminSettings.controller");

router.post("/add_roles", mainMiddleware.protect, adminSettingsController.addRoles);
router.get("/get_roles", adminSettingsController.getAllRoles);
router.get("/get_roles/:_id", adminSettingsController.getRoleById);
router.post("/update_role", mainMiddleware.protect, adminSettingsController.updateRole);
router.get("/get_roles_list", adminSettingsController.getRolesList);

router.post("/add_week_off_setup", mainMiddleware.protect, adminSettingsController.addWeekOffSetup);
router.get("/get_week_off_setup", adminSettingsController.getAllWeekOffSetup);
router.get("/get_week_off_setup/:_id", adminSettingsController.getWeekOffSetupById);
router.get("/get_week_off_setup_by_department/:department_id", adminSettingsController.getAllWeekOffSetupByDepartmentId);
router.post("/update_week_off_setup", mainMiddleware.protect, adminSettingsController.updateWeekOffSetup);

// router.post("/add_shift_timings", adminSettingsController.addShiftTimings);
// router.get("/get_shift_timings", adminSettingsController.getAllShiftTimings);
// router.post("/update_shift_timings", adminSettingsController.updateShiftTimings);
// router.post("/delete_shift_timings", adminSettingsController.deleteShiftTimings);

router.post("/add_income_components", adminSettingsController.addIncomeComponents);
router.get("/get_income_components", adminSettingsController.getAllIncomeComponents);
router.post("/update_income_components", adminSettingsController.updateIncomeComponents);
router.post("/delete_income_components", adminSettingsController.deleteIncomeComponents);

router.post("/add_deduction_components", adminSettingsController.addDeductionComponents);
router.get("/get_deduction_components", adminSettingsController.getAllDeductionComponents);
router.post("/update_deduction_components", adminSettingsController.updateDeductionComponents);
router.post("/delete_deduction_components", adminSettingsController.deleteDeductionComponents);

// router.post("/add_leave_services", adminSettingsController.addLeaveAndService);
// router.get("/get_leave_services", adminSettingsController.getAllLeaveAndService);
// router.post("/update_leave_services", adminSettingsController.updateLeaveAndService);
// router.post("/delete_leave_services", adminSettingsController.deleteLeaveAndService);


module.exports = router;
