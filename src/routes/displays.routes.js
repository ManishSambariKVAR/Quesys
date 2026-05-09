const express = require('express');
const router = express.Router();
const displaysController = require('../controllers/displays.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/waiting-room', authenticateToken, displaysController.getWaitingRoomDisplays);
router.post('/waiting-room', authenticateToken, displaysController.addWaitingRoomDisplay);
router.put('/waiting-room/:id', authenticateToken, displaysController.updateWaitingRoomDisplay);
router.delete('/waiting-room/:id', authenticateToken, displaysController.deleteWaitingRoomDisplay);

module.exports = router;
