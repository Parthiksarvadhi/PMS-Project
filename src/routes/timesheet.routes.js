const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/rbac.middleware");
const timesheetController = require("../controllers/timesheet.controller");

router.use(authMiddleware);

// ✅ Start task
router.post(
  "/timesheets/start",
  authorizeRoles("EMPLOYEE"),
  timesheetController.startTask
);

// ✅ Push task (stop)
router.post(
  "/timesheets/push",
  authorizeRoles("EMPLOYEE"),
  timesheetController.pushTask
);

// ✅ Switch task
router.post(
  "/timesheets/switch",
  authorizeRoles("EMPLOYEE"),
  timesheetController.switchTask
);

// ✅ Get my timesheets
router.get(
  "/timesheets/me",
  authorizeRoles("EMPLOYEE"),
  timesheetController.getMyTimesheets
);

router.get(
  "/timesheets/my-task-summary",
  authorizeRoles("EMPLOYEE"),
  timesheetController.getMyTaskSummary
);

module.exports = router;
