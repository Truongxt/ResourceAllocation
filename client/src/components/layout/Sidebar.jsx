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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const { Sider } = Layout;

// Nhãn dựng trong component chứ không phải ở cấp module: ở cấp module thì nó
// được tính đúng một lần lúc nạp file, và đổi ngôn ngữ sau đó không đổi được menu.
const MENU_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, labelKey: 'nav.dashboard' },
  { key: '/projects', icon: <ProjectOutlined />, labelKey: 'nav.projects' },
  { key: '/tasks', icon: <UnorderedListOutlined />, labelKey: 'nav.tasks' },
  { key: '/resources', icon: <TeamOutlined />, labelKey: 'nav.resources' },
  { key: '/optimization', icon: <ThunderboltOutlined />, labelKey: 'nav.optimization' },
  { key: '/gantt', icon: <BarChartOutlined />, labelKey: 'nav.gantt' },
  { key: '/reports', icon: <FileTextOutlined />, labelKey: 'nav.reports' },
  { key: '/activity-logs', icon: <HistoryOutlined />, labelKey: 'nav.activityLogs' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const menuItems = MENU_ITEMS.map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }));

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
