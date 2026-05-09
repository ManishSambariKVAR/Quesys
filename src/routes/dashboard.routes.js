const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/admin', authenticateToken, dashboardController.getAdminData);
router.get('/', authenticateToken, dashboardController.getDashboardData);
router.get('/update', authenticateToken, dashboardController.updateData);

module.exports = router;
