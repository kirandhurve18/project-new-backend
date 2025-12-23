const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const roleModel = require("../models/role.model");
const menuModel = require("../models/menu.model");
const employeeModel = require("../models/employee.model");
const { UnauthenticatedError, NoRecordFoundError, UnauthorisedError } = require("../lib/error");



const protect = asyncHandler(async (req, res, next) => {
  let token;

  // console.log("token --> ",  req?.headers?.authorization)
  // return next();
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 1️⃣ Extract token
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        throw new UnauthenticatedError("Authentication token missing");
      }

      // 2️⃣ Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.log("error ---> ", err)
        throw new UnauthenticatedError("Invalid or expired token");
      }

      // 3️⃣ Find user
      const user = await employeeModel.findById(decoded.userId);
      if (!user) {
        throw new NoRecordFoundError("User not found");
      }

      // Attach user to request
      req.user = user;

      // 4️⃣ Find role
      const userRole = await roleModel.findById(user.role_id);
      if (!userRole) {
        throw new UnauthorisedError("Role not found or invalid");
      }

      // Attach role slug
      req.user.role_slug = userRole.role_slug;

      next();
    } catch (error) {
      next(error); // ✅ Forward to global error handler
    }
  } else {
    throw new UnauthenticatedError("Authorization token missing");
  }
});

// Middleware to check role access
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.role_slug) {
        return res.status(403).json({
          success: false,
          message: "Access denied, role not found",
        });
      }

      if (!allowedRoles.includes(req.role_slug)) {
        return res.status(403).json({
          success: false,
          message: "Access denied, insufficient permissions",
        });
      }

      next();
    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error during authorization",
      });
    }
  };
};

/**
 * Middleware to check if logged-in user has required permissions
 * across one or more menus.
 * 
 * @param {Array<{menuKey: string, actions: string[]}>} requiredPermissions
 *   Example:
 *   [
 *     { menuKey: "employee", actions: ["read"] },
 *     { menuKey: "employee", actions: ["read", "write", "create"] }
 *   ]
 */
const authorizePermission = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      if (!req.role_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied: No role found on request",
        });
      }

      // Load role with permissions
      const role = await roleModel.findById(req.role_id);
      if (!role) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Role not found",
        });
      }

      for (const reqPerm of requiredPermissions) {
        const menu = await menuModel.findOne({
          key: reqPerm.menuKey,
          is_active: true,
        });

        if (!menu) {
          return res.status(403).json({
            success: false,
            message: `Access denied: Menu '${reqPerm.menuKey}' not found or inactive`,
          });
        }

        const menuPermission = role.permissions.find(
          (perm) => perm.menu.toString() === menu._id.toString()
        );

        if (!menuPermission) {
          return res.status(403).json({
            success: false,
            message: `Access denied: No permissions set for '${reqPerm.menuKey}'`,
          });
        }

        // ✅ check if role has at least one matching action
        const hasPermission = reqPerm.actions.some((action) =>
          menuPermission.actions.includes(action)
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Access denied: Requires one of [${reqPerm.actions.join(
              ", "
            )}] on '${reqPerm.menuKey}'`,
          });
        }
      }

      // ✅ if all checks passed
      next();
    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error during authorization",
      });
    }
  };
};


module.exports = {
  protect,
  authorize,
  authorizePermission,
};
