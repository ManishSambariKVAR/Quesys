import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Sidebar.css';

interface SidebarProps {
    isOpen: boolean;
}

const Icon = ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} className="sidebar-icon" />
);

export default function Sidebar({ isOpen }: SidebarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Determine which menu should be expanded based on the current URL
    const getInitialExpandedState = () => ({
        departments: location.pathname.startsWith('/admin/departments'),
        users: location.pathname.startsWith('/admin/users'),
        counters: location.pathname.startsWith('/admin/counters'),
        waitingRoom: location.pathname.startsWith('/admin/waiting-room'),
        tv: location.pathname.startsWith('/admin/ota'),
        factory: location.pathname.startsWith('/admin/system-settings'),
        printer: location.pathname.startsWith('/admin/printer-settings')
    });

    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(getInitialExpandedState());

    // Keep accordion open when navigating directly to a route
    useEffect(() => {
        setExpandedMenus(getInitialExpandedState());
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;
    const isSubActive = (path: string, search: string) => location.pathname === path && location.search.includes(search);

    const toggleMenu = (menu: string) => {
        setExpandedMenus(prev => {
            // Close all others, toggle the clicked one
            const newState = {
                departments: false,
                users: false,
                counters: false,
                waitingRoom: false,
                tv: false,
                factory: false,
                printer: false
            };
            return { ...newState, [menu]: !prev[menu] };
        });
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <img src="/images/Adhar Logo.png" alt="Aadhaar Logo" className="sidebar-logo" />
            </div>

            <div className="sidebar-user">
                <div className="sidebar-avatar">
                    <img src="/images/pngtree-business-male-icon-vector-png-image_916468-removebg-preview.png" alt="User" className="sidebar-avatar-img" />
                </div>
                <div className="sidebar-user-info">
                    <span className="sidebar-user-name">Hello, <strong>{user?.name || 'kvar'}</strong></span>
                    {user?.department && (
                        <div style={{ marginTop: '5px', fontSize: '0.95rem', fontWeight: 'bold' }}>
                            Department : {user.department}
                        </div>
                    )}
                </div>
            </div>

            <nav className="sidebar-nav">
                <ul>
                    <li className="sidebar-section-label">MAIN MENU</li>
                    {user?.adminLevel === 'Admin' ? (
                        <>
                            <li>
                                <a className={isActive('/admin') ? 'active' : ''} onClick={() => navigate('/admin')}>
                                    <Icon src="/images/dashboard (1).png" alt="Dashboard" />
                                    Dashboard
                                </a>
                            </li>
                            <li>
                                <a onClick={handleLogout}>
                                    <Icon src="/images/logout.png" alt="Logout" />
                                    Logout
                                </a>
                            </li>
                            <li>
                                <a className={isActive('/admin/company') ? 'active' : ''} onClick={() => navigate('/admin/company')}>
                                    <Icon src="/images/Company Settings.png" alt="Company" />
                                    Company Settings
                                </a>
                            </li>
                            
                            <li className={`has-submenu ${expandedMenus.departments ? 'expanded' : ''}`}>
                                <a className={isActive('/admin/departments') ? 'active' : ''} onClick={() => toggleMenu('departments')}>
                                    <Icon src="/images/Department Settings.png" alt="Departments" />
                                    Department Settings
                                </a>
                                <ul className="submenu">
                                    <li>
                                        <a className={isSubActive('/admin/departments', 'tab=view') || (isActive('/admin/departments') && !location.search) ? 'active' : ''} 
                                           onClick={() => navigate('/admin/departments?tab=view')}>
                                            <span className="submenu-dot">◦</span> View Departments
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/departments', 'tab=add') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/departments?tab=add')}>
                                            <span className="submenu-dot">◦</span> Add Departments
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/departments', 'tab=delete') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/departments?tab=delete')}>
                                            <span className="submenu-dot">◦</span> Delete Departments
                                        </a>
                                    </li>
                                </ul>
                            </li>

                            <li className={`has-submenu ${expandedMenus.users ? 'expanded' : ''}`}>
                                <a className={isActive('/admin/users') ? 'active' : ''} onClick={() => toggleMenu('users')}>
                                    <Icon src="/images/system.png" alt="Users" />
                                    User Settings
                                </a>
                                <ul className="submenu">
                                    <li>
                                        <a className={isSubActive('/admin/users', 'tab=view') || (isActive('/admin/users') && !location.search) ? 'active' : ''} 
                                           onClick={() => navigate('/admin/users?tab=view')}>
                                            <span className="submenu-dot">◦</span> View users
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/users', 'tab=add') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/users?tab=add')}>
                                            <span className="submenu-dot">◦</span> Add Users
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/users', 'tab=delete') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/users?tab=delete')}>
                                            <span className="submenu-dot">◦</span> Delete Users
                                        </a>
                                    </li>
                                </ul>
                            </li>

                            <li className={`has-submenu ${expandedMenus.counters ? 'expanded' : ''}`}>
                                <a className={isActive('/admin/counters') ? 'active' : ''} onClick={() => toggleMenu('counters')}>
                                    <Icon src="/images/Counter Settings.png" alt="Counters" />
                                    Counter Settings
                                </a>
                                <ul className="submenu">
                                    <li>
                                        <a className={isSubActive('/admin/counters', 'tab=view') || (isActive('/admin/counters') && !location.search) ? 'active' : ''} 
                                           onClick={() => navigate('/admin/counters?tab=view')}>
                                            <span className="submenu-dot">◦</span> View Counter
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/counters', 'tab=add') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/counters?tab=add')}>
                                            <span className="submenu-dot">◦</span> Add Counter
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/counters', 'tab=delete') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/counters?tab=delete')}>
                                            <span className="submenu-dot">◦</span> Delete Counter
                                        </a>
                                    </li>
                                </ul>
                            </li>

                            <li className={`has-submenu ${expandedMenus.waitingRoom ? 'expanded' : ''}`}>
                                <a className={isActive('/admin/waiting-room') ? 'active' : ''} onClick={() => toggleMenu('waitingRoom')}>
                                    <Icon src="/images/hall.png" alt="Waiting Room" />
                                    Waiting Room Display
                                </a>
                                <ul className="submenu">
                                    <li>
                                        <a className={isSubActive('/admin/waiting-room', 'tab=view') || (isActive('/admin/waiting-room') && !location.search) ? 'active' : ''} 
                                           onClick={() => navigate('/admin/waiting-room?tab=view')}>
                                            <span className="submenu-dot">◦</span> View Waiting Room Display
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/waiting-room', 'tab=add') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/waiting-room?tab=add')}>
                                            <span className="submenu-dot">◦</span> Add Waiting Room Display
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/waiting-room', 'tab=delete') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/waiting-room?tab=delete')}>
                                            <span className="submenu-dot">◦</span> Delete Waiting Room Display
                                        </a>
                                    </li>
                                </ul>
                            </li>

                            <li className={`has-submenu ${expandedMenus.tv ? 'expanded' : ''}`}>
                                <a className={isActive('/admin/ota') ? 'active' : ''} onClick={() => toggleMenu('tv')}>
                                    <Icon src="/images/TVsettings.png" alt="TV" />
                                    TV Setting
                                </a>
                                <ul className="submenu">
                                    <li>
                                        <a className={isSubActive('/admin/ota', 'tab=editor') || (isActive('/admin/ota') && !location.search) ? 'active' : ''} 
                                           onClick={() => navigate('/admin/ota?tab=editor')}>
                                            <span className="submenu-dot">◦</span> OTA Editor
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/ota', 'tab=list') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/ota?tab=list')}>
                                            <span className="submenu-dot">◦</span> View OTA List
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/ota', 'tab=link') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/ota?tab=link')}>
                                            <span className="submenu-dot">◦</span> Choose OTA
                                        </a>
                                    </li>
                                </ul>
                            </li>

                            <li>
                                <a className={isActive('/admin/auto-logout') ? 'active' : ''} onClick={() => navigate('/admin/auto-logout')}>
                                    <Icon src="/images/logout.png" alt="Auto Logout" />
                                    Auto Logout Settings
                                </a>
                            </li>
                            <li>
                                <a className={isActive('/admin/kiosk') ? 'active' : ''} onClick={() => navigate('/admin/kiosk')}>
                                    <Icon src="/images/KIOSK Registration.png" alt="Kiosk" />
                                    KIOSK Registration
                                </a>
                            </li>

                            <li className={`has-submenu ${expandedMenus.factory ? 'expanded' : ''}`}>
                                <a className={isActive('/admin/system-settings') ? 'active' : ''} onClick={() => toggleMenu('factory')}>
                                    <Icon src="/images/Factory Settings.png" alt="Factory Settings" />
                                    Factory Settings
                                </a>
                                <ul className="submenu">
                                    <li>
                                        <a className={isSubActive('/admin/system-settings', 'tab=factory') || (isActive('/admin/system-settings') && !location.search) ? 'active' : ''} 
                                           onClick={() => navigate('/admin/system-settings?tab=factory')}>
                                            <span className="submenu-dot">◦</span> Factory Settings
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/system-settings', 'tab=software') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/system-settings?tab=software')}>
                                            <span className="submenu-dot">◦</span> Software Settings
                                        </a>
                                    </li>
                                </ul>
                            </li>

                            <li className={`has-submenu ${expandedMenus.printer ? 'expanded' : ''}`}>
                                <a className={isActive('/admin/printer-settings') ? 'active' : ''} onClick={() => toggleMenu('printer')}>
                                    <Icon src="/images/Printer Settings.png" alt="Printer" />
                                    Printer Setting
                                </a>
                                <ul className="submenu">
                                    <li>
                                        <a className={isSubActive('/admin/printer-settings', 'tab=editor') || (isActive('/admin/printer-settings') && !location.search) ? 'active' : ''} 
                                           onClick={() => navigate('/admin/printer-settings?tab=editor')}>
                                            <span className="submenu-dot">◦</span> Printer Editor
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/printer-settings', 'tab=summary') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/printer-settings?tab=summary')}>
                                            <span className="submenu-dot">◦</span> Choose summary report
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/printer-settings', 'tab=token') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/printer-settings?tab=token')}>
                                            <span className="submenu-dot">◦</span> Choose token report
                                        </a>
                                    </li>
                                    <li>
                                        <a className={isSubActive('/admin/printer-settings', 'tab=view') ? 'active' : ''} 
                                           onClick={() => navigate('/admin/printer-settings?tab=view')}>
                                            <span className="submenu-dot">◦</span> View Report Linking
                                        </a>
                                    </li>
                                </ul>
                            </li>
                        </>
                    ) : (
                        <>
                            <li>
                                <a className={isActive('/dashboard') ? 'active' : ''} onClick={() => navigate('/dashboard')}>
                                    <Icon src="/images/dashboard (1).png" alt="Dashboard" />
                                    Dashboard
                                </a>
                            </li>
                            <li>
                                <a className={isActive('/dashboard/change-dept') ? 'active' : ''} onClick={() => navigate('/dashboard/change-dept')}>
                                    <Icon src="/images/Department.png" alt="Department" />
                                    Change Department
                                </a>
                            </li>
                            <li>
                                <a onClick={handleLogout}>
                                    <Icon src="/images/logout.png" alt="Logout" />
                                    Logout
                                </a>
                            </li>
                        </>
                    )}
                </ul>
            </nav>
        </aside>
    );
}