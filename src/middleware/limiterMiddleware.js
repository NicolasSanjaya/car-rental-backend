const rateLimit = require("express-rate-limit");

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 requests per window
  message: {
    error: "Too many contact form submissions. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { contactLimiter };
