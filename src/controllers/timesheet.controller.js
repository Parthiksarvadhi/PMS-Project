const ApiError = require("../utils/ApiError");
const db = require("../models");
const {
  startTaskSchema,
  pushTaskSchema,
  switchTaskSchema,
} = require("../validators/timesheet.validator");

// helper: compute minutes
const diffMinutes = (start, end) => Math.max(0, Math.round((end - start) / 60000));

/**
 * ✅ Start Task
 * Employee starts a task -> creates running timesheet entry
 */
exports.startTask = async (req, res, next) => {
  try {
    const { error } = startTaskSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    if (req.user.role !== "EMPLOYEE") {
      throw new ApiError(403, "Only employee can start task");
    }

    const { taskId, remarks } = req.body;

    // check running already
    const running = await db.Timesheet.findOne({
      where: { employee_id: req.user.id, is_running: true },
    });
    

    if (running) throw new ApiError(400, "You already have a running task. Push it first.");

    // validate task exists
    const task = await db.Task.findByPk(taskId, {
      include: [{ model: db.Project, as: "project" }],
    });
    if (!task) throw new ApiError(404, "Task not found");
if (task.status === "COMPLETED") {
  throw new ApiError(400, "Task is already completed. You cannot work on it.");
}
    // validate assigned task
    if (task.assigned_to !== req.user.id) {
      throw new ApiError(403, "You can start only tasks assigned to you");
    }

    // validate project active
    if (!task.project?.is_active || task.project?.status === "COMPLETED") {
      throw new ApiError(400, "Project is not active");
    }

    const now = new Date();
    const workDate = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const entry = await db.Timesheet.create({
      employee_id: req.user.id,
      task_id: taskId,
      work_date: workDate,
      start_time: now,
      end_time: null,
      duration_minutes: 0,
      hours_logged: 0,
      remarks: remarks || null,
      is_running: true,
    });

    return res.status(201).json({
      success: true,
      message: "Task started",
      timesheet: entry,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ Push Task (Stop)
 * Stops current running task and calculates duration/hours
 */
exports.pushTask = async (req, res, next) => {
  try {
    const { error } = pushTaskSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    if (req.user.role !== "EMPLOYEE") {
      throw new ApiError(403, "Only employee can push task");
    }

    const { remarks } = req.body;

    const running = await db.Timesheet.findOne({
      where: { employee_id: req.user.id, is_running: true },
    });

    if (!running) throw new ApiError(400, "No running task found");

    const now = new Date();
    const minutes = diffMinutes(new Date(running.start_time), now);
    const hours = Number((minutes / 60).toFixed(2));

    running.end_time = now;
    running.duration_minutes = minutes;
    running.hours_logged = hours;
    running.is_running = false;
    if (remarks) running.remarks = remarks;

    await running.save();

    return res.json({
      success: true,
      message: "Task pushed (stopped)",
      timesheet: running,
    });
  } catch (err) {
    next(err);
  }
};
exports.completeTask = async (req, res, next) => {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;

    const task = await db.Task.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!task) throw new ApiError(404, "Task not found");

    const project = await db.Project.findByPk(task.project_id, { transaction: t });
    if (!project) throw new ApiError(404, "Project not found");

    if (req.user.role === "EMPLOYEE" && task.assigned_to !== req.user.id) {
      throw new ApiError(403, "You can complete only your assigned task");
    }

    if (req.user.role === "MANAGER" && project.manager_id !== req.user.id) {
      throw new ApiError(403, "You can complete tasks only in your projects");
    }

    if (task.status === "COMPLETED") {
      throw new ApiError(400, "Task already completed");
    }

    if (req.user.role === "EMPLOYEE") {
      const running = await db.Timesheet.findOne({
        where: { employee_id: req.user.id, task_id: task.id, is_running: true },
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

    task.status = "COMPLETED";
    await task.save({ transaction: t });

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



/**
 * ✅ Switch Task
 * Push current task + start new task in single request
 */
exports.switchTask = async (req, res, next) => {
  const t = await db.sequelize.transaction();
  try {
    const { error } = switchTaskSchema.validate(req.body);
    if (error) throw new ApiError(400, error.details[0].message);

    if (req.user.role !== "EMPLOYEE") {
      throw new ApiError(403, "Only employee can switch tasks");
    }

    const { newTaskId, remarks } = req.body;

    // push current
    const running = await db.Timesheet.findOne({
      where: { employee_id: req.user.id, is_running: true },
      transaction: t,
      lock: true,
    });

    if (running) {
      const now = new Date();
      const minutes = diffMinutes(new Date(running.start_time), now);
      const hours = Number((minutes / 60).toFixed(2));

      running.end_time = now;
      running.duration_minutes = minutes;
      running.hours_logged = hours;
      running.is_running = false;

      await running.save({ transaction: t });
    }

    // validate new task
    const task = await db.Task.findByPk(newTaskId, {
      include: [{ model: db.Project, as: "project" }],
      transaction: t,
    });

    if (!task) throw new ApiError(404, "New task not found");
    if (task.status === "COMPLETED") {
  throw new ApiError(400, "Task is already completed. You cannot work on it.");
}

    if (task.assigned_to !== req.user.id) throw new ApiError(403, "Task is not assigned to you");
    if (!task.project?.is_active || task.project?.status === "COMPLETED") {
      throw new ApiError(400, "Project is not active");
    }

    const now2 = new Date();
    const workDate = now2.toISOString().slice(0, 10);

    const newEntry = await db.Timesheet.create(
      {
        employee_id: req.user.id,
        task_id: newTaskId,
        work_date: workDate,
        start_time: now2,
        end_time: null,
        duration_minutes: 0,
        hours_logged: 0,
        remarks: remarks || null,
        is_running: true,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Task switched successfully",
      newTimesheet: newEntry,
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

/**
 * ✅ Get My Timesheets (Employee)
 */
const { getPagination } = require("../utils/pagination");

exports.getMyTimesheets = async (req, res, next) => {
  try {
    if (req.user.role !== "EMPLOYEE") {
      throw new ApiError(403, "Only employee can view own timesheets");
    }

    const { page, limit, offset } = getPagination(req.query.page, req.query.limit);

    const { rows: timesheets, count } = await db.Timesheet.findAndCountAll({
      where: { employee_id: req.user.id },
      include: [
        {
          model: db.Task,
          as: "task",
          attributes: ["id", "title", "project_id"],
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
      timesheets,
    });
  } catch (err) {
    next(err);
  }
};

const { QueryTypes } = require("sequelize");

exports.getMyTaskSummary = async (req, res, next) => {
  try {
    if (req.user.role !== "EMPLOYEE") {
      throw new ApiError(403, "Only employee can access this report");
    }

    const rows = await db.sequelize.query(
      `
      SELECT
        t.id AS task_id,
        t.title,
        t.status,
        t.estimated_hours,
        COALESCE(SUM(ts.hours_logged),0) AS actual_hours,
        (COALESCE(SUM(ts.hours_logged),0) - t.estimated_hours) AS variance_hours
      FROM tasks t
      LEFT JOIN timesheets ts
        ON ts.task_id = t.id
        AND ts.employee_id = :employeeId
      WHERE t.assigned_to = :employeeId
      GROUP BY t.id
      ORDER BY t.id DESC;
      `,
      {
        replacements: { employeeId: req.user.id },
        type: QueryTypes.SELECT,
      }
    );

    return res.json({
      success: true,
      employeeId: req.user.id,
      tasks: rows,
    });
  } catch (err) {
    next(err);
  }
};
