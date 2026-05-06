const { client } = require("../config/database");

async function getFactorySettings() {
  const result = await client.query("SELECT * FROM factory_settings");
  return result.rows[0];
}

async function getDepartments() {
  const result = await client.query("SELECT * FROM departments");
  return result.rows;
}

async function getCompanies() {
  const result = await client.query("SELECT * FROM companies");
  return result.rows;
}

async function getAutoLogoutSettings() {
  const result = await client.query("SELECT * FROM auto_logout_settings");
  return result.rows[0];
}

async function getSoftwareSettings() {
  const result = await client.query("SELECT * FROM software_settings");
  return result.rows[0];
}

async function getTokenDataByDate(date) {
  const result = await client.query("SELECT * FROM dailytokencount WHERE date = $1", [date]);
  return result.rows;
}

async function getUserLogsByDate(date) {
  const result = await client.query("SELECT * FROM userlogs WHERE datetime = $1", [date]);
  return result.rows;
}

async function getDailyTokenCount(kioskId, department, date) {
  const result = await client.query(
    "SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND dep = $2 AND date = $3",
    [kioskId, department, date]
  );
  return result.rows;
}

async function getTokenLogs(kioskId, department, date) {
  const result = await client.query(
    `SELECT * FROM token_logs 
     WHERE kiosk_id = $1 AND (dep = $2 OR reassign_dep = $2) AND DATE(generated_time) = $3`,
    [kioskId, department, date]
  );
  return result.rows;
}

async function getDepartmentsByKiosk(kioskId) {
  const result = await client.query("SELECT * FROM departments WHERE kiosk_id = $1", [kioskId]);
  return result.rows;
}

async function getDepartmentPrefix(kioskId, department) {
  const result = await client.query(
    "SELECT * FROM departments WHERE kiosk_id = $1 AND department = $2",
    [kioskId, department]
  );
  return result.rows[0];
}

async function trackUserLogin(userId, department, counter, date) {
  try {
    const check = await client.query(
      "SELECT * FROM userlogs WHERE datetime = $1 AND userid = $2 AND department = $3",
      [date, userId, department]
    );

    if (check.rows && check.rows.length > 0) {
      await client.query(
        `UPDATE userlogs SET counter = $1, updatedat = CURRENT_TIMESTAMP, log = 1 
         WHERE datetime = $2 AND department = $3 AND userid = $4`,
        [counter, date, department, userId]
      );
    } else {
      await client.query(
        `INSERT INTO userlogs (counter, department, userId, datetime, updatedat, log)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 1)`,
        [counter, department, userId, date]
      );
    }
  } catch (error) {
    console.error("Error tracking user login:", error);
  }
}

module.exports = {
  getFactorySettings,
  getDepartments,
  getCompanies,
  getAutoLogoutSettings,
  getSoftwareSettings,
  getTokenDataByDate,
  getUserLogsByDate,
  getDailyTokenCount,
  getTokenLogs,
  getDepartmentsByKiosk,
  getDepartmentPrefix,
  trackUserLogin,
};
