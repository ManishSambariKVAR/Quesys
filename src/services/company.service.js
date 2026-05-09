const { client } = require('../config/database');

async function getCompany() {
  const result = await client.query(
    'SELECT * FROM companies ORDER BY id ASC LIMIT 1'
  );
  return result.rows[0];
}

async function updateCompany(id, companyName) {
  const updateQuery = 'UPDATE companies SET company_name = $1 WHERE id = $2';
  await client.query(updateQuery, [companyName, id]);
}

async function insertCompany(companyName, logoPath) {
  const insertQuery =
    'INSERT INTO companies (company_name, logo_path) VALUES ($1, $2)';
  await client.query(insertQuery, [companyName, logoPath]);
}

module.exports = {
  getCompany,
  updateCompany,
  insertCompany,
};
