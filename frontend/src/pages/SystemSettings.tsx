import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import './UserManagement.css'; 

export default function SystemSettings() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const activeTab = queryParams.get('tab') || 'factory';

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Factory state
    const [callToAck, setCallToAck] = useState(90);
    const [ackToEnd, setAckToEnd] = useState(90);
    const [endToCall, setEndToCall] = useState(90);

    // Software state
    const [recall, setRecall] = useState('true');
    const [reassign, setReassign] = useState('true');
    const [changeDept, setChangeDept] = useState('true');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                if (activeTab === 'factory') {
                    const res = await api.get('/admin/settings/factory');
                    const s = res.data.settings;
                    setCallToAck(s?.calltoack || 90);
                    setAckToEnd(s?.acktoend || 90);
                    setEndToCall(s?.endtocall || 90);
                } else {
                    const res = await api.get('/admin/settings/software');
                    const s = res.data.settings;
                    setRecall(s?.activate_recall || 'true');
                    setReassign(s?.activate_reassign || 'true');
                    setChangeDept(s?.activate_changedept || 'true');
                }
            } catch {
                setMessage({ text: 'Failed to load settings', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [activeTab]);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleFactorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/settings/factory', { calltoack: callToAck, acktoend: ackToEnd, endtocall: endToCall });
            showMsg('Factory Settings updated', 'success');
        } catch {
            showMsg('Failed to update Factory Settings', 'error');
        }
    };

    const handleSoftwareSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/settings/software', { recall, reassign, changeDept });
            showMsg('Software Settings updated', 'success');
        } catch {
            showMsg('Failed to update Software Settings', 'error');
        }
    };

    if (loading) return <div className="um-loading"><div className="spinner" /></div>;

    return (
        <div className="um-page">
            {message && <div className={`um-alert um-alert-${message.type}`}>{message.text}</div>}

            {activeTab === 'factory' && (
                <div className="um-content" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h3 className="um-page-title text-center" style={{ textAlign: 'center' }}>Factory Settings</h3>
                    <form className="um-form" onSubmit={handleFactorySubmit}>
                        <div className="um-form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                            <label className="um-label" style={{ margin: 0, flex: 1, textAlign: 'right' }}>Call to Ack Timeout (sec):</label>
                            <div style={{ flex: 1 }}>
                                <input type="number" className="um-form-control" value={callToAck} onChange={e => setCallToAck(Number(e.target.value))} required />
                            </div>
                        </div>
                        <div className="um-form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                            <label className="um-label" style={{ margin: 0, flex: 1, textAlign: 'right' }}>Ack to End Timeout (sec):</label>
                            <div style={{ flex: 1 }}>
                                <input type="number" className="um-form-control" value={ackToEnd} onChange={e => setAckToEnd(Number(e.target.value))} required />
                            </div>
                        </div>
                        <div className="um-form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                            <label className="um-label" style={{ margin: 0, flex: 1, textAlign: 'right' }}>End to Call Timeout (sec):</label>
                            <div style={{ flex: 1 }}>
                                <input type="number" className="um-form-control" value={endToCall} onChange={e => setEndToCall(Number(e.target.value))} required />
                            </div>
                        </div>
                        <div className="um-submit-wrap" style={{ marginTop: '0', textAlign: 'center' }}>
                            <button type="submit" className="um-submit-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 30px' }}>Save Factory Settings</button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'software' && (
                <div className="um-content" style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h3 className="um-page-title text-center" style={{ textAlign: 'center' }}>Software Settings</h3>
                    <form className="um-form" onSubmit={handleSoftwareSubmit}>
                        <div className="um-form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                            <label className="um-label" style={{ margin: 0, flex: 1, textAlign: 'right' }}>Activate Recall Button:</label>
                            <div style={{ flex: 1 }}>
                                <select className="um-form-control" value={recall} onChange={e => setRecall(e.target.value)}>
                                    <option value="true">Enable</option>
                                    <option value="false">Disable</option>
                                </select>
                            </div>
                        </div>
                        <div className="um-form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                            <label className="um-label" style={{ margin: 0, flex: 1, textAlign: 'right' }}>Activate Reassign Button:</label>
                            <div style={{ flex: 1 }}>
                                <select className="um-form-control" value={reassign} onChange={e => setReassign(e.target.value)}>
                                    <option value="true">Enable</option>
                                    <option value="false">Disable</option>
                                </select>
                            </div>
                        </div>
                        <div className="um-form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                            <label className="um-label" style={{ margin: 0, flex: 1, textAlign: 'right' }}>Activate Change Department Button:</label>
                            <div style={{ flex: 1 }}>
                                <select className="um-form-control" value={changeDept} onChange={e => setChangeDept(e.target.value)}>
                                    <option value="true">Enable</option>
                                    <option value="false">Disable</option>
                                </select>
                            </div>
                        </div>
                        <div className="um-submit-wrap" style={{ marginTop: '0', textAlign: 'center' }}>
                            <button type="submit" className="um-submit-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 30px' }}>Save Software Features</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
