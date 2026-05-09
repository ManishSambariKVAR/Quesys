const { client } = require('../config/database');

async function checkPrinterSetting(reportType) {
  const result = await client.query(
    'SELECT id FROM printer_settings WHERE report_type = $1',
    [reportType]
  );
  return result.rows;
}

async function insertPrinterSetting(reportType, filename) {
  await client.query(
    'INSERT INTO printer_settings (report_type, uploadlink) VALUES ($1, $2)',
    [reportType, filename]
  );
}

async function updatePrinterSetting(reportType, filename) {
  await client.query(
    'UPDATE printer_settings SET uploadlink = $1 WHERE report_type = $2',
    [filename, reportType]
  );
}

async function getPrinterSetting(reportType) {
  const result = await client.query(
    'SELECT uploadlink FROM printer_settings WHERE report_type = $1',
    [reportType]
  );
  return result.rows[0];
}

module.exports = {
  checkPrinterSetting,
  insertPrinterSetting,
  updatePrinterSetting,
  getPrinterSetting,
};
