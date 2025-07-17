const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController.js");
const { authenticateToken } = require("../middleware/authMiddleware.js");
const upload = require("../middleware/uploadMiddleware.js");

router.post(
  "/cars",
  authenticateToken,
  upload.single("image"),
  adminController.addCars
);
router.put(
  "/cars/:id",
  authenticateToken,
  upload.single("image"),
  adminController.updateCars
);
// PATCH /api/admin/cars/:id/availability - Toggle car availability (admin only)
router.patch(
  "/cars/:id/availability",
  authenticateToken,
  upload.single("image"),
  adminController.updateCarsAvailability
);
router.delete("/cars/:id", authenticateToken, adminController.deleteCars);
router.get("/stats", authenticateToken, adminController.getStats);

// Bookings
router.get("/bookings", authenticateToken, adminController.getAllBookings);
router.put(
  "/bookings/:id/status",
  authenticateToken,
  adminController.updateBookings
);
router.delete(
  "/bookings/:id",
  authenticateToken,
  adminController.deleteBookings
);

module.exports = router;
