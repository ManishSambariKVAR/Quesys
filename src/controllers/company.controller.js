const fs = require("fs");
const path = require("path");
const companyService = require("../services/company.service");
const { ensureDirectoryExistence } = require("../utils/helpers");

async function getCompany(req, res) {
  try {
    const company = await companyService.getCompany();
    if (company) {
      res.json({
        companyName: company.company_name,
        logoPath: "/src/uploads/companyLogo.png"
      });
    } else {
      res.json({ companyName: "KVAR TECH", logoPath: null });
    }
  } catch (error) {
    console.error("API company error:", error);
    res.status(500).json({ error: "Failed to load company details" });
  }
}

async function updateCompany(req, res) {
  const companyName = req.body.companyName;

  try {
    const company = await companyService.getCompany();

    if (req.file) {
      const companyLogoPath = req.file.path;
      // Use process.cwd() instead of __dirname to avoid nesting issues
      const targetPath = path.join(process.cwd(), "src/uploads/companyLogo.png");
      ensureDirectoryExistence(path.dirname(targetPath));
      fs.copyFileSync(companyLogoPath, targetPath);
      fs.unlinkSync(companyLogoPath);
    }

    if (company) {
      await companyService.updateCompany(company.id, companyName);
    } else {
      await companyService.insertCompany(companyName, "src/uploads/companyLogo.png");
    }

    res.json({ message: "Company settings updated successfully" });
  } catch (error) {
    console.error("API company update error:", error);
    res.status(500).json({ error: "Failed to update company settings" });
  }
}

module.exports = {
  getCompany,
  updateCompany,
};
