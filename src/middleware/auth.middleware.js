const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const db = require("../models");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Authorization token missing");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await db.User.findByPk(decoded.id);
    if (!user) throw new ApiError(401, "User not found");

    if (!user.is_active) {
      throw new ApiError(403, "User is inactive. Access denied.");
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (error) {
    next(error);
  }
};
