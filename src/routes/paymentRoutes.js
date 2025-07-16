const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController.js");
const { authenticateToken } = require("../middleware/authMiddleware.js");

router.post("/midtrans", authenticateToken, paymentController.createPayment);
router.post(
  "/notification",
  authenticateToken,
  paymentController.notificationPayment
);

module.exports = router;
