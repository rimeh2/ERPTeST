const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    location: {
      type: String,
      default: "",
    },

    // employee / team /everyone
    targetType: {
      type: String,
      enum: [
        "employee",
        "team",
        "company",
      ],
      required: true,
    },

    // For one employee
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    // For a manually selected group of employees
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],


    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "scheduled",
        "cancelled",
        "completed",
      ],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Event", eventSchema);