import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import './UserManagement.css';

interface OTALink {
  display_id: string;
  filename: string;
  status: string;
}

interface Display {
  display_id: string;
  type: string;
}

export default function TVOTAManagement() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'editor';

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Editor State
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');

  // List State
  const [files, setFiles] = useState<string[]>([]);

  // Link State
  const [displays, setDisplays] = useState<Display[]>([]);
  const [links, setLinks] = useState<OTALink[]>([]);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ files: string[] }>('/admin/ota/files');
      setFiles(res.data.files);
    } catch {
      showMsg('Failed to load OTA files', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDisplays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ displays: Display[]; linked: OTALink[] }>(
        '/admin/ota/displays'
      );
      setDisplays(res.data.displays);
      setLinks(res.data.linked);
    } catch {
      showMsg('Failed to load displays', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'list') {
      loadFiles();
    } else if (activeTab === 'link') {
      loadFiles();
      loadDisplays();
    }
  }, [activeTab, loadFiles, loadDisplays]);

  // Actions
  const handleSaveEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename || !content)
      return showMsg('Filename & content required', 'error');

    const finalFilename = filename.endsWith('.txt')
      ? filename
      : `${filename}.txt`;

    try {
      await api.post('/admin/ota/files', { filename: finalFilename, content });
      showMsg('Template saved', 'success');
      setFilename('');
      setContent('');
    } catch {
      showMsg('Failed to save', 'error');
    }
  };

  const handleDeleteFile = async (fn: string) => {
    if (!window.confirm(`Delete ${fn}?`)) return;
    try {
      await api.delete(`/admin/ota/files/${fn}`);
      showMsg('File deleted', 'success');
      loadFiles();
    } catch {
      showMsg('Failed to delete', 'error');
    }
  };

  const handleLinkSubmit = async (
    displayid: string,
    selectedFilename: string,
    status: string
  ) => {
    try {
      await api.post('/admin/ota/links', {
        displayid,
        filename: selectedFilename,
        status,
      });
      showMsg('Link updated', 'success');
      loadDisplays();
    } catch {
      showMsg('Failed to update link', 'error');
    }
  };

  return (
    <div className="um-page">
      {message && (
        <div className={`um-alert um-alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {loading && (
        <div className="um-loading">
          <div className="spinner" />
        </div>
      )}

      {!loading && activeTab === 'editor' && (
        <div className="um-content">
          <h3 className="um-page-title">OTA Editor</h3>
          <form
            className="um-add-form"
            onSubmit={handleSaveEditor}
            style={{ maxWidth: '800px', margin: '0 auto' }}
          >
            <div className="um-form-group">
              <label className="um-label">Filename (e.g., config.txt)</label>
              <input
                type="text"
                className="um-form-control"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                required
              />
            </div>
            <div className="um-form-group">
              <label className="um-label">Content Template</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={15}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontFamily: 'monospace',
                  border: '1px solid #ccc',
                  borderRadius: '5px',
                }}
                required
              />
            </div>
            <div className="um-submit-wrap">
              <button type="submit" className="um-submit-btn">
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && activeTab === 'list' && (
        <div className="um-content">
          <h3 className="um-page-title">View OTA List</h3>
          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th>Sr No.</th>
                  <th>Filename</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {files.map((fn, i) => (
                  <tr key={fn}>
                    <td>
                      <div className="um-input-container">
                        <input type="text" value={i + 1} readOnly />
                      </div>
                    </td>
                    <td>
                      <div className="um-input-container">
                        <input type="text" value={fn} readOnly />
                      </div>
                    </td>
                    <td>
                      <button
                        className="um-delete-button"
                        onClick={() => handleDeleteFile(fn)}
                      >
                        <span style={{ fontSize: '20px' }}>
                          <i className="fa fa-trash"></i>
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center' }}>
                      No OTA files found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'link' && (
        <div className="um-content">
          <h3 className="um-page-title">Choose OTA</h3>
          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th>Display ID</th>
                  <th>Type</th>
                  <th>Select OTA File</th>
                  <th>Update Link</th>
                </tr>
              </thead>
              <tbody>
                {displays.map((disp) => {
                  const link = links.find(
                    (l) => l.display_id === disp.display_id
                  );
                  return (
                    <LinkRow
                      key={disp.display_id}
                      display={disp}
                      link={link}
                      files={files}
                      onSave={handleLinkSubmit}
                    />
                  );
                })}
                {displays.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center' }}>
                      No Displays found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkRow({ display, link, files, onSave }: any) {
  const [selectedFile, setSelectedFile] = useState(link?.filename || '');
  const [status, setStatus] = useState(link?.status || '0');

  useEffect(() => {
    setSelectedFile(link?.filename || '');
    setStatus(link?.status || '0');
  }, [link]);

  return (
    <tr>
      <td>
        <div className="um-input-container">
          <input type="text" value={display.display_id} readOnly />
        </div>
      </td>
      <td>
        <div className="um-input-container">
          <input type="text" value={display.type} readOnly />
        </div>
      </td>
      <td>
        <div className="um-input-container">
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="um-form-control"
            style={{ padding: '8px', border: 'none', flex: 1 }}
          >
            <option value="">-- Choose File --</option>
            {files.map((f: string) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: '5px', textAlign: 'center' }}>
          <input
            type="checkbox"
            id={`cb-${display.display_id}`}
            checked={status === '1'}
            onChange={(e) => setStatus(e.target.checked ? '1' : '0')}
          />
          <label
            htmlFor={`cb-${display.display_id}`}
            style={{ marginLeft: '5px', fontSize: '13px', color: '#666' }}
          >
            Need Update (Status=1)
          </label>
        </div>
      </td>
      <td>
        <button
          type="button"
          className="um-edit-button"
          onClick={() => onSave(display.display_id, selectedFile, status)}
        >
          <i className="fa fa-save"></i>
        </button>
      </td>
    </tr>
  );
}
