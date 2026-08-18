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
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';

const { Header: AntHeader } = Layout;
const { Text, Title } = Typography;

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

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffSec = Math.floor((now - past) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return `${Math.floor(diffSec / 86400)} ngày trước`;
}

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

  const currentTitle = pageTitles[location.pathname] || 'RAO';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotifClick = (notif) => {
    if (!notif.readAt) markAsRead(notif._id);
    if (notif.link) navigate(notif.link);
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
      label: 'Cài đặt tài khoản',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
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
          <Text strong style={{ fontSize: 14 }}>Thông báo</Text>
          {unreadCount > 0 && (
            <Badge count={`${unreadCount} mới`} style={{ backgroundColor: '#4f46e5' }} />
          )}
        </Space>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllAsRead}>
            Đọc tất cả
          </Button>
        )}
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <Empty description="Không có thông báo mới" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '28px 0' }} />
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
                      <Text type="secondary" style={{ fontSize: 11 }}>{formatTimeAgo(n.createdAt)}</Text>
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
          {/* Theme Toggle */}
          <Tooltip title={isDark ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}>
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
                  {ROLE_LABELS[user?.role] || user?.role || 'Member'}
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
