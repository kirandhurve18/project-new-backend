const mongoose = require("mongoose");

const LeaveBalanceSchema = new mongoose.Schema({
  employee_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Employee",
    required: true
  },
  year: { type: Number, required: true, },
  leaves: {
    casual: {
      allotted: Number,
      used: Number,
    },
    sick: {
      allotted: Number,
      used: Number,
    },
    emergency: {
      allotted: Number,
      used: Number,
    },
    carryForward: {
      fromYear: Number,
      count: Number,
    },
    compensatory: {
      earned: Number,
      used: Number,
    },
    early: {
      earned: Number,
      used: Number,
    },
    lateComing: {
      earned: Number,
      used: Number,
    },
  },
});

module.exports = mongoose.model("LeaveBalance", LeaveBalanceSchema);
