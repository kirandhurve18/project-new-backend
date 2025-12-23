const router = require("express").Router();

const mainMiddleware = require("../middlewares/main.middleware");
const leaveController = require("../controllers/leave.controller");

router.post("/leave-balance/create", leaveController.createLeaveBalance);
router.post("/get_leave_summary_by_employee", leaveController.getLeaveByEmployee);
router.post("/apply_leave", mainMiddleware.protect, leaveController.applyLeave);
router.post("/get_leave_details_by_employee", leaveController.leaveDetailsByEmployee);
router.post("/get_leave_details_by_team", leaveController.leaveDetailsByTeam);
// router.post("/get_leave_details_by_team", leaveController.leaveDetailsByTeam);
router.post("/update_leave_status_by_employee", mainMiddleware.protect, leaveController.updateLeaveStatusByEmployee);
router.post("/update_leave_status", mainMiddleware.protect, leaveController.updateLeaveStatus);
router.post("/team_on_leave", leaveController.teamOnLeave);
router.post("/team_on_leave", leaveController.teamOnLeave);
router.post("/get_leave_by_id", leaveController.getLeaveById);
router.post("/get_leave_taken_by_team", leaveController.leavesTakenByTeam);
router.post("/get_leave_list_by_team", leaveController.teamOnLeaveList);
router.post("/get_active_leave_list", leaveController.activeLeaveList);
router.post("/get_past_leave_list", leaveController.pastLeaveList);
router.post("/get_reviewer_leave_list", leaveController.getReviewerLeaveList);
router.post("/update_leave_status_by_reviewer", leaveController.updateLeaveStatusByReviewer);

module.exports = router;
