const fs = require("fs");
const path = require("path");
const printerService = require("../services/printer.service");
const { ensureDirectoryExistence } = require("../utils/helpers");

async function getReportFiles(req, res) {
  try {
    const dir = path.join(process.cwd(), "src", "uploads", "printerReport");
    if (!fs.existsSync(dir)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(dir).filter(f => !f.startsWith("."));
    res.json({ files });
  } catch (error) {
    console.error("Error listing printer report files:", error);
    res.status(500).json({ error: "Failed to list report files." });
  }
}

async function saveTemplate(req, res) {
  const { content, filename } = req.body;
  if (!content || !filename) return res.status(400).json({ error: "Content and filename required." });
  try {
    const dir = path.join(process.cwd(), "src", "uploads", "printerReport");
    ensureDirectoryExistence(dir);
    fs.writeFileSync(path.join(dir, filename), content, "utf-8");
    res.json({ message: "Template saved successfully." });
  } catch (error) {
    console.error("Error saving printer template:", error);
    res.status(500).json({ error: "Failed to save template." });
  }
}

async function getTemplate(req, res) {
  try {
    const filePath = path.join(process.cwd(), "src", "uploads", "printerReport", req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });
    const content = fs.readFileSync(filePath, "utf-8");
    res.json({ content, filename: req.params.filename });
  } catch (error) {
    res.status(500).json({ error: "Failed to read template." });
  }
}

async function submitSummary(req, res) {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "Filename required." });
  try {
    const rows = await printerService.checkPrinterSetting("summary");
    if (rows.length === 0) {
      await printerService.insertPrinterSetting("summary", filename);
    } else {
      await printerService.updatePrinterSetting("summary", filename);
    }
    res.json({ message: "Summary report linked successfully." });
  } catch (error) {
    console.error("Error submitting summary report:", error);
    res.status(500).json({ error: "Failed to link summary report." });
  }
}

async function submitToken(req, res) {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "Filename required." });
  try {
    const rows = await printerService.checkPrinterSetting("token");
    if (rows.length === 0) {
      await printerService.insertPrinterSetting("token", filename);
    } else {
      await printerService.updatePrinterSetting("token", filename);
    }
    res.json({ message: "Token report linked successfully." });
  } catch (error) {
    console.error("Error submitting token report:", error);
    res.status(500).json({ error: "Failed to link token report." });
  }
}

async function viewLinking(req, res) {
  try {
    const summarySetting = await printerService.getPrinterSetting("summary");
    const tokenSetting = await printerService.getPrinterSetting("token");
    
    res.json({
      summary: summarySetting?.uploadlink || "Not configured",
      token: tokenSetting?.uploadlink || "Not configured"
    });
  } catch (error) {
    console.error("Error fetching report linking:", error);
    res.status(500).json({ error: "Failed to load report linking." });
  }
}

module.exports = {
  getReportFiles,
  saveTemplate,
  getTemplate,
  submitSummary,
  submitToken,
  viewLinking,
};
