const router = require("express").Router();

const authMiddleware = require("../middleware/auth.middleware");
const authorizeRoles = require("../middleware/rbac.middleware");
const userController = require("../controllers/user.controller");

// ✅ All routes protected
router.use(authMiddleware);

// ✅ Admin-only routes
router.post("/", authorizeRoles("ADMIN"), userController.createUser);
router.get("/", authorizeRoles("ADMIN"), userController.getAllUsers);

// ✅ Manager: list employees working in my projects
router.get(
  "/manager/employees",
  authorizeRoles("MANAGER"),
  userController.getEmployeesUnderManager
);


router.patch("/:id/active", authorizeRoles("ADMIN"), userController.updateUserActiveStatus);
router.patch("/:id/hourly-rate", authorizeRoles("ADMIN"), userController.updateHourlyRate);
router.patch("/:id/role", authorizeRoles("ADMIN"), userController.updateUserRole);



module.exports = router;
