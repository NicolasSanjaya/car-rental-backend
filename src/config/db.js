const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Jika menggunakan Neon, SSL mungkin diperlukan
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
