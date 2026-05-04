const reportsService = require("../services/reports.service");

async function getLogs(req, res) {
  const { fromDate, toDate } = req.query;
  try {
    const logs = await reportsService.getReportLogs(fromDate, toDate);
    const reassigned = await reportsService.getReassignedData();
    res.json({ logs, reassigned });
  } catch (error) {
    console.error("Error fetching report logs:", error);
    res.status(500).json({ error: "Failed to load log data." });
  }
}

async function getSummary(req, res) {
  const { fromDate, toDate } = req.query;
  try {
    const summary = await reportsService.getSummaryData(fromDate, toDate);
    const usernames = await reportsService.getUsernames();
    const departments = await reportsService.getDepartments();

    res.json({ summary, usernames, departments });
  } catch (error) {
    res.status(500).json({ error: "Failed to load summary data." });
  }
}

module.exports = {
  getLogs,
  getSummary,
};
