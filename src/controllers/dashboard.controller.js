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
      tokenData: tokenData,   // ✅ was 'tokenData'
      userLogs: userLogs,        // ✅ was 'userLogs'
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
      // ✅ FIX: Provided a complete dummy object so the frontend doesn't render "Pundefined"
      data: dailyTokens.length > 0 ? dailyTokens : [{ 
        token_total_count: 0,
        token_current_count: 0, 
        token_skip_count: 0,
        reassign_token: 0,
        dep: userDepartment 
      }],
      user: { id: userId, department: userDepartment, kioskId },
      currDt,
      prefix: departmentPrefix?.dep || "",
      // ✅ FIX: Fallback for token_log to ensure an array is always returned
      token_log: updatedTokenLogs.length > 0 ? updatedTokenLogs : [],
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
