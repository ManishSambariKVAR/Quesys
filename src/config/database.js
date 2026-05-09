const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

async function connectDatabase() {
  try {
    await client.connect();
    console.log('Connected to the database successfully');
  } catch (err) {
    console.error('Error connecting to the database:', err);
    throw err;
  }
}

module.exports = {
  client,
  connectDatabase,
};
