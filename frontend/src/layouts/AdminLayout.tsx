import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useCompanySettings } from '../hooks/useCompanySettings';
import './AdminLayout.css';

export default function AdminLayout() {
  const { companyName } = useCompanySettings();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes}:${seconds} ${ampm}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
    >
      <Sidebar isOpen={isSidebarOpen} />
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
            >
              <span className="line"></span>
              <span className="line"></span>
              <span className="line"></span>
            </button>
          </div>
          <div className="topbar-center">
            <h1 className="company-title">{companyName}</h1>
          </div>
          <div className="topbar-right">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
            >
              <img
                src="/images/Quesys.png"
                alt="Quesys"
                className="quesys-logo"
                style={{ height: '50px', objectFit: 'contain' }}
              />
              <span
                className="dashboard-clock"
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: '#000',
                  fontVariantNumeric: 'tabular-nums',
                  marginTop: '5px',
                }}
              >
                {currentTime}
              </span>
            </div>
          </div>
        </header>
        <div className="admin-content-inner">
          <Outlet />
        </div>
        <div className="footer">
          <div className="copyright">
            <p>
              Copyright © Designed & Developed by{' '}
              <a
                href="https://kvartech.in/"
                target="_blank"
                rel="noopener noreferrer"
              >
                KVAR TECH
              </a>{' '}
              2024{' '}
              <img
                src="/images/Make-In-IndiaLogo650.webp"
                alt="Make In India"
                height="40"
                width="70"
              />
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
