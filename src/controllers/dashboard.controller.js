const dashboardService = require("../services/dashboard.service");
const { getCurrentDate, getCurrentTime } = require("../utils/helpers");

async function getDashboardData(req, res) {
  try {
    const currDt = getCurrentDate();
    const currTm = getCurrentTime();

    const factorySettings = await dashboardService.getFactorySettings();
    const departments = await dashboardService.getDepartments();
    const companies = await dashboardService.getCompanies();
    const autoLogoutSettings = await dashboardService.getAutoLogoutSettings();
    const softwareSettings = await dashboardService.getSoftwareSettings();

    res.json({
      currDt,
      currTm,
      factorySettings: {
        call: factorySettings?.calltoack || 90,
        ack: factorySettings?.acktoend || 90,
        end: factorySettings?.endtocall || 90,
      },
      departments,
      companyName: companies[0]?.company_name || "KVAR Tech",
      autoLogoutTime: autoLogoutSettings?.auto_logout_time || 30,
      featureFlags: {
        recallBtn: softwareSettings?.activate_recall ?? true,
        reassignBtn: softwareSettings?.activate_reassign ?? true,
        changeDept: softwareSettings?.activate_changedept ?? true,
      },
    });
  } catch (error) {
    console.error("API dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
}

async function getAdminData(req, res) {
  try {
    const currDt = getCurrentDate();
    const currTm = getCurrentTime();

    const tokenData = await dashboardService.getTokenDataByDate(currDt);
    const userLogs = await dashboardService.getUserLogsByDate(currDt);
    const companies = await dashboardService.getCompanies();

    res.json({
      currDt,
      currTm,
      departments: tokenData,   // ✅ was 'tokenData'
      userLog: userLogs,        // ✅ was 'userLogs'
      companyName: companies[0]?.company_name || "KVAR Tech",
    });
  } catch (error) {
    console.error("API admin error:", error);
    res.status(500).json({ error: "Failed to load admin data" });
  }
}

async function updateData(req, res) {
  try {
    const { userId, userDepartment, kioskId } = req.query;
    const currDt = getCurrentDate();

    const dailyTokens = await dashboardService.getDailyTokenCount(kioskId, userDepartment, currDt);
    const tokenLogs = await dashboardService.getTokenLogs(kioskId, userDepartment, currDt);
    const departments = await dashboardService.getDepartmentsByKiosk(kioskId);
    const departmentPrefix = await dashboardService.getDepartmentPrefix(kioskId, userDepartment);

    const updatedTokenLogs = tokenLogs.map((log) => {
      let prefix = "";
      for (let i = 0; i < departments.length; i++) {
        if (departments[i].department === log.dep || departments[i].department === log.reassign_dep) {
          prefix = departments[i].dep;
          break;
        }
      }
      return { ...log, prefix };
    });

    res.json({
      data: dailyTokens.length > 0 ? dailyTokens : [{ token_total_count: 0 }],
      user: { id: userId, department: userDepartment, kioskId },
      currDt,
      prefix: departmentPrefix?.dep || "",
      token_log: updatedTokenLogs,
    });
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).json({ error: "Failed to update data" });
  }
}

module.exports = {
  getDashboardData,
  getAdminData,
  updateData,
};
