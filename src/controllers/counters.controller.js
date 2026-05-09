const countersService = require('../services/counters.service');

async function getCounters(req, res) {
  try {
    const counters = await countersService.getAllCounters();
    const kiosks = await countersService.getAllKiosks();
    res.json({ counters, kiosks });
  } catch (error) {
    console.error('API counters error:', error);
    res.status(500).json({ error: 'Failed to load counters' });
  }
}

async function registerCounter(req, res) {
  const {
    counter,
    active,
    displayid,
    buzzer_time,
    buzzer_active,
    blink,
    ipaddress,
  } = req.body;
  try {
    await countersService.registerCounter(
      counter,
      active,
      displayid,
      buzzer_time,
      buzzer_active,
      blink,
      ipaddress
    );
    res.json({ message: 'Counter registered successfully' });
  } catch (err) {
    console.error('API counter register error:', err);
    res.status(500).json({ error: 'Failed to register counter.' });
  }
}

async function updateCounter(req, res) {
  const {
    id,
    counter,
    active,
    displayid,
    buzzer_time,
    buzzer_active,
    blink,
    ipaddress,
  } = req.body;
  if (!id) return res.status(400).json({ error: 'Counter ID is required.' });
  try {
    await countersService.updateCounter(
      id,
      counter,
      active,
      displayid,
      buzzer_time,
      buzzer_active,
      blink,
      ipaddress
    );
    res.json({ message: 'Counter updated successfully' });
  } catch (err) {
    console.error('API counter update error:', err);
    res.status(500).json({ error: 'Failed to update counter.' });
  }
}

async function deleteCounter(req, res) {
  const id = req.params.id;
  try {
    const rowCount = await countersService.deleteCounter(id);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Counter not found.' });
    }
    res.json({ message: 'Counter deleted successfully' });
  } catch (err) {
    console.error('API counter delete error:', err);
    res.status(500).json({ error: 'Failed to delete counter.' });
  }
}

module.exports = {
  getCounters,
  registerCounter,
  updateCounter,
  deleteCounter,
};
