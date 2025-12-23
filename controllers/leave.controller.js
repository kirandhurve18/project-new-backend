const LeaveApplication = require("../models/leaveApplication.model.js");
const LeaveType = require("../models/leaveType.model.js");
const Employee = require("../models/employee.model");
const LeaveBalance = require("../models/leaveBalance.model"); // adjust path
const moment = require("moment-timezone");
const { default: mongoose } = require("mongoose");
const timesheetModel = require("../models/timesheet.model.js");
const employeeModel = require("../models/employee.model");
const leaveApplicationModel = require("../models/leaveApplication.model.js");

const createLeaveBalance = async (req, res) => {
  try {
    const { employee_id, year } = req.body;

    if (!employee_id || !year) {
      return res.status(400).json({
        success: false,
        message: "employee_id and year are required",
      });
    }

    // check if already exists
    const exists = await LeaveBalance.findOne({ employee_id, year });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Leave balance already initialized for this employee and year",
      });
    }

    // default leave structure
    const defaultLeaves = {
      casual: { allotted: 12, used: 0 },
      sick: { allotted: 10, used: 0 },
      emergency: { allotted: 5, used: 0 },
      carryForward: { fromYear: year - 1, count: 0 },
      compensatory: { earned: 0, used: 0 },
      early: { earned: 0, used: 0 },
      lateComing: { earned: 0, used: 0 },
    };

    const created = await LeaveBalance.create({
      employee_id,
      year,
      leaves: defaultLeaves,
    });

    return res.status(201).json({
      success: true,
      message: "Leave balance initialized successfully",
    });
  } catch (error) {
    console.error("error ---> ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const getLeaveByEmployee = async (req, res) => {
  try {
    const { employee_id, year } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "employee_id is required",
      });
    }

    // Use IST (Asia/Kolkata) timezone for current year
    const currentYear = moment.tz("Asia/Kolkata").year();
    const searchYear = year ? Number(year) : currentYear;

    const result = await LeaveBalance.aggregate([
      {
        $match: {
          employee_id: new mongoose.Types.ObjectId(employee_id),
          year: searchYear,
        },
      },
      {
        $lookup: {
          from: "employees", // 👈 Employee collection name
          localField: "employee_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $project: {
          _id: 1,
          year: 1,
          employee_id: 1,
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
          leaves: 1,
        },
      },
    ]);

    if (!result.length) {
      return res.status(404).json({
        success: false,
        message: "Leave balance not found for this employee and year",
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("error ---> ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const applyLeave = async (req, res) => {
  try {
    const {
      employee_id,
      leave_type,
      leave_mode,
      from_date,
      to_date,
      custom_dates,
      reason,
      number_of_days,
      start_time, // ✅ new field for Half Day
      end_time,
      // document,
    } = req.body;

    // ✅ Basic validation
    if (!employee_id || !leave_type || !leave_mode || !reason) {
      return res.status(400).json({
        success: false,
        message: "employee_id, leave_type, leave_mode and reason are required",
      });
    }

    // ✅ Mode-specific validation
    if (leave_mode === "Continuous") {
      if (!from_date || !to_date) {
        return res.status(400).json({
          success: false,
          message: "from_date and to_date are required for Continuous leave",
        });
      }
    }

    if (leave_mode === "Custom Dates") {
      if (
        !custom_dates ||
        !Array.isArray(custom_dates) ||
        custom_dates.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "custom_dates are required for Custom Dates leave",
        });
      }
    }

    if (leave_mode === "Half Day") {
      if (!from_date || !start_time) {
        return res.status(400).json({
          success: false,
          message: "from_date and start_time are required for Half Day leave",
        });
      }
    }

    // ✅ Create leave application
    const application = await LeaveApplication.create({
      employee_id,
      leave_type,
      leave_mode,
      from_date,
      to_date,
      custom_dates,
      reason,
      number_of_days,
      half_day_start_time: start_time, // ✅ included for half-day case
      half_day_end_time: end_time,
      // half_day_session,
      // document,
    });

    return res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      _id: application._id,
    });
  } catch (error) {
    console.error("error --->", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const leaveDetailsByEmployee = async (req, res) => {
  try {
    const { employee_id, year } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "employee_id is required",
      });
    }

    const currentYear = new Date().getFullYear();
    const searchYear = year ? Number(year) : currentYear;

    const result = await LeaveApplication.aggregate([
      {
        $match: {
          employee_id: new mongoose.Types.ObjectId(employee_id),
        },
      },
      {
        $lookup: {
          from: "employees", // 👈 collection name of Employee model
          localField: "employee_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $lookup: {
          from: "employees", // 👈 collection name of Employee model
          localField: "updated_by",
          foreignField: "_id",
          as: "updated_by",
        },
      },
      { $unwind: { path: "$updated_by", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          is_el: {
            $lte: [
              {
                $dateDiff: {
                  startDate: "$createdAt", // when leave was applied
                  endDate: "$from_date", // when leave actually starts
                  unit: "day",
                },
              },
              7,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          leave_id: "$_id",
          employee_id: 1,
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
          leave_type: 1,
          // leave_mode: 1,
          from_date: 1,
          to_date: 1,
          custom_dates: 1,
          reason: 1,
          status: 1,
          number_of_days: 1,
          createdAt: 1,
          is_el: 1,
          half_day_start_time: 1,
          half_day_end_time: 1,
          updated_by_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$updated_by.first_name", ""] },
                  " ",
                  { $ifNull: ["$updated_by.last_name", ""] },
                ],
              },
            },
          },
          rejection_reason: 1,
          manager_comment: 1,
          reviewer_comment: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("error ---> ", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const leaveDetailsByTeam = async (req, res) => {
  try {
    let {
      employee_id,
      team_member_id,
      status,
      search,
      page = 1,
      limit = 10,
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "Please provide employee_id.",
      });
    }

    // 1. Find team members where this employee is lead OR manager
    const teams = await employeeModel
      .find({
        $or: [{ team_lead_id: employee_id }, { team_managers_id: employee_id }],
      })
      .select("_id");

    if (!teams || teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No teams found for this employee",
      });
    }

    const teamIds = teams.map((t) => t._id);

    // 📊 Pagination
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // 📝 Base match
    const matchStage = {
      employee_id: { $in: teamIds },
    };

    // If team_member_id provided → filter by that member
    if (team_member_id) {
      matchStage.employee_id = new mongoose.Types.ObjectId(team_member_id);
    }

    // If status provided → filter by that status
    if (status) {
      matchStage.status = status;
    }

    // 📝 Build aggregation pipeline
    const pipeline = [
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: "employees",
          localField: "employee_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_manager",
          foreignField: "_id",
          as: "updated_by_manager",
        },
      },
      {
        $unwind: {
          path: "$updated_by_manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_hr",
          foreignField: "_id",
          as: "updated_by_hr",
        },
      },
      {
        $unwind: { path: "$updated_by_hr", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_head",
          foreignField: "_id",
          as: "updated_by_head",
        },
      },
      {
        $unwind: {
          path: "$updated_by_head",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_reviewer",
          foreignField: "_id",
          as: "updated_by_reviewer",
        },
      },
      {
        $unwind: {
          path: "$updated_by_reviewer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by",
          foreignField: "_id",
          as: "updated_by",
        },
      },
      {
        $unwind: {
          path: "$updated_by",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
        },
      },
      // Apply search if provided
      ...(search
        ? [
            {
              $match: {
                $or: [{ full_name: { $regex: search, $options: "i" } }],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: 1,
          leave_id: "$_id",
          employee_id: 1,
          apply_date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Kolkata",
            },
          },
          full_name: 1,
          reviewer_full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$updated_by_reviewer.first_name", ""] },
                  " ",
                  { $ifNull: ["$updated_by_reviewer.last_name", ""] },
                ],
              },
            },
          },
          reviewer_full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$updated_by_reviewer.first_name", ""] },
                  " ",
                  { $ifNull: ["$updated_by_reviewer.last_name", ""] },
                ],
              },
            },
          },
          manager_full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$updated_by_manager.first_name", ""] },
                  " ",
                  { $ifNull: ["$updated_by_manager.last_name", ""] },
                ],
              },
            },
          },
          head_full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$updated_by_head.first_name", ""] },
                  " ",
                  { $ifNull: ["$updated_by_head.last_name", ""] },
                ],
              },
            },
          },
          updated_by_full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$updated_by.first_name", ""] },
                  " ",
                  { $ifNull: ["$updated_by.last_name", ""] },
                ],
              },
            },
          },

          from_date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$from_date",
              timezone: "Asia/Kolkata",
            },
          },
          to_date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$to_date",
              timezone: "Asia/Kolkata",
            },
          },
          custom_dates: 1,
          leave_type: 1,
          leave_mode: 1,
          reason: 1,
          status: 1,
          rejection_reason: 1,
          manager_comment: 1,
          reviewer_comment: 1,
          half_day_start_time: 1,
          half_day_end_time: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    // 📊 Count aggregation
    const countPipeline = [
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: "employees",
          localField: "employee_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_manager",
          foreignField: "_id",
          as: "updated_by_manager",
        },
      },
      {
        $unwind: {
          path: "$updated_by_manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_hr",
          foreignField: "_id",
          as: "updated_by_hr",
        },
      },
      {
        $unwind: { path: "$updated_by_hr", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_head",
          foreignField: "_id",
          as: "updated_by_head",
        },
      },
      {
        $unwind: {
          path: "$updated_by_head",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_reviewer",
          foreignField: "_id",
          as: "updated_by_reviewer",
        },
      },
      {
        $unwind: {
          path: "$updated_by_reviewer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by",
          foreignField: "_id",
          as: "updated_by",
        },
      },
      {
        $unwind: {
          path: "$updated_by",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
        },
      },
      // Apply search if provided
      ...(search
        ? [
            {
              $match: {
                $or: [{ full_name: { $regex: search, $options: "i" } }],
              },
            },
          ]
        : []),
      { $count: "totalRecords" },
    ];

    const teamLeaves = await leaveApplicationModel.aggregate(pipeline);

    const countResult = await leaveApplicationModel.aggregate(countPipeline);
    const totalRecords =
      countResult.length > 0 ? countResult[0].totalRecords : 0;

    res.status(200).json({
      success: true,
      message: "Leave Fetched Successfully",
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        pageSize: teamLeaves.length,
      },
      data: teamLeaves,
    });
  } catch (e) {
    console.error("Error in team leave:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const leavesTakenByTeam = async (req, res) => {
  try {
    let { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "Please provide employee_id.",
      });
    }

    // 1️⃣ Find team members where this employee is lead OR manager
    const teamMembers = await employeeModel.find({
      $or: [{ team_lead_id: employee_id }, { team_managers_id: employee_id }],
    });

    if (!teamMembers || teamMembers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No teams found for this employee",
      });
    }

    const teamIds = teamMembers.map((t) => t._id);

    // 2️⃣ Pipeline: Start from employees
    const pipeline = [
      {
        $match: { _id: { $in: teamIds } },
      },
      // lookup leave balances
      {
        $lookup: {
          from: "leavebalances",
          let: { empId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee_id", "$$empId"] },
                    { $eq: ["$year", new Date().getFullYear()] }, // 👈 only current year
                  ],
                },
              },
            },
          ],
          as: "leave_balance",
        },
      },

      {
        $unwind: {
          path: "$leave_balance",
          preserveNullAndEmptyArrays: true, // 👈 if no balance, keep employee
        },
      },

      {
        $project: {
          _id: 1,
          employee_id: "$_id",
          full_name: {
            $concat: [
              { $ifNull: ["$first_name", ""] },
              " ",
              { $ifNull: ["$last_name", ""] },
            ],
          },
          // designation_id: 1,
          // leave_balance: "$leave_balance.leaves", // 👈 may be null
          total_used_leaves: {
            $add: [
              { $ifNull: ["$leave_balance.leaves.casual.used", 0] },
              { $ifNull: ["$leave_balance.leaves.sick.used", 0] },
              { $ifNull: ["$leave_balance.leaves.emergency.used", 0] },
              { $ifNull: ["$leave_balance.leaves.compensatory.used", 0] },
              // { $ifNull: ["$leave_balance.leaves.early.used", 0] },
              // { $ifNull: ["$leave_balance.leaves.lateComing.used", 0] },
            ],
          },
          // applications: {
          //   $map: {
          //     input: "$applications",
          //     as: "app",
          //     in: {
          //       leave_id: "$$app._id",
          //       leave_type: "$$app.leave_type",
          //       from_date: {
          //         $dateToString: {
          //           format: "%Y-%m-%d",
          //           date: "$$app.from_date",
          //           timezone: "Asia/Kolkata",
          //         },
          //       },
          //       to_date: {
          //         $dateToString: {
          //           format: "%Y-%m-%d",
          //           date: "$$app.to_date",
          //           timezone: "Asia/Kolkata",
          //         },
          //       },
          //       status: "$$app.status",
          //       reason: "$$app.reason",
          //     },
          //   },
          // },
        },
      },
    ];

    const result = await employeeModel.aggregate(pipeline);
    return res.status(200).json({
      success: true,
      message: "Team members + leave balances ",
      data: result,
    });
  } catch (e) {
    console.error("Error in leavesTakenByTeam:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    const {
      leave_id,
      status,
      updated_by_id,
      approver_id,
      rejection_reason,
      manager_comment,
    } = req.body;

    if (!leave_id || !status) {
      return res.status(400).json({
        success: false,
        message: "leave_id and status are required",
      });
    }

    // Validate status
    const allowedStatuses = ["Approved", "Rejected", "Cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    // 1. Fetch old leave record
    const oldLeave = await LeaveApplication.findById(leave_id);
    if (!oldLeave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    // Build update object
    const updateData = { status, head_status: status };
    if (status === "Rejected" && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }
    if (approver_id) {
      updateData.updated_by_head = new mongoose.Types.ObjectId(approver_id);
      updateData.updated_by = new mongoose.Types.ObjectId(approver_id);
    }
    if (updated_by_id) {
      updateData.updated_by_head = new mongoose.Types.ObjectId(updated_by_id);
      updateData.updated_by = new mongoose.Types.ObjectId(updated_by_id);
    }
    if (manager_comment) {
      updateData.manager_comment = manager_comment;
    }

    // 2. Update leave application
    const updatedLeave = await LeaveApplication.findByIdAndUpdate(
      leave_id,
      { $set: updateData },
      { new: true }
    );

    // 3. Handle leave balance adjustments
    const leaveYear = new Date(updatedLeave.from_date).getFullYear();
    const leaveTypeField = updatedLeave.leave_type; // e.g. "casual", "sick"

    if (leaveTypeField) {
      const updatePath = `leaves.${leaveTypeField}.used`;

      // Case A: New status Approved, Old was not Approved → Increment balance
      if (
        updatedLeave.status === "Approved" &&
        oldLeave.status !== "Approved"
      ) {
        await LeaveBalance.findOneAndUpdate(
          { employee_id: updatedLeave.employee_id, year: leaveYear },
          { $inc: { [updatePath]: updatedLeave.number_of_days } },
          { new: true }
        );
      }

      // Case B: Old status Approved, New is Rejected/Cancelled → Decrement balance
      if (
        oldLeave.status === "Approved" &&
        updatedLeave.status !== "Approved"
      ) {
        await LeaveBalance.findOneAndUpdate(
          { employee_id: updatedLeave.employee_id, year: leaveYear },
          { $inc: { [updatePath]: -updatedLeave.number_of_days } },
          { new: true }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Leave status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const updateLeaveStatusByEmployee = async (req, res) => {
  try {
    const { leave_id, status, updated_by_id } = req.body;

    if (!leave_id || !status) {
      return res.status(400).json({
        success: false,
        message: "leave_id and status are required",
      });
    }

    // Validate status
    const allowedStatuses = ["Cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    // 1. Fetch old leave record
    const oldLeave = await LeaveApplication.findById(leave_id);
    if (!oldLeave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    if (oldLeave.status !== "Pending") {
      return res.status(404).json({
        success: false,
        message: "Only Pending Leaves Can be Cancelled",
      });
    }

    // Build update object
    const updateData = { status };
    // if (status === "Rejected" && rejection_reason) {
    //   updateData.rejection_reason = rejection_reason;
    // }
    // if (status === "Cancelled") {
    //   updateData.rejection_reason = rejection_reason;
    // }
    // if (approver_id) {
    //   updateData.updated_by_head = new mongoose.Types.ObjectId(approver_id);
    //   updateData.updated_by = new mongoose.Types.ObjectId(approver_id);
    // }
    if (updated_by_id) {
      // updateData.updated_by_head = new mongoose.Types.ObjectId(updated_by_id);
      updateData.updated_by = new mongoose.Types.ObjectId(updated_by_id);
    }
    // if (manager_comment) {
    //   updateData.manager_comment = manager_comment;
    // }

    // 2. Update leave application
    const updatedLeave = await LeaveApplication.findByIdAndUpdate(
      leave_id,
      { $set: updateData },
      { new: true }
    );

    // // 3. Handle leave balance adjustments
    // const leaveYear = new Date(updatedLeave.from_date).getFullYear();
    // const leaveTypeField = updatedLeave.leave_type; // e.g. "casual", "sick"

    // if (leaveTypeField) {
    //   const updatePath = `leaves.${leaveTypeField}.used`;

    //   // Case A: New status Approved, Old was not Approved → Increment balance
    //   if (
    //     updatedLeave.status === "Approved" &&
    //     oldLeave.status !== "Approved"
    //   ) {
    //     await LeaveBalance.findOneAndUpdate(
    //       { employee_id: updatedLeave.employee_id, year: leaveYear },
    //       { $inc: { [updatePath]: updatedLeave.number_of_days } },
    //       { new: true }
    //     );
    //   }

    //   // Case B: Old status Approved, New is Rejected/Cancelled → Decrement balance
    //   if (
    //     oldLeave.status === "Approved" &&
    //     updatedLeave.status !== "Approved"
    //   ) {
    //     await LeaveBalance.findOneAndUpdate(
    //       { employee_id: updatedLeave.employee_id, year: leaveYear },
    //       { $inc: { [updatePath]: -updatedLeave.number_of_days } },
    //       { new: true }
    //     );
    //   }
    // }

    res.status(200).json({
      success: true,
      message: `Leave status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const updateLeaveStatusByReviewer = async (req, res) => {
  try {
    const {
      leave_id,
      status,
      reviewer_id,
      rejection_reason,
      reviewer_comment,
    } = req.body;

    if (!leave_id || !status) {
      return res.status(400).json({
        success: false,
        message: "leave_id and status are required",
      });
    }

    // Validate status
    const allowedStatuses = ["Approved", "Rejected", "Cancelled"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    // 1. Fetch old leave record
    const oldLeave = await LeaveApplication.findById(leave_id);
    if (!oldLeave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    // Build update object
    const updateData = { status, reviewer_status: status };
    if (status === "Rejected" && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }
    if (reviewer_id) {
      updateData.updated_by_reviewer = new mongoose.Types.ObjectId(reviewer_id);
      updateData.updated_by = new mongoose.Types.ObjectId(reviewer_id);
    }
    if (reviewer_comment) {
      updateData.reviewer_comment = reviewer_comment;
    }

    // 2. Update leave application
    const updatedLeave = await LeaveApplication.findByIdAndUpdate(
      leave_id,
      { $set: updateData },
      { new: true }
    );

    // 3. Handle leave balance adjustments
    const leaveYear = new Date(updatedLeave.from_date).getFullYear();
    const leaveTypeField = updatedLeave.leave_type;

    if (leaveTypeField) {
      const updatePath = `leaves.${leaveTypeField}.used`;

      // Case A: New status Approved, Old was not Approved → Increment balance
      if (
        updatedLeave.status === "Approved" &&
        oldLeave.status !== "Approved"
      ) {
        await LeaveBalance.findOneAndUpdate(
          { employee_id: updatedLeave.employee_id, year: leaveYear },
          { $inc: { [updatePath]: updatedLeave.number_of_days } },
          { new: true }
        );
      }

      // Case B: Old status Approved, New is Rejected/Cancelled → Decrement balance
      if (
        oldLeave.status === "Approved" &&
        updatedLeave.status !== "Approved"
      ) {
        await LeaveBalance.findOneAndUpdate(
          { employee_id: updatedLeave.employee_id, year: leaveYear },
          { $inc: { [updatePath]: -updatedLeave.number_of_days } },
          { new: true }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Leave status updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const teamOnLeave = async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({
        success: false,
        message: "employee_id is required",
      });
    }

    // 1. Find team members where this employee is lead OR manager
    const teams = await employeeModel
      .find({
        $or: [{ team_lead_id: _id }, { team_managers_id: _id }],
      })
      .select("_id first_name last_name");

    if (!teams || teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No team members found",
      });
    }

    const teamsIds = teams.map((team) => team._id);

    // 📅 get today's start & end in IST
    const start = moment().tz("Asia/Kolkata").startOf("day").toDate();
    const end = moment().tz("Asia/Kolkata").endOf("day").toDate();

    const pipeline = [
      {
        $match: {
          status: "Approved", // only approved leaves
          from_date: { $lte: end },
          to_date: { $gte: start },
          employee_id: { $in: teamsIds },
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
          from: "designations",
          localField: "employee.designation_id",
          foreignField: "_id",
          as: "designation",
        },
      },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          leave_type: 1,
          leave_mode: 1,
          start_time: 1,
          from_date: 1,
          to_date: 1,
          reason: 1,
          employee_id: 1,
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
          designation_name: "$designation.designation_name",
        },
      },
    ];

    const result = await leaveApplicationModel.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      message: "Team members on leave today",
      data: result.map((l) => ({
        leave_id: l._id,
        employee_id: l.employee_id,
        full_name: l.full_name,
        leave_type: l.leave_type,
        leave_mode: l.leave_mode,
        start_time: l.start_time || null, // useful if half day
        from_date: moment(l.from_date).format("YYYY-MM-DD"),
        to_date: moment(l.to_date).format("YYYY-MM-DD"),
        reason: l.reason,
        designation_name: l.designation_name,
      })),
    });
  } catch (e) {
    console.error("Error in teamOnLeave:", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const teamOnLeaveList = async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({
        success: false,
        message: "employee_id is required",
      });
    }

    // 1️⃣ Find team members where this employee is lead OR manager
    const teams = await employeeModel
      .find({
        $or: [{ team_lead_id: _id }, { team_managers_id: _id }],
      })
      .select("_id first_name last_name");

    if (!teams || teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No teams found",
      });
    }

    const teamIds = teams.map((team) => team._id);

    // 📅 today's start & end
    const start = moment().tz("Asia/Kolkata").startOf("day").toDate();
    const end = moment().tz("Asia/Kolkata").endOf("day").toDate();

    const pipeline = [
      {
        $match: {
          status: "Approved",
          employee_id: { $in: teamIds },
          $or: [
            { from_date: { $lte: end }, to_date: { $gte: start } }, // current/ongoing
            { from_date: { $gt: end } }, // upcoming
          ],
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
          from: "designations",
          localField: "employee.designation_id",
          foreignField: "_id",
          as: "designation",
        },
      },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          leave_type: 1,
          from_date: 1,
          to_date: 1,
          reason: 1,
          employee_id: 1,
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
          designation_name: "$designation.designation_name",
        },
      },
      { $sort: { from_date: 1 } }, // 👈 upcoming first
    ];

    const result = await leaveApplicationModel.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      message: "Team members on current or upcoming leave",
      data: result.map((l) => ({
        leave_id: l._id,
        employee_id: l.employee_id,
        full_name: l.full_name,
        leave_type: l.leave_type,
        from_date: moment(l.from_date).format("YYYY-MM-DD"),
        to_date: moment(l.to_date).format("YYYY-MM-DD"),
        reason: l.reason,
        designation_name: l.designation_name,
        status:
          moment().isBetween(l.from_date, l.to_date, "day", "[]") ||
          moment(l.from_date).isSame(start, "day")
            ? "current"
            : "upcoming",
      })),
    });
  } catch (e) {
    console.error("Error in teamOnLeaveList:", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const getLeaveById = async (req, res) => {
  try {
    const { leave_id } = req.body;

    if (!leave_id) {
      return res.status(400).json({
        success: false,
        message: "leave_id is required",
      });
    }

    const pipeline = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(leave_id),
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
          from: "employees",
          localField: "updated_by",
          foreignField: "_id",
          as: "updated_by",
        },
      },
      { $unwind: { path: "$updated_by", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_head",
          foreignField: "_id",
          as: "updated_by_head",
        },
      },
      {
        $unwind: { path: "$updated_by_head", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_reviewer",
          foreignField: "_id",
          as: "updated_by_reviewer",
        },
      },
      {
        $unwind: {
          path: "$updated_by_reviewer",
          preserveNullAndEmptyArrays: true,
        },
      },
      // join designation
      {
        $lookup: {
          from: "designations",
          localField: "employee.designation_id",
          foreignField: "_id",
          as: "designation",
        },
      },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          leave_id: "$_id",
          leave_type: 1,
          from_date: 1,
          to_date: 1,
          reason: 1,
          employee_id: 1,
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
          updated_by_full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$updated_by.first_name", ""] },
                  " ",
                  { $ifNull: ["$updated_by.last_name", ""] },
                ],
              },
            },
          },
          head_full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$updated_by_head.first_name", ""] },
                  " ",
                  { $ifNull: ["$updated_by_head.last_name", ""] },
                ],
              },
            },
          },
          reviewer_full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$reviewer_full_name.first_name", ""] },
                  " ",
                  { $ifNull: ["$reviewer_full_name.last_name", ""] },
                ],
              },
            },
          },
          designation_name: "$designation.designation_name",
          custom_dates: 1,
          leave_mode: 1,
          reason: 1,
          status: 1,
          reviewer_status: 1,
          head_status: 1,
          // approved_by_manager: 1,
          // approved_by_hr: 1,
          // approved_by_head: 1,
          rejection_reason: 1,
          number_of_days: 1,
          half_day_start_time: 1,
          half_day_end_time: 1,
          createdAt: 1,
          manager_comment: 1,
          reviewer_comment: 1,
          updated_by_head_id: "$updated_by_head._id",
          updated_by_reviewer_id: "$updated_by_reviewer._id",
          updated_by_id: "$updated_by._id",
        },
      },
    ];

    const result = await leaveApplicationModel.aggregate(pipeline);

    // console.log("leaveresult ---> ", result)

    if (result.length === 0)
      return res.status(400).json({
        success: false,
        message: "Leave not found with this leave_id",
      });

    return res.status(200).json({
      success: true,
      message: "Leave Details ...",
      data: {
        ...result[0],
        leave_id: result[0].leave_id,
        from_date: moment(result[0].from_date).format("YYYY-MM-DD"),
        to_date: moment(result[0].to_date).format("YYYY-MM-DD"),
        createdAt: moment(result[0].createdAt).format("YYYY-MM-DD"),
      },
    });
  } catch (e) {
    console.error("Error:", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const activeLeaveList = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query; // get query params
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 📅 today's start & end
    const start = moment().tz("Asia/Kolkata").startOf("day").toDate();
    const end = moment().tz("Asia/Kolkata").endOf("day").toDate();
    const now = moment().tz("Asia/Kolkata");

    // Build match conditions
    const matchConditions = {
      status: "Approved",
      $or: [
        { from_date: { $lte: end }, to_date: { $gte: start } }, // current/ongoing
        { from_date: { $gte: end } }, // upcoming
      ],
    };

    const pipeline = [
      { $match: matchConditions },
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
          from: "designations",
          localField: "employee.designation_id",
          foreignField: "_id",
          as: "designation",
        },
      },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
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
        $addFields: {
          createdAtKolkata: {
            $dateToString: {
              date: "$createdAt",
              timezone: "Asia/Kolkata",
              format: "%Y-%m-%d",
            },
          },
        },
      },
      {
        $addFields: {
          is_el: {
            $lte: [
              {
                $dateDiff: {
                  startDate: "$createdAt", // when leave was applied
                  endDate: "$from_date", // when leave actually starts
                  unit: "day",
                },
              },
              7,
            ],
          },
        },
      },
      // Apply search if provided
      ...(search && search.trim() !== ""
        ? [
            {
              $match: {
                $or: [
                  { "employee.first_name": { $regex: search, $options: "i" } },
                  { "employee.last_name": { $regex: search, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            "$employee.first_name",
                            " ",
                            "$employee.last_name",
                          ],
                        },
                        regex: search,
                        options: "i",
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: 1,
          leave_type: 1,
          from_date: 1,
          to_date: 1,
          reason: 1,
          employee_id: 1,
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
          designation_name: "$designation.designation_name",
          createdAt: "$createdAtKolkata", // 👈 use formatted date here
          number_of_days: 1,
          half_day_start_time: 1,
          department_name: "$department.department_name",
          status: 1,
          is_el: 1,
        },
      },
      { $sort: { from_date: 1 } }, // 👈 upcoming first
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const result = await leaveApplicationModel.aggregate(pipeline);

    // Optional: total count for pagination
    const totalCountPipeline = [
      { $match: matchConditions },
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
          from: "designations",
          localField: "employee.designation_id",
          foreignField: "_id",
          as: "designation",
        },
      },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
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
        $addFields: {
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
        },
      },
      ...(search && search.trim() !== ""
        ? [
            {
              $match: {
                $or: [
                  { "employee.first_name": { $regex: search, $options: "i" } },
                  { "employee.last_name": { $regex: search, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            "$employee.first_name",
                            " ",
                            "$employee.last_name",
                          ],
                        },
                        regex: search,
                        options: "i",
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),
      { $count: "total" },
    ];

    const totalCountResult = await leaveApplicationModel.aggregate(
      totalCountPipeline
    );
    const totalRecords = totalCountResult[0] ? totalCountResult[0].total : 0;
    return res.status(200).json({
      success: true,
      message: "Team members on current or upcoming leave",
      page: parseInt(page),
      limit: parseInt(limit),
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      data: result.map((l) => ({
        leave_id: l._id,
        employee_id: l.employee_id,
        full_name: l.full_name,
        leave_type: l.leave_type,
        from_date: moment(l.from_date).tz("Asia/Kolkata").format("YYYY-MM-DD"),
        to_date: moment(l.to_date).tz("Asia/Kolkata").format("YYYY-MM-DD"),
        reason: l.reason,
        designation_name: l.designation_name,
        department_name: l.department_name,
        status_type:
          now.isBetween(
            moment(l.from_date).tz("Asia/Kolkata"),
            moment(l.to_date).tz("Asia/Kolkata"),
            "day",
            "[]"
          ) || now.isSame(moment(l.from_date).tz("Asia/Kolkata"), "day")
            ? "current"
            : "upcoming",
        createdAt: l.createdAt,
        half_day_start_time: l.half_day_start_time,
        status: l.status,
        is_el: l.is_el,
        number_of_days: l.number_of_days,
      })),
    });
  } catch (e) {
    console.error("Error in teamOnLeaveList:", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const pastLeaveList = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query; // get query params
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 📅 today's start & end
    const start = moment().tz("Asia/Kolkata").startOf("day").toDate();
    const end = moment().tz("Asia/Kolkata").endOf("day").toDate();
    const now = moment().tz("Asia/Kolkata");

    // Build match conditions
    const matchConditions = {
      status: "Approved",
      $or: [
        { from_date: { $lt: end }, to_date: { $lt: start } }, // preivous
      ],
    };

    const pipeline = [
      { $match: matchConditions },
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
          from: "designations",
          localField: "employee.designation_id",
          foreignField: "_id",
          as: "designation",
        },
      },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
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
        $addFields: {
          createdAtKolkata: {
            $dateToString: {
              date: "$createdAt",
              timezone: "Asia/Kolkata",
              format: "%Y-%m-%d",
            },
          },
        },
      },
      // 🔍 Search by employee full name
      ...(search && search.trim() !== ""
        ? [
            {
              $match: {
                $or: [
                  { "employee.first_name": { $regex: search, $options: "i" } },
                  { "employee.last_name": { $regex: search, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            "$employee.first_name",
                            " ",
                            "$employee.last_name",
                          ],
                        },
                        regex: search,
                        options: "i",
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),
      {
        $addFields: {
          is_el: {
            $lte: [
              {
                $dateDiff: {
                  startDate: "$createdAt", // when leave was applied
                  endDate: "$from_date", // when leave actually starts
                  unit: "day",
                },
              },
              7,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          leave_type: 1,
          from_date: 1,
          to_date: 1,
          reason: 1,
          employee_id: 1,
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
          designation_name: "$designation.designation_name",
          createdAt: "$createdAtKolkata", // 👈 use formatted date here
          number_of_days: 1,
          half_day_start_time: 1,
          department_name: "$department.department_name",
          status: 1,
          is_el: 1,
        },
      },
      { $sort: { from_date: 1 } }, // 👈 upcoming first
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const result = await leaveApplicationModel.aggregate(pipeline);

    // Optional: total count for pagination
    const totalCountPipeline = [
      { $match: matchConditions },
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
          from: "designations",
          localField: "employee.designation_id",
          foreignField: "_id",
          as: "designation",
        },
      },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "departments",
          localField: "employee.department_id",
          foreignField: "_id",
          as: "department",
        },
      },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
      // 🔍 Search by employee full name
      ...(search && search.trim() !== ""
        ? [
            {
              $match: {
                $or: [
                  { "employee.first_name": { $regex: search, $options: "i" } },
                  { "employee.last_name": { $regex: search, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            "$employee.first_name",
                            " ",
                            "$employee.last_name",
                          ],
                        },
                        regex: search,
                        options: "i",
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),
      { $count: "total" },
    ];

    const totalCountResult = await leaveApplicationModel.aggregate(
      totalCountPipeline
    );
    const totalRecords = totalCountResult[0] ? totalCountResult[0].total : 0;
    return res.status(200).json({
      success: true,
      message: "Team members on current or upcoming leave",
      page: parseInt(page),
      limit: parseInt(limit),
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      data: result.map((l) => ({
        leave_id: l._id,
        employee_id: l.employee_id,
        full_name: l.full_name,
        leave_type: l.leave_type,
        from_date: moment(l.from_date).tz("Asia/Kolkata").format("YYYY-MM-DD"),
        to_date: moment(l.to_date).tz("Asia/Kolkata").format("YYYY-MM-DD"),
        createdAt: moment(l.createdAt).tz("Asia/Kolkata").format("YYYY-MM-DD"),
        reason: l.reason,
        designation_name: l.designation_name,
        department_name: l.department_name,
        createdAt: l.createdAt,
        half_day_start_time: l.half_day_start_time,
        status: l.status,
        is_el: l.is_el,
        number_of_days: l.number_of_days,
      })),
    });
  } catch (e) {
    console.error("Error in teamOnLeaveList:", e);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const getReviewerLeaveList = async (req, res) => {
  try {
    let { status, search, page = 1, limit = 10 } = req.body;

    // 📊 Pagination
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // 📝 Base match
    const matchStage = {
      // approved_by_head: { $ne: null }, // not null ObjectId
    };

    // If status provided → filter by that status
    // if (status) {
    //   matchStage.status = status;
    //   // matchStage.updated_by_reviewer = null;
    // }

    if (status == "Reviewer_Pending") {
      // matchStage.status = "Approved";
      matchStage.reviewer_status = "Pending";
      // matchStage.updated_by_reviewer = null;
    } else if (status == "Reviewer_Approved") {
      // matchStage.status = "Approved";
      matchStage.reviewer_status = "Approved";
    } else if (status == "Reviewer_Rejected") {
      // matchStage.status = "Rejected";
      matchStage.reviewer_status = "Rejected";
    } else if (status) {
      matchStage.status = status;
      // matchStage.updated_by_reviewer = null;
    }

    // 📝 Build aggregation pipeline
    const pipeline = [
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: "employees",
          localField: "employee_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },
      // 🔍 Search by employee full name
      ...(search && search.trim() !== ""
        ? [
            {
              $match: {
                $or: [
                  { "employee.first_name": { $regex: search, $options: "i" } },
                  { "employee.last_name": { $regex: search, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            "$employee.first_name",
                            " ",
                            "$employee.last_name",
                          ],
                        },
                        regex: search,
                        options: "i",
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_manager",
          foreignField: "_id",
          as: "updated_by_manager",
        },
      },
      {
        $unwind: {
          path: "$updated_by_manager",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_head",
          foreignField: "_id",
          as: "updated_by_head",
        },
      },
      {
        $unwind: {
          path: "$updated_by_head",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "updated_by_reviewer",
          foreignField: "_id",
          as: "updated_by_reviewer",
        },
      },
      {
        $unwind: {
          path: "$updated_by_reviewer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          is_el: {
            $lte: [
              {
                $dateDiff: {
                  startDate: "$createdAt", // when leave was applied
                  endDate: "$from_date", // when leave actually starts
                  unit: "day",
                },
              },
              7,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          leave_id: "$_id",
          employee_id: 1,
          apply_date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Kolkata",
            },
          },
          full_name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$employee.first_name", ""] },
                  " ",
                  { $ifNull: ["$employee.last_name", ""] },
                ],
              },
            },
          },
          from_date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$from_date",
              timezone: "Asia/Kolkata",
            },
          },
          createdAt: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$to_date",
              timezone: "Asia/Kolkata",
            },
          },
          custom_dates: 1,
          leave_type: 1,
          leave_mode: 1,
          reason: 1,
          status: 1,
          head_status: 1,
          reviewer_status: 1,
          number_of_days: 1,
          updated_by_head_id: "$updated_by_head._id",
          updated_by_reviewer_id: "$updated_by_reviewer._id",
          updated_by_id: "$updated_by._id",
          createdAt: 1,
          is_el: 1,
        },
      },
      { $sort: { createdAt: -1 } }, // 👈 newest first
      { $skip: skip },
      { $limit: limit },
    ];

    const teamLeaves = await leaveApplicationModel.aggregate(pipeline);
    console.log("teamLeaves --> ", teamLeaves);
    // 📊 Count aggregation
    const countPipeline = [
      { $match: matchStage }, // <-- same filters (team_member_id, status)
      {
        $lookup: {
          from: "employees",
          localField: "employee_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $unwind: {
          path: "$employee",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(search && search.trim() !== ""
        ? [
            {
              $match: {
                $or: [
                  { "employee.first_name": { $regex: search, $options: "i" } },
                  { "employee.last_name": { $regex: search, $options: "i" } },
                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: [
                            "$employee.first_name",
                            " ",
                            "$employee.last_name",
                          ],
                        },
                        regex: search,
                        options: "i",
                      },
                    },
                  },
                ],
              },
            },
          ]
        : []),
      { $count: "totalRecords" },
    ];

    const countResult = await leaveApplicationModel.aggregate(countPipeline);
    const totalRecords =
      countResult.length > 0 ? countResult[0].totalRecords : 0;

    res.status(200).json({
      success: true,
      message: "Leave Reviewer Fetched Successfully",
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        pageSize: teamLeaves.length,
      },
      data: teamLeaves,
    });
  } catch (e) {
    console.error("Error in team leave:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

module.exports = {
  createLeaveBalance,
  getLeaveByEmployee,
  applyLeave,
  leaveDetailsByEmployee,
  leaveDetailsByTeam,
  updateLeaveStatus,
  teamOnLeave,
  getLeaveById,
  leavesTakenByTeam,
  teamOnLeaveList,
  activeLeaveList,
  pastLeaveList,
  getReviewerLeaveList,
  updateLeaveStatusByReviewer,
  updateLeaveStatusByEmployee,
};
