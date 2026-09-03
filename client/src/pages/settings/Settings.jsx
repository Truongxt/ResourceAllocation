/**
 * ============================================================================
 * TRANG CÀI ĐẶT TÀI KHOẢN (Account Settings Page)
 * ============================================================================
 *
 * Mục đích:
 *   - Trang tổng hợp quản lý thông tin tài khoản người dùng, đổi mật khẩu bảo mật
 *     và quản lý lịch nghỉ phép / vắng mặt cá nhân.
 *
 * Cấu trúc các component con:
 *   - ProfileFormCard: Cập nhật họ tên, phòng ban (client/src/components/settings/ProfileFormCard.jsx)
 *   - PasswordFormCard: Đổi mật khẩu đăng nhập (client/src/components/settings/PasswordFormCard.jsx)
 *   - MyLeavesCard: Lịch nghỉ phép cá nhân & Ràng buộc H3 (client/src/components/settings/MyLeavesCard.jsx)
 */

import { useTranslation } from 'react-i18next';
import { Row, Col, Typography, Tag, Avatar, Space } from 'antd';
import { UserOutlined, SafetyCertificateOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { roleLabel } from '../../i18n/enums';
import ProfileFormCard from '../../components/settings/ProfileFormCard';
import PasswordFormCard from '../../components/settings/PasswordFormCard';
import MyLeavesCard from '../../components/settings/MyLeavesCard';
import './Settings.css';

const { Title, Text, Paragraph } = Typography;

export default function Settings() {
  const { t } = useTranslation();
  const { user, updateProfile, changePassword } = useAuth();
  const { isDark } = useTheme();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Tiêu đề trang */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: '0 0 4px 0', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t('settings.title') || 'Cài đặt Tài khoản'}
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t('settings.subtitle') || 'Quản lý thông tin cá nhân, bảo mật tài khoản và lịch nghỉ phép'}
        </Text>
      </div>

      {/* Banner nhận diện người dùng */}
      <div
        className="saas-card"
        style={{
          padding: '24px 28px',
          marginBottom: 24,
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)'
            : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Avatar
            size={72}
            src={user?.avatar}
            icon={<UserOutlined />}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: '3px solid #e0e7ff',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
              fontSize: 28,
            }}
          >
            {user?.name?.[0]?.toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
                {user?.name}
              </Title>
              <Tag
                color={user?.role === 'admin' ? 'purple' : user?.role === 'project_manager' ? 'blue' : 'cyan'}
                style={{
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 12,
                  border: 'none',
                }}
              >
                <SafetyCertificateOutlined style={{ marginRight: 4 }} />
                {roleLabel(user?.role)}
              </Tag>
            </div>
            <Paragraph type="secondary" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
              {user?.email} • {user?.department || 'Chưa cập nhật phòng ban'}
            </Paragraph>
          </div>
          <Space>
            <Tag color="success" style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12 }}>
              <CheckCircleFilled style={{ marginRight: 4 }} />
              Tài khoản đang hoạt động
            </Tag>
          </Space>
        </div>
      </div>

      {/* 2 Cột: Thông tin cá nhân & Đổi mật khẩu */}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <ProfileFormCard user={user} updateProfile={updateProfile} t={t} />
        </Col>

        <Col xs={24} md={12}>
          <PasswordFormCard changePassword={changePassword} t={t} />
        </Col>
      </Row>

      {/* Quản lý lịch nghỉ phép cá nhân */}
      <MyLeavesCard />
    </div>
  );
}
