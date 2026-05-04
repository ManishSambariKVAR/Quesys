const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.get("/counters", authController.getAvailableCounters);
router.post("/login", authController.login);

module.exports = router;
