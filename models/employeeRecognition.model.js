const mongoose = require("mongoose");

// models/EmployeeDocuments.js
const allowedAwardTypes = [
  "Performer of the Month",
  "Leader of the Month",
  "Performer of the Quarter",
  "Leader of the Quarter",
  "Employee of the Year",
  "Leader of the Year",
];

const allowedAwardDocTypes = [
  // 
]

const EmployeeRecognitionSchema = new mongoose.Schema(
  {
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    award_type: {
      type: String,
      enum: allowedAwardTypes,
      required: true,
    },
    period: {
      month: { type: Number, min: 1, max: 12 }, // Optional: 1 - 12
      quarter: { type: Number, min: 1, max: 4 }, // Optional: 1 - 4
      year: { type: Number, required: true }, // Required for all eg. 2025, 2026
    },
    description: {
      type: String, // Optional remarks
    },
    files: [
      {
        path: [{ type: String }],
        title: { type: String },
        active: { type: Boolean, default: true },
        uploaded_at: { type: Date, default: Date.now },
      },
    ],
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = {
  EmployeeRecognition: mongoose.model(
    "EmployeeRecognition",
    EmployeeRecognitionSchema
  ),
  allowedAwardTypes,
};
