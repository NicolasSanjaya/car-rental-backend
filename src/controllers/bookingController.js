const { findCarById } = require("../models/carModel.js");
const pool = require("../config/db.js");

const BookingModel = require("../models/bookingModel.js");
exports.addBooking = async (req, res, next) => {
  try {
    const {
      carId,
      startDate,
      endDate,
      fullName,
      email,
      phoneNumber,
      payment,
      txHash,
    } = req.body;

    // Validate required fields
    if (
      !carId ||
      !startDate ||
      !endDate ||
      !fullName ||
      !email ||
      !phoneNumber ||
      !payment
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if car exists and is available
    const car = await findCarById(carId);

    if (!car) {
      return res.status(404).json({ error: "Car not found or not available" });
    }

    // Check for booking conflicts
    const conflictingBookings = await pool.query(
      `SELECT * FROM bookings 
       WHERE car_id = $1 
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )`,
      [carId, startDate, endDate]
    );

    if (conflictingBookings.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "Car is already booked for the selected dates" });
    }

    // Calculate total price
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = days * parseFloat(car.rows[0].price_per_day);

    // Generate booking ID
    const bookingId = uidv4();

    const booking = {
      bookingId,
      carId,
      userId: req.user.id,
      startDate,
      endDate,
      fullName,
      email,
      phoneNumber,
      payment,
      txHash,
      totalPrice,
    };

    // Create booking
    const newBooking = await BookingModel.createBooking(booking);

    if (newBooking) {
      return res.status(201).json({
        success: true,
        message: "Booking created successfully",
        data: newBooking,
      });
    } else {
      return res.status(500).json({ error: "Internal server error" });
    }
  } catch (error) {
    next(error);
  }
};

exports.getBookingByUserId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bookings = await BookingModel.findBookingByUserId(id);

    if (bookings) {
      return res.json({
        success: true,
        message: "Bookings fetched successfully",
        data: bookings,
      });
    } else {
      return res.status(500).json({ error: "Internal server error" });
    }
  } catch (error) {
    next(error);
  }
};

exports.getBookingById = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await BookingModel.findBookingById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Ensure user can only access their own bookings
    if (req.user.id !== booking.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      success: true,
      message: "Booking fetched successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { txHash, isPaid } = req.body;

    // Check if booking exists and belongs to user
    const booking = await BookingModel.findBookingByIdAndUserId(
      bookingId,
      req.user.id
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Update payment status
    const updatedBooking = await BookingModel.updateBookingPaymentStatus(
      bookingId,
      isPaid,
      txHash
    );

    if (updatedBooking) {
      return res.json({
        success: true,
        message: "Payment status updated successfully",
        booking: updatedBooking,
      });
    } else {
      return res.status(500).json({ error: "Internal server error" });
    }
  } catch (error) {
    next(error);
  }
};

exports.deleteBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    // Check if booking exists and belongs to user
    const booking = await BookingModel.findBookingByIdAndUserId(
      bookingId,
      req.user.id
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Delete booking
    const deletedBooking = await BookingModel.deleteBooking(bookingId);

    if (deletedBooking) {
      return res.json({
        success: true,
        message: "Booking cancelled successfully",
        booking: deletedBooking,
      });
    } else {
      return res.status(500).json({ error: "Internal server error" });
    }
  } catch (error) {
    next(error);
  }
};
