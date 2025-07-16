const CarModel = require("../models/carModel.js");
const pool = require("../config/db.js");

exports.getAllCars = async (req, res, next) => {
  try {
    const result = await CarModel.findAllCars();

    if (result) {
      return res.json({
        success: true,
        message: "Cars fetched successfully",
        data: result,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "No cars found",
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.getAvailableCars = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT * FROM cars 
      WHERE is_available = true
    `;

    // const params = [];

    // if (start_date && end_date) {
    //   query += ` AND car_id NOT IN (
    //     SELECT car_id FROM bookings
    //     WHERE (start_date <= $1 AND end_date >= $2)
    //     OR (start_date <= $3 AND end_date >= $4)
    //     OR (start_date >= $5 AND end_date <= $6)
    //   )`;
    //   params.push(
    //     end_date,
    //     start_date,
    //     start_date,
    //     end_date,
    //     start_date,
    //     end_date
    //   );
    // }

    // query += " ORDER BY created_at DESC";

    const result = await pool.query(query);

    if (result) {
      return res.json({
        success: true,
        message: "Available cars fetched successfully",
        data: result.rows,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "No available cars found",
      });
    }
  } catch (error) {
    next(error);
  }
};
