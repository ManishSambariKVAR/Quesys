import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import './UserManagement.css';

interface Kiosk {
  id: number;
  kiosk_id: string;
  registration_date: string;
}

export default function KioskSettings() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const fetchKiosks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ kiosks: Kiosk[] }>('/admin/kiosks');
      setKiosks(res.data.kiosks || []);
    } catch {
      setMessage({ text: 'Failed to load kiosks', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKiosks();
  }, [fetchKiosks]);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this Kiosk?')) return;
    try {
      await api.delete(`/admin/kiosks/${id}`);
      showMsg('Kiosk deleted', 'success');
      fetchKiosks();
    } catch {
      showMsg('Failed to delete kiosk', 'error');
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

      <div className="um-content">
        <h3 className="um-page-title">Kiosk Registration Information</h3>
        <div className="um-table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                <th>Sr No.</th>
                <th>Kiosk Registration Name (ID)</th>
                <th>Date</th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {kiosks.map((k, i) => (
                <tr key={k.id}>
                  <td>
                    <div className="um-input-container">
                      <input type="text" value={i + 1} readOnly />
                    </div>
                  </td>
                  <td>
                    <div className="um-input-container">
                      <input type="text" value={k.kiosk_id} readOnly />
                    </div>
                  </td>
                  <td>
                    <div className="um-input-container">
                      <input
                        type="text"
                        value={new Date(
                          k.registration_date
                        ).toLocaleDateString()}
                        readOnly
                      />
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="um-delete-button"
                      onClick={() => handleDelete(k.id)}
                    >
                      <span style={{ fontSize: '20px' }}>
                        <i className="fa fa-trash"></i>
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
              {kiosks.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>
                    No Kiosks registered
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
