// routes/index.js
const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes.js");
const carRoutes = require("./carRoutes.js");
const bookingRoutes = require("./bookingRoutes.js");
const paymentRoutes = require("./paymentRoutes.js");
const adminRoutes = require("./adminRoutes.js");
const contactRoutes = require("./carRoutes.js");
const userRoutes = require("./userRoutes.js");

router.use("/api/auth", authRoutes);
router.use("/", carRoutes);
router.use("/api", bookingRoutes);
router.use("/api/payment", paymentRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api", contactRoutes);
router.use("/api/profile", userRoutes);

module.exports = router;
