import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
// 1. Import the new global hook (adjust the path if your hook is stored elsewhere)
import { useCompanySettings } from '../hooks/useCompanySettings';
import './AdminLayout.css';

export default function AdminLayout() {
    // 2. Replace the local useState with the global hook
    const { companyName } = useCompanySettings(); 
    
    // 3. Keep the sidebar state exactly as it is
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
                        {/* This will now instantly update when the global state changes! */}
                        <h1 className="company-title">{companyName}</h1>
                    </div>
                    <div className="topbar-right">
                        <img src="/images/Quesys.png" alt="Quesys" className="quesys-logo" />
                    </div>
                </header>
                <div className="admin-content-inner">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}