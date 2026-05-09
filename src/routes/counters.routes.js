const express = require('express');
const router = express.Router();
const countersController = require('../controllers/counters.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/', authenticateToken, countersController.getCounters);
router.post('/register', authenticateToken, countersController.registerCounter);
router.put('/update', authenticateToken, countersController.updateCounter);
router.delete('/:id', authenticateToken, countersController.deleteCounter);

module.exports = router;
