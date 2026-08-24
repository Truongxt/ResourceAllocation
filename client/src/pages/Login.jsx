import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import { LockOutlined, MailOutlined, ThunderboltOutlined, CheckCircleFilled, ArrowRightOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const { Title, Text, Paragraph } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    clearError();
    const result = await login(values);
    setLoading(false);
    if (result.success) navigate('/');
  };

  const handleQuickLogin = (email, password) => {
    form.setFieldsValue({ email, password });
    onFinish({ email, password });
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
      {/* Left Column: Brand & Value Proposition Showcase (Hidden on Mobile) */}
      <div
        style={{
          flex: 1.1,
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
        {/* Glow ambient spots */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '15%',
            right: '5%',
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        {/* Brand Top */}
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

        {/* Hero Central Content */}
        <div style={{ maxWidth: 540, margin: '60px 0', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#a5b4fc',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            Next-Gen Workforce Intelligence v2.0
          </div>
          <Title level={2} style={{ color: '#f8fafc', fontWeight: 800, fontSize: 32, lineHeight: 1.25, marginBottom: 16 }}>
            Tối ưu hóa Phân bổ Nguồn lực & Tiến độ Đa dự án
          </Title>
          <Paragraph style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            Ứng dụng thuật toán kết hợp <strong>Genetic Algorithm (GA)</strong> & <strong>CSP Solver</strong> để tự động lập lịch công việc, cân bằng khối lượng tải và triệt tiêu nguy cơ kiệt sức của nhân sự.
          </Paragraph>

          {/* Feature Highlights */}
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                  fontSize: 18,
                }}
              >
                🧬
              </div>
              <div>
                <Text strong style={{ color: '#f8fafc', fontSize: 14, display: 'block' }}>
                  Thuật toán Di truyền (Genetic Algorithm)
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                  Tối ưu hóa đa mục tiêu: Tối đa hóa khớp kỹ năng & Cân bằng năng suất
                </Text>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#22d3ee',
                  fontSize: 18,
                }}
              >
                🔗
              </div>
              <div>
                <Text strong style={{ color: '#f8fafc', fontSize: 14, display: 'block' }}>
                  Bộ giải Ràng buộc (CSP Solver)
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                  Thỏa mãn 100% ràng buộc quan hệ công việc tiền nhiệm & thời hạn deadline
                </Text>
              </div>
            </div>
          </Space>
        </div>

        {/* Footer Meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: 12, zIndex: 2 }}>
          <span>© 2026 RAO System. Bảo mật cấp doanh nghiệp.</span>
          <Space size="middle">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <SafetyCertificateOutlined style={{ color: '#10b981' }} /> AES-256
            </span>
          </Space>
        </div>
      </div>

      {/* Right Column: Sleek Auth Form */}
      <div
        style={{
          flex: 0.9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          background: '#090d16',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 32 }}>
            <Title level={3} style={{ color: '#f8fafc', marginBottom: 6, fontWeight: 700 }}>
              {t('auth.loginTitle') || 'Đăng nhập hệ thống'}
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              {t('auth.subtitle') || 'Nhập thông tin để tiếp tục vào không gian làm việc'}
            </Text>
          </div>

          {/* Quick Demo Credentials for One-Click Login */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#818cf8', letterSpacing: 0.5 }}>
                ⚡ Tài khoản trải nghiệm nhanh
              </Text>
            </div>
            <Button
              size="small"
              block
              onClick={() => handleQuickLogin('truongprolavua2004@gmail.com', '123123')}
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                color: '#e2e8f0',
                fontSize: 12,
                fontWeight: 600,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>👤 truongprolavua2004@gmail.com</span>
              <span style={{ fontSize: 11, color: '#a5b4fc' }}>Điền & Đăng nhập →</span>
            </Button>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={clearError}
              style={{ marginBottom: 20, borderRadius: 8 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            size="large"
            requiredMark={false}
            initialValues={{ email: 'truongprolavua2004@gmail.com', password: '' }}
          >
            <Form.Item
              name="email"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('auth.email') || 'Email'}</span>}
              rules={[
                { required: true, message: t('auth.required.email') || 'Vui lòng nhập email' },
                { type: 'email', message: t('auth.required.emailInvalid') || 'Email không hợp lệ' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#64748b' }} />}
                placeholder="truongprolavua2004@gmail.com"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('auth.password') || 'Mật khẩu'}</span>}
              rules={[{ required: true, message: t('auth.required.password') || 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#64748b' }} />}
                placeholder="••••••••"
                style={{ borderRadius: 8 }}
              />
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
                {t('auth.login') || 'Đăng nhập'} <ArrowRightOutlined />
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('auth.noAccount') || 'Chưa có tài khoản?'}{' '}
            </Text>
            <Link to="/register" style={{ fontWeight: 600, color: '#818cf8' }}>
              {t('auth.registerTitle') || 'Tạo tài khoản mới'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
