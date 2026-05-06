const settingsService = require("../services/settings.service");

async function getFactorySettings(req, res) {
  try {
    const settings = await settingsService.getFactorySettings();
    res.json({ settings: settings || { calltoack: 90, acktoend: 90, endtocall: 90 } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch factory settings." });
  }
}

async function saveFactorySettings(req, res) {
  const { calltoack, acktoend, endtocall } = req.body;
  try {
    await settingsService.saveFactorySettings(calltoack, acktoend, endtocall);
    res.json({ message: "Factory settings updated." });
  } catch (error) {
    res.status(500).json({ error: "Failed to update factory settings." });
  }
}

async function getSoftwareSettings(req, res) {
  try {
    const settings = await settingsService.getSoftwareSettings();
    res.json({ settings: settings || { activate_recall: 'true', activate_reassign: 'true', activate_changedept: 'true' } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch software settings." });
  }
}

async function saveSoftwareSettings(req, res) {
  const { recall, reassign, changeDept } = req.body;
  try {
    await settingsService.saveSoftwareSettings(recall, reassign, changeDept);
    res.json({ message: "Software settings updated." });
  } catch (error) {
    res.status(500).json({ error: "Failed to update software settings." });
  }
}

async function getAutoLogout(req, res) {
  try {
    const settings = await settingsService.getAutoLogoutSettings();
    res.json({ settings: settings || { auto_logout_time: 30 } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch auto-logout settings." });
  }
}

async function saveAutoLogout(req, res) {
  const { autoLogoutTime } = req.body;
  const userId = req.user?.userId || '';
  const userName = req.user?.name || '';
  const userDepartment = req.user?.department || '';
  try {
    await settingsService.saveAutoLogoutSettings(userId, userName, userDepartment, autoLogoutTime);
    res.json({ message: "Auto-logout settings updated." });
  } catch (error) {
    console.error("Error saving auto-logout settings:", error);
    res.status(500).json({ error: "Failed to update auto-logout settings." });
  }
}

module.exports = {
  getFactorySettings,
  saveFactorySettings,
  getSoftwareSettings,
  saveSoftwareSettings,
  getAutoLogout,
  saveAutoLogout,
};
