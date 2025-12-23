const dashboardService = require("../services/dashboard.service");
const employeeService = require("../services/employee.service");

const timesheetModel = require("../models/timesheet.model");
const leaveApplicationModel = require("../models/leaveApplication.model");
const employeeModel = require("../models/employee.model");
const taskModel = require("../models/task.model");
const moment = require("moment-timezone");

const attendanceSummaryCount = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      present: 35,
      absent: 2,
      late: 6,
      on_leave: 3,
    },
    message: "Attendance Summary Count Fetched Successfully...!",
  });
};

const employeesOnLeaveToday = async (req, res) => {
  try {
    const start = moment().tz("Asia/Kolkata").startOf("day").toDate();
    const end = moment().tz("Asia/Kolkata").endOf("day").toDate();
    const leaveApplications = await leaveApplicationModel.aggregate([
      {
        $match: {
          // status: { $in: ["Pending", "Approved"] },
          status: "Approved",
          // $or: [
          //   {
          // continuous leave (range check)
          from_date: { $lte: end },
          to_date: { $gte: start },
          // },
          // {
          //   // custom leave dates (within today’s range)
          //   custom_dates: { $gte: start, $lte: tomorrow },
          // },
          //   ],
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "employee_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "departments",
          localField: "employee.department_id",
          foreignField: "_id",
          as: "department",
        },
      },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          first_name: "$employee.first_name",
          last_name: "$employee.last_name",
          company_email: "$employee.company_email",
          department: "$department.name",
          start_date: "$from_date",
          end_date: "$to_date",
          leave_type: 1,
          leave_mode: 1,
          status: 1,
        },
      },
    ]);

    const finalEmployees = leaveApplications.map((leave) => ({
      ...leave,
      start_date: leave.start_date
        ? moment(leave.start_date).format("DD-MM-YYYY")
        : null,
      end_date: leave.end_date
        ? moment(leave.end_date).format("DD-MM-YYYY")
        : null,
    }));

    res.status(200).json({
      success: true,
      data: finalEmployees,
      message: "Fetched employees on leave today",
    });
  } catch (error) {
    console.error("Error in EmployeesOnLeaveToday:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const listUpcomingEvents = async (req, res) => {
  try {
    const today = moment().tz("Asia/Kolkata").startOf("day"); // IST start of today
    const currentYear = today.year();

    // pipeline
    const employees = await employeeModel.aggregate([
      {
        $match: {
          is_active: true,
          $or: [
            { date_of_birth: { $ne: null } },
            { date_of_joining: { $ne: null } },
          ],
        },
      },
      {
        $lookup: {
          from: "departments", // collection name in DB
          localField: "department_id",
          foreignField: "_id",
          as: "department",
        },
      },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employeedocuments",
          let: { empId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$employee_id", "$$empId"] } } },
            { $match: { document_type: "passport_photo", status: 1 } }, // only active passport_photo
            { $unwind: "$files" },
            { $match: { "files.status": 1 } }, // only active file
            { $project: { _id: 0, passport_photo: "$files.path" } },
          ],
          as: "passport_docs",
        },
      },
      {
        $unwind: {
          path: "$employee_documents",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          first_name: 1,
          last_name: 1,
          company_email: 1,
          date_of_birth: 1,
          date_of_joining: 1,
          department: "$department.name",
          passport_photo: {
            $arrayElemAt: ["$passport_docs.passport_photo", 0],
          }, // take first file
        },
      },
    ]);

    let events = [];

    employees.forEach((emp) => {
      // 🔹 Birthday
      if (emp.date_of_birth) {
        let birthdayThisYear = moment(emp.date_of_birth)
          .year(currentYear)
          .tz("Asia/Kolkata");

        if (birthdayThisYear.isSameOrAfter(today, "day")) {
          events.push({
            ...emp,
            type: "Birthday",
            date: birthdayThisYear.format("DD-MM-YYYY"),
          });
        }
      }

      // 🔹 Work Anniversary
      if (emp.date_of_joining) {
        let anniversaryThisYear = moment(emp.date_of_joining)
          .year(currentYear)
          .tz("Asia/Kolkata");

        if (anniversaryThisYear.isSameOrAfter(today, "day")) {
          events.push({
            ...emp,
            type: "Work Anniversary",
            date: anniversaryThisYear.format("DD-MM-YYYY"),
          });
        }
      }
    });

    // 🔹 Sort by upcoming date
    events.sort(
      (a, b) => moment(a.date, "DD-MM-YYYY") - moment(b.date, "DD-MM-YYYY")
    );

    res.status(200).json({
      success: true,
      data: events,
      message: "Fetched upcoming birthday and work anniversary list",
    });
  } catch (error) {
    console.error("Error in listUpcomingEvents:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const approvalPendings = async (req, res) => {
  try {
    const { user_role, employee_id } = req.query;

    if (!user_role) {
      return res.status(400).json({
        success: false,
        message: "user_role is required",
      });
    }

    let queryTimesheet = {};
    let queryLeave = { status: "Pending" };
    let queryReviewerLeave = {};
    let memberIds = [];

    if (["2", "3"].includes(user_role)) {
      // 🔹 Team Lead / Manager → get employees under them
      if (!employee_id) {
        return res.status(400).json({
          success: false,
          message: "employee_id is required for role " + user_role,
        });
      }

      const teamMembers = await employeeModel
        .find({
          $or: [
            { team_lead_id: employee_id }, // direct lead
            { team_managers_id: { $in: [employee_id] } }, // part of managers array
          ],
        })
        .select("_id");

      memberIds = teamMembers.map((emp) => emp._id);

      queryTimesheet = {
        submitStatus: 2, // Final Submitted
        employee: { $in: memberIds },
      };

      queryLeave = {
        status: "Pending",
        employee_id: { $in: memberIds },
      };
    } else if (user_role == "1") {
      console.log("comming here ")
      // 🔹 Admin → overall pending data
      queryTimesheet = { submitStatus: 2 };
      queryLeave = { status: "Pending" };
      queryReviewerLeave = {
        status: "Approved",
        reviewer_status: "Pending",
        // updated_by_reviewer: null,
      };
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized role",
      });
    }

    // 🔹 Fetch counts
    const [timeSheetsCount, leaveRequestCount] = await Promise.all([
      timesheetModel.countDocuments(queryTimesheet),
      leaveApplicationModel.countDocuments(queryLeave),
    ]);

    let leaveReviewerRequestCount = 0;
    if (user_role === "1") {
      leaveReviewerRequestCount = await leaveApplicationModel.countDocuments(
        queryReviewerLeave
      );
    }

    return res.status(200).json({
      success: true,
      message: "Approval Pendings List",
      data: {
        timeSheets: timeSheetsCount,
        leave_request: leaveRequestCount,
        leave_reviewer_request: leaveReviewerRequestCount,
      },
    });
  } catch (error) {
    console.error("Error in approvalPendings:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const todaysStatus = async (req, res) => {
  res.status(201).json({
    success: true,
    data: {
      current_status: "1",
      checkin_time: "9:30",
      checkout_time: "18:30",
    },
    message: "fetched My Tasks List",
  });
};

// 🔹 Get all tasks (optionally filter by employee_id)
const getTasks = async (req, res) => {
  try {
    const { employee_id } = req.query;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "employee_id is required",
      });
    }
    const filter = { employee_id, active: true };

    const tasks = await taskModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: tasks,
      message: "Fetched task list successfully",
    });
  } catch (error) {
    console.error("Error in getTasks:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🔹 Get a single task by ID
const getTaskById = async (req, res) => {
  try {
    const { task_id } = req.params;
    const task = await taskModel.findById(task_id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
      message: "Fetched task successfully",
    });
  } catch (error) {
    console.error("Error in getTaskById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🔹 Add new task
const addTask = async (req, res) => {
  try {
    const { title, employee_id } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    const newTask = new taskModel({
      title,
      employee_id,
    });

    const savedTask = await newTask.save();

    return res.status(201).json({
      success: true,
      data: savedTask,
      message: "Task added successfully",
    });
  } catch (error) {
    console.error("Error in addTask:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🔹 Update existing task
const updateTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    const { title, employee_id, active } = req.body;

    const updatedTask = await taskModel.findByIdAndUpdate(
      task_id,
      { $set: { title, employee_id, active } },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Error in updateTask:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 🔹 Update existing task
const unactiveTask = async (req, res) => {
  try {
    const { task_id } = req.params;
    console.log(task_id);
    // const { } = req.body;
    const updatedTask = await taskModel.updateOne(
      { _id: task_id }, // filter
      { $set: { active: false } } // update
    );

    return res.status(200).json({
      success: true,
      data: updatedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Error in updateTask:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  attendanceSummaryCount,
  employeesOnLeaveToday,
  listUpcomingEvents,
  approvalPendings,
  getTasks,
  addTask,
  updateTask,
  getTaskById,
  todaysStatus,
  unactiveTask,
};
