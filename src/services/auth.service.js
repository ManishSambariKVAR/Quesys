const { client } = require("../config/database");

async function getUserLogsByDate(date) {
  const query = "SELECT * FROM userlogs WHERE datetime = $1 AND log = 1;";
  const result = await client.query(query, [date]);
  return result.rows;
}

async function getAllCounters() {
  const query = "SELECT * FROM counterdisplay;";
  const result = await client.query(query);
  return result.rows;
}

async function getUserById(userId) {
  const query = "SELECT * FROM users WHERE userId = $1";
  const result = await client.query(query, [userId]);
  return result.rows;
}

async function getDepartmentByName(departmentName) {
  const query = "SELECT * FROM departments WHERE department = $1";
  const result = await client.query(query, [departmentName]);
  return result.rows;
}

module.exports = {
  getUserLogsByDate,
  getAllCounters,
  getUserById,
  getDepartmentByName,
};
