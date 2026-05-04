const express = require("express");
const router = express.Router();
const departmentsController = require("../controllers/departments.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

router.get("/", authenticateToken, departmentsController.getDepartments);
router.post("/register", authenticateToken, departmentsController.registerDepartment);
router.put("/update", authenticateToken, departmentsController.updateDepartment);
router.delete("/:id", authenticateToken, departmentsController.deleteDepartment);

module.exports = router;
