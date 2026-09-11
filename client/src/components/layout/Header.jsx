import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Badge, Dropdown, Avatar, Switch, List, Typography, Button, Space, Tooltip, Empty, Breadcrumb, Tag } from 'antd';
import {
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  ProjectOutlined,
  CloseOutlined,
  GlobalOutlined,
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../../i18n';
import { formatTimeAgo } from '../../i18n/format';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import GlobalSearchModal from '../common/GlobalSearchModal';
import QuickCreateModal from '../common/QuickCreateModal';

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

  const [searchOpen, setSearchOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState('task');

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      label: 'Base Account & Cài đặt',
      onClick: () => navigate('/account'),
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
        {/* Left: Page Title & Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {currentTitle}
          </Title>
        </div>

        {/* Center: Compact Command Palette Trigger */}
        <div
          onClick={() => setSearchOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            height: 32,
            width: 210,
            padding: '0 10px',
            borderRadius: 8,
            background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none',
          }}
          className="header-search-trigger"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}>
            <SearchOutlined style={{ fontSize: 13, color: '#6366f1' }} />
            <span>{t('header.searchPlaceholder', { defaultValue: 'Tìm kiếm...' })}</span>
          </div>
          <kbd
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 4,
              background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
              color: isDark ? '#cbd5e1' : '#64748b',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
              lineHeight: 1.2,
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Right: Quick Controls, Quick Create & Profile */}
        <Space size="middle" align="center">
          {/* Quick Create Button */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'task',
                  icon: <FileTextOutlined style={{ color: '#6366f1' }} />,
                  label: t('header.quickTask', { defaultValue: '+ Công việc mới (Task)' }),
                  onClick: () => {
                    setQuickCreateType('task');
                    setQuickCreateOpen(true);
                  },
                },
                {
                  key: 'project',
                  icon: <ProjectOutlined style={{ color: '#06b6d4' }} />,
                  label: t('header.quickProject', { defaultValue: '+ Dự án mới (Project)' }),
                  onClick: () => {
                    setQuickCreateType('project');
                    setQuickCreateOpen(true);
                  },
                },
                ...(user?.role !== 'member'
                  ? [
                      {
                        key: 'resource',
                        icon: <TeamOutlined style={{ color: '#8b5cf6' }} />,
                        label: t('header.quickResource', { defaultValue: '+ Nhân sự mới (Resource)' }),
                        onClick: () => {
                          setQuickCreateType('resource');
                          setQuickCreateOpen(true);
                        },
                      },
                    ]
                  : []),
              ],
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="primary"
              size="middle"
              icon={<PlusOutlined style={{ fontSize: 12 }} />}
              style={{
                height: 32,
                padding: '0 12px',
                fontSize: 13,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                fontWeight: 600,
                borderRadius: 8,
                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
              }}
            >
              {t('header.quickCreate', { defaultValue: 'Tạo mới' })}
            </Button>
          </Dropdown>

          {/* Language Switch */}
          <Tooltip title={`${t('header.switchLanguage') || 'Đổi ngôn ngữ'}: ${nextLanguage.label}`}>
            <Button
              type="text"
              size="small"
              aria-label={nextLanguage.short}
              onClick={() => changeLanguage(nextLanguage.code)}
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
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Theme"
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
                padding: 0,
              }}
            >
              {isDark ? <SunOutlined style={{ fontSize: 16 }} /> : <MoonOutlined style={{ fontSize: 16 }} />}
            </button>
          </Tooltip>

          {/* Notification Bell */}
          <Dropdown
            popupRender={() => notifContent}
            dropdownRender={() => notifContent}
            trigger={['click']}
            placement="bottomRight"
          >
            <button
              type="button"
              aria-label="Notifications"
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
                padding: 0,
              }}
            >
              <Badge count={unreadCount} size="small" offset={[2, -2]}>
                <BellOutlined style={{ fontSize: 16 }} />
              </Badge>
            </button>
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
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 500, display: 'block' }}>
                  {user?.role ? t(`enums.role.${user.role}`) : ''}
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

      {/* Global Command Palette / Search Modal */}
      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* Global Quick Create Modal */}
      <QuickCreateModal
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        defaultType={quickCreateType}
        onSuccess={() => {
          // If on tasks or projects or resources page, refresh or reload
          window.location.reload();
        }}
      />
    </>
  );
}
