const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");
const { contactenticateToken } = require("../middleware/contactMiddleware");
const contactLimiter = require("../middleware/limiterMiddleware");
const validateContactForm = require("../middleware/validationMiddleware");

router.post(
  "/contact",
  contactLimiter,
  validateContactForm,
  contactController.sendContactForm
);

module.exports = router;
