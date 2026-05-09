const express = require('express');
const router = express.Router();
const printerController = require('../controllers/printer.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

router.get(
  '/report-files',
  authenticateToken,
  printerController.getReportFiles
);
router.post(
  '/save-template',
  authenticateToken,
  printerController.saveTemplate
);
router.get(
  '/template/:filename',
  authenticateToken,
  printerController.getTemplate
);
router.post(
  '/submit-summary',
  authenticateToken,
  printerController.submitSummary
);
router.post('/submit-token', authenticateToken, printerController.submitToken);
router.get('/view-linking', authenticateToken, printerController.viewLinking);

module.exports = router;
