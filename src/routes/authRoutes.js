const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController.js");
const { authenticateToken } = require("../middleware/authMiddleware.js");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authenticateToken, authController.logout); // Logout perlu token
router.get("/profile", authenticateToken, authController.getProfile);
router.post("/refresh", authenticateToken, authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
