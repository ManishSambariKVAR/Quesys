const { client } = require('../config/database');

async function getReportLogs(fromDate, toDate) {
  let query =
    "SELECT *, info::json AS info_json FROM token_logs WHERE user_id != '0'";
  const queryParams = [];

  if (fromDate) {
    queryParams.push(fromDate);
    query += ` AND DATE(call_time) >= $${queryParams.length}`;
  }
  if (toDate) {
    queryParams.push(toDate);
    query += ` AND DATE(call_time) <= $${queryParams.length}`;
  }
  query += ' ORDER BY call_time DESC';

  const result = await client.query(query, queryParams);
  return result.rows;
}

async function getReassignedData() {
  const result = await client.query('SELECT * FROM reassignedTokenData');
  return result.rows;
}

async function getSummaryData(fromDate, toDate) {
  let query = 'SELECT * FROM dailytokencount WHERE 1=1';
  const queryParams = [];

  if (fromDate) {
    queryParams.push(fromDate);
    query += ` AND date >= $${queryParams.length}`;
  }
  if (toDate) {
    queryParams.push(toDate);
    query += ` AND date <= $${queryParams.length}`;
  }

  const result = await client.query(query, queryParams);
  return result.rows;
}

async function getUsernames() {
  const result = await client.query(
    "SELECT name FROM users WHERE adminlevel != 'Admin'"
  );
  return result.rows.map((u) => u.name);
}

async function getDepartments() {
  const result = await client.query('SELECT department FROM departments');
  return result.rows.map((d) => d.department);
}

module.exports = {
  getReportLogs,
  getReassignedData,
  getSummaryData,
  getUsernames,
  getDepartments,
};
