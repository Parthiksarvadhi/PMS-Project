const ApiError = require("../utils/ApiError");

module.exports = (err, req, res, next) => {
  console.error("ERROR:", err);

  // Custom API error
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Sequelize validation
  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({
      success: false,
      message: err.errors?.[0]?.message || "Validation error",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // Default
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};
