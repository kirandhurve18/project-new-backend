const { default: mongoose } = require("mongoose");
const attendanceModel = require("../models/attendance.model");
const moment = require("moment-timezone");
const timesheetModel = require("../models/timesheet.model");
const weekOffSetupModel = require("../models/weekOffSetup.model");
const employeeModel = require("../models/employee.model");
const festivalLeaveModel = require("../models/festivalLeave.model");
const leaveApplicationModel = require("../models/leaveApplication.model");
const axios = require("axios");

const getAddressFromLatLon = async (latitude, longitude) => {
  try {
    const LOCATION_API_KEY =
      process.env.LOCATION_API_KEY || "674ee1f336530402396178adid70af0";
    let URL = `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}&api_key=${LOCATION_API_KEY}`;
    let addressResponse = await axios.get(URL);
    console.log("Response address ---> ", addressResponse);
    if (addressResponse && addressResponse.data) {
      return { success: true, address: addressResponse.data.display_name };
    } else {
      return { success: false, message: error.message || "Location Not Found" };
    }
  } catch (error) {
    console.log("error address ---> ", error);
    return {
      success: false,
      message: error.message || "Error in Fetch Location",
    };
  }
};

// Check-In
const checkIn = async (req, res) => {
  try {
    const { employee_id, checkin_location, latitude, longitude } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "employee_id is required",
      });
    }

    if (!latitude) {
      return res.status(400).json({
        success: false,
        message: "latitude is required",
      });
    }

    if (!longitude) {
      return res.status(400).json({
        success: false,
        message: "longitude is required",
      });
    }

    let addressResponse = await getAddressFromLatLon(latitude, longitude);
    let location = null;
    if (addressResponse.success) {
      location = addressResponse.address;
    } else {
      location = addressResponse.message;
    }

    const currentDate = moment.tz("Asia/Kolkata").format("YYYY-MM-DD");
    const currentTime = moment.tz("Asia/Kolkata").format("HH:mm:ss");
    // Check if already checked in today
    const existing = await attendanceModel.findOne({
      employee_id,
      checkin_date: currentDate,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Already checked in today.",
      });
    }

    let status = 1;
    if (currentTime > "09:36:00") {
      status = 7;
    }

    const attendance = new attendanceModel({
      employee_id,
      checkin_date: currentDate,
      checkin_time: currentTime,
      checkin_location: location || checkin_location,
      latitude,
      longitude,
      status,
    });

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Checked in successfully.",
      data: {
        checkin_time: attendance.checkin_time,
        checkout_time: attendance.checkout_time,
        status: attendance.status,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during check-in.",
      error: error.message,
    });
  }
};

// Check-Out
const checkOut = async (req, res) => {
  try {
    const { employee_id, checkout_location, latitude, longitude } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "employee_id is required",
      });
    }

    if (!latitude) {
      return res.status(400).json({
        success: false,
        message: "latitude is required",
      });
    }

    if (!longitude) {
      return res.status(400).json({
        success: false,
        message: "longitude is required",
      });
    }

    let addressResponse = await getAddressFromLatLon(latitude, longitude);
    let location = null;
    if (addressResponse.success) {
      location = addressResponse.address;
    } else {
      location = addressResponse.message;
    }
    const currentDate = moment.tz("Asia/Kolkata").format("YYYY-MM-DD");
    const currentTime = moment.tz("Asia/Kolkata").format("HH:mm:ss");

    // Find today's check-in record
    const attendance = await attendanceModel.findOne({
      employee_id,
      checkin_date: currentDate,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No check-in record found for today.",
      });
    }

    if (attendance.checkout_time) {
      return res.status(400).json({
        success: false,
        message: "Already checked out today.",
      });
    }

    attendance.checkout_date = currentDate;
    attendance.checkout_time = currentTime;
    attendance.checkout_location = location || checkout_location;
    attendance.latitude = latitude || attendance.latitude;
    attendance.longitude = longitude || attendance.longitude;

    await attendance.save();

    res.status(200).json({
      success: true,
      message: "Checked out successfully.",
      // data: attendance
      data: {
        checkin_time: attendance.checkin_time,
        checkout_time: attendance.checkout_time,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during check-out.",
      error: error.message,
    });
  }
};

// get Attendace
const getAttendance = async (req, res) => {
  try {
    // console.log("we are here ")
    const { employee_id } = req.body;

    const currentDate = moment.tz("Asia/Kolkata").format("YYYY-MM-DD");
    // const currentTime = moment.tz("Asia/Kolkata").format("HH:mm:ss");
    
    // Find today's check-in record
    const attendance = await attendanceModel.findOne(
      {
        employee_id,
        checkin_date: currentDate,
      },
      {
        checkin_date: 1,
        checkin_time: 1,
        checkout_date: 1,
        checkout_time: 1,

        _id: 1,
      }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "No check-in record found for today.",
      });
    }

    // Format using moment
    const formatted = {
      _id: attendance._id,
      checkin_date: attendance.checkin_date
        ? moment(attendance.checkin_date)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD")
        : null,
      checkin_time: attendance.checkin_time,
      checkout_date: attendance.checkout_date
        ? moment(attendance.checkout_date)
            .tz("Asia/Kolkata")
            .format("YYYY-MM-DD")
        : null,
      checkout_time: attendance.checkout_time,
    };

    res.status(200).json({
      success: true,
      message: "Present Date Attendance Fetched successfully.",
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during check-out.",
      error: error.message,
    });
  }
};

const getMonthlyEmployeeStatus = async (req, res) => {
  try {
    const { employee_id, month, year } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "Please provide employee_id.",
      });
    }

    // Default month/year
    const targetMonth = month || moment().tz("Asia/Kolkata").month() + 1;
    const targetYear = year || moment().tz("Asia/Kolkata").year();

    const startOfMonth = moment
      .tz({ year: targetYear, month: targetMonth - 1, day: 1 }, "Asia/Kolkata")
      .startOf("month")
      .toDate();

    const endOfMonth = moment
      .tz({ year: targetYear, month: targetMonth - 1, day: 1 }, "Asia/Kolkata")
      .endOf("month")
      .toDate();

    // Fetch attendance for employee
    const attendances = await attendanceModel.find({
      employee_id,
      checkin_date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // Fetch timesheet for employee
    const timesheets = await timesheetModel.find({
      employee: employee_id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const employeeDetails = await employeeModel.findById(employee_id);

    // console.log("employeeDetails ---> ", employeeDetails);

    const weekOff = await weekOffSetupModel.findOne({
      department_id: employeeDetails.department_id,
    });

    const festivalLeaves = await festivalLeaveModel.find({
      festival_date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    // console.log("festivalLeaves ---> ", festivalLeaves);

    // Build lookup maps
    const attendanceMap = {};
    attendances.forEach((a) => {
      const dateKey = moment(a.checkin_date)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD");

      attendanceMap[dateKey] = {
        attendance_status: a.status, // numeric status (1=full day, 2=half day...)
        checkin_time: a.checkin_time || null,
        checkout_time: a.checkout_time || null,
      };
    });

    const timesheetMap = {};
    timesheets.forEach((t) => {
      const dateKey = moment(t.date).tz("Asia/Kolkata").format("YYYY-MM-DD");

      timesheetMap[dateKey] = {
        submitStatus: t.submitStatus, // 0-5
      };
    });

    const festivalMap = {};
    festivalLeaves.forEach((t) => {
      const dateKey = moment(t.festival_date)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD");

      festivalMap[dateKey] = {
        holiday_status: 1, // 0-5
      };
    });

    // Build full month data
    const daysInMonth = moment(
      `${targetYear}-${targetMonth}`,
      "YYYY-MM"
    ).daysInMonth();
    const fullMonthData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateMoment = moment.tz(
        `${targetYear}-${targetMonth}-${day}`,
        "YYYY-MM-DD",
        "Asia/Kolkata"
      );

      const date = dateMoment.format("YYYY-MM-DD");
      const weekDay = dateMoment.day(); // 0 = Sunday, 6 = Saturday

      let isWeekOff = false;
      if (weekOff?.week_off_days?.includes(weekDay)) isWeekOff = true;

      const attendance = attendanceMap[date] || {
        attendance_status: 0, // absent
        checkin_time: null,
        checkout_time: null,
      };

      const timesheet = timesheetMap[date] || {
        submitStatus: 0, // Not submitted
      };

      const holiday = festivalMap[date] || {
        holiday_status: 0,
      };

      fullMonthData.push({
        date,
        weekDay,
        isWeekOff,
        ...attendance,
        ...timesheet,
        ...holiday,
      });
    }

    res.status(200).json({
      success: true,
      message: `Attendance + Timesheet status fetched for ${targetYear}-${targetMonth}`,
      data: fullMonthData,
    });
  } catch (error) {
    console.error("error --->", error);
    res.status(500).json({
      success: false,
      message: "Error fetching monthly employee status.",
      error: error.message,
    });
  }
};

const getAttendanceSummary = async (req, res) => {
  try {
    const currentDate = moment.tz("Asia/Kolkata").format("YYYY-MM-DD");
    const start = moment().tz("Asia/Kolkata").startOf("day").toDate();
    const end = moment().tz("Asia/Kolkata").endOf("day").toDate();

    // Fetch all today's attendance records
    const attendances = await attendanceModel.find(
      {
        checkin_date: currentDate,
      },
      {
        checkin_date: 1,
        checkin_time: 1,
        status: 1,
        _id: 1,
      }
    );

    if (!attendances.length) {
      return res.status(200).json({
        success: false,
        message: "No check-in records found for today.",
      });
    }

    // Calculate late/on-time
    let lateCount = 0;
    let onTimeCount = 0;

    // console.log("attendances --> ", attendances);
    attendances.forEach((att) => {
      if (att.status) {
        // const checkinMoment = moment(att.checkin_time, "HH:mm:ss");
        // const lateThreshold = moment("09:35:00", "HH:mm:ss");
        if (att.status == 7) {
          lateCount++;
        }
        // else {
        //   onTimeCount++;
        // }
      }
    });

    const pipeline = [
      {
        $match: {
          status: "Approved",

          // status: { $in: ["Pending", "Approved"] },
          status: { $in: ["Approved"] },
          // $or: [
          //   {
          // continuous leave (range check)
          from_date: { $lte: end },
          to_date: { $gte: start },
          // },
          // {
          //   // custom leave dates (within today’s range)
          //   custom_dates: { $gte: start, $lte: end },
          // },
          // ],
        },
      },
      {
        $count: "todayOnLeaveCount",
      },
    ];

    const result = await leaveApplicationModel.aggregate(pipeline);

    const leaveCount = result.length > 0 ? result[0].todayOnLeaveCount : 0;

    res.status(200).json({
      success: true,
      message: "Today's Attendance & Leave Summary",
      total_present: attendances.length,
      late_count: lateCount,
      on_leave_count: leaveCount,
      on_time_count: onTimeCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error during Attendance Summary.",
      error: error.message,
    });
  }
};

const getMonthlyLateCommers = async (req, res) => {
  try {
    const { month, year } = req.body;

    // Default to current month/year if not provided
    const targetMonth = month || moment().tz("Asia/Kolkata").month() + 1; // 1-12
    const targetYear = year || moment().tz("Asia/Kolkata").year();

    // Start & end of month in IST
    const startOfMonth = moment
      .tz(`${targetYear}-${targetMonth}-01`, "Asia/Kolkata")
      .startOf("month")
      .toDate();
    const endOfMonth = moment
      .tz(`${targetYear}-${targetMonth}-01`, "Asia/Kolkata")
      .endOf("month")
      .toDate();

    // Fetch all attendances in that month
    const attendances = await attendanceModel.aggregate([
      {
        $match: {
          checkin_date: { $gte: startOfMonth, $lte: endOfMonth },
          // checkin_time: { $gt: "09:35:00" }, // only late
          status: 7,
        },
      },
      {
        $group: {
          _id: "$employee_id",
          late_count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "employees", // collection name of employees
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $project: {
          employee_id: "$_id",
          // first_name: "$employee.first_name",
          // last_name: "$employee.last_name",
          full_name: {
            $concat: ["$employee.first_name", " ", "$employee.last_name"],
          },
          late_count: 1,
          _id: 0,
        },
      },
      { $sort: { late_count: -1 } },
    ]);

    if (!attendances.length) {
      return res.status(404).json({
        success: false,
        message: "No attendance records found for this month.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Late comers for (YYYY-MM)(${targetYear}-${targetMonth})`,
      // total_late: lateComers.length,
      // data: lateComers,
      data: attendances,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching monthly late comers.",
      error: error.message,
    });
  }
};

const getPresentEmployeeList = async (req, res) => {
  try {
    let {
      date,
      search,
      page = 1,
      limit = 10,
      sortBy = "checkin_time",
      order = "desc",
    } = req.query;

    // Convert pagination params
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // search filter
    let match = {};
    if (search) {
      match = {
        $or: [
          { first_name: { $regex: search, $options: "i" } },
          { last_name: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Determine sort order
    const sortObj = {};
    sortObj[sortBy] = order.toLowerCase() === "asc" ? 1 : -1;

    // Default to today's date if not provided
    if (!date) {
      date = moment.tz("Asia/Kolkata").format("YYYY-MM-DD");
    }

    // Ensure proper date range for the whole day
    const startOfDay = moment
      .tz(date, "YYYY-MM-DD", "Asia/Kolkata")
      .startOf("day")
      .toDate();
    const endOfDay = moment(startOfDay).endOf("day").toDate();

    const attendances = await attendanceModel.aggregate([
      {
        $match: {
          checkin_date: { $gte: startOfDay, $lte: endOfDay },
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
      { $unwind: "$employee" },
      // Apply search filter after lookup
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
          employee_id: "$employee._id",
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
          checkin_date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$checkin_date",
              timezone: "Asia/Kolkata",
            },
          },
          checkout_date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$checkout_date",
              timezone: "Asia/Kolkata",
            },
          },
          checkin_time: 1,
          checkout_time: 1,
          checkin_location: 1,
          checkout_location: 1,
          latitude: 1,
          longitude: 1,
          status: 1,
          comment: 1,
        },
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Build aggregation for counting total records
    const countAggregation = [
      {
        $match: {
          checkin_date: { $gte: startOfDay, $lte: endOfDay },
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
      { $unwind: "$employee" },
      // Apply search if present
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

    // Execute aggregation
    const totalResult = await attendanceModel.aggregate(countAggregation);
    const totalRecords = totalResult.length > 0 ? totalResult[0].total : 0;

    return res.status(200).json({
      success: true,
      message: `Present employees fetched for ${date}`,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        pageSize: attendances.length,
      },
      data: attendances,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching present employee list",
      error: error.message,
    });
  }
};

const updatePresentEmployeeStatus = async (req, res) => {
  try {
    const { attendance_id, status } = req.body;

    if (!attendance_id || !status) {
      return res.status(400).json({
        success: false,
        message: "attendance_id and status are required.",
      });
    }

    // Validate status (1–7 only)
    if (![1, 2, 3, 4, 5, 6, 7].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Allowed: 1-7.",
      });
    }

    // Find and update attendance by object _id
    const updated = await attendanceModel.findByIdAndUpdate(
      attendance_id,
      { $set: { status } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "No attendance record found with given ID.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance status updated successfully.",
      data: {
        _id: updated._id,
        status: updated.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating attendance status.",
      error: error.message,
    });
  }
};

const getEmployeeAttendanceReport = async (req, res) => {
  try {
    let {
      employee_id,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 10,
      sortBy = "checkin_date",
      order = "asc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "Please provide employee_id.",
      });
    }

    if (!fromDate) fromDate = moment.tz("Asia/Kolkata").format("YYYY-MM-DD");
    if (!toDate) toDate = moment.tz("Asia/Kolkata").format("YYYY-MM-DD");

    const startOfDay = moment
      .tz(fromDate, "YYYY-MM-DD", "Asia/Kolkata")
      .startOf("day")
      .toDate();
    const endOfDay = moment
      .tz(toDate, "YYYY-MM-DD", "Asia/Kolkata")
      .endOf("day")
      .toDate();

    const sortObj = {};
    sortObj[sortBy] = order.toLowerCase() === "desc" ? -1 : 1;

    // ========= Attendance Records ==========
    const aggregationPipeline = [
      {
        $match: {
          employee_id: new mongoose.Types.ObjectId(employee_id),
          checkin_date: { $gte: startOfDay, $lte: endOfDay },
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
      { $unwind: "$employee" },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "employee.first_name": { $regex: search, $options: "i" } },
                  { "employee.last_name": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: 1,
          employee_id: "$employee._id",
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
          checkin_date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$checkin_date",
              timezone: "Asia/Kolkata",
            },
          },
          checkout_date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$checkout_date",
              timezone: "Asia/Kolkata",
            },
          },
          checkin_time: 1,
          checkout_time: 1,
          checkin_location: 1,
          checkout_location: 1,
          latitude: 1,
          longitude: 1,
          status: 1,
          comment: 1,
        },
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit },
    ];

    const attendances = await attendanceModel.aggregate(aggregationPipeline);

    // ========= Count Total Records ==========
    const countPipeline = [
      {
        $match: {
          employee_id: new mongoose.Types.ObjectId(employee_id),
          checkin_date: { $gte: startOfDay, $lte: endOfDay },
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
      { $unwind: "$employee" },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "employee.first_name": { $regex: search, $options: "i" } },
                  { "employee.last_name": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      { $count: "total" },
    ];

    const totalResult = await attendanceModel.aggregate(countPipeline);
    const totalRecords = totalResult.length > 0 ? totalResult[0].total : 0;

    // ========= Attendance Summary ==========
    const summaryPipeline = [
      {
        $match: {
          employee_id: new mongoose.Types.ObjectId(employee_id),
          checkin_date: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ];

    const summaryResult = await attendanceModel.aggregate(summaryPipeline);

    const summary = {
      totalDays: moment(endOfDay).diff(moment(startOfDay), "days") + 1,
      weekOff: 0, // we’ll calculate separately
      absent: 0,
      present: 0,
      fullDay: 0,
      halfDay: 0,
      lateMark: 0,
      earlyLeave: 0,
      lateJoining: 0,
      compOff: 0,
      electricityIssue: 0,
    };

    // Calculate week offs (Sat/Sun)
    let current = moment(startOfDay);
    while (current.isSameOrBefore(endOfDay)) {
      const day = current.day();
      if (day === 6) summary.weekOff += 1;
      current.add(1, "days");
    }

    // Map DB results to summary
    summaryResult.forEach((item) => {
      switch (item._id) {
        case 1:
          summary.fullDay = item.count;
          break;
        case 2:
          summary.halfDay = item.count;
          break;
        case 3:
          summary.earlyLeave = item.count;
          break;
        case 4:
          summary.lateJoining = item.count;
          break;
        case 5:
          summary.compOff = item.count;
          break;
        case 6:
          summary.electricityIssue = item.count;
          break;
        case 7:
          summary.lateMark = item.count;
          break;
      }
    });

    // Absent = TotalDays - (present + weekOff + halfDay + compOff + other statuses)
    const present =
      summary.fullDay +
      summary.halfDay +
      summary.compOff +
      summary.electricityIssue +
      summary.lateMark +
      summary.earlyLeave +
      summary.lateJoining;
      // summary.weekOff;

    let notpresent = present + summary.weekOff;
    // summary.absent = summary.totalDays - notpresent;
    summary.present = present;

    console.log(summary.persent)
    return res.status(200).json({
      success: true,
      message: `Employees Attendance Report fetched between ${fromDate} and ${toDate}`,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        pageSize: attendances.length,
      },
      data: attendances,
      summary,
    });
  } catch (error) {
    console.log("error ---> ", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employee attendance report",
      error: error.message,
    });
  }
};


module.exports = {
  checkIn,
  checkOut,
  getAttendance,
  getMonthlyEmployeeStatus,
  getAttendanceSummary,
  getMonthlyLateCommers,
  getPresentEmployeeList,
  updatePresentEmployeeStatus,
  getEmployeeAttendanceReport,
};
