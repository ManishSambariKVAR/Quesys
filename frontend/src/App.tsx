import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import DeptManagement from './pages/DeptManagement';
import CounterManagement from './pages/CounterManagement';
import CompanySettings from './pages/CompanySettings';
import TVOTAManagement from './pages/TVOTAManagement';
import KioskSettings from './pages/KioskSettings';
import SystemSettings from './pages/SystemSettings';
import WaitingRoomSettings from './pages/WaitingRoomSettings';
import UserReports from './pages/UserReports';
import SummaryReports from './pages/SummaryReports';
import GrievanceReports from './pages/GrievanceReports';
import OperatorReports from './pages/OperatorReports';
import PrinterSettings from './pages/PrinterSettings';
import ChangeDepartment from './pages/ChangeDepartment';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import AutoLogoutSettings from './pages/AutoLogoutSettings';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — Normal user */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="change-dept" element={<ChangeDepartment />} />
          </Route>

          {/* Protected — Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="departments" element={<DeptManagement />} />
            <Route path="counters" element={<CounterManagement />} />
            <Route path="company" element={<CompanySettings />} />
            <Route path="ota" element={<TVOTAManagement />} />
            <Route path="kiosk" element={<KioskSettings />} />
            <Route path="system-settings" element={<SystemSettings />} />
            <Route path="waiting-room" element={<WaitingRoomSettings />} />
            <Route path="auto-logout" element={<AutoLogoutSettings />} />
            <Route path="user-reports" element={<UserReports />} />
            <Route path="summary-reports" element={<SummaryReports />} />
            <Route path="grievance-reports" element={<GrievanceReports />} />
            <Route path="operator-reports" element={<OperatorReports />} />
            <Route path="printer-settings" element={<PrinterSettings />} />
          </Route>

          {/* Default — redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
