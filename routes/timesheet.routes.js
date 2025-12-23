const router = require("express").Router();

const mainMiddleware = require("../middlewares/main.middleware");
const timesheetController = require("../controllers/timesheet.controller");

// POST apply for leave
router.post("/add_timesheet", mainMiddleware.protect, timesheetController.addWorkReport);
router.post("/get_timesheet", timesheetController.getWorkReport);
router.post("/get_timesheet_status_by_employee", timesheetController.getTimesheetStatusByEmployee);
router.post("/get_timesheet_status_by_team", timesheetController.getTimesheetStatusByTeam);
router.post("/get_timesheet_status_by_date", timesheetController.getTimesheetStatusByDate);
router.post("/reassign_timesheet", mainMiddleware.protect, timesheetController.reassignTimesheet);
router.post("/approve_timesheet", mainMiddleware.protect, timesheetController.approveTimesheet);
router.post("/reject_timesheet", mainMiddleware.protect, timesheetController.rejectTimesheet);

module.exports = router;
