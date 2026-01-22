const ApiError = require("../utils/ApiError");
const db = require("../models");
const {
  createProjectSchema,
  assignManagerSchema,
  updateProjectStatusSchema,
} = require("../validators/project.validator");

// ✅ Admin creates project
exports.createProject = async (req, res, next) => {
  try {
    const { error } = createProjectSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    const { name, description, managerId, budget, startDate, endDate } = req.body;

    // if managerId provided -> validate manager exists
    if (managerId) {
      const manager = await db.User.findByPk(managerId);
      if (!manager) throw new ApiError(404, "Manager not found");
      if (manager.role !== "MANAGER") throw new ApiError(400, "managerId must be a MANAGER");
      if (!manager.is_active) throw new ApiError(400, "Manager is inactive");
    }

    const project = await db.Project.create({
      name,
      description,
      manager_id: managerId || null,
      budget,
      status: "ONGOING",
      start_date: startDate,
      end_date: endDate || null,
      is_active: true,
      created_by: req.user.id, // admin from token
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Admin sees all projects | Manager sees only assigned projects
const { getPagination } = require("../utils/pagination");

exports.getProjects = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);

    let where = {};

    if (req.user.role === "MANAGER") {
      where.manager_id = req.user.id;
    }

    const { rows: projects, count } = await db.Project.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: "manager",
          attributes: ["id", "name", "email"],
        },
      ],
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
      projects,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Admin assigns manager to project
exports.assignManager = async (req, res, next) => {
  try {
    const { error } = assignManagerSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    const { id } = req.params;
    const { managerId } = req.body;

    const project = await db.Project.findByPk(id);
    if (!project) throw new ApiError(404, "Project not found");

    const manager = await db.User.findByPk(managerId);
    if (!manager) throw new ApiError(404, "Manager not found");

    if (manager.role !== "MANAGER") {
      throw new ApiError(400, "Only MANAGER role can be assigned");
    }
    if (!manager.is_active) {
      throw new ApiError(400, "Manager is inactive");
    }

    project.manager_id = managerId;
    await project.save();

    res.json({
      success: true,
      message: "Manager assigned successfully",
      project,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Admin updates project status
exports.updateProjectStatus = async (req, res, next) => {
  try {
    const { error } = updateProjectStatusSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    const { id } = req.params;
    const { status } = req.body;

    const project = await db.Project.findByPk(id);
    if (!project) throw new ApiError(404, "Project not found");

    project.status = status;
    if (status === "COMPLETED") {
      project.is_active = false; // recommended
    }

    await project.save();

    res.json({
      success: true,
      message: "Project status updated",
      project,
    });
  } catch (err) {
    next(err);
  }
};
