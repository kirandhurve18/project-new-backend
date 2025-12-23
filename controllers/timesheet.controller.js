const timesheetModel = require("../models/timesheet.model");
const moment = require("moment-timezone");
const employeeModel = require("../models/employee.model");
const { default: mongoose } = require("mongoose");

const addWorkReport = async (req, res) => {
  try {
    const { employee, date, workLogs, submitStatus } = req.body;

    if (
      !employee ||
      !date ||
      !Array.isArray(workLogs) ||
      workLogs.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Employee, date, and workLogs are required",
      });
    }

    // Convert incoming date (or default to today)
    const reportDateStr = moment
      .tz(date || new Date(), "Asia/Kolkata")
      .format("YYYY-MM-DD");

    // Convert back to JS Date object (time 00:00:00) for Mongo
    const reportDate = moment.tz(reportDateStr, "Asia/Kolkata").toDate();

    // Upsert timesheet (create if not exists, update if exists)
    const timesheet = await timesheetModel.findOneAndUpdate(
      { employee, date: reportDate },
      {
        $set: {
          workLogs,
          submitStatus: submitStatus || 1, // default to "Saved"
          submittedAt: submitStatus === 2 ? new Date() : undefined,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Work report added/updated successfully",
      // data: timesheet,
    });
  } catch (e) {
    console.error("Error in addWorkReport:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const getWorkReport = async (req, res) => {
  try {
    let { employee, date } = req.body;

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Please provide employee.",
      });
    }

    // 📅 Date range setup
    let start, end;
    if (date) {
      start = moment.tz(date, "Asia/Kolkata").startOf("day").toDate();
      end = moment.tz(date, "Asia/Kolkata").endOf("day").toDate();
    } else {
      start = moment().tz("Asia/Kolkata").startOf("day").toDate();
      end = moment().tz("Asia/Kolkata").endOf("day").toDate();
    }

    const pipeline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(employee) },
      },
      // 👉 Lookup timesheet (might not exist)
      {
        $lookup: {
          from: "timesheets",
          let: { empId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee", "$$empId"] },
                    { $gte: ["$date", start] },
                    { $lte: ["$date", end] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "employees",
                localField: "approvedBy",
                foreignField: "_id",
                as: "approvedBy",
              },
            },
            {
              $unwind: {
                path: "$approvedBy",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "employees",
                localField: "rejectedBy",
                foreignField: "_id",
                as: "rejectedBy",
              },
            },
            {
              $unwind: {
                path: "$rejectedBy",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "employees",
                localField: "reassignedBy",
                foreignField: "_id",
                as: "reassignedBy",
              },
            },
            {
              $unwind: {
                path: "$reassignedBy",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "timesheet",
        },
      },
      { $unwind: { path: "$timesheet", preserveNullAndEmptyArrays: true } },

      // 👉 Lookup attendance
      {
        $lookup: {
          from: "attendances",
          let: { empId: "$_id", tsDate: "$timesheet.date" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$employee_id", "$$empId"] },
                    {
                      $eq: [
                        "$checkin_date",
                        { $ifNull: ["$$tsDate", start] }, // fallback to input date
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                checkin_time: 1,
                checkout_time: 1,
              },
            },
          ],
          as: "attendance",
        },
      },
      { $unwind: { path: "$attendance", preserveNullAndEmptyArrays: true } },

      // 👉 Lookup designation
      {
        $lookup: {
          from: "designations",
          localField: "designation_id",
          foreignField: "_id",
          as: "designation",
        },
      },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "departments",
          localField: "department_id",
          foreignField: "_id",
          as: "departments",
        },
      },
      { $unwind: { path: "$departments", preserveNullAndEmptyArrays: true } },

      // 👉 Lookup team managers (multiple)
      {
        $lookup: {
          from: "employees",
          localField: "team_managers_id",
          foreignField: "_id",
          as: "team_managers",
        },
      },
      {
        $addFields: {
          team_managers: {
            $map: {
              input: "$team_managers",
              as: "mgr",
              in: { $concat: ["$$mgr.first_name", " ", "$$mgr.last_name"] },
            },
          },
        },
      },
      // { $unwind: { path: "$team_managers", preserveNullAndEmptyArrays: true } },

      // 👉 Lookup team lead
      {
        $lookup: {
          from: "employees",
          localField: "team_lead_id",
          foreignField: "_id",
          as: "team_lead",
        },
      },
      { $unwind: { path: "$team_lead", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          employee_id: "$_id",
          full_name: { $concat: ["$first_name", " ", "$last_name"] },
          designation_name: "$designation.designation_name",
          department_name: "$departments.department_name",
          team_lead: {
            $cond: [
              { $ifNull: ["$team_lead", false] },
              {
                $concat: ["$team_lead.first_name", " ", "$team_lead.last_name"],
              },
              null,
            ],
          },
          team_managers: 1,
          // Timesheet fields
          date: {
            $cond: [
              { $ifNull: ["$timesheet.date", false] },
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$timesheet.date",
                  timezone: "Asia/Kolkata",
                },
              },
              null,
            ],
          },
          submitStatus: "$timesheet.submitStatus",
          rejectedReason: "$timesheet.rejectedReason",
          submittedAt: {
            $cond: [
              { $ifNull: ["$timesheet.submittedAt", false] },
              {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$timesheet.submittedAt",
                  timezone: "Asia/Kolkata",
                },
              },
              null,
            ],
          },
          approvedBy: {
            $cond: [
              { $ifNull: ["$timesheet.approvedBy", false] },
              {
                $concat: [
                  "$timesheet.approvedBy.first_name",
                  " ",
                  "$timesheet.approvedBy.last_name",
                ],
              },
              null,
            ],
          },
          rejectedBy: {
            $cond: [
              { $ifNull: ["$timesheet.rejectedBy", false] },
              {
                $concat: [
                  "$timesheet.rejectedBy.first_name",
                  " ",
                  "$timesheet.rejectedBy.last_name",
                ],
              },
              null,
            ],
          },
          rejectedBy: {
            $cond: [
              { $ifNull: ["$timesheet.rejectedBy", false] },
              {
                $concat: [
                  "$timesheet.rejectedBy.first_name",
                  " ",
                  "$timesheet.rejectedBy.last_name",
                ],
              },
              null,
            ],
          },
          reassignedBy: {
            $cond: [
              { $ifNull: ["$timesheet.reassignedBy", false] },
              {
                $concat: [
                  "$timesheet.reassignedBy.first_name",
                  " ",
                  "$timesheet.reassignedBy.last_name",
                ],
              },
              null,
            ],
          },
          attendance: 1,
          timesheet_id: "$timesheet._id",
          workLogs: "$timesheet.workLogs",
          start_time: "9:30",
          break_hours: "1.0",
          regular_hours: "9.0",
          weekend: ["Saturday", "Sunday"],
        },
      },
    ];

    const reports = await employeeModel.aggregate(pipeline);

    if (!reports || reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No work report found for the given date.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Work report fetched successfully",
      data: reports[0], // single employee
    });
  } catch (e) {
    console.error("Error in getWorkReport:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const getTimesheetStatusByEmployee = async (req, res) => {
  try {
    let {
      employee_id,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
      search = "",
      sortBy = "date",
      order = "asc",
    } = req.body;

    if (!employee_id || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide employee_id, fromDate, and toDate.",
      });
    }

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // normalize dates to IST
    const start = moment.tz(fromDate, "Asia/Kolkata").startOf("day").toDate();
    const end = moment.tz(toDate, "Asia/Kolkata").endOf("day").toDate();

    // sort config
    const sortObj = {};
    sortObj[sortBy] = order.toLowerCase() === "desc" ? -1 : 1;

    const baseMatch = {
      employee: new mongoose.Types.ObjectId(employee_id),
      date: { $gte: start, $lte: end },
    };

    // Build aggregation
    const pipeline = [
      { $match: baseMatch },
      // join employee
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      // join approver
      {
        $lookup: {
          from: "employees",
          localField: "approvedBy",
          foreignField: "_id",
          as: "approvedBy",
        },
      },
      { $unwind: { path: "$approvedBy", preserveNullAndEmptyArrays: true } },
      // join rejector
      {
        $lookup: {
          from: "employees",
          localField: "rejectedBy",
          foreignField: "_id",
          as: "rejectedBy",
        },
      },
      { $unwind: { path: "$rejectedBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "reassignedBy",
          foreignField: "_id",
          as: "reassignedBy",
        },
      },
      { $unwind: { path: "$reassignedBy", preserveNullAndEmptyArrays: true } },
    ];

    // Apply search filter
    // if (search) {
    //   pipeline.push({
    //     $match: {
    //       $or: [
    //         { "employee.first_name": { $regex: search, $options: "i" } },
    //         { "employee.last_name": { $regex: search, $options: "i" } },
    //       ],
    //     },
    //   });
    // }

    // Projection
    pipeline.push({
      $project: {
        _id: 1,
        timesheet_id: "$_id",
        employee_id: "$employee._id",
        submitStatus: 1,
        rejectedReason: 1,
        date: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
            timezone: "Asia/Kolkata",
          },
        },
        submittedAt: {
          $cond: [
            { $ifNull: ["$submittedAt", false] },
            {
              $dateToString: {
                format: "%Y-%m-%d %H:%M:%S",
                date: "$submittedAt",
                timezone: "Asia/Kolkata",
              },
            },
            null,
          ],
        },
        submittedDay: {
          $cond: [
            { $ifNull: ["$submittedAt", false] },
            {
              $dateToString: {
                format: "%w", // 👈 sorts day name (e.g., )
                date: "$submittedAt",
                timezone: "Asia/Kolkata",
              },
            },
            null,
          ],
        },
        // "employee._id": 1,
        full_name: {
          $concat: ["$employee.first_name", " ", "$employee.last_name"],
        },
        approvedBy: {
          $cond: [
            { $ifNull: ["$approvedBy", false] },
            {
              $concat: ["$approvedBy.first_name", " ", "$approvedBy.last_name"],
            },
            null,
          ],
        },
        rejectedBy: {
          $cond: [
            { $ifNull: ["$rejectedBy", false] },
            {
              $concat: ["$rejectedBy.first_name", " ", "$rejectedBy.last_name"],
            },
            null,
          ],
        },
        reassignedBy: {
          $cond: [
            { $ifNull: ["$reassignedBy", false] },
            {
              $concat: [
                "$reassignedBy.first_name",
                " ",
                "$reassignedBy.last_name",
              ],
            },
            null,
          ],
        },
      },
    });

    // Count & Paginate
    const countPipeline = [...pipeline, { $count: "totalRecords" }];
    const [countResult, timesheets] = await Promise.all([
      timesheetModel.aggregate(countPipeline),
      timesheetModel.aggregate([
        ...pipeline,
        { $sort: sortObj },
        { $skip: skip },
        { $limit: limit },
      ]),
    ]);

    const totalRecords =
      countResult.length > 0 ? countResult[0].totalRecords : 0;

    res.status(200).json({
      success: true,
      message: "Timesheet status fetched successfully",
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        pageSize: timesheets.length,
      },
      data: timesheets,
    });
  } catch (e) {
    console.error("Error in getTimesheetStatusByEmployee:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const getTimesheetStatusByTeam = async (req, res) => {
  try {
    let {
      employee_id,
      date,
      search,
      page = 1,
      limit = 10,
      sortBy = "date",
      order = "desc",
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

    // 📅 Date range setup
    let start, end;
    if (date) {
      start = moment.tz(date, "Asia/Kolkata").startOf("day").toDate();
      end = moment.tz(date, "Asia/Kolkata").endOf("day").toDate();
    } else {
      start = moment().tz("Asia/Kolkata").startOf("day").toDate();
      end = moment().tz("Asia/Kolkata").endOf("day").toDate();
    }

    // ↕ Sorting
    const sortObj = {};
    sortObj[sortBy] = order.toLowerCase() === "asc" ? 1 : -1;

    // 📊 Pagination
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // 📝 Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          employee: { $in: teamIds },
          date: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $lookup: {
          from: "employees",
          localField: "approvedBy",
          foreignField: "_id",
          as: "approvedBy",
        },
      },
      { $unwind: { path: "$approvedBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "rejectedBy",
          foreignField: "_id",
          as: "rejectedBy",
        },
      },
      { $unwind: { path: "$rejectedBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "reassignedBy",
          foreignField: "_id",
          as: "reassignedBy",
        },
      },
      { $unwind: { path: "$reassignedBy", preserveNullAndEmptyArrays: true } },
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
        $project: {
          _id: 1,
          timesheet_id: "$_id",
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: "Asia/Kolkata",
            },
          },
          submitStatus: 1,
          // rejectedReason: 1,
          // submittedAt: 1,
          submittedAt: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$submittedAt",
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
          employee_number: "$employee.employee_number",
          employee_id: "$employee._id",
          approvedBy: {
            $cond: [
              { $ifNull: ["$approvedBy", false] },
              {
                $concat: [
                  "$approvedBy.first_name",
                  " ",
                  "$approvedBy.last_name",
                ],
              },
              null,
            ],
          },
          rejectedBy: {
            $cond: [
              { $ifNull: ["$rejectedBy", false] },
              {
                $concat: [
                  "$rejectedBy.first_name",
                  " ",
                  "$rejectedBy.last_name",
                ],
              },
              null,
            ],
          },
          reassignedBy: {
            $cond: [
              { $ifNull: ["$reassignedBy", false] },
              {
                $concat: [
                  "$reassignedBy.first_name",
                  " ",
                  "$reassignedBy.last_name",
                ],
              },
              null,
            ],
          },
        },
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },
    ];

    const timesheets = await timesheetModel.aggregate(pipeline);

    // 📊 Count aggregation
    const countPipeline = [
      {
        $match: {
          employee: { $in: teamIds },
          date: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
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

    const totalResult = await timesheetModel.aggregate(countPipeline);
    const totalRecords = totalResult.length > 0 ? totalResult[0].total : 0;

    res.status(200).json({
      success: true,
      message: "Timesheet status fetched successfully",
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        pageSize: timesheets.length,
      },
      data: timesheets,
    });
  } catch (e) {
    console.error("Error in getTimesheetStatusByTeam:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const getTimesheetStatusByDate = async (req, res) => {
  try {
    const { date, search } = req.body;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const skip = (page - 1) * limit;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Please provide date.",
      });
    }

    // normalize date to IST
    const start = moment.tz(date, "Asia/Kolkata").startOf("day").toDate();
    const end = moment.tz(date, "Asia/Kolkata").endOf("day").toDate();

    // 🔹 Aggregation pipeline
    const pipeline = [
      {
        $match: {
          date: { $gte: start, $lte: end },
        },
      },
      // lookup employee
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      // lookup approvedBy
      {
        $lookup: {
          from: "employees",
          localField: "approvedBy",
          foreignField: "_id",
          as: "approvedBy",
        },
      },
      { $unwind: { path: "$approvedBy", preserveNullAndEmptyArrays: true } },
      // lookup rejectedBy
      {
        $lookup: {
          from: "employees",
          localField: "rejectedBy",
          foreignField: "_id",
          as: "rejectedBy",
        },
      },
      { $unwind: { path: "$rejectedBy", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "employees",
          localField: "reassignedBy",
          foreignField: "_id",
          as: "reassignedBy",
        },
      },
      { $unwind: { path: "$reassignedBy", preserveNullAndEmptyArrays: true } },
      // add full_name
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
      // 🔎 search on full_name or employee_number
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { full_name: { $regex: search, $options: "i" } },
                  {
                    "employee.employee_number": {
                      $regex: search,
                      $options: "i",
                    },
                  },
                ],
              },
            },
          ]
        : []),
      // project fields
      {
        $project: {
          _id: 1,
          timesheet_id: "$_id",
          employee_id: "$employee._id",
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: "Asia/Kolkata",
            },
          },
          submitStatus: 1,
          rejectedReason: 1,
          submittedAt: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$submittedAt",
              timezone: "Asia/Kolkata",
            },
          },
          full_name: 1,
          employee_number: "$employee.employee_number",
          approvedBy: {
            $cond: [
              { $ifNull: ["$approvedBy", false] },
              {
                $concat: [
                  "$approvedBy.first_name",
                  " ",
                  "$approvedBy.last_name",
                ],
              },
              null,
            ],
          },
          rejectedBy: {
            $cond: [
              { $ifNull: ["$rejectedBy", false] },
              {
                $concat: [
                  "$rejectedBy.first_name",
                  " ",
                  "$rejectedBy.last_name",
                ],
              },
              null,
            ],
          },
          reassignedBy: {
            $cond: [
              { $ifNull: ["$reassignedBy", false] },
              {
                $concat: [
                  "$reassignedBy.first_name",
                  " ",
                  "$reassignedBy.last_name",
                ],
              },
              null,
            ],
          },
        },
      },
      { $sort: { date: 1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    // run aggregation
    const timesheets = await timesheetModel.aggregate(pipeline);

    // count total for pagination
    const totalPipeline = pipeline.filter(
      (stage) =>
        !("$skip" in stage) && !("$limit" in stage) && !("$sort" in stage)
    );
    totalPipeline.push({ $count: "total" });
    const totalResult = await timesheetModel.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Timesheet status fetched successfully",
      data: timesheets,
      page,
      limit,
      total,
    });
  } catch (e) {
    console.error("Error in getTimesheetStatus:", e);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: e.message,
    });
  }
};

const reassignTimesheet = async (req, res) => {
  try {
    const { timesheetId, reassignedBy, reason } = req.body;

    if (!timesheetId || !reassignedBy) {
      return res.status(400).json({
        success: false,
        message: "timesheetId and reassignedBy are required",
      });
    }

    const timesheet = await timesheetModel.findById(timesheetId);

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet not found",
      });
    }

    // Update status to reassign
    timesheet.submitStatus = 5; // reassign
    timesheet.reassignedBy = reassignedBy; // storing manager/lead who reassigned
    timesheet.rejectedReason = reason || "";
    timesheet.updatedAt = moment().tz("Asia/Kolkata").toDate();

    await timesheet.save();

    return res.json({
      success: true,
      message: "Timesheet reassigned successfully",
      // data: timesheet.toJSON(),
    });
  } catch (err) {
    console.error("reassignTimesheet error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const approveTimesheet = async (req, res) => {
  try {
    const { timesheetId, approvedBy } = req.body;

    if (!timesheetId || !approvedBy) {
      return res.status(400).json({
        success: false,
        message: "timesheetId and approvedBy are required",
      });
    }

    const timesheet = await timesheetModel.findById(timesheetId);

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet not found",
      });
    }

    // Update status to reassign
    timesheet.submitStatus = 3; // approved
    timesheet.approvedBy = approvedBy; // storing manager/lead who reassigned
    // timesheet.rejectedReason = reason || "Timesheet sent back for correction";
    timesheet.updatedAt = moment().tz("Asia/Kolkata").toDate();

    await timesheet.save();

    return res.json({
      success: true,
      message: "Timesheet Approved Successfully",
      // data: timesheet.toJSON(),
    });
  } catch (err) {
    console.error("reassignTimesheet error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const rejectTimesheet = async (req, res) => {
  try {
    const { timesheetId, rejectedBy, reason } = req.body;

    if (!timesheetId || !rejectedBy) {
      return res.status(400).json({
        success: false,
        message: "timesheetId and rejectedBy are required",
      });
    }

    const timesheet = await timesheetModel.findById(timesheetId);

    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet not found",
      });
    }

    // Update status to reassign
    timesheet.submitStatus = 4; // approved
    timesheet.rejectedBy = rejectedBy; // storing manager/lead who reassigned
    timesheet.rejectedReason = reason; // storing reason
    // timesheet.rejectedReason = reason || "Timesheet sent back for correction";
    timesheet.updatedAt = moment().tz("Asia/Kolkata").toDate();

    await timesheet.save();

    return res.json({
      success: true,
      message: "Timesheet Rejected Successfully",
      // data: timesheet.toJSON(),
    });
  } catch (err) {
    console.error("reassignTimesheet error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  addWorkReport,
  getWorkReport,
  getTimesheetStatusByEmployee,
  getTimesheetStatusByTeam,
  getTimesheetStatusByDate,
  reassignTimesheet,
  approveTimesheet,
  rejectTimesheet,
};
