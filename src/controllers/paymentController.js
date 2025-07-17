const pool = require("../config/db.js");
const BookingModel = require("../models/bookingModel.js");
const {
  sendConfirmationEmailBlockchain,
  sendConfirmationEmailMidtrans,
} = require("../utils/emailHelper.js");
const snap = require("../config/midtrans.js");

exports.mainPayment = async (req, res, next) => {
  try {
    const { paymentData } = req.body;
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

    // 2. Simpan detail pemesanan dan pembayaran ke database
    const bookingData = {
      car_id: paymentData.car_id,
      start_date: paymentData.start_date,
      end_date: paymentData.end_date,
      full_name: paymentData.customerName,
      email: paymentData.customerEmail,
      phone_number: paymentData.customerPhone,
      payment_method: paymentData.payment_method,
      txHash: paymentData.txHash,
      user_id: paymentData.user_id,
    };

    const savedBooking = await BookingModel.saveBookingToDatabase(bookingData);

    // 3. Kirim email konfirmasi ke pelanggan
    const transactionDetails = {
      txHash: paymentData.txHash,
      amount: paymentData.amount,
    };

    console.log("savedBooking", savedBooking);

    const emailSent = await sendConfirmationEmailBlockchain(
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
};

exports.createPayment = async (req, res, next) => {
  try {
    const { bookingData } = req.body;

    // Validate required fields
    if (
      !bookingData.customerName ||
      !bookingData.customerEmail ||
      !bookingData.totalAmount ||
      !bookingData.payment_method
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate unique order ID
    const orderId = `ORDER-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Save booking to database
    const bookingResult = await pool.query(
      `INSERT INTO bookings (full_name, email, phone_number, 
       payment_method, start_date, end_date, amount, midtrans_order_id, car_id, is_paid, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10) RETURNING id`,
      [
        bookingData.customerName,
        bookingData.customerEmail,
        bookingData.customerPhone || null,
        bookingData.payment_method,
        bookingData.start_date,
        bookingData.end_date,
        bookingData.totalAmount,
        orderId,
        bookingData.car_id,
        bookingData.user_id || null, // Set user_id to null if not provided
      ]
    );

    const bookingId = bookingResult.rows[0].id;

    // Prepare Midtrans transaction parameter
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(bookingData.totalAmount * 100), // Convert to cents
      },
      customer_details: {
        first_name: bookingData.customerName,
        email: bookingData.customerEmail,
        phone: bookingData.customerPhone || "",
      },
      item_details: [
        {
          id: `booking-${bookingId}`,
          price: Math.round(bookingData.totalAmount * 100),
          quantity: 1,
          name: bookingData.carName,
        },
      ],
      credit_card: {
        secure: true,
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment/success`,
        error: `${process.env.FRONTEND_URL}/payment/error`,
        pending: `${process.env.FRONTEND_URL}/payment/pending`,
      },
    };

    // Create Midtrans transaction
    const transaction = await snap.createTransaction(parameter);

    // Save payment record
    await pool.query(
      `INSERT INTO payments (booking_id, midtrans_order_id, payment_status, amount) 
       VALUES ($1, $2, $3, $4)`,
      [bookingId, orderId, "pending", bookingData.totalAmount]
    );

    res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      order_id: orderId,
      booking_id: bookingId,
    });
  } catch (error) {
    next(error);
  }
};

exports.notificationPayment = async (req, res, next) => {
  try {
    // Verify notification
    const statusResponse = await snap.transaction.status(req.body.order_id);

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    const paymentType = statusResponse.payment_type;
    const transactionId = statusResponse.transaction_id;

    console.log("Notification received:", {
      orderId,
      transactionStatus,
      fraudStatus,
      paymentType,
    });

    let paymentStatus = "pending";
    let bookingStatus = "pending";

    // Determine payment status
    if (transactionStatus === "capture") {
      if (fraudStatus === "challenge") {
        paymentStatus = "challenge";
      } else if (fraudStatus === "accept") {
        paymentStatus = "success";
        bookingStatus = "confirmed";
      }
    } else if (transactionStatus === "settlement") {
      paymentStatus = "success";
      bookingStatus = "confirmed";
    } else if (transactionStatus === "deny") {
      paymentStatus = "failed";
      bookingStatus = "cancelled";
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "expire"
    ) {
      paymentStatus = "failed";
      bookingStatus = "cancelled";
    } else if (transactionStatus === "pending") {
      paymentStatus = "pending";
    }

    const transactionDetails = {
      orderId: statusResponse.order_id,
      transactionId: statusResponse.transaction_id,
      paymentType: statusResponse.payment_type,
      transactionStatus: statusResponse.transaction_status,
      paymentStatus: paymentStatus, // yang sudah dihitung di webhook
    };

    const booking = await pool.query(
      `SELECT * FROM bookings WHERE midtrans_order_id = $1`,
      [orderId]
    );

    const car = await pool.query(`SELECT * FROM cars WHERE id = $1`, [
      booking.rows[0].car_id,
    ]);

    const emailSent = await sendConfirmationEmailMidtrans(
      booking.rows[0],
      car.rows[0],
      transactionDetails
    );

    // Update booking status
    await pool.query(
      `UPDATE bookings SET payment_status = $1, status = $2, 
       midtrans_transaction_id = $3, updated_at = CURRENT_TIMESTAMP, is_paid = true
       WHERE midtrans_order_id = $4`,
      [paymentStatus, bookingStatus, transactionId, orderId]
    );

    // Update payment record
    await pool.query(
      `UPDATE payments SET payment_status = $1, midtrans_transaction_id = $2, 
       payment_method = $3, payment_date = CURRENT_TIMESTAMP 
       WHERE midtrans_order_id = $4`,
      [paymentStatus, transactionId, paymentType, orderId]
    );

    res.status(200).json({ status: "success", emailSent });
  } catch (error) {
    next(error);
  }
};
