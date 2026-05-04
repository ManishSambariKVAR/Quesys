const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

router.get("/logs", authenticateToken, reportsController.getLogs);
router.get("/summary", authenticateToken, reportsController.getSummary);

module.exports = router;
