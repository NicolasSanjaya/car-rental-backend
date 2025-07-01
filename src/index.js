// 1. Impor dependensi yang diperlukan
require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

// 2. Inisialisasi aplikasi Express
const app = express();

const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 3. Konfigurasi koneksi database menggunakan Pool dari pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Jika menggunakan Neon, SSL mungkin diperlukan
  ssl: {
    rejectUnauthorized: false,
  },
});

// 4. Middleware untuk parsing body JSON dari request
app.use(express.json());

// 5. Definisikan Routes (Endpoint API)

// GET: Mendapatkan semua mobil
app.get("/cars", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cars ORDER BY id ASC");
    res.status(200).json({
      success: true,
      message: "List of cars",
      cars: result.rows,
      count: result.rowCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET: Mendapatkan satu mobil berdasarkan ID
app.get("/cars/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM cars WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.status(200).json({
      success: true,
      message: "Car details",
      car: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST: Menambahkan mobil baru
app.post("/cars", async (req, res) => {
  const { brand, model, year, is_available } = req.body;
  if (!brand || !model || !year) {
    return res
      .status(400)
      .json({ error: "Brand, model, and year are required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO cars (brand, model, year, is_available) VALUES ($1, $2, $3, $4) RETURNING *",
      [brand, model, year, is_available]
    );
    res.status(201).json({
      success: true,
      message: "Car added successfully",
      car: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT: Memperbarui data mobil berdasarkan ID
app.put("/cars/:id", async (req, res) => {
  const { id } = req.params;
  const { brand, model, year, is_available } = req.body;
  if (!brand || !model || !year) {
    return res
      .status(400)
      .json({ message: "Brand, model, and year are required" });
  }
  try {
    const result = await pool.query(
      "UPDATE cars SET brand = $1, model = $2, year = $3, is_available = $4 WHERE id = $5 RETURNING *",
      [brand, model, year, is_available, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.status(200).json({
      success: true,
      message: "Car updated successfully",
      car: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// DELETE: Menghapus mobil berdasarkan ID
app.delete("/cars/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM cars WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Car not found" });
    }
    res
      .status(200)
      .json({ message: "Car deleted successfully", car: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 6. Jalankan server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
