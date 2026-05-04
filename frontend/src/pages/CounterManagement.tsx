import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import './UserManagement.css';

interface Counter {
    id: number;
    counter: string;
    active: string;
    displayid: string;
    buzzer_time: string;
    buzzer_active: string;
    blink: string;
    ipaddress: string;
}

export default function CounterManagement() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const activeTab = queryParams.get('tab') || 'view';

    const [counters, setCounters] = useState<Counter[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const fetchCounters = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get<{ counters: Counter[] }>('/admin/counters');
            setCounters(res.data.counters || []);
        } catch {
            setMessage({ text: 'Failed to load counters', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCounters(); }, [fetchCounters]);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    // ADD FORM STATE
    const [addForm, setAddForm] = useState({
        counter: '', active: '', displayid: '', buzzer_time: '', buzzer_active: '', blink: '', ipaddress: ''
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/counters/register', addForm);
            showMsg('Counter registered', 'success');
            setAddForm({ counter: '', active: '', displayid: '', buzzer_time: '', buzzer_active: '', blink: '', ipaddress: '' });
            fetchCounters();
            navigate('/admin/counters?tab=view');
        } catch {
            showMsg('Registration failed', 'error');
        }
    };

    // EDIT STATE
    const [editItem, setEditItem] = useState<Counter | null>(null);

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editItem) return;
        try {
            await api.put('/admin/counters/update', editItem);
            showMsg('Counter updated', 'success');
            setEditItem(null);
            fetchCounters();
        } catch {
            showMsg('Update failed', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this counter?')) return;
        try {
            await api.delete(`/admin/counters/${id}`);
            showMsg('Counter deleted', 'success');
            fetchCounters();
        } catch {
            showMsg('Delete failed', 'error');
        }
    };

    if (loading) return <div className="um-loading"><div className="spinner" /></div>;

    return (
        <div className="um-page">
            {message && <div className={`um-alert um-alert-${message.type}`}>{message.text}</div>}

            {activeTab === 'view' && (
                <div className="um-content">
                    <h3 className="um-page-title">View & Edit Counters</h3>
                    <div className="um-table-wrapper">
                        <table className="um-table">
                            <thead>
                                <tr>
                                    <th>Sr No.</th>
                                    <th>Counter</th>
                                    <th>Counter Status</th>
                                    <th>Display</th>
                                    <th>Buzzer On/Off</th>
                                    <th>Buzzer Time(millis)</th>
                                    <th>Flash</th>
                                    <th>IP Address</th>
                                    <th style={{ width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {counters.map((c, i) => (
                                    <tr key={c.id}>
                                        <td><div className="um-input-container"><input type="text" value={i + 1} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.counter} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.active} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.displayid} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.buzzer_active} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.buzzer_time} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.blink} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.ipaddress} readOnly /></div></td>
                                        <td>
                                            <button type="button" className="um-edit-button" onClick={() => setEditItem(c)}>
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
                    <h3 className="um-page-title">Counter Registration</h3>
                    <form className="um-add-form" onSubmit={handleAdd}>
                        <div className="um-table-wrapper">
                            <table className="um-table">
                                <thead>
                                    <tr>
                                        <th>Counter</th>
                                        <th>Counter Status</th>
                                        <th>Display</th>
                                        <th>Buzzer On/Off</th>
                                        <th>Buzzer Time(millis)</th>
                                        <th>Flash</th>
                                        <th>IP Address</th>
                                        <th style={{ width: '60px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" placeholder="Counter" value={addForm.counter} onChange={e => setAddForm({ ...addForm, counter: e.target.value })} required />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" placeholder="Status" value={addForm.active} onChange={e => setAddForm({ ...addForm, active: e.target.value })} />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" placeholder="Display" value={addForm.displayid} onChange={e => setAddForm({ ...addForm, displayid: e.target.value })} />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" placeholder="Buzzer" value={addForm.buzzer_active} onChange={e => setAddForm({ ...addForm, buzzer_active: e.target.value })} />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" placeholder="Time" value={addForm.buzzer_time} onChange={e => setAddForm({ ...addForm, buzzer_time: e.target.value })} />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" placeholder="Flash" value={addForm.blink} onChange={e => setAddForm({ ...addForm, blink: e.target.value })} />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="um-input-container">
                                                <input type="text" placeholder="IP" value={addForm.ipaddress} onChange={e => setAddForm({ ...addForm, ipaddress: e.target.value })} />
                                            </div>
                                        </td>
                                        <td>
                                            <button type="submit" className="dept-add-row-btn" style={{ backgroundColor: '#886cc0', border: 'none', color: '#fff', borderRadius: '5px', padding: '5px 15px', cursor: 'pointer' }}>
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
                    <h3 className="um-page-title">Delete Counter</h3>
                    <div className="um-table-wrapper">
                        <table className="um-table">
                            <thead>
                                <tr>
                                    <th>Sr No.</th>
                                    <th>Counter</th>
                                    <th>Counter Status</th>
                                    <th>Display</th>
                                    <th>Buzzer On/Off</th>
                                    <th>Buzzer Time(millis)</th>
                                    <th>Flash</th>
                                    <th>IP Address</th>
                                    <th style={{ width: '60px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {counters.map((c, i) => (
                                    <tr key={c.id}>
                                        <td><div className="um-input-container"><input type="text" value={i + 1} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.counter} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.active} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.displayid} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.buzzer_active} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.buzzer_time} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.blink} readOnly /></div></td>
                                        <td><div className="um-input-container"><input type="text" value={c.ipaddress} readOnly /></div></td>
                                        <td>
                                            <button type="button" className="um-delete-button" onClick={() => handleDelete(c.id)}>
                                                <span style={{ fontSize: '20px' }}><i className="fa fa-trash"></i></span>
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
                    <div className="um-modal-content" style={{ width: '90%' }}>
                        <span className="um-close-button" onClick={() => setEditItem(null)}>&times;</span>
                        <h2>Edit Counter</h2>
                        <form onSubmit={handleEditSubmit} className="um-modal-form" style={{ display: 'flex', flexWrap: 'wrap' }}>
                            <div className="um-input-container modal-input" style={{ width: '120px' }}>
                                <input type="text" value={editItem.counter} onChange={e => setEditItem({ ...editItem, counter: e.target.value })} placeholder="Counter" required />
                            </div>
                            <div className="um-input-container modal-input" style={{ width: '120px' }}>
                                <input type="text" value={editItem.active} onChange={e => setEditItem({ ...editItem, active: e.target.value })} placeholder="Active" />
                            </div>
                            <div className="um-input-container modal-input" style={{ width: '120px' }}>
                                <input type="text" value={editItem.displayid} onChange={e => setEditItem({ ...editItem, displayid: e.target.value })} placeholder="Display" />
                            </div>
                            <div className="um-input-container modal-input" style={{ width: '120px' }}>
                                <input type="text" value={editItem.buzzer_active} onChange={e => setEditItem({ ...editItem, buzzer_active: e.target.value })} placeholder="Buzzer Active" />
                            </div>
                            <div className="um-input-container modal-input" style={{ width: '120px' }}>
                                <input type="text" value={editItem.buzzer_time} onChange={e => setEditItem({ ...editItem, buzzer_time: e.target.value })} placeholder="Buzzer Time" />
                            </div>
                            <div className="um-input-container modal-input" style={{ width: '120px' }}>
                                <input type="text" value={editItem.blink} onChange={e => setEditItem({ ...editItem, blink: e.target.value })} placeholder="Flash" />
                            </div>
                            <div className="um-input-container modal-input" style={{ width: '120px' }}>
                                <input type="text" value={editItem.ipaddress} onChange={e => setEditItem({ ...editItem, ipaddress: e.target.value })} placeholder="IP Address" />
                            </div>
                            <button className="um-modal-submit" type="submit"><i className="fa fa-save"></i> Save</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
