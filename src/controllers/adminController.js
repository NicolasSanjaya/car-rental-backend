const CarModel = require("../models/carModel.js");
const BookingModel = require("../models/bookingModel.js");
const { uploadToCloudinary } = require("../utils/cloudinaryHelper.js");
const pool = require("../config/db.js");
const cloudinary = require("cloudinary").v2;

exports.addCars = async (req, res, next) => {
  try {
    const { brand, model, year, features, price, is_available } = req.body;

    let imageUrl = null;

    // Upload image to Cloudinary if provided
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(
          req.file.buffer,
          req.file.originalname
        );
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
        });
      }
    }

    // Parse features if it's a string
    let parsedFeatures = [];
    if (features) {
      try {
        parsedFeatures =
          typeof features === "string" ? JSON.parse(features) : features;
      } catch (parseError) {
        console.error("Error parsing features:", parseError);
        parsedFeatures = [];
      }
    }

    const car = {
      brand,
      model,
      year,
      is_available,
      imageUrl,
      price,
      parsedFeatures,
    };

    const addCar = await CarModel.createCar(car);

    if (addCar) {
      return res.status(201).json({
        success: true,
        message: "Car added successfully",
        car: addCar,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to add car",
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.updateCars = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { brand, model, year, is_available, price, features } = req.body;

    // Check if car exists
    const existingCar = await CarModel.findCarById(id);

    if (!existingCar) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    let imageUrl = existingCar.image;

    // Upload new image if provided
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(
          req.file.buffer,
          req.file.originalname
        );
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
        });
      }
    }

    // Parse features if it's a string
    let parsedFeatures = existingCar.features;
    if (features !== undefined) {
      try {
        parsedFeatures =
          typeof features === "string" ? JSON.parse(features) : features;
      } catch (parseError) {
        console.error("Error parsing features:", parseError);
        parsedFeatures = [];
      }
    }

    const result = await pool.query(
      `
      UPDATE cars 
      SET brand = $1, model = $2, year = $3, is_available = $4, image = $5, 
          price = $6, features = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING id, brand, model, year, is_available, image, price, features, created_at, updated_at
    `,
      [
        brand || existingCar.brand,
        model || existingCar.model,
        year ? parseInt(year) : existingCar.year,
        is_available !== undefined
          ? is_available === "true"
          : existingCar.is_available,
        imageUrl,
        price ? parseFloat(price) : existingCar.price,
        parsedFeatures,
        id,
      ]
    );

    if (result) {
      return res.status(200).json({
        success: true,
        message: "Car updated successfully",
        car: result.rows[0],
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to update car",
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.updateCarsAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;

    if (is_available === undefined) {
      return res.status(400).json({
        success: false,
        message: "is_available field is required",
      });
    }

    const car = {
      is_available,
      id,
    };

    const updateCarAvailability = await CarModel.updateCar(car);

    if (!updateCarAvailability) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    } else {
      res.json({
        success: true,
        message: "Car availability updated successfully",
        car: updateCarAvailability,
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.deleteCars = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get car info before deletion for cleanup
    const carResult = await CarModel.findCarById(id);

    if (!carResult) {
      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }

    // Delete from database
    const deleteCar = await CarModel.deleteCar(id);

    // Optional: Delete image from Cloudinary
    const imageUrl = carResult.image;
    if (imageUrl) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`car-rental/cars/${publicId}`);
      } catch (deleteError) {
        console.error("Error deleting image from Cloudinary:", deleteError);
        // Continue with success response even if image deletion fails
      }
    }

    return res.status(200).json({
      success: true,
      message: "Car deleted successfully",
      car: deleteCar,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllBookings = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        c.model as car_name,
        c.brand as car_brand,
        c.image as car_image
      FROM bookings b
      LEFT JOIN cars c ON b.car_id = c.id
    `);

    if (result) {
      return res.json({
        success: true,
        bookings: result.rows,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "No bookings found",
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.updateBookings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_paid } = req.body;

    const result = await pool.query(
      "UPDATE bookings SET is_paid = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
      [is_paid, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.json({
      success: true,
      message: "Booking status updated successfully",
      booking: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteBookings = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log("Deleting booking with ID:", id);

    const result = await BookingModel.deleteBooking(id);

    if (!result) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const [bookingsResult, carsResult] = await Promise.all([
      pool.query(
        "SELECT COUNT(*) as total, SUM(total_price) as revenue, SUM(CASE WHEN is_paid = true THEN 1 ELSE 0 END) as paid FROM bookings"
      ),
      pool.query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN available = true THEN 1 ELSE 0 END) as available FROM cars"
      ),
    ]);

    const bookingStats = bookingsResult.rows[0];
    const carStats = carsResult.rows[0];

    res.json({
      success: true,
      stats: {
        totalBookings: parseInt(bookingStats.total),
        totalRevenue: parseFloat(bookingStats.revenue || 0),
        paidBookings: parseInt(bookingStats.paid),
        pendingBookings:
          parseInt(bookingStats.total) - parseInt(bookingStats.paid),
        totalCars: parseInt(carStats.total),
        availableCars: parseInt(carStats.available),
      },
    });
  } catch (error) {
    next(error);
  }
};
