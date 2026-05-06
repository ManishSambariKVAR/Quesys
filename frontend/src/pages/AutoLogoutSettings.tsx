import { useState, useEffect } from 'react';
import api from '../api';
import './UserManagement.css'; 

export default function AutoLogoutSettings() {
    const [autoLogoutTime, setAutoLogoutTime] = useState(30);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Fetch current auto-logout setting on mount
    useEffect(() => {
        const fetchSetting = async () => {
            try {
                const res = await api.get('/admin/auto-logout');
                if (res.data.settings?.auto_logout_time) {
                    setAutoLogoutTime(res.data.settings.auto_logout_time);
                }
            } catch {
                // Use default 30
            }
        };
        fetchSetting();
    }, []);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/auto-logout', { autoLogoutTime }); 
            showMsg('Settings updated successfully', 'success');
        } catch {
            showMsg('Failed to update settings', 'error');
        }
    };

    return (
        <div className="um-page">
            {message && <div className={`um-alert um-alert-${message.type}`}>{message.text}</div>}

            <div className="um-content" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3 className="um-page-title text-center" style={{ textAlign: 'center' }}>Auto Logout Settings</h3>
                <form className="um-form" onSubmit={handleSubmit}>
                    <div className="um-form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                        <label className="um-label" style={{ margin: 0, flex: 1, textAlign: 'right' }}>Set Auto Logout Time (in minutes):</label>
                        <div style={{ flex: 1 }}>
                            <input 
                                type="number" 
                                className="um-form-control" 
                                value={autoLogoutTime} 
                                onChange={e => setAutoLogoutTime(Number(e.target.value))} 
                                min="1" max="1440" required 
                            />
                        </div>
                    </div>
                    <div className="um-submit-wrap" style={{ marginTop: '0', textAlign: 'center' }}>
                        <button type="submit" className="um-submit-btn" style={{ display: 'inline-block', width: 'auto', padding: '10px 30px' }}>Save Settings</button>
                    </div>
                </form>
            </div>
        </div>
    );
}