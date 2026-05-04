const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const companyRoutes = require("./routes/company.routes");
const countersRoutes = require("./routes/counters.routes");
const departmentsRoutes = require("./routes/departments.routes");
const displaysRoutes = require("./routes/displays.routes");
const kiosksRoutes = require("./routes/kiosks.routes");
const otaRoutes = require("./routes/ota.routes");
const printerRoutes = require("./routes/printer.routes");
const reportsRoutes = require("./routes/reports.routes");
const settingsRoutes = require("./routes/settings.routes");
const tokensRoutes = require("./routes/tokens.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const tokensController = require("./controllers/tokens.controller");
const kiosksController = require("./controllers/kiosks.controller");
const authController = require("./controllers/auth.controller");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.endsWith(":7000") ||
        origin.endsWith(":5173")
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "KVAR", resave: false, saveUninitialized: false }));

app.use("/src/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/src/otaForTV", express.static(path.join(__dirname, "../src/otaForTV")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

// Direct login endpoint for backward compatibility
app.post("/api/login", authController.login);

// Mount Refactored Routes with /admin prefix
app.use("/api/auth", authRoutes); // Keep auth standard 

// Add /admin to all your dashboard-related routes
app.use("/api/admin/users", usersRoutes);
app.use("/api/admin/company", companyRoutes);
app.use("/api/admin/counters", countersRoutes);
app.use("/api/admin/departments", departmentsRoutes);
app.use("/api/admin/displays", displaysRoutes);
app.use("/api/admin/kiosks", kiosksRoutes);
app.use("/api/admin/ota", otaRoutes);
app.use("/api/admin/printer", printerRoutes);
app.use("/api/admin/reports", reportsRoutes);
app.use("/api/admin/settings", settingsRoutes);
app.use("/api/admin/tokens", tokensRoutes);

app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin", dashboardRoutes); 

// Legacy hardware endpoints (for kiosk devices)
app.get("/keypad", tokensController.generateToken);
app.get("/checkStack", tokensController.checkStack);
app.get("/kioskSummary", kiosksController.getKioskSummary);
app.get("/KioskRegistration", kiosksController.generateSerialNumber);
app.get("/KioskRegConfirm", kiosksController.confirmRegistration);
app.get("/AllData", kiosksController.getAllData);

module.exports = app;
