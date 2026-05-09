const express = require('express');
const router = express.Router();
const kiosksController = require('../controllers/kiosks.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get('/', authenticateToken, kiosksController.getKiosks);
router.delete('/:id', authenticateToken, kiosksController.deleteKiosk);
router.get('/registration', kiosksController.generateSerialNumber);
router.get('/confirm', kiosksController.confirmRegistration);
router.get('/summary', kiosksController.getKioskSummary);
router.get('/alldata', kiosksController.getAllData);

module.exports = router;
