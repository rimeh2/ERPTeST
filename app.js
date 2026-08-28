require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const connectDB = require("./db");
const User = require("./models/User");
const Company = require("./models/Company");
const Employee = require("./models/Employee");
const app = express();
const authMiddleware = require("./middleware/authMiddleware");
connectDB();
// Middleware
app.use(cors());
app.use(express.json());


app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "employee",
    });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});
app.post("/api/auth/register1", async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      // User
      name,
      email,
      password,

      // Employee
      employeeNumber,
      position,
      nationality,
      gender,
      department,
      phone,
      hireDate,
      status,
      companyId,
    } = req.body;



    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }


    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }



    session.startTransaction();


    const hashedPassword = await bcrypt.hash(
      password,
      12
    );



    const users = await User.create(
      [
        {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "admin",
        },
      ],
      { session }
    );

    const user = users[0];

 

    const employees = await Employee.create(
      [
        {
          userId: user._id,

          // If you already have a company
          companyId: companyId || null,

          employeeNumber,
          position,
          nationality,
          gender,
          department,
          phone,
          hireDate,
          status: status || "present",
        },
      ],
      { session }
    );

    const employee = employees[0];

   

    await session.commitTransaction();

  

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        employeeId: employee._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
          process.env.JWT_EXPIRES_IN || "7d",
      }
    );

  

    return res.status(201).json({
      success: true,
      message: "Owner registered successfully",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },

      employee: {
        id: employee._id,
        userId: employee.userId,
        companyId: employee.companyId,
        employeeNumber: employee.employeeNumber,
        position: employee.position,
        nationality: employee.nationality,
        gender: employee.gender,
        department: employee.department,
        phone: employee.phone,
        hireDate: employee.hireDate,
        status: employee.status,
      },
    });

  } catch (error) {

    // Abort only if transaction is active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(
      "Register owner error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });

  } finally {
    await session.endSession();
  }
});

//login this register is the one we use cause its add user to emplyee table 
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

   
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const passwordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});




//companies Apis

const ownerOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Owner access required",
    });
  }

  next();
};
//get companies
app.get(
  "/api/companies",
  authMiddleware,
  ownerOnly,
  async (req, res) => {

    const companies = await Company.find({
      ownerId: req.user.userId,
      isActive: true,
    });

    res.json({
      success: true,
      companies,
    });
  }
);
//add companies
app.post(
  "/api/companies",
  authMiddleware,
  ownerOnly,
  async (req, res) => {

    const { name, email, phone, address } = req.body;

    const company = await Company.create({
      name,
      email,
      phone,
      address,
      ownerId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      company,
    });
  }
);
//delete company
app.delete(
  "/api/companies/:id",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const companyId = req.params.id;

      session.startTransaction();

      // Find company belonging to logged-in owner
      const company = await Company.findOne({
        _id: companyId,
        ownerId: req.user.userId,
      }).session(session);

      if (!company) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

      // Find employees
      const employees = await Employee.find({
        companyId: companyId,
      }).session(session);

      // Get User IDs
      const userIds = employees.map(
        (employee) => employee.userId
      );

      // Delete employees
      await Employee.deleteMany(
        {
          companyId: companyId,
        },
        { session }
      );

      // Delete employee accounts
      if (userIds.length > 0) {
        await User.deleteMany(
          {
            _id: { $in: userIds },
            role: "employee",
          },
          { session }
        );
      }

      // Delete company
      await Company.deleteOne(
        {
          _id: companyId,
        },
        { session }
      );

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message:
          "Company and all employees deleted successfully",
        deletedEmployees: employees.length,
      });

    } catch (error) {
      await session.abortTransaction();

      console.error("Delete company error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to delete company",
      });

    } finally {
      session.endSession();
    }
  }
);
//add employee 
app.post(
  "/api/companies/:companyId/employees",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      const {
        name,
        email,
        password,
        employeeNumber,
        position,
        nationality,
        gender,
        department,
        phone,
        hireDate,status
      } = req.body;

      const { companyId } = req.params;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email and password are required",
        });
      }

      const company = await Company.findOne({
        _id: companyId,
        ownerId: req.user.userId,
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

      // Check email already exists
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }

      session.startTransaction();

      // Hash password
      const hashedPassword = await bcrypt.hash(
        password,
        12
      );

      // Create User account
      const users = await User.create(
        [
          {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: "employee",
          },
        ],
        { session }
      );

      const user = users[0];

      // Create Employee
      const employees = await Employee.create(
        [
          {
            userId: user._id,
            companyId: company._id,
            employeeNumber,
            position,
            nationality,
            gender,
            department,
            phone,
            hireDate,
            status
          },
        ],
        { session }
      );

      const employee = employees[0];

      await session.commitTransaction();

      res.status(201).json({
        success: true,
        message: "Employee created successfully",
        employee: {
          id: employee._id,
          userId: user._id,
          companyId: company._id,
          name: user.name,
          email: user.email,
          employeeNumber: employee.employeeNumber,
          position: employee.position,
          department: employee.department,
          phone: employee.phone,
          hireDate: employee.hireDate,
          status:employee.status
        },
      });

    } catch (error) {
      await session.abortTransaction();

      console.error("Create employee error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create employee",
      });

    } finally {
      session.endSession();
    }
  }
);
//delete employee
app.delete(
  "/api/employees/:id",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const employee = await Employee.findById(
        req.params.id
      ).session(session);

      if (!employee) {
        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      // Check company belongs to owner
      const company = await Company.findOne({
        _id: employee.companyId,
        ownerId: req.user.userId,
      }).session(session);

      if (!company) {
        await session.abortTransaction();

        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Delete Employee
      await Employee.deleteOne(
        {
          _id: employee._id,
        },
        { session }
      );

      // Delete User account
      await User.deleteOne(
        {
          _id: employee.userId,
          role: "employee",
        },
        { session }
      );

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: "Employee and user account deleted successfully",
      });

    } catch (error) {
      await session.abortTransaction();

      console.error("Delete employee error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to delete employee",
      });

    } finally {
      session.endSession();
    }
  }
);
//update employee 
app.put(
  "/api/employees/:id",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    try {
      const {
        name,
        email,
        employeeNumber,
        position,
        department,
        phone,
        hireDate,
      } = req.body;

      const employee = await Employee.findById(
        req.params.id
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      // Check company belongs to owner
      const company = await Company.findOne({
        _id: employee.companyId,
        ownerId: req.user.userId,
      });

      if (!company) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Update User
      const user = await User.findByIdAndUpdate(
        employee.userId,
        {
          name,
          email: email?.toLowerCase(),
        },
        {
          new: true,
          runValidators: true,
        }
      );

      // Update Employee
      const updatedEmployee =
        await Employee.findByIdAndUpdate(
          req.params.id,
          {
            employeeNumber,
            position,
            department,
            phone,
            hireDate,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      res.status(200).json({
        success: true,
        message: "Employee updated successfully",
        employee: {
          ...updatedEmployee.toObject(),
          user: {
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });

    } catch (error) {
      console.error("Update employee error:", error);

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);
//get employee by id 
app.get(
  "/api/employees/:employeeId",
  authMiddleware,
  async (req, res) => {
    try {
      const { employeeId } = req.params;

      const employee = await Employee.findById(employeeId)
        .populate(
          "userId",
          "name email role isActive"
        )
        .populate(
          "companyId",
          "name email phone address"
        );

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      res.status(200).json({
        success: true,
        employee: {
          id: employee._id,
          userId: employee.userId?._id,

          name: employee.userId?.name,
          email: employee.userId?.email,
          role: employee.userId?.role,
          isActive: employee.userId?.isActive,

          employeeNumber: employee.employeeNumber,
          position: employee.position,
          department: employee.department,
          phone: employee.phone,
          gender: employee.gender,
          nationality: employee.nationality,
          hireDate: employee.hireDate,
          status: employee.status,

          company: {
            id: employee.companyId?._id,
            name: employee.companyId?.name,
            email: employee.companyId?.email,
            phone: employee.companyId?.phone,
            address: employee.companyId?.address,
          },

          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        },
      });

    } catch (error) {
      console.error("Get employee error:", error);

      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);
//get list employee 
app.get(
  "/api/companies/:companyId/employees",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    try {
      const { companyId } = req.params;

      // Make sure company belongs to owner
      const company = await Company.findOne({
        _id: companyId,
        ownerId: req.user.userId,
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

      // Get employees
      const employees = await Employee.find({
        companyId: companyId,
      })
        .populate(
          "userId",
          "name email role isActive"
        )
        .sort({ createdAt: -1 });



      const maleCount = employees.filter(
        (employee) =>
          employee.gender?.toLowerCase() === "male"
      ).length;

      const femaleCount = employees.filter(
        (employee) =>
          employee.gender?.toLowerCase() === "female"
      ).length;

      const presentCount = employees.filter(
        (employee) =>
          employee.status?.toLowerCase() ===
          "present"
      ).length;

      const absentCount = employees.filter(
        (employee) =>
          employee.status?.toLowerCase() ===
          "absent"
      ).length;

      const leaveCount = employees.filter(
        (employee) =>
          employee.status?.toLowerCase() ===
          "leave"
      ).length;

      res.status(200).json({
        success: true,

        count: employees.length,

        statistics: {
          male: maleCount,
          female: femaleCount,
          present: presentCount,
          absent: absentCount,
          leave: leaveCount,
        },

        employees,
      });

    } catch (error) {
      console.error("Get employees error:", error);

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);
//get employee 
app.get(
  "/api/employees/:id",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    try {
      const employee = await Employee.findById(
        req.params.id
      ).populate(
        "userId",
        "name email role isActive"
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      // Check that employee's company belongs to owner
      const company = await Company.findOne({
        _id: employee.companyId,
        ownerId: req.user.userId,
      });

      if (!company) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      res.status(200).json({
        success: true,
        employee,
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);
//get current employee /**

app.get("/api/employeescurrent/", authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const employee = await Employee.findOne({ userId: req.user.userId })
      .populate("userId", "name email role isActive")
      .populate("companyId", "name email phone address");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "No employee profile found for this user",
      });
    }

    res.status(200).json({
      success: true,
      employee: {
        id: employee._id,
        userId: employee.userId?._id,
        name: employee.userId?.name,
        email: employee.userId?.email,
        role: employee.userId?.role,
        isActive: employee.userId?.isActive,
        employeeNumber: employee.employeeNumber,
        position: employee.position,
        department: employee.department,
        phone: employee.phone,
        gender: employee.gender,
        nationality: employee.nationality,
        hireDate: employee.hireDate,
        status: employee.status,
        company: {
          id: employee.companyId?._id,
          name: employee.companyId?.name,
          email: employee.companyId?.email,
          phone: employee.companyId?.phone,
          address: employee.companyId?.address,
        },
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get employee by token error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});
// get one company Dashboard
app.get(
  "/api/companies/:companyId",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    try {
      const { companyId } = req.params;
console.log(req.user.userId);
      
      const company = await Company.findOne({
        _id: companyId,
        ownerId: req.user.userId,
      });

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

   

      const employees = await Employee.find({
        companyId: company._id,
      })
        .populate(
          "userId",
          "name email role isActive"
        )
        .sort({ createdAt: -1 });

    

      const totalEmployees = employees.length;

 

      const maleCount = employees.filter(
        (employee) =>
          employee.gender?.toLowerCase() === "male"
      ).length;

      const femaleCount = employees.filter(
        (employee) =>
          employee.gender?.toLowerCase() === "female"
      ).length;

     

      const nationalityStats = {};

      employees.forEach((employee) => {
        const nationality =
          employee.nationality?.trim() || "Unknown";

        if (!nationalityStats[nationality]) {
          nationalityStats[nationality] = 0;
        }

        nationalityStats[nationality]++;
      });

      // Convert object to array
      const nationalities = Object.entries(
        nationalityStats
      ).map(([nationality, count]) => ({
        nationality,
        count,
        percentage:
          totalEmployees > 0
            ? Number(
                ((count / totalEmployees) * 100).toFixed(2)
              )
            : 0,
      }));


      const departmentStats = {};

      employees.forEach((employee) => {
        const department =
          employee.department?.trim() || "Unknown";

        if (!departmentStats[department]) {
          departmentStats[department] = 0;
        }

        departmentStats[department]++;
      });

      const departments = Object.entries(
        departmentStats
      ).map(([department, count]) => ({
        department,
        count,
        percentage:
          totalEmployees > 0
            ? Number(
                ((count / totalEmployees) * 100).toFixed(2)
              )
            : 0,
      }));


    

   
      const presentCount =
        employees.filter(
          (attendance) =>
            attendance.status?.toLowerCase() === "present"
        ).length;

      const absentCount =
        employees.filter(
          (attendance) =>
            attendance.status?.toLowerCase() === "absent"
        ).length;

      const leaveCount =
        employees.filter(
          (attendance) =>
            attendance.status?.toLowerCase() === "leave"
        ).length;

     const totalAttendance =
  presentCount +
  absentCount +
  leaveCount;

const attendancePercentage =
  totalAttendance > 0
    ? Number(
        (
          (presentCount / totalAttendance) *
          100
        ).toFixed(2)
      )
    : 0;

   


      const employeeList = employees.map(
        (employee) => ({
          id: employee._id,
          userId: employee.userId?._id,

          name: employee.userId?.name,
          email: employee.userId?.email,
          role: employee.userId?.role,
          isActive: employee.userId?.isActive,

          employeeNumber:
            employee.employeeNumber,

          position: employee.position,
          department: employee.department,
          phone: employee.phone,
          gender: employee.gender,
          nationality: employee.nationality,
          hireDate: employee.hireDate,
          status: employee.status
        })
      );

     

      res.status(200).json({
        success: true,

        company: {
          id: company._id,
          name: company.name,
          email: company.email,
          phone: company.phone,
          address: company.address,
          ownerId: company.ownerId,
        },

        dashboard: {
          totalEmployees,

          gender: {
            male: maleCount,
            female: femaleCount,
          },

          attendance: {
            percentage: attendancePercentage,
            present: presentCount,
            absent: absentCount,
            leave: leaveCount,
            totalRecords: totalAttendance,
          },

          nationalities,

          departments,
        },

        employees: employeeList,
      });

    } catch (error) {
      console.error(
        "Get company dashboard error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ERP API is running",
  });
});



const Event = require("./models/Events");


const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);


app.post(
  "/api/events/",
  authMiddleware,
  ownerOnly , async (req, res) => {
  try {
    const {
      companyId,
      title,
      description,
      startDate,
      endDate,
      location,
      targetType,
      employeeId,
      participants,
    } = req.body;


    if (!companyId || !isValidObjectId(companyId)) {
      return res.status(400).json({ message: "A valid companyId is required." });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required." });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "startDate/endDate must be valid dates." });
    }

    if (!(end > start)) {
      return res.status(400).json({ message: "endDate must be after startDate." });
    }

    if (!["employee", "team", "company"].includes(targetType)) {
      return res
        .status(400)
        .json({ message: "targetType must be 'employee', 'team' or 'company'." });
    }

    
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

   
    let resolvedEmployeeId = null;
    let resolvedParticipants = [];

    if (targetType === "employee") {
      if (!employeeId || !isValidObjectId(employeeId)) {
        return res.status(400).json({ message: "A valid employeeId is required." });
      }

      const employee = await Employee.findById(employeeId);

      if (!employee) {
        return res.status(404).json({ message: "Employee not found." });
      }

      if (String(employee.companyId) !== String(companyId)) {
        return res
          .status(400)
          .json({ message: "This employee does not belong to the selected company." });
      }

      resolvedEmployeeId = employee._id;
    }

    if (targetType === "team") {
      if (!Array.isArray(participants) || participants.length === 0) {
        return res
          .status(400)
          .json({ message: "At least one participant is required for a team event." });
      }

      const invalidIds = participants.filter((id) => !isValidObjectId(id));

      if (invalidIds.length > 0) {
        return res.status(400).json({ message: "One or more participant IDs are invalid." });
      }

      const foundEmployees = await Employee.find({
        _id: { $in: participants },
        companyId,
      }).select("_id");

      if (foundEmployees.length !== participants.length) {
        return res.status(400).json({
          message:
            "One or more selected employees were not found or do not belong to this company.",
        });
      }

      resolvedParticipants = foundEmployees.map((e) => e._id);
    }

    if (targetType === "company") {
      // "Everyone": resolve server-side so the audience is captured
      // at creation time rather than recomputed dynamically later.
      const allEmployees = await Employee.find({ companyId }).select("_id");

      if (allEmployees.length === 0) {
        return res
          .status(400)
          .json({ message: "This company has no employees to invite." });
      }

      resolvedParticipants = allEmployees.map((e) => e._id);
    }

   
    const event = await Event.create({
      companyId,
      title: title.trim(),
      description: description ? description.trim() : "",
      location: location ? location.trim() : "",
      startDate: start,
      endDate: end,
      targetType,
      employeeId: resolvedEmployeeId,
      participants: resolvedParticipants,
      createdBy:  req.user.userId, // requires an auth middleware setting req.user
    });

    return res.status(201).json({
      message: "Event created successfully.",
      event,
    });
  } catch (error) {
    console.error("createEvent error:", error);
    return res.status(500).json({ message: "Something went wrong while creating the event." });
  }
});
//get all events 
app.get(
  "/api/events/all",
  authMiddleware,
    async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const events = await Event.find({ createdBy: req.user.userId })
      .sort({ startDate: -1 })
      .populate("companyId", "name")
      .populate({
        path: "employeeId",
        select: "position department userId",
        populate: { path: "userId", select: "name" },
      })
      .populate({
        path: "participants",
        select: "position department userId",
        populate: { path: "userId", select: "name" },
      });

    return res.status(200).json({
      message: "Events fetched successfully.",
      events,
    });
  } catch (error) {
    console.error("getMyEvents error:", error);
    return res.status(500).json({ message: "Something went wrong while fetching events." });
  }
});

app.patch(
  "/api/events/:eventId/status",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    try {
      const { eventId } = req.params;
      const { status } = req.body;

      if (!isValidObjectId(eventId)) {
        return res.status(400).json({ message: "A valid eventId is required." });
      }

      if (!["scheduled", "cancelled", "completed"].includes(status)) {
        return res
          .status(400)
          .json({ message: "status must be 'scheduled', 'cancelled' or 'completed'." });
      }

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ message: "Event not found." });
      }

      // Only the event's creator can change its status.
      // Remove this block if `ownerOnly` already enforces the right
      // scope (e.g. company-level ownership) and per-resource
      // creator checks would be redundant.
      if (String(event.createdBy) !== String(req.user.userId)) {
        return res
          .status(403)
          .json({ message: "You are not allowed to update this event." });
      }

      if (event.status === status) {
        return res.status(200).json({
          message: `Event is already '${status}'.`,
          event,
        });
      }

      event.status = status;
      await event.save();

      return res.status(200).json({
        message: "Event status updated successfully.",
        event,
      });
    } catch (error) {
      console.error("updateEventStatus error:", error);
      return res
        .status(500)
        .json({ message: "Something went wrong while updating the event status." });
    }
  }
);


app.put(
  "/api/events/:eventId",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!isValidObjectId(eventId)) {
        return res.status(400).json({ message: "A valid eventId is required." });
      }

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ message: "Event not found." });
      }

      if (String(event.createdBy) !== String(req.user.userId)) {
        return res
          .status(403)
          .json({ message: "You are not allowed to update this event." });
      }

      const {
        title,
        description,
        startDate,
        endDate,
        location,
        targetType,
        employeeId,
        participants,
      } = req.body;

      const companyId = event.companyId; 

      if (title !== undefined) {
        if (!title || !title.trim()) {
          return res.status(400).json({ message: "Title is required." });
        }
        event.title = title.trim();
      }

      if (description !== undefined) {
        event.description = description ? description.trim() : "";
      }

      if (location !== undefined) {
        event.location = location ? location.trim() : "";
      }

   
      let start = event.startDate;
      let end = event.endDate;

      if (startDate !== undefined) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "startDate must be a valid date." });
        }
      }

      if (endDate !== undefined) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: "endDate must be a valid date." });
        }
      }

      if (!(end > start)) {
        return res.status(400).json({ message: "endDate must be after startDate." });
      }

      event.startDate = start;
      event.endDate = end;

  
      if (targetType !== undefined) {
        if (!["employee", "team", "company"].includes(targetType)) {
          return res
            .status(400)
            .json({ message: "targetType must be 'employee', 'team' or 'company'." });
        }

        let resolvedEmployeeId = null;
        let resolvedParticipants = [];

        if (targetType === "employee") {
          if (!employeeId || !isValidObjectId(employeeId)) {
            return res.status(400).json({ message: "A valid employeeId is required." });
          }

          const employee = await Employee.findById(employeeId);

          if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
          }

          if (String(employee.companyId) !== String(companyId)) {
            return res
              .status(400)
              .json({ message: "This employee does not belong to the event's company." });
          }

          resolvedEmployeeId = employee._id;
        }

        if (targetType === "team") {
          if (!Array.isArray(participants) || participants.length === 0) {
            return res
              .status(400)
              .json({ message: "At least one participant is required for a team event." });
          }

          const invalidIds = participants.filter((id) => !isValidObjectId(id));

          if (invalidIds.length > 0) {
            return res.status(400).json({ message: "One or more participant IDs are invalid." });
          }

          const foundEmployees = await Employee.find({
            _id: { $in: participants },
            companyId,
          }).select("_id");

          if (foundEmployees.length !== participants.length) {
            return res.status(400).json({
              message:
                "One or more selected employees were not found or do not belong to this company.",
            });
          }

          resolvedParticipants = foundEmployees.map((e) => e._id);
        }

        if (targetType === "company") {
          const allEmployees = await Employee.find({ companyId }).select("_id");

          if (allEmployees.length === 0) {
            return res
              .status(400)
              .json({ message: "This company has no employees to invite." });
          }

          resolvedParticipants = allEmployees.map((e) => e._id);
        }

        event.targetType = targetType;
        event.employeeId = resolvedEmployeeId;
        event.participants = resolvedParticipants;
      }

      await event.save();

      return res.status(200).json({
        message: "Event updated successfully.",
        event,
      });
    } catch (error) {
      console.error("updateEvent error:", error);
      return res
        .status(500)
        .json({ message: "Something went wrong while updating the event." });
    }
  }
);

app.get("/api/events/attending", authMiddleware, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const employee = await Employee.findOne({ userId: req.user.userId }).select("_id");

    if (!employee) {
      return res.status(404).json({ message: "No employee profile found for this user." });
    }

    const events = await Event.find({
      $or: [
        { employeeId: employee._id },
        { participants: employee._id },
      ],
    })
      .sort({ startDate: -1 })
      .populate("companyId", "name")
      .populate({
        path: "employeeId",
        select: "position department userId",
        populate: { path: "userId", select: "name" },
      })
      .populate({
        path: "participants",
        select: "position department userId",
        populate: { path: "userId", select: "name" },
      });

    return res.status(200).json({
      message: "Events fetched successfully.",
      events,
    });
  } catch (error) {
    console.error("getEventsAttending error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong while fetching events." });
  }
});
// delet event 
app.delete(
  "/api/events/:eventId",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    try {
      const { eventId } = req.params;

      if (!eventId || !isValidObjectId(eventId)) {
        return res.status(400).json({ status :false ,message: "A valid eventId is required." });
      }

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ status :false ,message: "Event not found." });
      }

      const { companyId } = req.body;

      if (companyId) {
        if (!isValidObjectId(companyId)) {
          return res.status(400).json({ status :false,message: "A valid companyId is required." });
        }

        if (String(event.companyId) !== String(companyId)) {
          return res
            .status(400)
            .json({status:false ,  message: "This event does not belong to the selected company." });
        }
      }

      await Event.deleteOne({ _id: eventId });

      return res.status(200).json({status:true , 
        message: "Event deleted successfully.",
      });
    } catch (error) {
      console.error("deleteEvent error:", error);
      return res.status(500).json({ message: "Something went wrong while deleting the event." });
    }
  }
);
// get all employees belonging to the logged-in owner, across all their companies
app.get(
  "/api/employees",
  authMiddleware,
  ownerOnly,
  async (req, res) => {
    try {
      // Find every company this owner has
      const companies = await Company.find({
        ownerId: req.user.userId,
      }).select("_id name");

      if (companies.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          employees: [],
        });
      }

      const companyIds = companies.map((c) => c._id);

      const employees = await Employee.find({
        companyId: { $in: companyIds },
      })
        .populate("userId", "name email role isActive")
        .populate("companyId", "name")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: employees.length,
        employees,
      });
    } catch (error) {
      console.error("getAllOwnerEmployees error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});