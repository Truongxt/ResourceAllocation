import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';

const { Sider } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/projects', icon: <ProjectOutlined />, label: 'Dự án' },
  { key: '/tasks', icon: <UnorderedListOutlined />, label: 'Công việc' },
  { key: '/resources', icon: <TeamOutlined />, label: 'Nhân sự' },
  { key: '/optimization', icon: <ThunderboltOutlined />, label: 'Tối ưu hóa' },
  { key: '/gantt', icon: <BarChartOutlined />, label: 'Gantt Chart' },
  { key: '/reports', icon: <FileTextOutlined />, label: 'Báo cáo' },
  { key: '/activity-logs', icon: <HistoryOutlined />, label: 'Nhật ký hoạt động' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onToggle}
      width={240}
      collapsedWidth={72}
      style={{
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 200,
        background: isDark ? '#0f172a' : '#ffffff',
        borderRight: isDark ? '1px solid rgba(148,163,184,0.15)' : '1px solid #e2e8f0',
        boxShadow: isDark ? 'none' : '2px 0 8px rgba(0, 0, 0, 0.04)',
      }}
      theme={isDark ? 'dark' : 'light'}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          padding: collapsed ? '16px 0' : '16px 20px',
          height: 64,
          borderBottom: isDark ? '1px solid rgba(148,163,184,0.1)' : '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #4f46e5, #0d9488)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 18,
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
          }}
        >
          R
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: isDark ? '#f8fafc' : '#0f172a',
                lineHeight: 1.2,
                letterSpacing: 0.5,
              }}
            >
              RAO
            </div>
            <div
              style={{
                fontSize: 11,
                color: isDark ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                fontWeight: 500,
              }}
            >
              Resource Optimization
            </div>
          </div>
        )}
      </div>

      <Menu
        theme={isDark ? 'dark' : 'light'}
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{
          border: 'none',
          marginTop: 10,
          background: 'transparent',
          fontWeight: 500,
        }}
      />
    </Sider>
  );
}
