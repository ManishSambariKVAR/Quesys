const express = require("express");
const router = express.Router();
const companyController = require("../controllers/company.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");
const { upload } = require("../middlewares/upload.middleware");

router.get("/", authenticateToken, companyController.getCompany);
router.post("/", authenticateToken, upload.single("logo"), companyController.updateCompany);

module.exports = router;
