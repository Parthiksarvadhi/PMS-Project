const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/rbac.middleware");
const taskController = require("../controllers/task.controller");

router.use(authMiddleware);

// ✅ Create task: Admin/Manager
router.post(
  "/projects/:projectId/tasks",
  authorizeRoles("ADMIN", "MANAGER"),
  taskController.createTask
);

// ✅ Get tasks: Admin/Manager/Employee (filtered)
router.get(
  "/tasks",
  authorizeRoles("ADMIN", "MANAGER", "EMPLOYEE"),
  taskController.getTasks
);

// ✅ Update status: Manager/Employee
router.patch(
  "/tasks/:id/status",
  authorizeRoles("MANAGER", "EMPLOYEE", "ADMIN"),
  taskController.updateTaskStatus
);

// ✅ Reassign task (Manager/Admin)
router.patch(
  "/tasks/:id/reassign",
  authorizeRoles("MANAGER", "ADMIN"),
  taskController.reassignTask
);

// ✅ Reopen completed task (Manager/Admin)
router.patch(
  "/tasks/:id/reopen",
  authorizeRoles("MANAGER", "ADMIN"),
  taskController.reopenTask
);

router.get(
  "/manager/tasks",
  authorizeRoles("MANAGER"),
  taskController.getManagerTasks
);

router.patch(
  "/tasks/:id/complete",
  authorizeRoles("EMPLOYEE", "MANAGER", "ADMIN"),
  taskController.completeTask
);


module.exports = router;
