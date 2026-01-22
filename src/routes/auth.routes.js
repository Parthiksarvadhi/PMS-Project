const router = require("express").Router();
const authController = require("../controllers/auth.controller");

router.post("/login", authController.login);

// ✅ bootstrap route
router.post("/bootstrap-admin", authController.bootstrapAdmin);

module.exports = router;
