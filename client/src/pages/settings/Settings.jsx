/**
 * ============================================================================
 * PHÂN HỆ QUẢN LÝ TÀI KHOẢN TOÀN DIỆN (Base Account Platform)
 * Chuẩn mô hình Base Account (https://help.base.vn/support/solutions/articles/63000277859-base-account)
 * ============================================================================
 */

import React, { useState } from 'react';
import { Tabs, Typography, Tag, Avatar, Space, Row, Col, Badge } from 'antd';
import {
  UserOutlined,
  SafetyCertificateOutlined,
  CheckCircleFilled,
  LockOutlined,
  CalendarOutlined,
  TeamOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  BankOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { roleLabel } from '../../i18n/enums';
import MyProfileTab from '../../components/settings/MyProfileTab';
import SecuritySessionsTab from '../../components/settings/SecuritySessionsTab';
import MyLeavesCard from '../../components/settings/MyLeavesCard';
import UserDirectoryTab from '../../components/settings/UserDirectoryTab';
import AppPermissionsTab from '../../components/settings/AppPermissionsTab';
import GroupsTab from '../../components/settings/GroupsTab';
import './Settings.css';

const { Title, Text, Paragraph } = Typography;

export default function Settings() {
  const { t } = useTranslation();
  const { user, updateProfile, changePassword } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');

  const isAdmin = user?.role === 'admin';
  const isPM = user?.role === 'project_manager';
  const canManageUsers = isAdmin;
  const canManageGroups = isAdmin || isPM;

  const tabItems = [
    {
      key: 'profile',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
          <UserOutlined />
          <span>{t('settings.profile') || 'Hồ sơ cá nhân'}</span>
        </span>
      ),
      children: <MyProfileTab user={user} updateProfile={updateProfile} />,
    },
    {
      key: 'security',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
          <LockOutlined />
          <span>Bảo mật & Phiên đăng nhập</span>
        </span>
      ),
      children: (
        <SecuritySessionsTab
          user={user}
          changePassword={changePassword}
          updateProfile={updateProfile}
        />
      ),
    },
    {
      key: 'leaves',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
          <CalendarOutlined />
          <span>Lịch làm việc & Nghỉ phép</span>
        </span>
      ),
      children: <MyLeavesCard />,
    },
    ...(canManageUsers
      ? [
          {
            key: 'users',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                <TeamOutlined />
                <span>Danh bạ Tài khoản (Base Directory)</span>
                <Badge count="Admin" style={{ backgroundColor: '#7c3aed', fontSize: 10 }} />
              </span>
            ),
            children: <UserDirectoryTab currentUser={user} />,
          },
          {
            key: 'permissions',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                <AppstoreOutlined />
                <span>Phân quyền Thao tác & Ứng dụng</span>
                <Badge count="Admin" style={{ backgroundColor: '#2563eb', fontSize: 10 }} />
              </span>
            ),
            children: <AppPermissionsTab />,
          },
        ]
      : []),
    ...(canManageGroups
      ? [
          {
            key: 'groups',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                <ApartmentOutlined />
                <span>Nhóm & Phòng ban (Groups)</span>
              </span>
            ),
            children: <GroupsTab />,
          },
        ]
      : []),
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 40 }}>
      {/* Base Account Header Banner */}
      <div
        className="saas-card"
        style={{
          padding: '24px 28px',
          marginBottom: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Avatar
              size={68}
              src={user?.avatar}
              icon={<UserOutlined />}
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                fontSize: 28,
              }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Title level={3} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {user?.name}
                </Title>
                <Tag
                  color={user?.role === 'admin' ? 'purple' : user?.role === 'project_manager' ? 'blue' : 'cyan'}
                  style={{ borderRadius: 12, fontWeight: 600, padding: '2px 10px' }}
                >
                  <SafetyCertificateOutlined style={{ marginRight: 4 }} />
                  {roleLabel(user?.role)}
                </Tag>
                <Tag color="success" style={{ borderRadius: 12 }}>
                  <CheckCircleFilled style={{ marginRight: 4 }} />
                  Base Account Active
                </Tag>
              </div>

              <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
                {user?.email} • {user?.jobTitle || user?.position || 'Thành viên'} • {user?.companyName || 'Công ty Công nghệ RAO'}
              </Text>
            </div>
          </div>

          {/* Platform Identity Badges */}
          <Space size={12} wrap>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hệ sinh thái
              </Text>
              <Tag color="#1e3a8a" style={{ border: '1px solid #3b82f6', color: '#93c5fd', margin: 0, fontWeight: 600 }}>
                Base Platform 2026
              </Tag>
            </div>
          </Space>
        </div>
      </div>

      {/* Tabs điều hướng chuẩn Base Account */}
      <div
        className="saas-card"
        style={{
          background: isDark ? 'rgba(11, 17, 30, 0.7)' : '#ffffff',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '8px 24px 24px 24px',
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          tabBarStyle={{ marginBottom: 20 }}
        />
      </div>
    </div>
  );
}
