const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");
const { authenticateToken } = require("../middlewares/auth.middleware");

router.get("/", authenticateToken, usersController.getAllUsers);
router.post("/register", authenticateToken, usersController.registerUser);
router.put("/update", authenticateToken, usersController.updateUser);
router.delete("/:id", authenticateToken, usersController.deleteUser);
router.post("/change-department",authenticateToken,usersController.changeDepartment);

module.exports = router;
