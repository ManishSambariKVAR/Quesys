import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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

  const isSuperAdmin = user?.name === 'kvar' || user?.userId === '000';

  // Determine which menu should be expanded based on the current URL
  const getInitialExpandedState = () => ({
    departments: location.pathname.startsWith('/admin/departments'),
    users: location.pathname.startsWith('/admin/users'),
    counters: location.pathname.startsWith('/admin/counters'),
    waitingRoom: location.pathname.startsWith('/admin/waiting-room'),
    tv: location.pathname.startsWith('/admin/ota'),
    factory: location.pathname.startsWith('/admin/system-settings'),
    printer: location.pathname.startsWith('/admin/printer-settings'),
  });

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
    getInitialExpandedState()
  );

  // Update expanded menus when the route changes
  useEffect(() => {
    setExpandedMenus(getInitialExpandedState());
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;
  const isSubActive = (path: string, search: string) =>
    location.pathname === path && location.search.includes(search);

  const toggleMenu = (menu: string) => {
    setExpandedMenus((prev) => {
      // Close all others, toggle the clicked one
      const newState = {
        departments: false,
        users: false,
        counters: false,
        waitingRoom: false,
        tv: false,
        factory: false,
        printer: false,
      };
      return { ...newState, [menu]: !prev[menu] };
    });
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <img
          src="/images/Adhar Logo.png"
          alt="Aadhaar Logo"
          className="sidebar-logo"
        />
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar">
          <img
            src="/images/pngtree-business-male-icon-vector-png-image_916468-removebg-preview.png"
            alt="User"
            className="sidebar-avatar-img"
          />
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">
            Hello, <strong>{user?.name || 'kvar'}</strong>
          </span>
          {user?.department && (
            <div
              style={{
                marginTop: '5px',
                fontSize: '0.95rem',
                fontWeight: 'bold',
              }}
            >
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
              {/* --- VISIBLE TO ALL ADMINS --- */}
              <li>
                <Link
                  to="/admin"
                  className={isActive('/admin') ? 'active' : ''}
                >
                  <Icon src="/images/dashboard (1).png" alt="Dashboard" />
                  Dashboard
                </Link>
              </li>
              <li>
                <a onClick={handleLogout}>
                  <Icon src="/images/logout.png" alt="Logout" />
                  Logout
                </a>
              </li>

              <li
                className={`has-submenu ${expandedMenus.departments ? 'expanded' : ''}`}
              >
                <a
                  className={isActive('/admin/departments') ? 'active' : ''}
                  onClick={() => toggleMenu('departments')}
                >
                  <Icon
                    src="/images/Department Settings.png"
                    alt="Departments"
                  />
                  Department Settings
                </a>
                <ul className="submenu">
                  <li>
                    <Link
                      to="/admin/departments?tab=view"
                      className={
                        isSubActive('/admin/departments', 'tab=view') ||
                        (isActive('/admin/departments') && !location.search)
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> View Departments
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/departments?tab=add"
                      className={
                        isSubActive('/admin/departments', 'tab=add')
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> Add Departments
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/departments?tab=delete"
                      className={
                        isSubActive('/admin/departments', 'tab=delete')
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> Delete Departments
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`has-submenu ${expandedMenus.users ? 'expanded' : ''}`}
              >
                <a
                  className={isActive('/admin/users') ? 'active' : ''}
                  onClick={() => toggleMenu('users')}
                >
                  <Icon src="/images/system.png" alt="Users" />
                  User Settings
                </a>
                <ul className="submenu">
                  <li>
                    <Link
                      to="/admin/users?tab=view"
                      className={
                        isSubActive('/admin/users', 'tab=view') ||
                        (isActive('/admin/users') && !location.search)
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> View users
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/users?tab=add"
                      className={
                        isSubActive('/admin/users', 'tab=add') ? 'active' : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> Add Users
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/users?tab=delete"
                      className={
                        isSubActive('/admin/users', 'tab=delete')
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> Delete Users
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`has-submenu ${expandedMenus.counters ? 'expanded' : ''}`}
              >
                <a
                  className={isActive('/admin/counters') ? 'active' : ''}
                  onClick={() => toggleMenu('counters')}
                >
                  <Icon src="/images/Counter Settings.png" alt="Counters" />
                  Counter Settings
                </a>
                <ul className="submenu">
                  <li>
                    <Link
                      to="/admin/counters?tab=view"
                      className={
                        isSubActive('/admin/counters', 'tab=view') ||
                        (isActive('/admin/counters') && !location.search)
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> View Counter
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/counters?tab=add"
                      className={
                        isSubActive('/admin/counters', 'tab=add')
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> Add Counter
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/counters?tab=delete"
                      className={
                        isSubActive('/admin/counters', 'tab=delete')
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> Delete Counter
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`has-submenu ${expandedMenus.waitingRoom ? 'expanded' : ''}`}
              >
                <a
                  className={isActive('/admin/waiting-room') ? 'active' : ''}
                  onClick={() => toggleMenu('waitingRoom')}
                >
                  <Icon src="/images/hall.png" alt="Waiting Room" />
                  Waiting Room Display
                </a>
                <ul className="submenu">
                  <li>
                    <Link
                      to="/admin/waiting-room?tab=view"
                      className={
                        isSubActive('/admin/waiting-room', 'tab=view') ||
                        (isActive('/admin/waiting-room') && !location.search)
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> View Waiting Room
                      Display
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/waiting-room?tab=add"
                      className={
                        isSubActive('/admin/waiting-room', 'tab=add')
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> Add Waiting Room
                      Display
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin/waiting-room?tab=delete"
                      className={
                        isSubActive('/admin/waiting-room', 'tab=delete')
                          ? 'active'
                          : ''
                      }
                    >
                      <span className="submenu-dot">◦</span> Delete Waiting Room
                      Display
                    </Link>
                  </li>
                </ul>
              </li>

              {/* --- VISIBLE TO SUPER-ADMIN (kvar) ONLY --- */}
              {isSuperAdmin && (
                <>
                  <li>
                    <Link
                      to="/admin/company"
                      className={isActive('/admin/company') ? 'active' : ''}
                    >
                      <Icon src="/images/Company Settings.png" alt="Company" />
                      Company Settings
                    </Link>
                  </li>

                  <li
                    className={`has-submenu ${expandedMenus.tv ? 'expanded' : ''}`}
                  >
                    <a
                      className={isActive('/admin/ota') ? 'active' : ''}
                      onClick={() => toggleMenu('tv')}
                    >
                      <Icon src="/images/TVsettings.png" alt="TV" />
                      TV Setting
                    </a>
                    <ul className="submenu">
                      <li>
                        <Link
                          to="/admin/ota?tab=editor"
                          className={
                            isSubActive('/admin/ota', 'tab=editor') ||
                            (isActive('/admin/ota') && !location.search)
                              ? 'active'
                              : ''
                          }
                        >
                          <span className="submenu-dot">◦</span> OTA Editor
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/admin/ota?tab=list"
                          className={
                            isSubActive('/admin/ota', 'tab=list')
                              ? 'active'
                              : ''
                          }
                        >
                          <span className="submenu-dot">◦</span> View OTA List
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/admin/ota?tab=link"
                          className={
                            isSubActive('/admin/ota', 'tab=link')
                              ? 'active'
                              : ''
                          }
                        >
                          <span className="submenu-dot">◦</span> Choose OTA
                        </Link>
                      </li>
                    </ul>
                  </li>

                  <li>
                    <Link
                      to="/admin/auto-logout"
                      className={isActive('/admin/auto-logout') ? 'active' : ''}
                    >
                      <Icon src="/images/logout.png" alt="Auto Logout" />
                      Auto Logout Settings
                    </Link>
                  </li>

                  <li>
                    <Link
                      to="/admin/kiosk"
                      className={isActive('/admin/kiosk') ? 'active' : ''}
                    >
                      <Icon src="/images/KIOSK Registration.png" alt="Kiosk" />
                      KIOSK Registration
                    </Link>
                  </li>

                  <li
                    className={`has-submenu ${expandedMenus.factory ? 'expanded' : ''}`}
                  >
                    <a
                      className={
                        isActive('/admin/system-settings') ? 'active' : ''
                      }
                      onClick={() => toggleMenu('factory')}
                    >
                      <Icon
                        src="/images/Factory Settings.png"
                        alt="Factory Settings"
                      />
                      Factory Settings
                    </a>
                    <ul className="submenu">
                      <li>
                        <Link
                          to="/admin/system-settings?tab=factory"
                          className={
                            isSubActive(
                              '/admin/system-settings',
                              'tab=factory'
                            ) ||
                            (isActive('/admin/system-settings') &&
                              !location.search)
                              ? 'active'
                              : ''
                          }
                        >
                          <span className="submenu-dot">◦</span> Factory
                          Settings
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/admin/system-settings?tab=software"
                          className={
                            isSubActive(
                              '/admin/system-settings',
                              'tab=software'
                            )
                              ? 'active'
                              : ''
                          }
                        >
                          <span className="submenu-dot">◦</span> Software
                          Settings
                        </Link>
                      </li>
                    </ul>
                  </li>

                  <li
                    className={`has-submenu ${expandedMenus.printer ? 'expanded' : ''}`}
                  >
                    <a
                      className={
                        isActive('/admin/printer-settings') ? 'active' : ''
                      }
                      onClick={() => toggleMenu('printer')}
                    >
                      <Icon src="/images/Printer Settings.png" alt="Printer" />
                      Printer Setting
                    </a>
                    <ul className="submenu">
                      <li>
                        <Link
                          to="/admin/printer-settings?tab=editor"
                          className={
                            isSubActive(
                              '/admin/printer-settings',
                              'tab=editor'
                            ) ||
                            (isActive('/admin/printer-settings') &&
                              !location.search)
                              ? 'active'
                              : ''
                          }
                        >
                          <span className="submenu-dot">◦</span> Printer Editor
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/admin/printer-settings?tab=summary"
                          className={
                            isSubActive(
                              '/admin/printer-settings',
                              'tab=summary'
                            )
                              ? 'active'
                              : ''
                          }
                        >
                          <span className="submenu-dot">◦</span> Choose summary
                          report
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/admin/printer-settings?tab=token"
                          className={
                            isSubActive('/admin/printer-settings', 'tab=token')
                              ? 'active'
                              : ''
                          }
                        >
                          <span className="submenu-dot">◦</span> Choose token
                          report
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/admin/printer-settings?tab=view"
                          className={
                            isSubActive('/admin/printer-settings', 'tab=view')
                              ? 'active'
                              : ''
                          }
                        >
                          <span className="submenu-dot">◦</span> View Report
                          Linking
                        </Link>
                      </li>
                    </ul>
                  </li>
                </>
              )}
            </>
          ) : (
            <>
              {/* --- VISIBLE TO REGULAR NON-ADMIN USERS --- */}
              <li>
                <Link
                  to="/dashboard"
                  className={isActive('/dashboard') ? 'active' : ''}
                >
                  <Icon src="/images/dashboard (1).png" alt="Dashboard" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/change-dept"
                  className={isActive('/dashboard/change-dept') ? 'active' : ''}
                >
                  <Icon src="/images/Department.png" alt="Department" />
                  Change Department
                </Link>
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
