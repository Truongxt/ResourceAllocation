import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineBell,
  HiOutlineSearch,
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlineCog,
  HiOutlineSun,
  HiOutlineMoon,
} from 'react-icons/hi';
import './Header.css';

const pageTitles = {
  '/': 'Dashboard',
  '/projects': 'Quản lý Dự án',
  '/tasks': 'Quản lý Công việc',
  '/resources': 'Quản lý Nhân sự',
  '/optimization': 'Tối ưu hóa Phân bổ',
  '/gantt': 'Gantt Chart',
  '/reports': 'Báo cáo',
  '/settings': 'Cài đặt tài khoản',
};

const ROLE_LABELS = {
  admin: 'Quản trị viên',
  project_manager: 'Project Manager',
  member: 'Thành viên',
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('rao_theme') || 'dark');
  const menuRef = useRef(null);

  const currentTitle = pageTitles[location.pathname] || 'RAO';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rao_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <h2 className="header-title">{currentTitle}</h2>
      </div>

      <div className="header-right">
        {/* Search */}
        <div className="header-search">
          <HiOutlineSearch className="header-search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="header-search-input"
            id="global-search"
          />
        </div>

        {/* Theme Toggle */}
        <button
          className="header-icon-btn"
          onClick={toggleTheme}
          id="theme-toggle-btn"
          title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
        >
          {theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}
        </button>

        {/* Notifications */}
        <button className="header-icon-btn" id="notifications-btn" title="Thông báo">
          <HiOutlineBell />
          <span className="header-notification-badge">3</span>
        </button>

        {/* User Menu */}
        <div className="header-user-container" ref={menuRef}>
          <button
            className="header-user"
            onClick={() => setShowUserMenu(!showUserMenu)}
            id="user-menu-btn"
          >
            <div className="header-avatar">
              <HiOutlineUser />
            </div>
            <div className="header-user-info">
              <span className="header-user-name">{user?.name || 'User'}</span>
              <span className="header-user-role">
                {ROLE_LABELS[user?.role] || user?.role || 'Member'}
              </span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="header-dropdown animate-scale-in" id="user-dropdown">
              <div className="header-dropdown-header">
                <div className="header-dropdown-avatar">
                  <HiOutlineUser />
                </div>
                <div>
                  <div className="header-dropdown-name">{user?.name}</div>
                  <div className="header-dropdown-email">{user?.email}</div>
                </div>
              </div>
              <div className="header-dropdown-divider"></div>
              <button
                className="header-dropdown-item"
                onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                id="btn-settings"
              >
                <HiOutlineCog /> Cài đặt tài khoản
              </button>
              <button
                className="header-dropdown-item header-dropdown-item-danger"
                onClick={handleLogout}
                id="btn-logout"
              >
                <HiOutlineLogout /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
