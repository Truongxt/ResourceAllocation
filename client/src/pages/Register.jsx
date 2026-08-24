import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Select, Space } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined, ArrowRightOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants';
import { roleLabel } from '../i18n/enums';
import './Auth.css';

const { Title, Text, Paragraph } = Typography;

export default function Register() {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuth();
  const { t } = useTranslation();
  const roleOptions = Object.values(ROLES).map((value) => ({ value, label: roleLabel(value) }));
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    clearError();
    const result = await register(values);
    setLoading(false);
    if (result.success) navigate('/');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: '#090d16',
        color: '#f8fafc',
      }}
    >
      {/* Left Column: Brand & Info Banner */}
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #0c1220 0%, #151b2e 50%, #090d16 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="auth-hero-pane"
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, zIndex: 2 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: '#fff',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
            }}
          >
            ⚡
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              RAO Studio
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>
              Resource Allocation AI
            </span>
          </div>
        </div>

        <div style={{ maxWidth: 500, margin: '40px 0', zIndex: 2 }}>
          <Title level={2} style={{ color: '#f8fafc', fontWeight: 800, fontSize: 30, lineHeight: 1.3, marginBottom: 16 }}>
            Bắt đầu phân bổ nhân sự thông minh & chuẩn xác
          </Title>
          <Paragraph style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.6 }}>
            Tham gia nền tảng tối ưu hóa nguồn lực đa dự án thế hệ mới. Phân bổ công việc chuẩn kỹ năng, giám sát tiến độ thời gian thực và quản lý khối lượng công việc hiệu quả.
          </Paragraph>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: 12, zIndex: 2 }}>
          <span>© 2026 RAO System.</span>
          <Space size="middle">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SafetyCertificateOutlined style={{ color: '#10b981' }} /> Bảo mật tài khoản
            </span>
          </Space>
        </div>
      </div>

      {/* Right Column: Register Form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          background: '#090d16',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ marginBottom: 28 }}>
            <Title level={3} style={{ color: '#f8fafc', marginBottom: 6, fontWeight: 700 }}>
              {t('auth.registerTitle') || 'Tạo tài khoản mới'}
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {t('auth.subtitle') || 'Điền thông tin để đăng ký thành viên hệ thống'}
            </Text>
          </div>

          {error && (
            <Alert message={error} type="error" showIcon closable onClose={clearError} style={{ marginBottom: 20, borderRadius: 8 }} />
          )}

          <Form
            layout="vertical"
            onFinish={onFinish}
            size="large"
            requiredMark={false}
            initialValues={{ role: 'member' }}
          >
            <Form.Item
              name="name"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('auth.name') || 'Họ và tên'}</span>}
              rules={[{ required: true, message: t('auth.required.name') || 'Vui lòng nhập họ tên' }]}
            >
              <Input prefix={<UserOutlined style={{ color: '#64748b' }} />} placeholder="Nguyễn Văn A" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="email"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('auth.email') || 'Email'}</span>}
              rules={[
                { required: true, message: t('auth.required.email') || 'Vui lòng nhập email' },
                { type: 'email', message: t('auth.required.emailInvalid') || 'Email không hợp lệ' },
              ]}
            >
              <Input prefix={<MailOutlined style={{ color: '#64748b' }} />} placeholder="email@congty.com" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('auth.password') || 'Mật khẩu'}</span>}
              rules={[
                { required: true, message: t('auth.required.password') || 'Vui lòng nhập mật khẩu' },
                { min: 6, message: t('auth.required.passwordMin') || 'Mật khẩu tối thiểu 6 ký tự' },
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#64748b' }} />} placeholder="••••••••" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('auth.confirmPassword') || 'Xác nhận mật khẩu'}</span>}
              dependencies={['password']}
              rules={[
                { required: true, message: t('auth.required.confirm') || 'Vui lòng xác nhận mật khẩu' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                    return Promise.reject(new Error(t('auth.required.confirmMismatch') || 'Mật khẩu xác nhận không khớp'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#64748b' }} />} placeholder="••••••••" style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item
              name="role"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('auth.roleLabel') || 'Vai trò'}</span>}
            >
              <Select options={roleOptions} style={{ borderRadius: 8 }} />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 44,
                  fontWeight: 600,
                  fontSize: 14,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                }}
              >
                {t('auth.createAccount') || 'Đăng ký tài khoản'} <ArrowRightOutlined />
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('auth.haveAccount') || 'Đã có tài khoản?'}{' '}
            </Text>
            <Link to="/login" style={{ fontWeight: 600, color: '#818cf8' }}>
              {t('auth.login') || 'Đăng nhập ngay'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
