const { validationResult } = require("express-validator");
const {
  createContactEmailTemplate,
  createConfirmationEmailTemplate,
  sendEmail,
} = require("../utils/emailHelper.js");

exports.sendContactForm = async (req, res, next) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { name, email, phone, subject, message, serviceType } = req.body;

    // Verify required environment variables
    if (!process.env.EMAIL_PASSWORD) {
      console.error("Gmail credentials not configured");
      return res.status(500).json({
        success: false,
        message: "Email service not configured",
      });
    }

    // Email options for admin notification
    const adminMailOptions = {
      from: `"Turbo Rent" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `New Contact Form: ${subject}`,
      html: createContactEmailTemplate({
        name,
        email,
        phone,
        subject,
        message,
        serviceType,
      }),
      replyTo: email,
    };

    // Email options for auto-reply
    const autoReplyOptions = {
      from: `"Turbo Rent" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Thank you for contacting Turbo Rent",
      html: createConfirmationEmailTemplate(name),
    };

    // Send emails
    const [adminResult, autoReplyResult] = await Promise.all([
      sendEmail(adminMailOptions),
      sendEmail(autoReplyOptions),
    ]);

    res.json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon.",
      data: {
        messageId: adminResult.messageId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Contact form error:", error);

    // Handle specific errors
    if (error.code === "EAUTH") {
      return res.status(500).json({
        success: false,
        message: "Email authentication failed",
      });
    }

    if (error.code === "ECONNECTION") {
      return res.status(500).json({
        success: false,
        message: "Unable to connect to email service",
      });
    }

    next(error);
  }
};
