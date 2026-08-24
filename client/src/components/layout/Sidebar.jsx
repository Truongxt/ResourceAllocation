import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Tooltip } from 'antd';
import {
  DashboardOutlined,
  ProjectOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const { Sider } = Layout;
const { Text } = Typography;

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const menuItems = [
    {
      key: 'grp-overview',
      type: 'group',
      label: !collapsed ? (
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase' }}>
          {t('nav.overview') || 'TỔNG QUAN'}
        </span>
      ) : null,
      children: [
        { key: '/', icon: <DashboardOutlined style={{ fontSize: 16 }} />, label: t('nav.dashboard') },
      ],
    },
    {
      key: 'grp-management',
      type: 'group',
      label: !collapsed ? (
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase' }}>
          {t('nav.workspace') || 'QUẢN LÝ DỰ ÁN'}
        </span>
      ) : null,
      children: [
        { key: '/projects', icon: <ProjectOutlined style={{ fontSize: 16 }} />, label: t('nav.projects') },
        { key: '/tasks', icon: <UnorderedListOutlined style={{ fontSize: 16 }} />, label: t('nav.tasks') },
        { key: '/resources', icon: <TeamOutlined style={{ fontSize: 16 }} />, label: t('nav.resources') },
      ],
    },
    {
      key: 'grp-analytics',
      type: 'group',
      label: !collapsed ? (
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase' }}>
          {t('nav.analytics') || 'TỐI ƯU & BÁO CÁO'}
        </span>
      ) : null,
      children: [
        { key: '/optimization', icon: <ThunderboltOutlined style={{ fontSize: 16, color: '#818cf8' }} />, label: t('nav.optimization') },
        { key: '/gantt', icon: <BarChartOutlined style={{ fontSize: 16 }} />, label: t('nav.gantt') },
        { key: '/reports', icon: <FileTextOutlined style={{ fontSize: 16 }} />, label: t('nav.reports') },
      ],
    },
    {
      key: 'grp-system',
      type: 'group',
      label: !collapsed ? (
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase' }}>
          {t('nav.system') || 'HỆ THỐNG'}
        </span>
      ) : null,
      children: [
        { key: '/activity-logs', icon: <HistoryOutlined style={{ fontSize: 16 }} />, label: t('nav.activityLogs') },
      ],
    },
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={240}
      collapsedWidth={72}
      style={{
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 200,
        background: isDark ? '#090d16' : '#ffffff',
        borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        boxShadow: isDark ? '4px 0 24px rgba(0,0,0,0.4)' : '2px 0 12px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      theme={isDark ? 'dark' : 'light'}
    >
      {/* Brand Header */}
      <div>
        <div
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 12,
            padding: collapsed ? '16px 0' : '16px 20px',
            height: 64,
            cursor: 'pointer',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9',
            background: isDark ? 'rgba(255, 255, 255, 0.01)' : '#ffffff',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              minWidth: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 18,
              color: '#ffffff',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.45)',
            }}
          >
            ⚡
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 16, color: isDark ? '#f8fafc' : '#0f172a', letterSpacing: '-0.02em' }}>
                  RAO Studio
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                  }}
                >
                  PRO
                </span>
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap', fontWeight: 500 }}>
                Resource Allocation AI
              </div>
            </div>
          )}
        </div>

        {/* Menu Navigation */}
        <div style={{ maxHeight: 'calc(100vh - 128px)', overflowY: 'auto', padding: '8px 0' }}>
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{
              border: 'none',
              background: 'transparent',
              fontWeight: 500,
            }}
          />
        </div>
      </div>

      {/* Footer Collapse Toggle */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '0 16px',
          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9',
          background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        {!collapsed && (
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
            {t('common.collapseSidebar') || 'Thu gọn menu'}
          </Text>
        )}
        <Tooltip title={collapsed ? 'Mở rộng' : 'Thu gọn'} placement="right">
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#94a3b8' : '#64748b',
              background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
        </Tooltip>
      </div>
    </Sider>
  );
}
