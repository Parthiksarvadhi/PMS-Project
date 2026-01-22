const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/rbac.middleware");
const reportController = require("../controllers/report.controller");

router.use(authMiddleware);

// ✅ Project cost report (Admin/Manager)
router.get(
  "/reports/project-cost",
  authorizeRoles("ADMIN", "MANAGER"),
  reportController.projectCostReport
);

// ✅ Employee hours report (Admin/Manager/Employee)
router.get(
  "/reports/employee-hours",
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  reportController.employeeHoursReport
);

// ✅ Task summary report (Admin/Manager)
router.get(
  "/reports/task-summary",
  authorizeRoles("ADMIN", "MANAGER"),
  reportController.taskSummaryReport
);

// ✅ Monthly summary report (Admin/Manager/Employee)
router.get(
  "/reports/monthly-summary",
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  reportController.monthlySummaryReport
);

module.exports = router;
