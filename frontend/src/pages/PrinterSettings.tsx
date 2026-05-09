import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import './UserManagement.css';

export default function PrinterSettings() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'editor';

  // Editor state
  const [templateContent, setTemplateContent] = useState('');

  // File list for choosing reports
  const [fileList, setFileList] = useState<string[]>([]);
  const [selectedSummaryFile, setSelectedSummaryFile] = useState('');
  const [selectedTokenFile, setSelectedTokenFile] = useState('');

  // View linking state
  const [summaryLink, setSummaryLink] = useState('');
  const [tokenLink, setTokenLink] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await api.get('/admin/printer/report-files');
      setFileList(res.data.files || []);
    } catch (err) {
      console.error('Failed to load report files', err);
    }
  }, []);

  const fetchLinking = useCallback(async () => {
    try {
      const res = await api.get('/admin/printer/view-linking');
      setSummaryLink(res.data.summary || 'Not configured');
      setTokenLink(res.data.token || 'Not configured');
    } catch (err) {
      console.error('Failed to load report linking', err);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchLinking();
  }, [fetchFiles, fetchLinking]);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // ── Editor actions ──
  const handleSaveTemplate = async () => {
    const filename = prompt('Enter filename to save:', 'thermal_template.txt');
    if (!filename) return;
    try {
      setLoading(true);
      await api.post('/admin/printer/save-template', {
        content: templateContent,
        filename,
      });
      showMessage('Template saved successfully!', 'success');
      fetchFiles();
    } catch {
      showMessage('Failed to save template.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([templateContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thermal_template.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleLoadTemplate = async (filename: string) => {
    try {
      const res = await api.get(
        `/admin/printer/template/${encodeURIComponent(filename)}`
      );
      setTemplateContent(res.data.content || '');
      showMessage(`Loaded: ${filename}`, 'success');
    } catch {
      showMessage('Failed to load template.', 'error');
    }
  };

  // ── Choose report submit actions ──
  const handleSubmitSummary = async () => {
    if (!selectedSummaryFile) return alert('Please select a summary report.');
    try {
      setLoading(true);
      await api.post('/admin/printer/submit-summary', {
        filename: selectedSummaryFile,
      });
      showMessage('Summary report linked successfully!', 'success');
      fetchLinking();
    } catch {
      showMessage('Failed to link summary report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitToken = async () => {
    if (!selectedTokenFile) return alert('Please select a token report.');
    try {
      setLoading(true);
      await api.post('/admin/printer/submit-token', {
        filename: selectedTokenFile,
      });
      showMessage('Token report linked successfully!', 'success');
      fetchLinking();
    } catch {
      showMessage('Failed to link token report.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = (filename: string) => {
    if (!filename) return alert('Please select a report first.');
    window.open(
      `/src/uploads/printerReport/${encodeURIComponent(filename)}`,
      '_blank'
    );
  };

  return (
    <div className="um-page">
      {message && (
        <div className={`um-alert um-alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* ── EDITOR TAB ── */}
      {activeTab === 'editor' && (
        <div className="um-content">
          <h3 className="um-page-title">Printer Template Editor</h3>

          {fileList.length > 0 && (
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <label className="um-label" style={{ marginBottom: 0 }}>
                Load existing:
              </label>
              <select
                className="um-form-control"
                onChange={(e) =>
                  e.target.value && handleLoadTemplate(e.target.value)
                }
                defaultValue=""
                style={{ width: 'auto', minWidth: 200 }}
              >
                <option value="" disabled>
                  Select a template to load
                </option>
                {fileList.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          )}

          <textarea
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            placeholder="Enter your printer template here..."
            style={{
              width: '100%',
              minHeight: 300,
              padding: 12,
              fontFamily: 'monospace',
              fontSize: 14,
              border: '1px solid #ddd',
              borderRadius: 8,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              className="um-submit-btn"
              style={{
                width: 'auto',
                padding: '10px 20px',
                backgroundColor: '#6c757d',
              }}
              onClick={handleDownloadTemplate}
            >
              ⬇️ Download Template
            </button>
            <button
              className="um-submit-btn"
              style={{ width: 'auto', padding: '10px 20px' }}
              onClick={handleSaveTemplate}
              disabled={loading}
            >
              💾 {loading ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      )}

      {/* ── CHOOSE SUMMARY REPORT TAB ── */}
      {activeTab === 'summary' && (
        <div className="um-content" style={{ maxWidth: 800 }}>
          <h3 className="um-page-title">Choose Summary Report Template</h3>
          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Choose Template</th>
                  <th style={{ width: '60px' }}></th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="um-input-container">
                      <input type="text" value="Summary Report" readOnly />
                    </div>
                  </td>
                  <td>
                    <div className="um-input-container">
                      <select
                        className="um-form-control"
                        value={selectedSummaryFile}
                        onChange={(e) => setSelectedSummaryFile(e.target.value)}
                        style={{ padding: '8px', border: 'none' }}
                      >
                        <option value="" disabled>
                          Select template
                        </option>
                        {fileList.length > 0 ? (
                          fileList.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))
                        ) : (
                          <option disabled>No reports available.</option>
                        )}
                      </select>
                    </div>
                  </td>
                  <td>
                    <button
                      className="um-edit-button"
                      onClick={() => handleViewFile(selectedSummaryFile)}
                      style={{ color: '#666' }}
                    >
                      <i className="fa fa-eye"></i>
                    </button>
                  </td>
                  <td>
                    <button
                      className="um-edit-button"
                      onClick={handleSubmitSummary}
                      disabled={loading}
                    >
                      <i className="fa fa-save"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CHOOSE TOKEN REPORT TAB ── */}
      {activeTab === 'token' && (
        <div className="um-content" style={{ maxWidth: 800 }}>
          <h3 className="um-page-title">Choose Token Report Template</h3>
          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Choose Template</th>
                  <th style={{ width: '60px' }}></th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="um-input-container">
                      <input type="text" value="Token Report" readOnly />
                    </div>
                  </td>
                  <td>
                    <div className="um-input-container">
                      <select
                        className="um-form-control"
                        value={selectedTokenFile}
                        onChange={(e) => setSelectedTokenFile(e.target.value)}
                        style={{ padding: '8px', border: 'none' }}
                      >
                        <option value="" disabled>
                          Select template
                        </option>
                        {fileList.length > 0 ? (
                          fileList.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))
                        ) : (
                          <option disabled>No reports available.</option>
                        )}
                      </select>
                    </div>
                  </td>
                  <td>
                    <button
                      className="um-edit-button"
                      onClick={() => handleViewFile(selectedTokenFile)}
                      style={{ color: '#666' }}
                    >
                      <i className="fa fa-eye"></i>
                    </button>
                  </td>
                  <td>
                    <button
                      className="um-edit-button"
                      onClick={handleSubmitToken}
                      disabled={loading}
                    >
                      <i className="fa fa-save"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW REPORT LINKING TAB ── */}
      {activeTab === 'view' && (
        <div className="um-content" style={{ maxWidth: 800 }}>
          <h3 className="um-page-title">Current Report Linking</h3>
          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Report Name</th>
                  <th>Summary Report</th>
                  <th>Token Report</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="um-input-container">
                      <input
                        type="text"
                        value="Selected Template"
                        readOnly
                        style={{ textAlign: 'left', paddingLeft: '15px' }}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="um-input-container">
                      <input type="text" value={summaryLink} readOnly />
                    </div>
                  </td>
                  <td>
                    <div className="um-input-container">
                      <input type="text" value={tokenLink} readOnly />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
