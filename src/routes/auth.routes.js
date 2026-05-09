const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/counters', authController.getAvailableCounters);
router.post('/login', authController.login);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
