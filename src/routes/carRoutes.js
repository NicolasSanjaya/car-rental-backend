const express = require("express");
const router = express.Router();
const carController = require("../controllers/carController.js");

router.get("/cars", carController.getAllCars);
router.get("/cars/available", carController.getAvailableCars);

module.exports = router;
