import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Badge, Dropdown, Avatar, Switch, List, Typography, Button, Space, Tooltip, Empty, Breadcrumb } from 'antd';
import {
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  CheckOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  ProjectOutlined,
  CloseOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../../i18n';
import { formatTimeAgo } from '../../i18n/format';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';

const { Header: AntHeader } = Layout;
const { Text, Title } = Typography;

function getNotifIcon(type) {
  if (type?.includes('task')) return <FileTextOutlined style={{ color: '#818cf8', fontSize: 16 }} />;
  if (type?.includes('optimization')) return <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 16 }} />;
  if (type?.includes('project')) return <ProjectOutlined style={{ color: '#10b981', fontSize: 16 }} />;
  return <BellOutlined style={{ color: '#94a3b8', fontSize: 16 }} />;
}

export default function Header({ collapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    toastNotification,
    dismissToast,
  } = useSocket();

  const { t, i18n } = useTranslation();
  const currentTitle = t(`pageTitle.${location.pathname}`, { defaultValue: 'Tổng quan' });
  const nextLanguage = LANGUAGES.find((l) => l.code !== i18n.language) || LANGUAGES[0];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isInternalPath = (link) => typeof link === 'string' && /^\/(?![/\\])/.test(link);

  const handleNotifClick = (notif) => {
    if (!notif.readAt) markAsRead(notif._id);
    if (isInternalPath(notif.link)) navigate(notif.link);
  };

  const userMenuItems = [
    {
      key: 'info',
      label: (
        <div style={{ padding: '8px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text strong style={{ fontSize: 14 }}>{user?.name}</Text>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
              }}
            >
              {user?.role ? t(`enums.role.${user.role}`) : 'MEMBER'}
            </span>
          </div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>{user?.email}</Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('header.settings') || 'Cài đặt tài khoản',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('header.logout') || 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const notifContent = (
    <div
      style={{
        width: 380,
        background: isDark ? '#101726' : '#ffffff',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
        borderRadius: 14,
        boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.6)' : '0 12px 32px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #f1f5f9',
          background: isDark ? '#0c121e' : '#f8fafc',
        }}
      >
        <Space>
          <Text strong style={{ fontSize: 14 }}>{t('header.notifications') || 'Thông báo'}</Text>
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ backgroundColor: '#6366f1' }} />
          )}
        </Space>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllAsRead} style={{ color: '#818cf8', padding: 0 }}>
            {t('header.markAllRead') || 'Đọc tất cả'}
          </Button>
        )}
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <Empty description={t('header.empty') || 'Không có thông báo mới'} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '32px 0' }} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(n) => (
              <List.Item
                onClick={() => handleNotifClick(n)}
                style={{
                  cursor: 'pointer',
                  padding: '12px 18px',
                  background: n.readAt ? 'transparent' : (isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(79, 70, 229, 0.04)'),
                  borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f8fafc',
                  transition: 'background 0.15s ease',
                }}
              >
                <List.Item.Meta
                  avatar={<div style={{ marginTop: 2 }}>{getNotifIcon(n.type)}</div>}
                  title={<Text strong style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a' }}>{n.title}</Text>}
                  description={
                    <>
                      <Text style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#475569', display: 'block', lineHeight: 1.4 }}>{n.message}</Text>
                      <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>{formatTimeAgo(n.createdAt, t)}</Text>
                    </>
                  }
                />
                {!n.readAt && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#6366f1',
                      boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)',
                      flexShrink: 0,
                    }}
                  />
                )}
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      <AntHeader
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: collapsed ? 72 : 240,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: isDark ? 'rgba(9, 13, 22, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
          boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.03)',
          transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Left: Page Title with Subtle Breadcrumb */}
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {currentTitle}
          </Title>
        </div>

        {/* Right: Quick Controls & Profile */}
        <Space size="middle" align="center">
          {/* Language Switch */}
          <Tooltip title={`${t('header.switchLanguage') || 'Đổi ngôn ngữ'}: ${nextLanguage.label}`}>
            <Button
              type="text"
              size="small"
              onClick={() => changeLanguage(nextLanguage.code)}
              icon={<GlobalOutlined style={{ fontSize: 14 }} />}
              style={{
                fontWeight: 600,
                fontSize: 12,
                borderRadius: 8,
                padding: '4px 10px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
              }}
            >
              {nextLanguage.short}
            </Button>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip title={t('header.toggleTheme') || 'Chuyển giao diện'}>
            <div
              onClick={toggleTheme}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                color: isDark ? '#fbbf24' : '#6366f1',
                transition: 'all 0.2s ease',
              }}
            >
              {isDark ? <SunOutlined style={{ fontSize: 16 }} /> : <MoonOutlined style={{ fontSize: 16 }} />}
            </div>
          </Tooltip>

          {/* Notification Bell */}
          <Dropdown
            dropdownRender={() => notifContent}
            trigger={['click']}
            placement="bottomRight"
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                color: isDark ? '#cbd5e1' : '#334155',
                position: 'relative',
              }}
            >
              <Badge count={unreadCount} size="small" offset={[2, -2]}>
                <BellOutlined style={{ fontSize: 16 }} />
              </Badge>
            </div>
          </Dropdown>

          {/* User Menu Chip */}
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '4px 10px 4px 6px',
                borderRadius: 20,
                background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                transition: 'all 0.2s ease',
              }}
            >
              <Avatar
                size={26}
                icon={<UserOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  fontWeight: 600,
                  fontSize: 12,
                }}
              />
              <div style={{ lineHeight: 1.2 }}>
                <Text strong style={{ fontSize: 13, display: 'block', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'User'}
                </Text>
              </div>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                }}
              />
            </div>
          </Dropdown>
        </Space>
      </AntHeader>

      {/* Real-time Toast Notification */}
      {toastNotification && (
        <div
          onClick={() => {
            handleNotifClick(toastNotification);
            dismissToast();
          }}
          style={{
            position: 'fixed',
            top: 76,
            right: 24,
            zIndex: 1000,
            background: isDark ? '#101726' : '#ffffff',
            border: '1px solid #6366f1',
            borderRadius: 14,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            cursor: 'pointer',
            boxShadow: isDark
              ? '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.25)'
              : '0 10px 30px rgba(0,0,0,0.12), 0 0 20px rgba(79,70,229,0.15)',
            animation: 'slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: 20, marginTop: 2 }}>{getNotifIcon(toastNotification.type)}</div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ display: 'block', fontSize: 13 }}>{toastNotification.title}</Text>
            <Text style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#475569' }}>
              {toastNotification.message}
            </Text>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              dismissToast();
            }}
          />
        </div>
      )}
    </>
  );
}
