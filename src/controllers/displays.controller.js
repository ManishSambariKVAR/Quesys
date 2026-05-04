const displaysService = require("../services/displays.service");

async function getWaitingRoomDisplays(req, res) {
  try {
    const displays = await displaysService.getWaitingRoomDisplays();
    res.json({ displays });
  } catch (error) {
    console.error("API waiting room displays error:", error);
    res.status(500).json({ error: "Failed to load waiting room displays." });
  }
}

async function addWaitingRoomDisplay(req, res) {
  const { displayId, displayStatus, IP } = req.body;
  if (!displayId || !displayStatus || !IP) return res.status(400).json({ error: "Missing required fields" });
  try {
    await displaysService.addWaitingRoomDisplay(displayId, displayStatus, IP);
    res.json({ message: "Display added successfully" });
  } catch (error) {
    console.error("API waiting room add error:", error);
    res.status(500).json({ error: "Failed to add display" });
  }
}

async function updateWaitingRoomDisplay(req, res) {
  const id = req.params.id;
  const { displayId, displayStatus, IP } = req.body;
  if (!displayId || !displayStatus || !IP) return res.status(400).json({ error: "Missing required fields" });
  try {
    await displaysService.updateWaitingRoomDisplay(id, displayId, displayStatus, IP);
    res.json({ message: "Display updated successfully" });
  } catch (error) {
    console.error("API waiting room update error:", error);
    res.status(500).json({ error: "Failed to update display" });
  }
}

async function deleteWaitingRoomDisplay(req, res) {
  const id = req.params.id;
  try {
    await displaysService.deleteWaitingRoomDisplay(id);
    res.json({ message: "Display deleted successfully" });
  } catch (error) {
    console.error("API waiting room delete error:", error);
    res.status(500).json({ error: "Failed to delete display" });
  }
}

module.exports = {
  getWaitingRoomDisplays,
  addWaitingRoomDisplay,
  updateWaitingRoomDisplay,
  deleteWaitingRoomDisplay,
};
