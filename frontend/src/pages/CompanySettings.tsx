import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import './CompanySettings.css';

export default function CompanySettings() {
    const [companyName, setCompanyName] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchCompany = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get<{ companyName: string; logoPath: string | null }>('/admin/company');
            setCompanyName(res.data.companyName);
        } catch {
            setMessage({ text: 'Failed to load company details', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCompany(); }, [fetchCompany]);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName.trim()) {
            showMsg('Company name is required', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('companyName', companyName);

        if (fileInputRef.current?.files?.[0]) {
            formData.append('logo', fileInputRef.current.files[0]);
        }

        try {
            await api.post('/admin/company', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showMsg('Company settings updated successfully', 'success');
            fetchCompany();
            
            // clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch {
            showMsg('Failed to update company settings', 'error');
        }
    };

    if (loading) return <div className="cs-loading"><div className="spinner" /></div>;

    return (
        <div className="container-fluid">
  <h3>Company Registration</h3>

  {message && (
    <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}>
      {message.text}
    </div>
  )}

  <form onSubmit={handleSubmit}>
    <div className="mb-3">
      <label><strong>Company Name:</strong></label>
      <input
        type="text"
        className="form-control"
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="Company name"
        required
        maxLength={40}
      />
    </div>

    <div className="mb-3">
      <label><strong>Company Logo:</strong></label>
      <input
        type="file"
        className="form-control"
        ref={fileInputRef}
        required
      />
    </div>

    <button className="btn btn-primary w-100">
      Submit
    </button>
  </form>
</div>
    );
}
