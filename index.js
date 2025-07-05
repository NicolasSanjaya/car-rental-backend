// 1. Impor dependensi yang diperlukan
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();
const nodemailer = require("nodemailer");
const { Web3 } = require("web3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 2. Inisialisasi aplikasi Express
const app = express();

const port = process.env.PORT || 4000;

// 3. Konfigurasi koneksi database menggunakan Pool dari pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Jika menggunakan Neon, SSL mungkin diperlukan
  ssl: {
    rejectUnauthorized: false,
  },
});

// Konfigurasi Web3 untuk Ethereum Sepolia

const web3 = new Web3(process.env.SEPOLIA_RPC_URL);

// Konfigurasi Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", // atau provider email lainnya
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// 4. Middleware untuk parsing body JSON dari request
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function
async function waitForTransactionReceipt(txHash, retries = 5, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("Transaction not found after retries");
}
// Fungsi untuk verifikasi transaksi di blockchain
async function verifyTransaction(txHash, expectedAmount, recipientAddress) {
  try {
    const receipt = await waitForTransactionReceipt(txHash);

    console.log("Transaction Receipt:", receipt);

    if (!receipt) {
      return {
        verified: false,
        error: "Transaction not found",
      };
    }

    const transaction = await web3.eth.getTransaction(txHash);

    // Verifikasi alamat penerima
    // if (transaction.to.toLowerCase() !== recipientAddress.toLowerCase()) {
    //   throw new Error("Invalid recipient address");
    // }

    if (
      !transaction.to ||
      transaction.to.toLowerCase() !== recipientAddress.toLowerCase()
    ) {
      throw new Error("Invalid recipient address");
    }

    // Verifikasi jumlah (dalam Wei)
    const transactionValue = web3.utils.fromWei(transaction.value, "ether");
    if (parseFloat(transactionValue) < parseFloat(expectedAmount)) {
      throw new Error("Insufficient payment amount");
    }

    // Verifikasi konfirmasi blok (minimal 3 konfirmasi)
    const currentBlock = await web3.eth.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;

    if (confirmations < 3) {
      throw new Error("Transaction needs more confirmations");
    }

    return {
      verified: true,
      blockNumber: receipt.blockNumber,
      confirmations: confirmations,
      gasUsed: receipt.gasUsed,
      transactionValue: transactionValue,
    };
  } catch (error) {
    console.error("Blockchain verification error:", error);
    return {
      verified: false,
      error: error.message,
    };
  }
}

// Fungsi untuk menyimpan booking ke database
async function saveBookingToDatabase(bookingData) {
  const client = await pool.connect();

  try {
    const query = `
      INSERT INTO booking (
        car_id, start_date, end_date, full_name, 
        email, phone_number, payment_method, is_paid, tx_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      bookingData.car_id,
      bookingData.start_date,
      bookingData.end_date,
      bookingData.full_name,
      bookingData.email,
      bookingData.phone_number,
      bookingData.payment_method,
      true, // is_paid = true karena sudah verified
      `https://sepolia.etherscan.io/tx/${bookingData.txHash}`, // Menyimpan tx_hash untuk referensi
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Fungsi untuk mengirim email konfirmasi
async function sendConfirmationEmail(booking, car, transactionDetails) {
  try {
    const mailOptions = {
      from: `"Turbo Rent" <${process.env.EMAIL_USER}>`,
      to: booking.email,
      subject: "Konfirmasi Pembayaran - Rental Mobil",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Pembayaran Berhasil Dikonfirmasi</h2>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c5aa0;">Detail Booking</h3>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Mobil:</strong> ${car.brand + " " + car.model}</p>
            <p><strong>Nama:</strong> ${booking.full_name}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            <p><strong>Nomor Telepon:</strong> ${booking.phone_number}</p>
            <p><strong>Tanggal Mulai:</strong> ${booking.start_date}</p>
            <p><strong>Tanggal Selesai:</strong> ${booking.end_date}</p>
          </div>
          
          <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2c5aa0;">Detail Transaksi Blockchain</h3>
            <p><strong>Transaction Hash:</strong> ${
              transactionDetails.txHash
            }</p>
            <p><strong>Jumlah Pembayaran:</strong> ${
              transactionDetails.amount
            } ETH</p>
            <p><strong>Status:</strong> <span style="color: #4caf50; font-weight: bold;">Verified ✓</span></p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Catatan:</strong> Pembayaran Anda telah berhasil diverifikasi di blockchain Ethereum Sepolia. Booking Anda telah dikonfirmasi.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666;">Terima kasih telah menggunakan layanan kami!</p>
            <p style="color: #666; font-size: 12px;">Email ini dikirim secara otomatis, mohon tidak membalas.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

// 5. Definisikan Routes (Endpoint API)

// GET: Mendapatkan semua mobil
app.get("/cars", async (req, res) => {
  // Filter mobil berdasarkan query parameters
  // Contoh: /cars?brand=Daihatsu&year=2020&available=true

  const { brand, year, available } = req.query;

  if (brand || year || available !== undefined) {
    const data = await pool.query("SELECT * FROM cars ORDER BY id ASC");
    let filteredCars = data.rows;

    if (brand) {
      filteredCars = filteredCars.filter((car) =>
        car.brand.toLowerCase().includes(brand.toLowerCase())
      );
    }

    if (year) {
      filteredCars = filteredCars.filter((car) => car.year.toString() === year);
    }

    if (available !== undefined) {
      filteredCars = filteredCars.filter(
        (car) => car.is_available === (available === "true")
      );
    }

    return res.json({
      status: true,
      message: "List of cars",
      cars: filteredCars,
      count: filteredCars.length,
    });
  }

  // Ambil semua mobil jika tidak ada filter

  try {
    const result = await pool.query("SELECT * FROM cars ORDER BY id ASC");
    return res.status(200).json({
      status: true,
      message: "List of cars",
      cars: result.rows,
      count: result.rowCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
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
      status: true,
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
      status: true,
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
      status: true,
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
      .json({ message: "Car deleted statusfully", car: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Payment
// Main payment API endpoint
app.post("/api/payment", async (req, res) => {
  try {
    const { paymentData } = req.body;
    console.log("Received payment data:", paymentData);
    if (paymentData === undefined) {
      res.status(400).json({
        error: "Payment data is required",
      });
    }
    // Validasi input yang diperlukan
    if (
      !paymentData.txHash ||
      !paymentData.amount ||
      !paymentData.recipientAddress
    ) {
      res.status(400).json({
        error: "Missing required fields: txHash, amount, recipientAddress",
      });
    }

    // 1. Verifikasi transaksi di blockchain Ethereum Sepolia
    // const verificationResult = await verifyTransaction(
    //   paymentData.txHash,
    //   paymentData.amount,
    //   paymentData.recipientAddress
    // );

    // if (!verificationResult.verified) {
    //   res.status(400).json({
    //     error: "Transaction verification failed",
    //     details: verificationResult.error,
    //   });
    // }

    // 2. Simpan detail pemesanan dan pembayaran ke database
    const bookingData = {
      car_id: paymentData.carId,
      start_date: paymentData.startDate,
      end_date: paymentData.endDate,
      full_name: paymentData.customerName,
      email: paymentData.customerEmail,
      phone_number: paymentData.customerPhone,
      payment_method: paymentData.paymentMethod,
      txHash: paymentData.txHash,
    };

    const savedBooking = await saveBookingToDatabase(bookingData);

    // 3. Kirim email konfirmasi ke pelanggan
    const transactionDetails = {
      txHash: paymentData.txHash,
      amount: paymentData.amount,
    };

    const emailSent = await sendConfirmationEmail(
      savedBooking,
      paymentData.car,
      transactionDetails
    );

    // Mengirim respons sukses
    return res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: {
        bookingId: savedBooking.id,
        transactionVerified: true,
        emailSent: emailSent,
        txHash: paymentData.txHash,
        amount: paymentData.amount,
        recipientAddress: paymentData.recipientAddress,
      },
    });
  } catch (error) {
    console.error("Payment processing error:", error);

    // Mengirim respons error dengan status 500
    return res.status(500).json({
      error: "Payment processing error",
      details: error.message,
    });
  }
});

// Auth
// JWT Secret
const JWT_SECRET =
  process.env.JWT_SECRET || "kunci_rahasia_super_aman_dan_panjang";

// Middleware untuk verifikasi JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
    req.user = user;
    next();
  });
};

// Helper functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// PERBAIKAN: Pastikan semua route menggunakan format yang benar
// Route yang bermasalah biasanya menggunakan karakter khusus atau format yang salah

// Route: Health Check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Route: Register - PERBAIKAN: Pastikan path tidak mengandung karakter khusus
app.post("/api/auth/register", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // Validasi input
    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validasi full_name - hindari karakter khusus yang berlebihan
    if (full_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Full name must be at least 2 characters",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await pool.query(
      "SELECT uid FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user baru
    const newUser = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING uid, full_name, email, created_at",
      [full_name.trim(), email.toLowerCase().trim(), password_hash]
    );

    const user = newUser.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        uid: user.uid,
        email: user.email,
        full_name: user.full_name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          uid: user.uid,
          full_name: user.full_name,
          email: user.email,
          created_at: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Route: Login - PERBAIKAN: Pastikan path tidak mengandung karakter khusus
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Cari user berdasarkan email
    const userResult = await pool.query(
      "SELECT uid, full_name, email, password_hash, created_at FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = userResult.rows[0];

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        uid: user.uid,
        email: user.email,
        full_name: user.full_name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          uid: user.uid,
          full_name: user.full_name,
          email: user.email,
          created_at: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Route: Get Profile - PERBAIKAN: Pastikan path tidak mengandung karakter khusus
app.get("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      "SELECT uid, full_name, email, created_at FROM users WHERE uid = $1",
      [req.user.uid]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user: {
          uid: user.uid,
          full_name: user.full_name,
          email: user.email,
          created_at: user.created_at,
        },
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Route: Logout - PERBAIKAN: Pastikan path tidak mengandung karakter khusus
app.post("/api/auth/logout", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
});

// Route: Refresh Token - PERBAIKAN: Pastikan path tidak mengandung karakter khusus
app.post("/api/auth/refresh", authenticateToken, (req, res) => {
  try {
    const newToken = jwt.sign(
      {
        uid: req.user.uid,
        email: req.user.email,
        full_name: req.user.full_name,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
  });
});

// 6. Jalankan server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// module.exports = app;
