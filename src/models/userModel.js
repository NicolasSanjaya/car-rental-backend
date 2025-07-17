const pool = require("../config/db.js");
const bcrypt = require("bcrypt");

const UserModel = {
  async findUserByEmail(email) {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    return result.rows[0];
  },

  async findUserById(id) {
    const result = await pool.query(
      "SELECT id, full_name, email, role FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0];
  },

  async createUser(user) {
    const { full_name, email, password } = user;
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      "INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
      [full_name, email.toLowerCase().trim(), passwordHash]
    );
    return result.rows[0];
  },

  async updateUser(id, user) {
    const { full_name, email, reset_password_token, reset_password_expiry } =
      user;

    if (reset_password_token && reset_password_expiry) {
      const result = await pool.query(
        "UPDATE users SET reset_password_token = $1, reset_password_expiry = $2 WHERE id = $3",
        [reset_password_token, reset_password_expiry, id]
      );
      return result.rows[0];
    }

    const result = await pool.query(
      "UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING id, full_name, email",
      [full_name, email.toLowerCase().trim(), id]
    );
    return result.rows[0];
  },

  // ... Tambahkan fungsi model lain seperti update, delete, dll.
};

module.exports = UserModel;
