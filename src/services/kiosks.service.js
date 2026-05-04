const { client } = require("../config/database");

async function getAllKiosks() {
  const result = await client.query("SELECT * FROM kioskRegistration");
  return result.rows;
}

async function deleteKiosk(id) {
  const result = await client.query("DELETE FROM kioskRegistration WHERE id = $1", [id]);
  return result.rowCount;
}

async function registerKiosk(kioskId) {
  await client.query("INSERT INTO kioskRegistration (kiosk_id) VALUES ($1)", [kioskId]);
}

async function getDailyTokenCount(kioskId, date) {
  const result = await client.query(
    "SELECT * FROM dailytokencount WHERE kiosk_id = $1 AND date = $2",
    [kioskId, date]
  );
  return result.rows;
}

async function getSummaryReport() {
  const result = await client.query("SELECT * FROM summaryreport");
  return result.rows[0];
}

async function getAllDepartments() {
  const result = await client.query("SELECT * FROM departments");
  return result.rows;
}

async function getDailyTokensByDate(date) {
  const result = await client.query("SELECT * FROM dailytokencount WHERE date = $1", [date]);
  return result.rows;
}

module.exports = {
  getAllKiosks,
  deleteKiosk,
  registerKiosk,
  getDailyTokenCount,
  getSummaryReport,
  getAllDepartments,
  getDailyTokensByDate,
};
