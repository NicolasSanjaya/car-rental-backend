const { body } = require("express-validator");

const validateContactForm = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .escape(),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please enter a valid email address"),

  body("phone")
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage("Phone number must be between 10 and 15 characters")
    .matches(/^[\+]?[\d\s\-\(\)]+$/)
    .withMessage("Please enter a valid phone number"),

  body("subject")
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Subject must be between 5 and 100 characters")
    .escape(),

  body("message")
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Message must be between 10 and 500 characters")
    .escape(),

  body("serviceType")
    .isIn(["rental", "support", "feedback", "other"])
    .withMessage("Please select a valid service type"),

  body("agreeToTerms")
    .isBoolean()
    .custom((value) => {
      if (value !== true) {
        throw new Error("You must agree to the terms and conditions");
      }
      return true;
    }),
];

module.exports = { validateContactForm };
