const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

// GET /api/admin/dashboard → getAdminData (for React AdminDashboard)
router.get("/", authenticateToken, dashboardController.getAdminData);

// GET /api/admin/dashboard/user → getDashboardData (for user dashboard)
router.get("/user", authenticateToken, dashboardController.getDashboardData);

router.get("/update", authenticateToken, dashboardController.updateData);

module.exports = router;