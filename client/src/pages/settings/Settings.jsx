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
      <header className="page-heading">
        <div><Title level={3}>{t('workspace.accountSettings')}</Title><Text type="secondary">{user?.name} · {user?.email}</Text></div>
        <Tag>{roleLabel(user?.role)}</Tag>
      </header>

      {/* Tabs điều hướng chuẩn Base Account */}
      <div
        className="settings-sections"
        style={{ padding: 0 }}
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
