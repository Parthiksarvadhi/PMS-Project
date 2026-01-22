const ApiError = require("../utils/ApiError");
const db = require("../models");
const { QueryTypes } = require("sequelize");

/**
 * ✅ Helper: check manager owns project
 */
async function ensureManagerOwnsProject(managerId, projectId) {
  const project = await db.Project.findByPk(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (project.manager_id !== managerId) {
    throw new ApiError(403, "You can access reports only for your projects");
  }

  return project;
}

/**
 * ✅ 1) Project Cost Report
 * Calculates:
 * - total hours
 * - total cost (hours * employee hourly_rate)
 * - budget usage
 */
exports.projectCostReport = async (req, res, next) => {
  try {
    const projectId = Number(req.query.projectId);
    if (!projectId) throw new ApiError(400, "projectId is required");

    // RBAC
    if (req.user.role === "MANAGER") {
      await ensureManagerOwnsProject(req.user.id, projectId);
    }
    if (req.user.role === "EMPLOYEE") {
      throw new ApiError(403, "Employee cannot access project cost report");
    }

    // Report Query
    const rows = await db.sequelize.query(
      `
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        p.budget AS project_budget,
        COALESCE(SUM(ts.hours_logged), 0) AS total_hours,
        COALESCE(SUM(ts.hours_logged * u.hourly_rate), 0) AS total_cost,
        (p.budget - COALESCE(SUM(ts.hours_logged * u.hourly_rate), 0)) AS remaining_budget
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      LEFT JOIN timesheets ts ON ts.task_id = t.id
      LEFT JOIN users u ON u.id = ts.employee_id
      WHERE p.id = :projectId
      GROUP BY p.id;
      `,
      {
        replacements: { projectId },
        type: QueryTypes.SELECT,
      }
    );

    return res.json({ success: true, report: rows[0] || null });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 2) Employee Work Hour Report
 * Filters by:
 * - employeeId
 * - optional date range from/to
 */
exports.employeeHoursReport = async (req, res, next) => {
  try {
    const employeeId = Number(req.query.employeeId);
    const from = req.query.from || null;
    const to = req.query.to || null;

    if (!employeeId) throw new ApiError(400, "employeeId is required");

    // RBAC
    if (req.user.role === "EMPLOYEE" && req.user.id !== employeeId) {
      throw new ApiError(403, "Employee can view only own report");
    }

    // Manager report only for employees under their projects
    if (req.user.role === "MANAGER") {
      const check = await db.sequelize.query(
        `
        SELECT COUNT(*)::int AS count
        FROM timesheets ts
        JOIN tasks t ON t.id = ts.task_id
        JOIN projects p ON p.id = t.project_id
        WHERE p.manager_id = :managerId AND ts.employee_id = :employeeId
        `,
        {
          replacements: { managerId: req.user.id, employeeId },
          type: QueryTypes.SELECT,
        }
      );

      if (check[0].count === 0) {
        throw new ApiError(403, "You can view report only for your project employees");
      }
    }

    let dateFilter = "";
    const replacements = { employeeId };

    if (from) {
      dateFilter += " AND ts.work_date >= :from ";
      replacements.from = from;
    }
    if (to) {
      dateFilter += " AND ts.work_date <= :to ";
      replacements.to = to;
    }

    // report: daily hours and total
    const rows = await db.sequelize.query(
      `
      SELECT
        ts.work_date,
        COALESCE(SUM(ts.hours_logged),0) AS total_hours
      FROM timesheets ts
      WHERE ts.employee_id = :employeeId
      ${dateFilter}
      GROUP BY ts.work_date
      ORDER BY ts.work_date DESC;
      `,
      { replacements, type: QueryTypes.SELECT }
    );

    const totalRow = await db.sequelize.query(
      `
      SELECT COALESCE(SUM(ts.hours_logged),0) AS total_hours
      FROM timesheets ts
      WHERE ts.employee_id = :employeeId
      ${dateFilter};
      `,
      { replacements, type: QueryTypes.SELECT }
    );

    return res.json({
      success: true,
      employeeId,
      from,
      to,
      totalHours: totalRow[0]?.total_hours || 0,
      dailyBreakdown: rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 3) Task Completion Report (Task Summary)
 * projectId required
 * shows:
 * - estimated vs actual hours
 * - status
 */
exports.taskSummaryReport = async (req, res, next) => {
  try {
    const projectId = Number(req.query.projectId);
    if (!projectId) throw new ApiError(400, "projectId is required");

    // RBAC
    if (req.user.role === "MANAGER") {
      await ensureManagerOwnsProject(req.user.id, projectId);
    }
    if (req.user.role === "EMPLOYEE") {
      throw new ApiError(403, "Employee cannot access project task report");
    }

    const tasks = await db.sequelize.query(
      `
      SELECT
        t.id AS task_id,
        t.title,
        t.status,
        t.estimated_hours,
        COALESCE(SUM(ts.hours_logged),0) AS actual_hours,
        (COALESCE(SUM(ts.hours_logged),0) - t.estimated_hours) AS variance_hours,
        u.id AS employee_id,
        u.name AS employee_name
      FROM tasks t
      LEFT JOIN timesheets ts ON ts.task_id = t.id
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.project_id = :projectId
      GROUP BY t.id, u.id
      ORDER BY t.id DESC;
      `,
      { replacements: { projectId }, type: QueryTypes.SELECT }
    );

    return res.json({
      success: true,
      projectId,
      tasks,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ 4) Monthly Summary Report
 * Params: month=YYYY-MM
 * - Admin: all employees
 * - Manager: only for their projects
 * - Employee: only self
 */
exports.monthlySummaryReport = async (req, res, next) => {
  try {
    const month = req.query.month; // e.g. 2026-01
    if (!month) throw new ApiError(400, "month is required (YYYY-MM)");

    // Derive from/to
    const from = `${month}-01`;
    const to = `${month}-31`;

    // Admin report for all
    if (req.user.role === "ADMIN") {
      const rows = await db.sequelize.query(
        `
        SELECT
          u.id AS employee_id,
          u.name AS employee_name,
          COALESCE(SUM(ts.hours_logged),0) AS total_hours,
          COALESCE(SUM(ts.hours_logged * u.hourly_rate),0) AS total_cost
        FROM users u
        LEFT JOIN timesheets ts ON ts.employee_id = u.id
        WHERE u.role='EMPLOYEE'
          AND ts.work_date >= :from AND ts.work_date <= :to
        GROUP BY u.id
        ORDER BY total_hours DESC;
        `,
        { replacements: { from, to }, type: QueryTypes.SELECT }
      );

      return res.json({ success: true, month, summary: rows });
    }

    // Manager report only for their projects
    if (req.user.role === "MANAGER") {
      const rows = await db.sequelize.query(
        `
        SELECT
          u.id AS employee_id,
          u.name AS employee_name,
          COALESCE(SUM(ts.hours_logged),0) AS total_hours,
          COALESCE(SUM(ts.hours_logged * u.hourly_rate),0) AS total_cost
        FROM timesheets ts
        JOIN users u ON u.id = ts.employee_id
        JOIN tasks t ON t.id = ts.task_id
        JOIN projects p ON p.id = t.project_id
        WHERE p.manager_id = :managerId
          AND ts.work_date >= :from AND ts.work_date <= :to
        GROUP BY u.id
        ORDER BY total_hours DESC;
        `,
        { replacements: { from, to, managerId: req.user.id }, type: QueryTypes.SELECT }
      );

      return res.json({ success: true, month, summary: rows });
    }

    // Employee only self
    if (req.user.role === "EMPLOYEE") {
      const rows = await db.sequelize.query(
        `
        SELECT
          ts.work_date,
          COALESCE(SUM(ts.hours_logged),0) AS total_hours
        FROM timesheets ts
        WHERE ts.employee_id = :employeeId
          AND ts.work_date >= :from AND ts.work_date <= :to
        GROUP BY ts.work_date
        ORDER BY ts.work_date DESC;
        `,
        { replacements: { from, to, employeeId: req.user.id }, type: QueryTypes.SELECT }
      );

      return res.json({ success: true, month, employeeId: req.user.id, daily: rows });
    }

    throw new ApiError(403, "Invalid role");
  } catch (err) {
    next(err);
  }
};
