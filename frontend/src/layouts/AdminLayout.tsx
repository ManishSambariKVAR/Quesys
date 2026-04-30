import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../api';
import './AdminLayout.css';

export default function AdminLayout() {
    const [companyName, setCompanyName] = useState('UNIQUE IDENTIFICATION AUTHORITY OF INDIA');
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className={`admin-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <Sidebar isOpen={isSidebarOpen} />
            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="topbar-left">
                        <button className="hamburger-btn" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                            <span className="line"></span>
                            <span className="line"></span>
                            <span className="line"></span>
                        </button>
                    </div>
                    <div className="topbar-center">
                        <h1 className="company-title">{companyName}</h1>
                    </div>
                    <div className="topbar-right">
                        <img src="/assets/images/Quesys.png" alt="Quesys" className="quesys-logo" />
                    </div>
                </header>
                <div className="admin-content-inner">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}