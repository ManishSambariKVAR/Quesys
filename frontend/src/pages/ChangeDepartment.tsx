import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './ChangeDepartment.css';

interface Department {
  department: string;
}

export default function ChangeDepartment() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/admin/departments');
      console.log(res.data);
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDept(e.target.value);
  };

  const handleSubmit = async () => {
    if (!selectedDept || !user?.userId) return;

    try {
      setLoading(true);
      await api.post('/admin/users/change-department', {
        userId: user.userId,
        newDepartment: selectedDept,
      });
      setMessage(
        'Department changed successfully! Please re-login for changes to take effect.'
      );
      setTimeout(() => {
        window.location.href = '/login'; // Auto redirect after change
      }, 1500);
    } catch {
      setMessage('Failed to change department.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-dept-wrapper" style={{ marginTop: '20px' }}>
      {message && (
        <div
          className={`alert ${message.includes('Failed') ? 'alert-danger' : 'alert-success'}`}
          style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}
        >
          {message}
        </div>
      )}

      <div className="form-container">
        <div className="form-group">
          <input
            type="text"
            value={user?.userId || ''}
            readOnly
            className="custom-input"
            placeholder="User ID"
          />
        </div>

        <div className="form-group">
          <select
            value={selectedDept}
            onChange={handleDepartmentChange}
            disabled={loading}
            className="custom-input"
          >
            <option value="" disabled>
              Select Your Department
            </option>
            {departments.map((d) => (
              <option key={d.department} value={d.department}>
                {d.department}
              </option>
            ))}
          </select>
        </div>

        <center>
          <button
            className="btn btn-primary submit-btn-dept w-100"
            disabled={loading || !selectedDept}
            onClick={handleSubmit}
          >
            Submit
          </button>
        </center>
      </div>
    </div>
  );
}
