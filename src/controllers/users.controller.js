const bcrypt = require("bcrypt");
const usersService = require("../services/users.service");

async function getAllUsers(req, res) {
  try {
    const users = await usersService.getAllUsers();
    const departments = await usersService.getAllDepartments();
    res.json({ users, departments });
  } catch (error) {
    console.error("API users error:", error);
    res.status(500).json({ error: "Failed to load users" });
  }
}

async function registerUser(req, res) {
  const { name, userId, password, confirmPassword, userDept, adminlevel } = req.body;

  if (!name || !userId || !password || !confirmPassword || password !== confirmPassword) {
    return res.status(400).json({ error: "All fields are required, and passwords must match." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await usersService.createUser(name, userId, hashedPassword, userDept, adminlevel);
    res.json({ message: "User registered successfully" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "User ID already exists." });
    }
    console.error("API register error:", err);
    res.status(500).json({ error: "Server error during registration." });
  }
}

async function updateUser(req, res) {
  const { userId, name, userid, userDept, adminLevel } = req.body;

  if (!userId || !name || !userid || !userDept || !adminLevel) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    await usersService.updateUser(userId, name, userid, userDept, adminLevel);
    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error("API update user error:", err);
    res.status(500).json({ error: "Server error during user update." });
  }
}

async function deleteUser(req, res) {
  const id = req.params.id;
  try {
    const rowCount = await usersService.deleteUser(id);
    if (rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("API delete user error:", err);
    res.status(500).json({ error: "Failed to delete user." });
  }
}

async function changeDepartment(req, res) {
  const { userId, newDepartment } = req.body;

  await usersService.changeDepartment(userId, newDepartment);

  res.json({ message: "Department updated successfully" });
}

module.exports = {
  getAllUsers,
  registerUser,
  updateUser,
  deleteUser,
  changeDepartment,
};
