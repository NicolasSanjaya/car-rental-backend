const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController.js");
const contactLimiter = require("../middleware/limiterMiddleware.js");
const validateContactForm = require("../middleware/validationMiddleware.js");

router.post(
  "/contact",
  contactLimiter,
  validateContactForm,
  contactController.sendContactForm
);

module.exports = router;
