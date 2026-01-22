const ApiError = require("../utils/ApiError");
const db = require("../models");
const { createTaskSchema, updateTaskStatusSchema } = require("../validators/task.validator");

// ✅ Manager creates task under their project
exports.createTask = async (req, res, next) => {
  try {
    const { error } = createTaskSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    const { projectId } = req.params;
    const { title, description, assignedTo, estimatedHours, dueDate } = req.body;

    const project = await db.Project.findByPk(projectId);
    if (!project) throw new ApiError(404, "Project not found");

    // ✅ Only manager of this project can create tasks
    if (req.user.role === "MANAGER" && project.manager_id !== req.user.id) {
      throw new ApiError(403, "You are not assigned manager of this project");
    }

    if (!project.is_active || project.status === "COMPLETED") {
      throw new ApiError(400, "Project is not active");
    }

    const employee = await db.User.findByPk(assignedTo);
    if (!employee) throw new ApiError(404, "Employee not found");
    if (employee.role !== "EMPLOYEE") throw new ApiError(400, "assignedTo must be an EMPLOYEE");
    if (!employee.is_active) throw new ApiError(400, "Employee is inactive");

    const task = await db.Task.create({
      project_id: project.id,
      title,
      description,
      assigned_to: assignedTo,
      estimated_hours: estimatedHours,
      status: "TODO",
      due_date: dueDate || null,
      is_active: true,
      created_by: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task,
    });
  } catch (err) {
    next(err);
  }
};
exports.completeTask = async (req, res, next) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params; // taskId

    // ✅ Lock task row safely (no include)
    const task = await db.Task.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!task) throw new ApiError(404, "Task not found");

    // ✅ Fetch project separately
    const project = await db.Project.findByPk(task.project_id, { transaction: t });
    if (!project) throw new ApiError(404, "Project not found");

    // ✅ Permission
    if (req.user.role === "EMPLOYEE" && task.assigned_to !== req.user.id) {
      throw new ApiError(403, "You can complete only your assigned task");
    }

    if (req.user.role === "MANAGER" && project.manager_id !== req.user.id) {
      throw new ApiError(403, "You can complete tasks only in your projects");
    }

    if (task.status === "COMPLETED") {
      throw new ApiError(400, "Task already completed");
    }

    // ✅ If employee is completing, auto push running session for THIS task
    if (req.user.role === "EMPLOYEE") {
      const running = await db.Timesheet.findOne({
        where: {
          employee_id: req.user.id,
          task_id: task.id,
          is_running: true,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (running) {
        const now = new Date();
        const minutes = Math.max(0, Math.round((now - new Date(running.start_time)) / 60000));
        const hours = Number((minutes / 60).toFixed(2));

        running.end_time = now;
        running.duration_minutes = minutes;
        running.hours_logged = hours;
        running.is_running = false;

        await running.save({ transaction: t });
      }
    }

    const oldStatus = task.status;

    // ✅ Mark task completed
    task.status = "COMPLETED";
    await task.save({ transaction: t });

    // ✅ History
    await db.TaskStatusHistory.create(
      {
        task_id: task.id,
        old_status: oldStatus,
        new_status: "COMPLETED",
        changed_by: req.user.id,
      },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      success: true,
      message: "Task completed successfully",
      task,
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};


// ✅ Admin all tasks | Manager tasks under their projects | Employee own tasks
const { getPagination } = require("../utils/pagination");

exports.getTasks = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);

    let where = {};
    let include = [
      { model: db.Project, as: "project", attributes: ["id", "name", "manager_id"] },
      { model: db.User, as: "assignee", attributes: ["id", "name", "email"] },
    ];

    if (req.user.role === "EMPLOYEE") {
      where.assigned_to = req.user.id;
    }

    if (req.user.role === "MANAGER") {
      include[0].where = { manager_id: req.user.id };
      include[0].required = true;
    }

    const { rows: tasks, count } = await db.Task.findAndCountAll({
      where,
      include,
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
      tasks,
    });
  } catch (err) {
    next(err);
  }
};


// ✅ update task status with validation (Manager or assigned Employee)
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { error } = updateTaskStatusSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    const { id } = req.params;
    const { status } = req.body;

    const task = await db.Task.findByPk(id, {
      include: [{ model: db.Project, as: "project" }],
    });

    if (!task) throw new ApiError(404, "Task not found");

    // ✅ Permission checks
    if (req.user.role === "EMPLOYEE" && task.assigned_to !== req.user.id) {
      throw new ApiError(403, "You can update only your assigned tasks");
    }

    if (req.user.role === "MANAGER" && task.project.manager_id !== req.user.id) {
      throw new ApiError(403, "You can update tasks only in your projects");
    }

    // ✅ Status transition validation
    const current = task.status;

    const allowedTransitions = {
      TODO: ["IN_PROGRESS"],
      IN_PROGRESS: ["COMPLETED"],
      COMPLETED: [],
    };

    if (!allowedTransitions[current].includes(status) && current !== status) {
      throw new ApiError(
        400,
        `Invalid status transition from ${current} to ${status}`
      );
    }

    task.status = status;
    await task.save();

    // optional: insert into history table
    await db.TaskStatusHistory.create({
      task_id: task.id,
      old_status: current,
      new_status: status,
      changed_by: req.user.id,
    });

    res.json({
      success: true,
      message: "Task status updated successfully",
      task,
    });
  } catch (err) {
    next(err);
  }
};
exports.reassignTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const task = await db.Task.findByPk(id, {
      include: [{ model: db.Project, as: "project" }],
    });

    if (!task) throw new ApiError(404, "Task not found");
    const running = await db.Timesheet.findOne({
  where: {
    task_id: task.id,
    is_running: true,
  },
});

if (running) {
  throw new ApiError(400, "Task is currently running. Please push/stop the task first.");
}


    // ✅ Only manager of project OR admin can reassign
    if (req.user.role === "MANAGER" && task.project.manager_id !== req.user.id) {
      throw new ApiError(403, "You can reassign only tasks in your projects");
    }

    const employee = await db.User.findByPk(assignedTo);
    if (!employee) throw new ApiError(404, "Employee not found");
    if (employee.role !== "EMPLOYEE") throw new ApiError(400, "assignedTo must be EMPLOYEE");
    if (!employee.is_active) throw new ApiError(400, "Employee is inactive");

    task.assigned_to = assignedTo;

    // optional: reopen if already completed
    if (task.status === "COMPLETED") {
      task.status = "IN_PROGRESS";
    }

    await task.save();

    res.json({
      success: true,
      message: "Task reassigned successfully",
      task,
    });
  } catch (err) {
    next(err);
  }
};

exports.reopenTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const task = await db.Task.findByPk(id, {
      include: [{ model: db.Project, as: "project" }],
    });

    if (!task) throw new ApiError(404, "Task not found");

    if (req.user.role === "MANAGER" && task.project.manager_id !== req.user.id) {
      throw new ApiError(403, "You can reopen only tasks in your projects");
    }

    if (task.status !== "COMPLETED") {
      throw new ApiError(400, "Only COMPLETED tasks can be reopened");
    }

    if (!["TODO", "IN_PROGRESS"].includes(status)) {
      throw new ApiError(400, "status must be TODO or IN_PROGRESS");
    }

    const oldStatus = task.status;
    task.status = status;
    await task.save();

    await db.TaskStatusHistory.create({
      task_id: task.id,
      old_status: oldStatus,
      new_status: status,
      changed_by: req.user.id,
    });

    res.json({
      success: true,
      message: "Task reopened successfully",
      task,
    });
  } catch (err) {
    next(err);
  }
};

exports.getManagerTasks = async (req, res, next) => {
  try {
    if (req.user.role !== "MANAGER") throw new ApiError(403, "Only manager can access");

    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);

    const { rows: tasks, count } = await db.Task.findAndCountAll({
      include: [
        {
          model: db.Project,
          as: "project",
          where: { manager_id: req.user.id },
          attributes: ["id", "name", "status"],
          required: true,
        },
        {
          model: db.User,
          as: "assignee",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    return res.json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
      },
      tasks,
    });
  } catch (err) {
    next(err);
  }
};
