const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController.js");
const { authenticateToken } = require("../middleware/authMiddleware.js");

router.post("/bookings", authenticateToken, bookingController.addBooking);
router.get(
  "/bookings/user/:id",
  authenticateToken,
  bookingController.getBookingByUserId
);
router.get(
  "/bookings/:bookingId",
  authenticateToken,
  bookingController.getBookingById
);
router.put(
  "/bookings/:bookingId/payment",
  authenticateToken,
  bookingController.updateBookingPayment
);
router.delete(
  "/bookings/:bookingId",
  authenticateToken,
  bookingController.deleteBooking
);
module.exports = router;
