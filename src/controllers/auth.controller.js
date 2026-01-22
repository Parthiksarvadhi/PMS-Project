const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const db = require("../models");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new ApiError(400, "Email and password are required");

    const user = await db.User.findOne({ where: { email } });
    if (!user) throw new ApiError(401, "Invalid email or password");

    if (!user.is_active) throw new ApiError(403, "User is inactive");

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new ApiError(401, "Invalid email or password");

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};


// ✅ NEW: Bootstrap Admin (one-time setup)
exports.bootstrapAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, "name, email and password are required");
    }

    // ✅ Check if any ADMIN already exists
    const adminExists = await db.User.findOne({ where: { role: "ADMIN" } });
    if (adminExists) {
      throw new ApiError(403, "Admin already exists. Bootstrap API disabled.");
    }

    // check email unique
    const emailExists = await db.User.findOne({ where: { email } });
    if (emailExists) throw new ApiError(409, "Email already exists");

    const password_hash = await bcrypt.hash(password, 10);

    const admin = await db.User.create({
      name,
      email,
      password_hash,
      role: "ADMIN",
      is_active: true,
      hourly_rate: 0,
    });

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    next(err);
  }
};
