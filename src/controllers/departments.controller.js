const departmentsService = require('../services/departments.service');

async function getDepartments(req, res) {
  try {
    const departments = await departmentsService.getAllDepartments();
    const kiosks = await departmentsService.getAllKiosks();
    res.json({ departments, kiosks });
  } catch (error) {
    console.error('API departments error:', error);
    res.status(500).json({ error: 'Failed to load departments' });
  }
}

async function registerDepartment(req, res) {
  const { department, kioskKey, depPrefix, kioskId } = req.body;
  if (!department || !kioskKey || !depPrefix || !kioskId) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    await departmentsService.registerDepartment(
      department,
      kioskKey,
      depPrefix,
      kioskId
    );
    res.json({ message: 'Department registered successfully' });
  } catch (err) {
    console.error('API dept register error:', err);
    res.status(500).json({ error: 'Failed to register department.' });
  }
}

async function updateDepartment(req, res) {
  const { id, department, kioskKey, depPrefix, kioskId } = req.body;
  if (!id || !department || !kioskKey || !depPrefix || !kioskId) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    await departmentsService.updateDepartment(
      id,
      department,
      kioskKey,
      depPrefix,
      kioskId
    );
    res.json({ message: 'Department updated successfully' });
  } catch (err) {
    console.error('API dept update error:', err);
    res.status(500).json({ error: 'Failed to update department.' });
  }
}

async function deleteDepartment(req, res) {
  const id = req.params.id;
  try {
    const rowCount = await departmentsService.deleteDepartment(id);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Department not found.' });
    }
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    console.error('API dept delete error:', err);
    res.status(500).json({ error: 'Failed to delete department.' });
  }
}

module.exports = {
  getDepartments,
  registerDepartment,
  updateDepartment,
  deleteDepartment,
};
