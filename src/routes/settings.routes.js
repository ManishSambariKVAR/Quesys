const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

router.get("/factory", authenticateToken, settingsController.getFactorySettings);
router.post("/factory", authenticateToken, settingsController.saveFactorySettings);

router.get("/software", authenticateToken, settingsController.getSoftwareSettings);
router.post("/software", authenticateToken, settingsController.saveSoftwareSettings);

router.get("/auto-logout", authenticateToken, settingsController.getAutoLogout);
router.post("/auto-logout", authenticateToken, settingsController.saveAutoLogout);

module.exports = router;
