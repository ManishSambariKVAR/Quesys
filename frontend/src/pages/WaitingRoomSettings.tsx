import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import './UserManagement.css';

interface Display {
  id: number;
  display_id: string;
  display_status: string;
  ip_address: string;
}

export default function WaitingRoomSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'view';

  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const [displayId, setDisplayId] = useState('');
  const [displayStatus, setDisplayStatus] = useState('Active');
  const [ipAddress, setIpAddress] = useState('');

  const [editItem, setEditItem] = useState<Display | null>(null);

  const fetchDisplays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ displays: Display[] }>(
        '/admin/displays/waiting-room'
      );
      setDisplays(res.data.displays || []);
    } catch {
      setMessage({ text: 'Failed to load displays', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisplays();
  }, [fetchDisplays]);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayId || !ipAddress)
      return showMsg('All fields are required', 'error');

    try {
      await api.post('/admin/displays/waiting-room', {
        displayId,
        displayStatus,
        IP: ipAddress,
      });
      showMsg('Display added successfully', 'success');
      setDisplayId('');
      setDisplayStatus('Active');
      setIpAddress('');
      fetchDisplays();
      navigate('/admin/waiting-room?tab=view');
    } catch {
      showMsg('Failed to save display', 'error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      await api.put(`/admin/displays/waiting-room/${editItem.id}`, {
        displayId: editItem.display_id,
        displayStatus: editItem.display_status,
        IP: editItem.ip_address,
      });
      showMsg('Display updated successfully', 'success');
      setEditItem(null);
      fetchDisplays();
    } catch {
      showMsg('Failed to update display', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this display?')) return;
    try {
      await api.delete(`/admin/displays/waiting-room/${id}`);
      showMsg('Display deleted', 'success');
      fetchDisplays();
    } catch {
      showMsg('Failed to delete display', 'error');
    }
  };

  if (loading)
    return (
      <div className="um-loading">
        <div className="spinner" />
      </div>
    );

  return (
    <div className="um-page">
      {message && (
        <div className={`um-alert um-alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {activeTab === 'view' && (
        <div className="um-content">
          <h3 className="um-page-title">View & Edit Waiting Display</h3>
          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th>Sr No.</th>
                  <th>Display ID</th>
                  <th>Display Status</th>
                  <th>IP Address</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {displays.map((disp, i) => (
                  <tr key={disp.id}>
                    <td>
                      <div className="um-input-container">
                        <input type="text" value={i + 1} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="um-input-container">
                        <input type="text" value={disp.display_id} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="um-input-container">
                        <input
                          type="text"
                          value={disp.display_status}
                          readOnly
                        />
                      </div>
                    </td>
                    <td>
                      <div className="um-input-container">
                        <input type="text" value={disp.ip_address} readOnly />
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="um-edit-button"
                        onClick={() => setEditItem(disp)}
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

      {activeTab === 'add' && (
        <div className="um-content">
          <h3 className="um-page-title">Add Waiting Room Display</h3>
          <form className="um-add-form" onSubmit={handleAddSubmit}>
            <div className="um-table-wrapper">
              <table className="um-table">
                <thead>
                  <tr>
                    <th>Display ID</th>
                    <th>Display Status</th>
                    <th>IP Address</th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="um-input-container">
                        <input
                          type="text"
                          placeholder="Display ID"
                          value={displayId}
                          onChange={(e) => setDisplayId(e.target.value)}
                          required
                        />
                      </div>
                    </td>
                    <td>
                      <div className="um-input-container">
                        <input
                          type="text"
                          placeholder="Status"
                          value={displayStatus}
                          onChange={(e) => setDisplayStatus(e.target.value)}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="um-input-container">
                        <input
                          type="text"
                          placeholder="IP Address"
                          value={ipAddress}
                          onChange={(e) => setIpAddress(e.target.value)}
                          required
                        />
                      </div>
                    </td>
                    <td>
                      <button
                        type="submit"
                        className="dept-add-row-btn"
                        style={{
                          backgroundColor: '#886cc0',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '5px',
                          padding: '5px 15px',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>&#8629;</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'delete' && (
        <div className="um-content">
          <h3 className="um-page-title">Delete Waiting Room Display</h3>
          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th>Sr No.</th>
                  <th>Display ID</th>
                  <th>Display Status</th>
                  <th>IP Address</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {displays.map((disp, i) => (
                  <tr key={disp.id}>
                    <td>
                      <div className="um-input-container">
                        <input type="text" value={i + 1} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="um-input-container">
                        <input type="text" value={disp.display_id} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="um-input-container">
                        <input
                          type="text"
                          value={disp.display_status}
                          readOnly
                        />
                      </div>
                    </td>
                    <td>
                      <div className="um-input-container">
                        <input type="text" value={disp.ip_address} readOnly />
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="um-delete-button"
                        onClick={() => handleDelete(disp.id)}
                      >
                        <span style={{ fontSize: '20px' }}>
                          <i className="fa fa-trash"></i>
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

      {editItem && (
        <div className="um-modal">
          <div className="um-modal-content">
            <span className="um-close-button" onClick={() => setEditItem(null)}>
              &times;
            </span>
            <h2>Edit Display</h2>
            <form onSubmit={handleEditSubmit} className="um-modal-form">
              <div
                className="um-input-container modal-input"
                style={{ width: '150px' }}
              >
                <input
                  type="text"
                  value={editItem.display_id}
                  onChange={(e) =>
                    setEditItem({ ...editItem, display_id: e.target.value })
                  }
                  placeholder="Display ID"
                  required
                />
              </div>
              <div
                className="um-input-container modal-input"
                style={{ width: '150px' }}
              >
                <input
                  type="text"
                  value={editItem.display_status}
                  onChange={(e) =>
                    setEditItem({ ...editItem, display_status: e.target.value })
                  }
                  placeholder="Display Status"
                />
              </div>
              <div
                className="um-input-container modal-input"
                style={{ width: '150px' }}
              >
                <input
                  type="text"
                  value={editItem.ip_address}
                  onChange={(e) =>
                    setEditItem({ ...editItem, ip_address: e.target.value })
                  }
                  placeholder="IP Address"
                  required
                />
              </div>
              <button className="um-modal-submit" type="submit">
                <i className="fa fa-save"></i> Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
