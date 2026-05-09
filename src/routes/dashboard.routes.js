const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// GET /api/admin/dashboard/admin → Admin dashboard data (pie chart, summary, user logs)
router.get('/admin', authenticateToken, dashboardController.getAdminData);

// GET /api/admin/dashboard/ → Operator dashboard config (factory settings, departments, etc.)
router.get('/', authenticateToken, dashboardController.getDashboardData);

// GET /api/admin/dashboard/update → Live token data for operator dashboard polling
router.get('/update', authenticateToken, dashboardController.updateData);

module.exports = router;
