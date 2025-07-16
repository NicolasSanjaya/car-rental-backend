const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController.js");
const { authenticateToken } = require("../middleware/authMiddleware.js");

router.put("/update", authenticateToken, userController.updateUser);
router.put(
  "/change-password",
  authenticateToken,
  userController.changePassword
);

module.exports = router;
