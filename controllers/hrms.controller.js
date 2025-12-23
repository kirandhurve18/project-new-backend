const hrmsService = require("../services/hrms.service");
const moment = require("moment-timezone");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

// const  = require("../lib/error/bad-request-parameter-error");
const {
  BadRequestParameterError,
  NoRecordFoundError,
} = require("../lib/error/index");

const { getFileFromS3 } = require("../config/aws");
const festivalLeaveModel = require("../models/festivalLeave.model");
const designationModel = require("../models/designation.model");
const { default: slugify } = require("slugify");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate inputs
    if (!email) {
      throw new BadRequestParameterError("Email is required");
    }

    if (!password) {
      throw new BadRequestParameterError("Password is required");
    }

    // 2️⃣ Find employee by email
    const user = await hrmsService.findOneEmployee({ company_email: email });
    if (!user) {
      throw new NoRecordFoundError("No account found with this email");
    }

    // 3️⃣ Validate password
    if (user.password !== password) {
      throw new BadRequestParameterError("Invalid email or password");
    }

    // 4️⃣ Check if account is active
    if (!user.is_active) {
      throw new NoRecordFoundError(
        "Your account is inactive. Please contact the administrator."
      );
    }

    // 5️⃣ Fetch role
    const userRole = await hrmsService.findOneRole({ _id: user.role_id });

    const userDesignation = await designationModel.findById(
      user.designation_id
    );

    // 6️⃣ Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.company_email,
        role_id: userRole?._id,
      },
      process.env.JWT_SECRET || "hrms@vibhu",
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 7️⃣ Success response
    res.status(200).json({
      success: true,
      message: "Login Successful",
      data: {
        _id: user._id,
        full_name: `${user.first_name} ${user.last_name}`,
        email: user.company_email,
        token,
        role: userRole?.role_slug,
        role_id: userRole?._id,
        is_team_lead: user.is_team_lead,
        is_team_manager: user.is_team_manager,
        is_super_admin: user.is_super_admin,
        work_mode: user.work_mode,
        designation_name: userDesignation?.designation_name,
      },
    });
  } catch (error) {
    next(error); // ✅ always forward to global error handler
  }
}

async function logout(req, res) {
  try {
    res.status(200).json({
      success: true,
      message: "logout successful",
    });
  } catch (error) {
    console.error("logout error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

async function festivaLeaves(req, res) {
  try {
    const search = req.query?.search || "";
    const page = parseInt(req.query?.page) || 1;
    const limit = parseInt(req.query?.limit) || 10;
    const skip = (page - 1) * limit;

    // 1️⃣ Build search query
    const query = {};
    if (search) {
      query.$or = [
        { festival_name: { $regex: search, $options: "i" } }, // case-insensitive
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 2️⃣ Fetch data with pagination and search
    const festivaLeavesResult = await festivalLeaveModel
      .find(query, { createdAt: 0, updatedAt: 0, __v: 0 })
      .sort({ festival_date: 1 })
      .skip(skip)   // ✅ use number directly
      .limit(limit) // ✅ use number directly
      .lean();

    // 3️⃣ Format dates
    const formatted = festivaLeavesResult.map((leave) => ({
      ...leave,
      festival_id: leave._id,
      festival_weekday: moment(leave.festival_date)
        .tz("Asia/Kolkata")
        .format("dddd"),
      festival_date: moment(leave.festival_date)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD"),
    }));

    // 4️⃣ Response
    res.status(200).json({
      success: true,
      message: "Festival leaves fetched successfully!",
      data: formatted,
      page,
      limit,
      total: await festivalLeaveModel.countDocuments(query),
    });
  } catch (error) {
    console.error("festivaLeaves error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

async function getFestivaLeaveById(req, res) {
  try {
    const festival_id = req.params.festival_id;

    console.log("festival_id --->", festival_id);
    const festivaLeave = await festivalLeaveModel
      .findById(festival_id, { createdAt: 0, updatedAt: 0, __v: 0 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Festival leave fetched successfully..!",
      data: festivaLeave,
    });
  } catch (error) {
    console.error("logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

async function addFestivalLeaves(req, res) {
  try {
    const festivalLeaves = req.body.festivalLeaves;

    if (
      !festivalLeaves ||
      !Array.isArray(festivalLeaves) ||
      festivalLeaves.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please add at least one festival leave",
      });
    }

    let inserted = [];
    let duplicates = [];

    try {
      inserted = await festivalLeaveModel.insertMany(festivalLeaves, {
        ordered: false,
      });
    } catch (err) {
      if (err.name === "BulkWriteError" || err.code === 11000) {
        // Extract duplicate errors
        duplicates = festivalLeaves.filter((leave) =>
          err.message.includes(leave.festival)
        );
        // InsertMany still inserts non-duplicate docs even if error thrown
        inserted = err.insertedDocs || inserted;
      } else {
        throw err; // rethrow other errors
      }
    }

    return res.status(200).json({
      success: true,
      message: "Festival leaves processed",
      insertedCount: inserted.length,
      duplicateCount: duplicates.length,
      duplicates: duplicates.map((d) => d.festival),
    });
  } catch (error) {
    console.error("❌ Error adding festival leaves:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

async function addFestivalLeave(req, res) {
  try {
    const { festival_name, festival_date } = req.body;

    if (!festival_name || !festival_date) {
      return res.status(400).json({
        success: false,
        message: "Festival, festival_date are required",
      });
    }

    // Generate slug from role_name
    const festival_slug = slugify(festival_name, { lower: true, strict: true });

    try {
      const newLeave = await festivalLeaveModel.create({
        festival_name,
        festival_date,
        festival_slug,
      });

      return res.status(201).json({
        success: true,
        message: "Festival leave added successfully!",
        festival_id: newLeave._id,
      });
    } catch (err) {
      if (err.code === 11000) {
        // duplicate key error from Mongo
        return res.status(400).json({
          success: false,
          message: "Festival leave already exists (duplicate slug)",
        });
      }
      throw err;
    }
  } catch (error) {
    console.error("❌ Error adding festival leave:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

async function updateFestivalLeave(req, res) {
  try {
    const { festival_id, festival_name, festival_date, is_every_year } =
      req.body;

    if (!festival_id) {
      return res.status(400).json({
        success: false,
        message: "Please Provide Festival Id",
      });
    }

    const updatedFestival = await festivalLeaveModel.findByIdAndUpdate(
      festival_id,
      {
        festival_name,
        festival_date,
        is_every_year,
      }
    );

    res.status(200).json({
      success: true,
      message: "Festival Updated",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
}

async function addMenus(req, res) {
  try {
    const menus = req.body.menus;
    const result = await hrmsService.insertMenus(menus);

    return res.status(200).json({
      success: true,
      data: result,
      message: "All Menus Added successfully..!",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

async function getMenus(req, res) {
  try {
    // const category = req.body.category;
    const query = {
      // category: category
      is_active: true,
    };
    const result = await hrmsService.getMenus(query);

    return res.status(200).json({
      success: true,
      message: "All Menus Added successfully..!",
      data: result,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
}

// Download
async function getDocumentsFromS3(req, res) {
  try {
    // req.params[0] will contain everything after /file/
    // const key = req.params[0];
    const key = req.query.key;

    const fileStream = await getFileFromS3(key);
    if (!fileStream) {
      return res.status(404).json({ message: "File not found" });
    }

    fileStream.pipe(res);
  } catch (err) {
    console.error("Error fetching file:", err);
    res.status(500).json({ message: "Error retrieving file" });
  }
}

async function getDocumentFromServerDownload(req, res) {
  try {
    // Expect query param ?file=filename.pdf
    const fileName = req.query.key;
    if (!fileName) {
      return res.status(400).json({ message: "File name is required" });
    }

    // Construct absolute file path
    const filePath = path.join(__dirname, "..", fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    // Set headers (so browser downloads instead of just showing)
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ message: "Error downloading file" });
      }
    });
  } catch (err) {
    console.error("Error fetching local file:", err);
    res.status(500).json({ message: "Error retrieving file" });
  }
}

async function getDocumentFromServerPreview(req, res) {
  try {
    const fileName = req.query.key;
    if (!fileName) {
      return res.status(400).json({ message: "File name is required" });
    }

    // Build absolute path
    const filePath = path.join(__dirname, "..", fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    // Detect MIME type based on extension
    const ext = path.extname(fileName).toLowerCase();
    let contentType = "application/octet-stream";

    if (ext === ".pdf") contentType = "application/pdf";
    else if ([".jpg", ".jpeg"].includes(ext)) contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".txt") contentType = "text/plain";

    res.setHeader("Content-Type", contentType);

    // Create readable stream and pipe to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on("error", (err) => {
      console.error("Stream error:", err);
      res.status(500).json({ message: "Error reading file" });
    });
  } catch (err) {
    console.error("Error previewing file:", err);
    res.status(500).json({ message: "Error retrieving file" });
  }
}

// Export at the bottom
module.exports = {
  login,
  logout,
  festivaLeaves,
  addMenus,
  getMenus,
  addFestivalLeaves,
  addFestivalLeave,
  getDocumentsFromS3,
  getDocumentFromServerDownload,
  getDocumentFromServerPreview,
  getFestivaLeaveById,
  updateFestivalLeave,
};
