const ApiError = require("../utils/ApiError");

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Access denied: insufficient permissions"));
    }

    next();
  };
};

module.exports = authorizeRoles;
