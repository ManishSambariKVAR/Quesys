const fs = require("fs");
const path = require("path");
const otaService = require("../services/ota.service");
const { ensureDirectoryExistence } = require("../utils/helpers");

async function getFiles(req, res) {
  try {
    const dirPath = path.join(process.cwd(), "src/uploads/OTAForTV/");
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const files = fs.readdirSync(dirPath).filter(file => fs.statSync(path.join(dirPath, file)).isFile());
    res.json({ files });
  } catch (error) {
    console.error("API OTA files error:", error);
    res.status(500).json({ error: "Failed to list OTA files" });
  }
}

async function saveFile(req, res) {
  const { content, filename } = req.body;
  if (!content || !filename) return res.status(400).json({ error: "Content and filename are required." });

  try {
    const dirPath = path.join(process.cwd(), "src/uploads/OTAForTV/");
    ensureDirectoryExistence(dirPath);
    fs.writeFileSync(path.join(dirPath, filename), content);
    res.json({ message: "OTA template saved successfully." });
  } catch (error) {
    console.error("API OTA save error:", error);
    res.status(500).json({ error: "Failed to save OTA template." });
  }
}

async function deleteFile(req, res) {
  try {
    const filePath = path.join(process.cwd(), "src/uploads/OTAForTV/", req.params.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: "OTA file deleted." });
    } else {
      res.status(404).json({ error: "File not found." });
    }
  } catch (error) {
    console.error("API OTA delete error:", error);
    res.status(500).json({ error: "Failed to delete OTA file." });
  }
}

async function getDisplays(req, res) {
  try {
    const waitingRoom = await otaService.getWaitingRoomDisplays();
    const counters = await otaService.getCounterDisplays();
    const assigned = await otaService.getOTADisplayLinks();

    const allDisplays = [
      ...waitingRoom.map(r => ({ ...r, type: 'Waiting Room' })),
      ...counters.map(r => ({ ...r, type: 'Counter' }))
    ];

    res.json({ displays: allDisplays, linked: assigned });
  } catch (error) {
    console.error("API OTA displays error:", error);
    res.status(500).json({ error: "Failed to fetch displays for OTA." });
  }
}

async function saveLink(req, res) {
  const { displayid, filename, status } = req.body;
  if (!displayid || !filename || !status) return res.status(400).json({ error: "Missing required fields." });

  try {
    const exists = await otaService.checkOTALink(displayid);
    if (exists) {
      await otaService.updateOTALink(displayid, filename, status);
    } else {
      await otaService.insertOTALink(displayid, filename, status);
    }
    res.json({ message: "OTA display link saved successfully." });
  } catch (error) {
    console.error("API OTA link error:", error);
    res.status(500).json({ error: "Failed to link OTA to display." });
  }
}

module.exports = {
  getFiles,
  saveFile,
  deleteFile,
  getDisplays,
  saveLink,
};
