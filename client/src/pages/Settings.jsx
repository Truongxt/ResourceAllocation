import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Row,
  Col,
  Form,
  Input,
  Button,
  Typography,
  message,
  Tag,
  Avatar,
  Space,
  Divider,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  ApartmentOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { roleLabel } from '../i18n/enums';
import './Settings.css';

const { Title, Text, Paragraph } = Typography;

export default function Settings() {
  const { t } = useTranslation();
  const { user, updateProfile, changePassword } = useAuth();
  const { isDark } = useTheme();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        name: user.name || '',
        department: user.department || '',
      });
    }
  }, [user, profileForm]);

  const handleProfileSubmit = async (values) => {
    setUpdatingProfile(true);
    try {
      const result = await updateProfile(values);
      if (result.success) {
        message.success(result.message || t('settings.profileSaved') || 'Đã lưu thông tin hồ sơ');
      } else {
        message.error(result.message || t('settings.profileFailed') || 'Lỗi cập nhật hồ sơ');
      }
    } catch {
      message.error(t('settings.profileError') || 'Lỗi hệ thống');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (values) => {
    setUpdatingPassword(true);
    try {
      const result = await changePassword(values);
      if (result.success) {
        message.success(result.message || t('settings.passwordSaved') || 'Đã đổi mật khẩu');
        passwordForm.resetFields();
      } else {
        message.error(result.message || t('settings.passwordFailed') || 'Lỗi đổi mật khẩu');
      }
    } catch {
      message.error(t('settings.passwordError') || 'Lỗi hệ thống');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: '0 0 4px 0', fontWeight: 800, letterSpacing: '-0.02em' }}>
          {t('settings.title') || 'Cài đặt Tài khoản'}
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {t('settings.subtitle') || 'Quản lý thông tin cá nhân và bảo mật tài khoản người dùng'}
        </Text>
      </div>

      {/* User Identity Banner */}
      <div
        className="saas-card"
        style={{
          padding: '24px 28px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          background: isDark
            ? 'linear-gradient(135deg, #101726 0%, #151d30 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Avatar
            size={64}
            icon={<UserOutlined />}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              fontWeight: 800,
              fontSize: 26,
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
            }}
          >
            {(user?.name || 'U')[0].toUpperCase()}
          </Avatar>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Title level={4} style={{ margin: 0, fontWeight: 700 }}>{user?.name}</Title>
              <Tag color="purple" style={{ borderRadius: 10, fontWeight: 600 }}>
                {user?.role ? roleLabel(user.role) : 'Thành viên'}
              </Tag>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CheckCircleFilled /> Hoạt động
              </span>
            </div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
              {user?.email}
            </Text>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
            Phòng ban trực thuộc
          </Text>
          <Text strong style={{ fontSize: 14 }}>
            {user?.department || 'Chưa phân bổ phòng ban'}
          </Text>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Profile Information */}
        <Col xs={24} md={12}>
          <div className="saas-card" style={{ padding: 24, height: '100%' }}>
            <Title level={5} style={{ marginBottom: 18, fontWeight: 700 }}>
              👤 {t('settings.profile') || 'Thông tin Hồ sơ'}
            </Title>
            <Form form={profileForm} layout="vertical" onFinish={handleProfileSubmit}>
              <Form.Item
                name="name"
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.name') || 'Họ và tên'}</span>}
                rules={[{ required: true, message: t('auth.required.name') || 'Vui lòng nhập họ tên' }]}
              >
                <Input prefix={<UserOutlined style={{ color: '#64748b' }} />} placeholder="Nguyễn Văn A" style={{ borderRadius: 8 }} />
              </Form.Item>

              <Form.Item label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.email') || 'Địa chỉ Email'}</span>}>
                <Input
                  prefix={<MailOutlined style={{ color: '#64748b' }} />}
                  value={user?.email}
                  disabled
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item
                name="department"
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.department') || 'Phòng ban'}</span>}
              >
                <Input
                  prefix={<ApartmentOutlined style={{ color: '#64748b' }} />}
                  placeholder={t('settings.departmentPlaceholder') || 'VD: IT, Kỹ thuật...'}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={updatingProfile}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  {t('settings.saveProfile') || 'Lưu thay đổi'}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Col>

        {/* Change Password */}
        <Col xs={24} md={12}>
          <div className="saas-card" style={{ padding: 24, height: '100%' }}>
            <Title level={5} style={{ marginBottom: 18, fontWeight: 700 }}>
              🔒 {t('settings.password') || 'Bảo mật & Đổi Mật khẩu'}
            </Title>
            <Form form={passwordForm} layout="vertical" onFinish={handlePasswordSubmit}>
              <Form.Item
                name="currentPassword"
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.currentPassword') || 'Mật khẩu hiện tại'}</span>}
                rules={[{ required: true, message: t('settings.currentPasswordRequired') || 'Vui lòng nhập mật khẩu hiện tại' }]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#64748b' }} />} placeholder="••••••••" style={{ borderRadius: 8 }} />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.newPassword') || 'Mật khẩu mới'}</span>}
                rules={[
                  { required: true, message: t('settings.newPasswordRequired') || 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: t('settings.newPasswordMin') || 'Tối thiểu 6 ký tự' },
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#64748b' }} />} placeholder="••••••••" style={{ borderRadius: 8 }} />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.confirmPassword') || 'Xác nhận mật khẩu mới'}</span>}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('settings.confirmPasswordRequired') || 'Vui lòng xác nhận mật khẩu' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                      return Promise.reject(new Error(t('settings.confirmPasswordMismatch') || 'Mật khẩu không khớp'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#64748b' }} />} placeholder="••••••••" style={{ borderRadius: 8 }} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<LockOutlined />}
                  loading={updatingPassword}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                >
                  {t('settings.changePassword') || 'Đổi mật khẩu'}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
}
