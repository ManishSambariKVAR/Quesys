import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import './DeptManagement.css';

interface Department {
  id: number;
  department: string;
  kiosk_key: string;
  dep: string;
  kiosk_id: string;
}

interface Kiosk {
  id: number;
  kiosk_id: string;
}

export default function DeptManagement() {
  const location = useLocation();
  const navigate = useNavigate();

  const [depts, setDepts] = useState<Department[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Get active tab from URL
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'view';

  // Add form
  const [addName, setAddName] = useState('');
  const [addKey, setAddKey] = useState('');
  const [addPrefix, setAddPrefix] = useState('');
  const [addKiosk, setAddKiosk] = useState('');

  // Edit Modal
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [editName, setEditName] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editPrefix, setEditPrefix] = useState('');
  const [editKiosk, setEditKiosk] = useState('');

  const fetchDepts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ departments: Department[]; kiosks: Kiosk[] }>(
        '/admin/departments'
      ); // changed from /departments to /admin/departments as per main.js api routes
      // NOTE: the backend route might be just /departments based on earlier reading, falling back to original if error:
      setDepts(res.data.departments || []);
      setKiosks(res.data.kiosks || []);
    } catch (err) {
      console.error('Failed to load departments', err);
      setMessage({ text: 'Failed to load departments', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepts();
  }, [fetchDepts]);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // ADD
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/departments/register', {
        department: addName,
        kioskKey: addKey,
        depPrefix: addPrefix,
        kioskId: addKiosk,
      });
      showMsg('Department registered', 'success');
      setAddName('');
      setAddKey('');
      setAddPrefix('');
      setAddKiosk('');
      fetchDepts();
      navigate('/admin/departments?tab=view');
    } catch (err: any) {
      showMsg(err.response?.data?.error || 'Registration failed', 'error');
    }
  };

  // EDIT
  const openEdit = (d: Department) => {
    setEditDept(d);
    setEditName(d.department);
    setEditKey(d.kiosk_key);
    setEditPrefix(d.dep);
    setEditKiosk(d.kiosk_id);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDept) return;
    try {
      await api.put('/admin/departments/update', {
        id: editDept.id,
        department: editName,
        kioskKey: editKey,
        depPrefix: editPrefix,
        kioskId: editKiosk,
      });
      showMsg('Department updated', 'success');
      setEditDept(null);
      fetchDepts();
    } catch {
      showMsg('Update failed', 'error');
    }
  };

  // DELETE
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this department?'))
      return;
    try {
      await api.delete(`/admin/departments/${id}`);
      showMsg('Department deleted', 'success');
      fetchDepts();
    } catch {
      showMsg('Delete failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="dept-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dept-page">
      {message && (
        <div className={`dept-alert dept-alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* VIEW & EDIT */}
      {activeTab === 'view' && (
        <div className="dept-content">
          <h3 className="dept-page-title">View & Edit Department</h3>
          <div className="dept-table-wrapper">
            <table className="dept-table">
              <thead>
                <tr>
                  <th>Sr No.</th>
                  <th>Department</th>
                  <th>Kiosk Key</th>
                  <th>Department Prefix</th>
                  <th>Kiosk Id</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {depts.map((d, i) => (
                  <tr key={d.id}>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={i + 1} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={d.department} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={d.kiosk_key} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={d.dep} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={d.kiosk_id} readOnly />
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dept-edit-button"
                        onClick={() => openEdit(d)}
                      >
                        <i className="fa fa-edit"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / REGISTER */}
      {activeTab === 'add' && (
        <div className="dept-content">
          <h3 className="dept-page-title">Department Registration</h3>
          <form onSubmit={handleAdd} className="dept-add-form">
            <div className="dept-table-wrapper">
              <table className="dept-table">
                <thead>
                  <tr>
                    <th>
                      <center>Department</center>
                    </th>
                    <th>
                      <center>Kiosk Key</center>
                    </th>
                    <th>
                      <center>Department Prefix</center>
                    </th>
                    <th>
                      <center>Kiosk Id</center>
                    </th>
                    <th style={{ width: '60px' }}>
                      <center></center>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="dept-input-container">
                        <input
                          type="text"
                          placeholder="Enter Department"
                          value={addName}
                          onChange={(e) => setAddName(e.target.value)}
                          required
                        />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input
                          type="text"
                          placeholder="Kiosk Key"
                          value={addKey}
                          onChange={(e) => setAddKey(e.target.value)}
                          required
                        />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input
                          type="text"
                          placeholder="Department Prefix"
                          value={addPrefix}
                          onChange={(e) => setAddPrefix(e.target.value)}
                          required
                        />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <select
                          value={addKiosk}
                          onChange={(e) => setAddKiosk(e.target.value)}
                          required
                        >
                          <option value="" disabled>
                            Select Your Kiosk
                          </option>
                          {kiosks.map((k) => (
                            <option key={k.id} value={k.kiosk_id}>
                              {k.kiosk_id}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <button type="button" className="dept-add-row-btn">
                        <span style={{ fontSize: '20px' }}>&#8629;</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="dept-submit-wrap">
              <button type="submit" className="dept-submit-btn">
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE */}
      {activeTab === 'delete' && (
        <div className="dept-content">
          <h3 className="dept-page-title">Delete Department</h3>
          <div className="dept-table-wrapper">
            <table className="dept-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Department</th>
                  <th>Kiosk Key</th>
                  <th>Department Prefix</th>
                  <th>Kiosk Id</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {depts.map((d, i) => (
                  <tr key={d.id}>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={i + 1} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={d.department} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={d.kiosk_key} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={d.dep} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="dept-input-container">
                        <input type="text" value={d.kiosk_id} readOnly />
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dept-delete-button"
                        onClick={() => handleDelete(d.id)}
                        style={{
                          color: '#f79696',
                          border: 'none',
                          background: 'transparent',
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>
                          <i className="fa fa-minus-circle"></i>
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editDept && (
        <div className="dept-modal">
          <div className="dept-modal-content">
            <span
              className="dept-close-button"
              onClick={() => setEditDept(null)}
            >
              &times;
            </span>
            <h2>Edit Department</h2>
            <form onSubmit={handleEditSubmit} className="dept-modal-form">
              <div
                className="dept-input-container modal-input"
                style={{ width: '150px' }}
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Department"
                  required
                />
              </div>
              <div
                className="dept-input-container modal-input"
                style={{ width: '150px' }}
              >
                <input
                  type="text"
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  placeholder="Kiosk Key"
                  required
                />
              </div>
              <div
                className="dept-input-container modal-input"
                style={{ width: '150px' }}
              >
                <input
                  type="text"
                  value={editPrefix}
                  onChange={(e) => setEditPrefix(e.target.value)}
                  placeholder="Department Prefix"
                  required
                />
              </div>
              <div
                className="dept-input-container modal-input"
                style={{ width: '150px' }}
              >
                <select
                  value={editKiosk}
                  onChange={(e) => setEditKiosk(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select Kiosk
                  </option>
                  {kiosks.map((k) => (
                    <option key={k.id} value={k.kiosk_id}>
                      {k.kiosk_id}
                    </option>
                  ))}
                </select>
              </div>
              <button className="dept-modal-submit" type="submit">
                <i className="fa fa-save"></i>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
