const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false,
    },

    employeeNumber: {
      type: String,
      trim: true,
    },

    position: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
    },

    nationality: {
      type: String,
      trim: true,
    },

    hireDate: {
      type: Date,
    },
     status:{
      type: String,
      trim: true,
      enum: ["absent", "present", "leave",],
      default: "Present",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Employee", employeeSchema);