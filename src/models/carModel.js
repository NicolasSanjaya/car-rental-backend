const pool = require("../config/db.js");

const CarModel = {
  async findAllCars() {
    const result = await pool.query(
      "SELECT * FROM cars ORDER BY created_at DESC"
    );
    return result.rows;
  },

  async findCarById(id) {
    const result = await pool.query("SELECT * FROM cars WHERE id = $1", [id]);
    return result.rows[0];
  },

  async createCar(car) {
    const { brand, model, year, is_available, imageUrl, price, features } = car;

    const result = await pool.query(
      `
      INSERT INTO cars (brand, model, year, is_available, image, price, features)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, brand, model, year, is_available, image, price, features, created_at, updated_at
    `,
      [
        brand,
        model,
        parseInt(year),
        is_available === "true" ? true : false,
        imageUrl,
        parseFloat(price),
        features,
      ]
    );
    return result.rows[0];
  },

  async updateCar(car) {
    const { is_available, id } = car;

    const result = await pool.query(
      `
      UPDATE cars 
      SET is_available = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, brand, model, year, is_available, image, price, features, created_at, updated_at
    `,
      [is_available, id]
    );

    return result.rows[0];
  },

  async deleteCar(id) {
    const result = await pool.query("DELETE FROM cars WHERE id = $1", [id]);
    return result.rows[0];
  },
};

module.exports = CarModel;
