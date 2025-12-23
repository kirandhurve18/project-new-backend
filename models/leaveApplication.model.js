const mongoose = require("mongoose");

const LeaveApplicationSchema = new mongoose.Schema(
  {
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leave_type: {
      type: String,
      enum: [
        "casual",
        "sick",
        "emergency",
        "carryForward",
        "compensatory",
        "early",
        "lateComing",
      ],
      required: true,
    },

    // Continuous leave range, Half day leave, Full Day Leave
    from_date: { type: Date },
    to_date: { type: Date },

    // OR Non-continuous custom dates
    custom_dates: [
      {
        type: Date, // eg. 2025-07-01, 2025-07-02
      },
    ],

    leave_mode: {
      type: String,
      enum: ["Full Day", "Half Day", "Continuous", "Custom Dates"],
      required: true,
    },

    // // 🔹 For Half Day leaves
    // half_day_session: {
    //   type: String,
    //   enum: ['Morning', 'Afternoon'],
    //   required: function () { return this.leave_mode === 'Half Day'; }
    // },
    half_day_start_time: {
      type: String, // e.g., "09:30"
      required: function () {
        return this.leave_mode === "Half Day";
      },
    },
    half_day_end_time: {
      type: String, // e.g., "13:30"
      required: function () {
        return this.leave_mode === "Half Day";
      },
    },

    reason: { type: String, required: true },
    document: { type: String },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    reviewer_status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    head_status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    updated_by_manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    updated_by_hr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    updated_by_head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    updated_by_reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },

    rejection_reason: { type: String },
    manager_comment: { type: String },
    reviewer_comment: { type: String },

    number_of_days: {
      type: Number, // Auto-calculated after excluding holidays/weekends
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaveApplication", LeaveApplicationSchema);
