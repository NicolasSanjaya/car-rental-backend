const CarModel = require("../models/carModel.js");
const pool = require("../config/db.js");

exports.getAllCars = async (req, res, next) => {
  // Filter mobil berdasarkan query parameters
  // Contoh: /cars?brand=Daihatsu&year=2020&available=true
  const { brand, year, available } = req.query;

  try {
    if (brand || year || available !== undefined) {
      const data = await pool.query(
        "SELECT * FROM cars ORDER BY created_at ASC"
      );

      let filteredCars = data.rows;

      if (brand) {
        filteredCars = filteredCars.filter((car) =>
          car.brand.toLowerCase().includes(brand.toLowerCase())
        );
      }

      if (year) {
        filteredCars = filteredCars.filter(
          (car) => car.year.toString() === year
        );
      }

      if (available !== undefined) {
        filteredCars = filteredCars.filter(
          (car) => car.is_available === (available === "true")
        );
      }

      return res.json({
        status: true,
        message: "List of cars",
        data: filteredCars,
        count: filteredCars.length,
      });
    } else {
      const data = await pool.query(
        "SELECT * FROM cars ORDER BY created_at ASC"
      );
      return res.json({
        status: true,
        message: "List of cars",
        data: data.rows,
        count: data.rows.length,
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

exports.getCarById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const car = await CarModel.findCarById(id);
    if (car) {
      return res.json({
        success: true,
        message: "Car fetched successfully",
        data: car,
      });
    } else {
      return res.status(404).json({ error: "Car not found" });
    }
  } catch (error) {
    next(error);
  }
};
