const bcrypt = require("bcrypt");
const ApiError = require("../utils/ApiError");
const db = require("../models");
const {
  createUserSchema,
  updateActiveSchema,
  updateHourlyRateSchema,
} = require("../validators/user.validator");
const { QueryTypes } = require("sequelize");

// ✅ Admin creates Manager/Employee
exports.createUser = async (req, res, next) => {
  try {
    const { error } = createUserSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    const { name, email, password, role } = req.body;

    // email unique check
    const existing = await db.User.findOne({ where: { email } });
    if (existing) throw new ApiError(409, "Email already exists");

    const password_hash = await bcrypt.hash(password, 10);

    const user = await db.User.create({
      name,
      email,
      password_hash,
      role,
      is_active: true,
      hourly_rate: 0, // admin can set later
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ✅ List users (Admin only)
const { getPagination } = require("../utils/pagination");

exports.getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);

    const { rows: users, count } = await db.User.findAndCountAll({
      attributes: ["id", "name", "email", "role", "hourly_rate", "is_active", "created_at"],
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
      },
      users,
    });
  } catch (err) {
    next(err);
  }
};


// ✅ Activate / deactivate user
exports.updateUserActiveStatus = async (req, res, next) => {
  try {
    const { error } = updateActiveSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    const { id } = req.params;
    const { isActive } = req.body;

    const user = await db.User.findByPk(id);
    if (!user) throw new ApiError(404, "User not found");

    // Prevent disabling admin for safety
    if (user.role === "ADMIN" && isActive === false) {
      throw new ApiError(403, "Cannot deactivate ADMIN user");
    }

    user.is_active = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Assign hourly rate (Admin only)
exports.updateHourlyRate = async (req, res, next) => {
  try {
    const { error } = updateHourlyRateSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    const { id } = req.params;
    const { hourlyRate } = req.body;

    const user = await db.User.findByPk(id);
    if (!user) throw new ApiError(404, "User not found");

    if (user.role !== "EMPLOYEE") {
      throw new ApiError(400, "Hourly rate can be assigned only to EMPLOYEE");
    }

    user.hourly_rate = hourlyRate;
    await user.save();

    res.json({
      success: true,
      message: "Hourly rate updated successfully",
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        hourly_rate: user.hourly_rate,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) throw new ApiError(400, "role is required");

    const allowedRoles = ["EMPLOYEE", "MANAGER"];
    if (!allowedRoles.includes(role)) {
      throw new ApiError(400, "role must be EMPLOYEE or MANAGER");
    }

    const user = await db.User.findByPk(id);
    if (!user) throw new ApiError(404, "User not found");

    if (user.role === "ADMIN") {
      throw new ApiError(403, "Cannot change ADMIN role");
    }

    // ✅ Demotion validation: MANAGER -> EMPLOYEE only if no projects assigned
    if (user.role === "MANAGER" && role === "EMPLOYEE") {
      const projectCount = await db.Project.count({
        where: { manager_id: user.id },
      });

      if (projectCount > 0) {
        throw new ApiError(
          400,
          "Manager has assigned projects. Reassign the projects first."
        );
      }
    }

    // ✅ Promotion validation: EMPLOYEE -> MANAGER only if active
    if (user.role === "EMPLOYEE" && role === "MANAGER") {
      if (!user.is_active) {
        throw new ApiError(400, "Inactive user cannot be promoted to Manager");
      }
    }

    user.role = role;
    await user.save();

    return res.json({
      success: true,
      message: `User role updated to ${role}`,
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

exports.getEmployeesUnderManager = async (req, res, next) => {
  try {
    if (req.user.role !== "MANAGER") {
      throw new ApiError(403, "Only manager can access this API");
    }

    const rows = await db.sequelize.query(
      `
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.is_active
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN users u ON u.id = t.assigned_to
      WHERE p.manager_id = :managerId
        AND u.role = 'EMPLOYEE'
      ORDER BY u.id DESC;
      `,
      {
        replacements: { managerId: req.user.id },
        type: QueryTypes.SELECT,
      }
    );

    return res.json({
      success: true,
      managerId: req.user.id,
      employees: rows,
    });
  } catch (err) {
    next(err);
  }
};
