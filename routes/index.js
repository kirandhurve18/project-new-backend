const express = require("express");
const router = express.Router();

const mainMiddleware = require("../middlewares/main.middleware");

// Import all sub-routes
const authRoutes = require("./auth.routes");
const employeeRoutes = require("./employee.routes");
const dashboardRoutes = require("./dashboard.routes");
const departmentRoutes = require("./department.routes");
const designationRoutes = require("./designation.routes");
const subDesignationRoutes = require("./subDesignation.routes");
const adminSettingsRoutes = require("./adminSettings.routes");
const recognitionRoutes = require("./recognition.routes");
const leaveRoutes = require("./leave.routes");
const attendanceRoutes = require("./attendance.routes");
const timesheetRoutes = require("./timesheet.routes");
const hrmsRoutes = require("./hrms.routes");


// ------------------- Modular routes -------------------
router.use("/auth", authRoutes);
router.use("/employee", employeeRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/department", departmentRoutes);
router.use("/designation", designationRoutes);
router.use("/sub_designation", subDesignationRoutes);
router.use("/admin_settings", adminSettingsRoutes);
router.use("/recognition", recognitionRoutes);
router.use("/leave", leaveRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/timesheet", timesheetRoutes);
router.use("/dashboard", hrmsRoutes);

module.exports = router;