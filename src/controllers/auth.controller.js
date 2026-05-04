const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authService = require("../services/auth.service");
const { getCurrentDate, findAvailableCounters } = require("../utils/helpers");
const { JWT_SECRET, DEFAULT_USER_ID, DEFAULT_PASSWORD } = require("../config/env");

async function getAvailableCounters(req, res) {
  try {
    const currDt = getCurrentDate();
    const data_user_counter = await authService.getUserLogsByDate(currDt);
    const data_all_counter = await authService.getAllCounters();

    const { availableCounters, error } = findAvailableCounters(
      data_all_counter,
      data_user_counter
    );

    res.json({ counters: availableCounters, error });
  } catch (error) {
    console.error("Error fetching counters:", error);
    res.status(500).json({ error: "Failed to fetch counters" });
  }
}

async function login(req, res) {
  try {
    const { userId, password, counter } = req.body;

    // Root admin check
    if (userId === DEFAULT_USER_ID && password === DEFAULT_PASSWORD) {
      const token = jwt.sign(
        { id: "000", name: "kvar", userId: "000", adminLevel: "Admin", department: "", counter: "" },
        JWT_SECRET,
        { expiresIn: "8h" }
      );
      return res.json({
        success: true,
        token,
        user: { id: "000", name: "kvar", userId: "000", adminLevel: "Admin", department: "", counter: "" },
        redirect: "/admin",
      });
    }

    // Fetch user from DB
    const users = await authService.getUserById(userId);
    if (users.length !== 1) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = users[0];

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Invalid credentials. Please try again." });
    }

    // Admin user
    if (user.adminlevel === "Admin") {
      const token = jwt.sign(
        { id: userId, name: user.name, userId, adminLevel: user.adminlevel, department: user.userdept, counter: "" },
        JWT_SECRET,
        { expiresIn: "8h" }
      );
      return res.json({
        success: true,
        token,
        user: { id: userId, name: user.name, userId, adminLevel: user.adminlevel, department: user.userdept, counter: "" },
        redirect: "/admin",
      });
    }

    // Normal user — need counter and department kiosk
    const departments = await authService.getDepartmentByName(user.userdept);
    const kioskData = departments[0];

    if (!kioskData) {
      return res.status(400).json({ error: "Wrong Counter — no kiosk mapped to department" });
    }

    if (!counter) {
      return res.status(400).json({ error: "Counter is undefined. Please select a valid counter." });
    }

    const payload = {
      id: userId,
      name: user.name,
      userId,
      adminLevel: user.adminlevel,
      department: user.userdept,
      counter,
      kioskId: kioskData.kiosk_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

    return res.json({
      success: true,
      token,
      user: payload,
      redirect: "/dashboard",
    });
  } catch (err) {
    console.error("API LOGIN ERROR:", err.message);
    return res.status(500).json({ error: "Invalid credentials. Please try again." });
  }
}

module.exports = {
  getAvailableCounters,
  login,
};
