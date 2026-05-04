const { client } = require("../config/database");

async function getAllCounters() {
  const result = await client.query("SELECT * FROM counterdisplay");
  return result.rows;
}

async function getAllKiosks() {
  const result = await client.query("SELECT * FROM kioskRegistration");
  return result.rows;
}

async function registerCounter(counter, active, displayid, buzzer_time, buzzer_active, blink, ipaddress) {
  const insertQuery = `INSERT INTO counterdisplay 
    (counter, active, displayid, buzzer_time, buzzer_active, blink, ipaddress) 
    VALUES ($1, $2, $3, $4, $5, $6, $7)`;
  await client.query(insertQuery, [counter, active, displayid, buzzer_time, buzzer_active, blink, ipaddress]);
}

async function updateCounter(id, counter, active, displayid, buzzer_time, buzzer_active, blink, ipaddress) {
  const updateQuery = `
    UPDATE counterdisplay 
    SET counter = $1, active = $2, displayid = $3, 
        buzzer_time = $4, buzzer_active = $5, blink = $6, ipaddress = $7
    WHERE id = $8
  `;
  await client.query(updateQuery, [counter, active, displayid, buzzer_time, buzzer_active, blink, ipaddress, id]);
}

async function deleteCounter(id) {
  const result = await client.query("DELETE FROM counterdisplay WHERE id = $1", [id]);
  return result.rowCount;
}

module.exports = {
  getAllCounters,
  getAllKiosks,
  registerCounter,
  updateCounter,
  deleteCounter,
};
