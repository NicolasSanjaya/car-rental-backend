const pool = require("../config/db.js");

const BookingModel = {
  async findBookingByUserId(id) {
    const result = await pool.query(
      `SELECT 
        b.*,
        c.model as car_name,
        c.brand as car_brand,
        c.image as car_image
      FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC`,
      [id]
    );
    return result.rows;
  },

  async findBookingById(id) {
    const result = await pool.query(
      `SELECT 
        b.*,
        c.name as car_name,
        c.brand as car_brand,
        c.image_url as car_image
      FROM bookings b
      JOIN cars c ON b.car_id = c.car_id
      WHERE b.id = $1`,
      [id]
    );

    return result.rows[0];
  },

  async findBookingByIdAndUserId(id, userId) {
    const result = await pool.query(
      "SELECT * FROM bookings WHERE id = $1 AND id = $2",
      [id, userId]
    );

    return result.rows;
  },

  async createBooking(booking) {
    const {
      bookingId,
      carId,
      userId,
      startDate,
      endDate,
      fullName,
      email,
      phoneNumber,
      payment,
      txHash,
      totalPrice,
    } = booking;

    const result = await pool.query(
      `INSERT INTO bookings (
            id, id, car_id, start_date, end_date, full_name, email, phone_number, 
            payment, is_paid, tx_hash, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
          RETURNING *`,
      [
        bookingId,
        userId,
        carId,
        startDate,
        endDate,
        fullName,
        email,
        phoneNumber,
        payment,
        payment === "metamask" && txHash ? true : false,
        txHash || null,
        totalPrice,
      ]
    );
    return result.rows[0];
  },

  async updateBooking(id, user) {
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

  async updateBookingPaymentStatus(id, isPaid, txHash) {
    const result = await pool.query(
      "UPDATE bookings SET is_paid = $1, tx_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
      [isPaid, txHash, id]
    );
    return result.rows[0];
  },

  async deleteBooking(id) {
    const result = await pool.query("DELETE FROM bookings WHERE id = $1", [id]);
    return result.rows[0];
  },

  async saveBookingToDatabase(bookingData) {
    const client = await pool.connect();

    console.log(bookingData);

    try {
      const query = `
      INSERT INTO bookings (
        car_id, start_date, end_date, full_name, 
        email, phone_number, payment_method, is_paid, tx_hash, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        bookingData.user_id,
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  // ... Tambahkan fungsi model lain seperti update, delete, dll.
};

module.exports = BookingModel;
