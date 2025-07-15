// controllers/authController.js
const UserModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const { isValidEmail, isValidPassword } = require("../utils/validation");
const {
  createResetPasswordEmailTemplate,
  sendEmail,
} = require("../utils/emailHelper");

exports.register = async (req, res, next) => {
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

    const existingUser = await UserModel.findByEmail(
      email.toLowerCase().trim()
    );

    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const newUser = await UserModel.create({ full_name, email, password });

    // Generate token (logika token bisa juga di-abstraksi ke helper)
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, full_name: newUser.full_name },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Simpan token di HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true, // Cookie tidak bisa diakses oleh JavaScript sisi klien
      secure: true, // Hanya kirim melalui HTTPS di lingkungan produksi
      sameSite: "strict", // Proteksi dari serangan CSRF
      maxAge: 3600000 * 24, // Masa berlaku cookie (1 jam dalam milidetik)
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: newUser, token },
    });
  } catch (error) {
    next(error); // Teruskan error ke error handler
  }
};

exports.login = async (req, res, next) => {
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

    const user = await UserModel.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Hapus password hash dari objek user sebelum mengirim respons
    delete user.password_hash;

    res.cookie("token", token, {
      httpOnly: true, // Cookie tidak bisa diakses oleh JavaScript sisi klien
      secure: true, // Hanya kirim melalui HTTPS di lingkungan produksi
      sameSite: "strict", // Proteksi dari serangan CSRF
      maxAge: 3600000 * 24, // Masa berlaku cookie (1 jam dalam milidetik)
    });

    if (user.role === "admin") {
      res.cookie("role", "admin", {
        path: "/",
        httpOnly: false,
      });
      return res.json({
        success: true,
        message: "Login successful",
        data: { user, token },
      });
    } else if (user.role === "user") {
      return res.json({
        success: true,
        message: "Login successful",
        data: { user, token },
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    // ID pengguna didapat dari token JWT yang sudah diverifikasi oleh middleware
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.role === "admin") {
      res.cookie("role", "admin", {
        path: "/",
        httpOnly: false,
      });
      return res.json({
        success: true,
        message: "Login successful",
        data: { user, token },
      });
    } else if (user.role === "user") {
      return res.json({
        success: true,
        message: "Login successful",
        data: { user, token },
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.clearCookie("token");
    res.clearCookie("role"); // Hapus cookie role jika ada
    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const newToken = jwt.sign(
      {
        id: req.user.id,
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
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validasi input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Validasi format email
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Cari user berdasarkan email
    const user = await UserModel.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (!user) {
      // Jangan berikan informasi bahwa email tidak ditemukan (security best practice)
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, we have sent a password reset link",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 jam dari sekarang

    // Simpan token dan expiry ke database
    const update = UserModel.update(user.id, user);

    // Buat reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Template email
    const mailOptions = {
      from: `"Reset Password" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: createResetPasswordEmailTemplate(resetUrl),
    };

    await sendEmail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Validasi input
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    // Validasi password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Cari user berdasarkan token yang masih valid
    const userQuery = `
      SELECT * FROM users 
      WHERE reset_password_token = $1 
      AND reset_password_expiry > NOW()
    `;
    const userResult = await pool.query(userQuery, [token]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash password baru
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, reset_password_token = $2, reset_password_expiry = $3
      WHERE id = $4
    `;
    await pool.query(updateQuery, [hashedPassword, null, null, user.id]);

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    next(error);
  }
};
// ... Tambahkan controller lain seperti logout, forgotPassword, resetPassword, dll.
