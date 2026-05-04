const { client } = require("../config/database");

async function getAllUsers() {
  const result = await client.query("SELECT * FROM users");
  return result.rows;
}

async function getAllDepartments() {
  const result = await client.query("SELECT * FROM departments");
  return result.rows;
}

async function createUser(name, userId, hashedPassword, userDept, adminlevel) {
  const insertQuery = `INSERT INTO users (name, userId, password, userDept, adminLevel) VALUES ($1, $2, $3, $4, $5)`;
  await client.query(insertQuery, [name, userId, hashedPassword, userDept, adminlevel]);
}

async function updateUser(id, name, userId, userDept, adminLevel) {
  const updateQuery = `UPDATE users SET name = $1, userId = $2, userDept = $3, adminLevel = $4 WHERE id = $5`;
  await client.query(updateQuery, [name, userId, userDept, adminLevel, id]);
}

async function deleteUser(id) {
  const result = await client.query("DELETE FROM users WHERE id = $1", [id]);
  return result.rowCount;
}

async function changeDepartment(userId, newDepartment) {
  const query = `
    UPDATE users 
    SET userDept = $1 
    WHERE userId = $2
  `;

  await client.query(query, [newDepartment, userId]);
}

module.exports = {
  getAllUsers,
  getAllDepartments,
  createUser,
  updateUser,
  deleteUser,
  changeDepartment,
};
