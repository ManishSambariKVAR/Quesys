const express = require("express");
const router = express.Router();
const otaController = require("../controllers/ota.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { upload } = require("../middlewares/upload.middleware");

router.get("/files", authenticateToken, otaController.getFiles);
router.post("/files", authenticateToken, upload.none(), otaController.saveFile);
router.delete("/files/:filename", authenticateToken, otaController.deleteFile);

router.get("/displays", authenticateToken, otaController.getDisplays);
router.post("/links", authenticateToken, otaController.saveLink);

module.exports = router;
