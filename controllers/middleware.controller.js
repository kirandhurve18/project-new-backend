const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const roleModel = require("../models/role.model");
const employeeModel = require("../models/employee.model");

// Middleware to protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let _id = decoded.userId;
      // const query = {
      // };

      const user = await employeeModel.findById(_id);
      // Check if user was found
      if (user.length === 0) {
        return res
          .status(401)
          .json({ message: "Not authorized, User Not Found!", success: false });
      }

      req.user = user._id; // Set user on request object for access in routes
      let role_id = user.role_id;

      const userRole = await roleModel.findById(role_id);
      req.role_slug = userRole.role_slug;
      req.role_id = userRole._id;
      next();
    } catch (error) {
        console.error(error);
      return res
        .status(401)
        .json({ message: "Not authorized, token failed", success: false });
    }
  } else {
    return res
      .status(401)
      .json({ message: "Not authorized, No Token Provided", success: false });
  }
});

const checkSuperAdminAccess = asyncHandler(async (req, res, next) => {
  try {
    const role = req.role?.toLowerCase(); // normalize to lowercase

    if (role && (role.startsWith("admin") || role.endsWith("admin"))) {
      return next();
    }

    return res.status(403).json({
      message: "You don't have permission to access this resource!",
      success: false,
    });
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized access!",
      success: false,
    });
  }
});

const checkAdminAccess = asyncHandler(async (req, res, next) => {
  try {
    const role = req.role;
    if (role == "Admin" || role == "Super_Admin") {
      next();
    } else {
      return res.status(200).json({
        message: "You Don't have a Permission To Access This...!",
        success: false,
      });
    }
  } catch (error) {
    //   console.error(error);
    return res
      .status(401)
      .json({
        message: "You Don't have a Permission To Access This...!",
        success: false,
      });
  }
});

const checkUserAccess = asyncHandler(async (req, res, next) => {
  try {
    const role = req.role;
    if (role == "admin" || role == "super-admin" || role == "employee") {
      next();
    } else {
      return res.status(200).json({
        message: "You Don't have a Permission To Access This...!",
        success: false,
      });
    }
  } catch (error) {
    //   console.error(error);
    return res
      .status(401)
      .json({
        message: "You Don't have a Permission To Access This...!",
        success: false,
      });
  }
});

module.exports = {
  protect,
  checkSuperAdminAccess,
  checkAdminAccess,
  checkUserAccess,
};
