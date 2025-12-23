const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6],   // 0 = default for whole week, 1 = Monday ... 7 = Sunday
      required: true,
    },
    start_time: {
      type: String, // e.g. "09:00"
      required: true,
    },
    end_time: {
      type: String, // e.g. "18:00"
      required: true,
    },
  },
  { _id: false } // No separate _id for each shift
);

const weekOffSetupSchema = new mongoose.Schema(
  {
    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    days: {
      type: [Number], // Array of numbers for week days
      enum: [0, 1, 2, 3, 4, 5, 6], // Restrict to valid week days
      default: [],
    },
    week_off_days: {
      type: [Number], // Array of numbers for week off days
      enum: [1, 2, 3, 4, 5, 6], // Restrict to valid week days
      default: [],
    },
    shifts: {
      type: [shiftSchema], // Array of shifts
      default: [],
    },
    is_random: {
      type: Boolean,
      default: false,
    },
    // is_custom: {
    //   type: Boolean,
    //   default: false,
    // },
    work_mode: { type: String, enum: ["WFH", "WFO", "HYBRID"], default: "WFO" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("weekOffSetup", weekOffSetupSchema);
