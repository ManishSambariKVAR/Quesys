const kiosksService = require('../services/kiosks.service');
const { getCurrentDate, padNumberWithZeros } = require('../utils/helpers');

async function getKiosks(req, res) {
  try {
    const kiosks = await kiosksService.getAllKiosks();
    res.json({ kiosks });
  } catch (error) {
    console.error('API kiosk fetch error:', error);
    res.status(500).json({ error: 'Failed to load kiosks' });
  }
}

async function deleteKiosk(req, res) {
  const { id } = req.params;
  try {
    const rowCount = await kiosksService.deleteKiosk(id);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Kiosk not found.' });
    }
    res.json({ message: 'Kiosk deleted successfully' });
  } catch (error) {
    console.error('API kiosk delete error:', error);
    res.status(500).json({ error: 'Failed to delete kiosk.' });
  }
}

async function generateSerialNumber(req, res) {
  console.log('➡️ generateSerialNumber called');

  try {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    console.log('🎲 Generated random number:', randomNumber);

    const serialNumber = `KVAR${randomNumber}`;
    console.log('🏷️ Generated serial number:', serialNumber);

    const responseText = `Regi=${serialNumber}`;
    console.log('📤 Sending response:', responseText);

    res.status(200).send(responseText);
  } catch (error) {
    console.error('💥 Error during serial number generation:', error);
    res.status(500).send('Internal server error');
  }
}

async function confirmRegistration(req, res) {
  console.log('➡️ confirmRegistration called with query:', req.query);

  try {
    const { KioskId } = req.query;

    console.log('🧩 Extracted KioskId:', KioskId);

    if (!KioskId) {
      console.warn('⚠️ Missing KioskId in request');
      return res.status(400).send('KioskId is required');
    }

    console.log('📡 Calling registerKiosk service...');
    const result = await kiosksService.registerKiosk(KioskId);

    console.log('✅ Kiosk registration result:', result);

    console.log('📤 Sending response: OK');
    res.status(200).send('OK');
  } catch (error) {
    console.error('💥 Error during Kiosk registration:', error);
    res.status(500).send('Internal server error');
  }
}

async function getKioskSummary(req, res) {
  try {
    const { kioskId } = req.query;
    const currDt = getCurrentDate();
    const data = await kiosksService.getDailyTokenCount(kioskId, currDt);
    const summaryReport = await kiosksService.getSummaryReport();

    res.set('Content-Type', 'text/plain').send(`Print:Summary for ${kioskId}`);
  } catch (error) {
    console.error('Error processing kioskSummary:', error);
    res.status(500).send('Internal Server Error');
  }
}

async function getAllData(req, res) {
  try {
    const currDt = getCurrentDate();
    const departments = await kiosksService.getAllDepartments();
    const dailyTokens = await kiosksService.getDailyTokensByDate(currDt);

    let departmentCountMap = {};
    if (dailyTokens.length > 0) {
      departmentCountMap = dailyTokens.reduce((map, item) => {
        map[item.dep] = item.token_total_count;
        return map;
      }, {});
    }

    const resultArray = departments.map((item) => {
      const tokenCount = departmentCountMap.hasOwnProperty(item.department)
        ? departmentCountMap[item.department]
        : '000';
      const final_new_count = padNumberWithZeros(tokenCount, 3);
      return `${item.department}:${item.dep + final_new_count}:${item.kiosk_key}`;
    });

    const resultString = resultArray.join(', ');
    res.set('Content-Type', 'text/plain').send(resultString);
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  getKiosks,
  deleteKiosk,
  generateSerialNumber,
  confirmRegistration,
  getKioskSummary,
  getAllData,
};
