const { client } = require('../config/database');

async function getAllDepartments() {
  const result = await client.query('SELECT * FROM departments');
  return result.rows;
}

async function getAllKiosks() {
  const result = await client.query('SELECT * FROM kioskRegistration');
  return result.rows;
}

async function registerDepartment(department, kioskKey, depPrefix, kioskId) {
  const insertQuery =
    'INSERT INTO departments (department, kiosk_key, dep, kiosk_id) VALUES ($1, $2, $3, $4)';
  await client.query(insertQuery, [department, kioskKey, depPrefix, kioskId]);
}

async function updateDepartment(id, department, kioskKey, depPrefix, kioskId) {
  const updateQuery =
    'UPDATE departments SET department = $1, kiosk_key = $2, dep = $3, kiosk_id = $4 WHERE id = $5';
  await client.query(updateQuery, [
    department,
    kioskKey,
    depPrefix,
    kioskId,
    id,
  ]);
}

async function deleteDepartment(id) {
  const result = await client.query('DELETE FROM departments WHERE id = $1', [
    id,
  ]);
  return result.rowCount;
}

module.exports = {
  getAllDepartments,
  getAllKiosks,
  registerDepartment,
  updateDepartment,
  deleteDepartment,
};
