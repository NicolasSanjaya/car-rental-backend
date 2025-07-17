const UserModel = require("../models/userModel.js");
const bcrypt = require("bcrypt");
const pool = require("../config/db.js");

exports.updateUser = async (req, res, next) => {
  try {
    const { full_name, email, id } = req.body;

    // Validate input
    if (!full_name || !email) {
      return res
        .status(400)
        .json({ message: "Full name and email are required" });
    }

    // Check if email is already taken by another user
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND id != $2",
      [email, id]
    );

    if (user.rows.length > 0) {
      console.log("Email is already taken by another user");
      return res
        .status(400)
        .json({ message: "Email is already taken by another user" });
    }

    // Update user
    const result = await UserModel.updateUser(id, {
      full_name,
      email,
    });

    console.log({ result });

    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password, id } = req.body;

    // Validate input
    if (!current_password || !new_password) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    if (new_password.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    // Get current user
    let user = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    user = user.rows[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(current_password, user.password_hash);

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      current_password,
      user.password_hash
    );

    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      hashedNewPassword,
      id,
    ]);

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};
