import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HiOutlineViewGrid,
  HiOutlineFolder,
  HiOutlineClipboardList,
  HiOutlineUserGroup,
  HiOutlineLightningBolt,
  HiOutlineChartBar,
  HiOutlineDocumentReport,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from 'react-icons/hi';
import './Sidebar.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: HiOutlineViewGrid },
  { path: '/projects', label: 'Dự án', icon: HiOutlineFolder },
  { path: '/tasks', label: 'Công việc', icon: HiOutlineClipboardList },
  { path: '/resources', label: 'Nhân sự', icon: HiOutlineUserGroup },
  { path: '/optimization', label: 'Tối ưu hóa', icon: HiOutlineLightningBolt },
  { path: '/gantt', label: 'Gantt Chart', icon: HiOutlineChartBar },
  { path: '/reports', label: 'Báo cáo', icon: HiOutlineDocumentReport },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <span>R</span>
        </div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">RAO</span>
            <span className="sidebar-logo-tagline">Resource Optimization</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? 'active' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="sidebar-nav-icon" />
                {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <button className="sidebar-toggle" onClick={onToggle}>
        {collapsed ? (
          <HiOutlineChevronRight className="sidebar-toggle-icon" />
        ) : (
          <HiOutlineChevronLeft className="sidebar-toggle-icon" />
        )}
      </button>
    </aside>
  );
}
