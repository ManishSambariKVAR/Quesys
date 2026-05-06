const { client } = require("../config/database");

async function getFactorySettings() {
  const result = await client.query("SELECT * FROM factory_settings");
  return result.rows[0];
}

async function saveFactorySettings(calltoack, acktoend, endtocall) {
  const r = await client.query("SELECT id FROM factory_settings");
  if (r.rows.length === 0) {
    await client.query("INSERT INTO factory_settings(calltoack, acktoend, endtocall) VALUES($1, $2, $3)", [calltoack, acktoend, endtocall]);
  } else {
    await client.query("UPDATE factory_settings SET calltoack = $1, acktoend = $2, endtocall = $3 WHERE id = $4", [calltoack, acktoend, endtocall, r.rows[0].id]);
  }
}

async function getSoftwareSettings() {
  const result = await client.query("SELECT * FROM software_settings");
  return result.rows[0];
}

async function saveSoftwareSettings(recall, reassign, changeDept) {
  const r = await client.query("SELECT id FROM software_settings");
  if (r.rows.length === 0) {
    await client.query("INSERT INTO software_settings(activate_recall, activate_reassign, activate_changedept) VALUES($1, $2, $3)", [recall, reassign, changeDept]);
  } else {
    await client.query("UPDATE software_settings SET activate_recall = $1, activate_reassign = $2, activate_changedept = $3 WHERE id = $4", [recall, reassign, changeDept, r.rows[0].id]);
  }
}

async function getAutoLogoutSettings() {
  const result = await client.query("SELECT * FROM auto_logout_settings");
  return result.rows[0];
}

async function saveAutoLogoutSettings(userId, userName, userDepartment, autoLogoutTime) {
  const query = `
    INSERT INTO auto_logout_settings (user_id, user_name, user_department, auto_logout_time)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id)
    DO UPDATE SET 
      user_name = EXCLUDED.user_name,
      user_department = EXCLUDED.user_department,
      auto_logout_time = EXCLUDED.auto_logout_time;
  `;
  await client.query(query, [userId, userName, userDepartment, autoLogoutTime]);
}

module.exports = {
  getFactorySettings,
  saveFactorySettings,
  getSoftwareSettings,
  saveSoftwareSettings,
  getAutoLogoutSettings,
  saveAutoLogoutSettings,
};
