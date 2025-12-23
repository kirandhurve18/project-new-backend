const express = require("express");
const router = express.Router();

const mainMiddleware = require("../middlewares/main.middleware");

const dashboardController = require("../controllers/dashboard.controller");
const hrmsController = require("../controllers/hrms.controller");

// router.post("/attendance_summary_count", dashboardController.attendanceSummaryCount);
router.post(
  "/employees_on_leave_today",
  dashboardController.employeesOnLeaveToday
);
router.get("/list_upcoming_events", dashboardController.listUpcomingEvents);
router.post("/approval_pendings", dashboardController.approvalPendings);
router.post("/todays_status", dashboardController.todaysStatus);

router.get("/tasks", dashboardController.getTasks);
router.post("/tasks", dashboardController.addTask);
router.get("/tasks/:task_id", dashboardController.getTaskById);
router.put("/tasks/:task_id", dashboardController.updateTask);
router.delete("/tasks/:task_id", dashboardController.unactiveTask);

router.post("/get_menus", hrmsController.getMenus);
router.post("/add_menus", mainMiddleware.protect, hrmsController.addMenus);

router.post(
  "/add_festival_leaves",
  mainMiddleware.protect,
  hrmsController.addFestivalLeaves
); // add bulk leaves

router.post(
  "/add_festival_leave",
  mainMiddleware.protect,
  hrmsController.addFestivalLeave
); // add single leave

router.post(
  "/update_festival_leave",
  mainMiddleware.protect,
  hrmsController.updateFestivalLeave
);
router.get("/festival_leaves", hrmsController.festivaLeaves);
router.get("/festival_leaves/:festival_id", hrmsController.getFestivaLeaveById);

module.exports = router;
