import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Badge, Dropdown, Avatar, Switch, List, Typography, Button, Space, Tooltip, Empty } from 'antd';
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
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../../i18n';
import { formatTimeAgo } from '../../i18n/format';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';

const { Header: AntHeader } = Layout;
const { Text, Title } = Typography;

// Tiêu đề trang và nhãn vai trò lấy từ i18n (`pageTitle.*`, `enums.role.*`).

function getNotifIcon(type) {
  if (type?.includes('task')) return <FileTextOutlined style={{ color: '#4f46e5' }} />;
  if (type?.includes('optimization')) return <ThunderboltOutlined style={{ color: '#f59e0b' }} />;
  if (type?.includes('project')) return <ProjectOutlined style={{ color: '#059669' }} />;
  return <BellOutlined style={{ color: '#64748b' }} />;
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
  const currentTitle = t(`pageTitle.${location.pathname}`, { defaultValue: 'RAO' });
  const nextLanguage =
    LANGUAGES.find((l) => l.code !== i18n.language) || LANGUAGES[0];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Đây là đích điều hướng duy nhất không phải hằng số trong toàn bộ client: nó
  // đến từ trường `link` của Notification trong database. Hiện server chỉ ghi
  // đường dẫn cố định, nhưng schema không ràng buộc, nên chặn tại đây: chỉ nhận
  // đường dẫn nội bộ, loại "//host" và "/\host" (dạng open redirect).
  const isInternalPath = (link) =>
    typeof link === 'string' && /^\/(?![/\\])/.test(link);

  const handleNotifClick = (notif) => {
    if (!notif.readAt) markAsRead(notif._id);
    if (isInternalPath(notif.link)) navigate(notif.link);
  };

  const userMenuItems = [
    {
      key: 'info',
      label: (
        <div style={{ padding: '6px 4px' }}>
          <Text strong style={{ display: 'block', fontSize: 14 }}>{user?.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('header.settings'),
      onClick: () => navigate('/settings'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('header.logout'),
      danger: true,
      onClick: handleLogout,
    },
  ];

  const notifContent = (
    <div
      style={{
        width: 360,
        background: isDark ? '#1e293b' : '#ffffff',
        border: isDark ? '1px solid rgba(148,163,184,0.2)' : '1px solid #cbd5e1',
        borderRadius: 12,
        boxShadow: isDark ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          borderBottom: isDark ? '1px solid rgba(148,163,184,0.15)' : '1px solid #e2e8f0',
          background: isDark ? '#0f172a' : '#f8fafc',
        }}
      >
        <Space>
          <Text strong style={{ fontSize: 14 }}>{t('header.notifications')}</Text>
          {unreadCount > 0 && (
            <Badge count={t('header.unreadBadge', { count: unreadCount })} style={{ backgroundColor: '#4f46e5' }} />
          )}
        </Space>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllAsRead}>
            {t('header.markAllRead')}
          </Button>
        )}
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <Empty description={t('header.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '28px 0' }} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(n) => (
              <List.Item
                onClick={() => handleNotifClick(n)}
                style={{
                  cursor: 'pointer',
                  padding: '12px 16px',
                  background: n.readAt ? 'transparent' : (isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(79, 70, 229, 0.05)'),
                  borderBottom: isDark ? '1px solid rgba(148,163,184,0.08)' : '1px solid #f1f5f9',
                }}
              >
                <List.Item.Meta
                  avatar={getNotifIcon(n.type)}
                  title={<Text strong style={{ fontSize: 13 }}>{n.title}</Text>}
                  description={
                    <>
                      <Text style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#475569' }}>{n.message}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>{formatTimeAgo(n.createdAt, t)}</Text>
                    </>
                  }
                />
                {!n.readAt && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#4f46e5',
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
          background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
          borderBottom: isDark ? '1px solid rgba(148,163,184,0.15)' : '1px solid #e2e8f0',
          boxShadow: isDark ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.04)',
          transition: 'left 0.2s ease',
        }}
      >
        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
          {currentTitle}
        </Title>

        <Space size="large">
          {/* Language Toggle — bấm để chuyển sang ngôn ngữ còn lại. Hai ngôn ngữ
              thì nút bập bênh gọn hơn dropdown; thêm ngôn ngữ thứ ba thì đổi. */}
          <Tooltip title={`${t('header.switchLanguage')}: ${nextLanguage.label}`}>
            <Button
              type="text"
              size="small"
              onClick={() => changeLanguage(nextLanguage.code)}
              style={{ fontWeight: 600, letterSpacing: 0.5 }}
            >
              {nextLanguage.short}
            </Button>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip title={t('header.toggleTheme')}>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
          </Tooltip>

          {/* Notification Bell */}
          <Dropdown
            dropdownRender={() => notifContent}
            trigger={['click']}
            placement="bottomRight"
          >
            <Badge count={unreadCount} size="small" offset={[-2, 4]}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18, color: isDark ? '#cbd5e1' : '#334155' }} />}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Badge>
          </Dropdown>

          {/* User Menu */}
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
            <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
              <Avatar
                icon={<UserOutlined />}
                style={{ background: 'linear-gradient(135deg, #4f46e5, #0d9488)', fontWeight: 600 }}
              />
              <div style={{ lineHeight: 1.25 }}>
                <Text strong style={{ fontSize: 13, display: 'block' }}>
                  {user?.name || 'User'}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
                  {user?.role ? t(`enums.role.${user.role}`) : ''}
                </Text>
              </div>
            </Space>
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
            top: 80,
            right: 24,
            zIndex: 1000,
            background: isDark ? '#1e293b' : '#ffffff',
            border: '1px solid #4f46e5',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            width: 360,
            maxWidth: 'calc(100vw - 32px)',
            cursor: 'pointer',
            boxShadow: isDark
              ? '0 10px 25px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.2)'
              : '0 10px 25px rgba(0,0,0,0.12), 0 0 20px rgba(79,70,229,0.1)',
            animation: 'slideInDown 0.3s ease-out',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: 22, marginTop: 2 }}>{getNotifIcon(toastNotification.type)}</div>
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
