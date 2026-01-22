const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/rbac.middleware");
const projectController = require("../controllers/project.controller");

router.use(authMiddleware);

// ✅ Admin
router.post("/", authorizeRoles("ADMIN"), projectController.createProject);
router.patch("/:id/assign-manager", authorizeRoles("ADMIN"), projectController.assignManager);
router.patch("/:id/status", authorizeRoles("ADMIN"), projectController.updateProjectStatus);

// ✅ Admin + Manager can view (with restriction logic inside controller)
router.get("/", authorizeRoles("ADMIN", "MANAGER"), projectController.getProjects);

module.exports = router;
