// routes/index.js
const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const carRoutes = require("./carRoutes");
const bookingRoutes = require("./bookingRoutes");
const paymentRoutes = require("./paymentRoutes");
const adminRoutes = require("./adminRoutes");
const contactRoutes = require("./contactRoutes");

router.use("/api/auth", authRoutes);
router.use("/cars", carRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payment", paymentRoutes);
router.use("/admin", adminRoutes);
router.use("/api", contactRoutes);

module.exports = router;
