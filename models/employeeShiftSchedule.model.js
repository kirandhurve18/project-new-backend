const mongoose = require("mongoose");

const dailyShiftSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6], // 0 = Sunday, 6 = Saturday
      required: true,
    },
    start_time: {
      type: String, // "09:00"
      required: true,
    },
    end_time: {
      type: String, // "18:00"
      required: true,
    },
    is_week_off: {
      type: Boolean,
      default: false, // true if off that day
    },
  },
  { _id: false }
);

const employeeShiftScheduleSchema = new mongoose.Schema(
  {
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    week_start_date: {
      type: Date,
      required: true, // To track schedules week by week
    },
    shifts: {
      type: [dailyShiftSchema], // 7 days or less
      default: [],
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee", // manager id
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployeeShiftSchedule", employeeShiftScheduleSchema);
