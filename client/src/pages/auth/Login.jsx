import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Space, message } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import AppLogo from '../../components/common/AppLogo';
import './Auth.css';

const { Title, Text } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const { login, verify2FALogin, error, clearError } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 2FA state
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isBackupMode, setIsBackupMode] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    clearError();
    const result = await login(values);
    setLoading(false);

    if (result.success) {
      if (result.requires2FA) {
        setIs2FAStep(true);
        setTempToken(result.tempToken);
        setAccountEmail(result.email || values.email);
        setTwoFactorCode('');
        setIsBackupMode(false);
      } else {
        navigate('/');
      }
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode || !twoFactorCode.trim()) {
      message.warning(isBackupMode ? 'Vui lòng nhập mã dự phòng' : 'Vui lòng nhập mã xác thực OTP 6 số');
      return;
    }

    setLoading(true);
    clearError();
    const result = await verify2FALogin(tempToken, twoFactorCode.trim());
    setLoading(false);

    if (result.success) {
      if (result.usedBackupCode) {
        message.info(result.message || 'Đăng nhập thành công bằng mã dự phòng');
      } else {
        message.success('Xác thực danh tính thành công');
      }
      navigate('/');
    }
  };

  const handleBackToLogin = () => {
    setIs2FAStep(false);
    setTempToken('');
    setTwoFactorCode('');
    setIsBackupMode(false);
    clearError();
  };

  const handleQuickLogin = (email, password) => {
    form.setFieldsValue({ email, password });
    onFinish({ email, password });
  };

  return (
    <main className="auth-workspace">
      <aside className="auth-context">
        <Link to="/home" className="auth-brand">
          <AppLogo size={36} subtitle="" />
        </Link>
        <div>
          <h1>{t('workspace.authHeadline')}</h1>
          <p>{t('workspace.authHint')}</p>
          <ul>
            <li>{t('nav.projects')}</li>
            <li>{t('nav.tasks')}</li>
            <li>{t('nav.resources')}</li>
          </ul>
        </div>
        <span className="auth-context-footer">Resource Allocation</span>
      </aside>

      <section className="auth-form-area">
        <div className="base-auth-card">
          {!is2FAStep ? (
            <>
              <Link to="/home" className="auth-back">
                ← {t('workspace.backHome')}
              </Link>
              <Title level={2}>{t('auth.loginTitle')}</Title>
              <p className="auth-form-hint">{t('workspace.loginHint')}</p>
              <details className="auth-demo">
                <summary>{t('workspace.demoAccount')}</summary>
                <Button block onClick={() => handleQuickLogin('truongprolavua2004@gmail.com', '123123')}>
                  {t('workspace.openDemo')}
                </Button>
              </details>

              {error && <Alert message={error} type="error" showIcon closable onClose={clearError} className="auth-error" style={{ marginBottom: 16 }} />}

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
                      background: 'var(--brand-primary)',
                      boxShadow: 'none',
                    }}
                  >
                    {t('auth.login') || 'Đăng nhập'} <ArrowRightOutlined />
                  </Button>
                </Form.Item>
              </Form>

              <div className="auth-switch">
                <Text type="secondary">{t('auth.noAccount')} </Text>
                <Link to="/register">{t('auth.registerTitle')}</Link>
              </div>
            </>
          ) : (
            /* Màn hình Xác thực 2 bước (2FA) */
            <div>
              <Button type="link" onClick={handleBackToLogin} style={{ padding: 0, marginBottom: 16 }}>
                ← Quay lại đăng nhập
              </Button>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#10b981',
                    marginBottom: 12,
                  }}
                >
                  <SafetyCertificateOutlined style={{ fontSize: 28 }} />
                </div>
                <Title level={3} style={{ margin: '0 0 6px 0', fontWeight: 700 }}>
                  Xác Thực 2 Bước (2FA)
                </Title>
                <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                  Tài khoản <strong>{accountEmail}</strong> đang được bảo vệ bởi lớp bảo mật nâng cao.
                </Text>
              </div>

              {error && <Alert message={error} type="error" showIcon closable onClose={clearError} className="auth-error" style={{ marginBottom: 16 }} />}

              {!isBackupMode ? (
                /* Nhập mã OTP từ ứng dụng */
                <div style={{ margin: '24px 0' }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8, textAlign: 'center' }}>
                    Nhập mã 6 chữ số từ ứng dụng xác thực:
                  </Text>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <Input.OTP
                      length={6}
                      size="large"
                      value={twoFactorCode}
                      onChange={(val) => setTwoFactorCode(val)}
                      onPressEnter={handleVerify2FA}
                      autoFocus
                    />
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', color: '#64748b' }}>
                    (Mở Google Authenticator, Microsoft Authenticator hoặc Authy trên điện thoại)
                  </Text>
                </div>
              ) : (
                /* Nhập mã dự phòng Backup Code */
                <div style={{ margin: '24px 0' }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                    Nhập một trong các mã dự phòng (8 ký tự) đã lưu:
                  </Text>
                  <Input
                    size="large"
                    prefix={<KeyOutlined style={{ color: '#94a3b8' }} />}
                    placeholder="Ví dụ: A1B2-C3D4"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase())}
                    onPressEnter={handleVerify2FA}
                    autoFocus
                    style={{ borderRadius: 8, textAlign: 'center', letterSpacing: 2, fontWeight: 700 }}
                  />
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8, color: '#f59e0b' }}>
                    ⚠️ Mỗi mã dự phòng chỉ có thể sử dụng một lần duy nhất.
                  </Text>
                </div>
              )}

              <Button
                type="primary"
                onClick={handleVerify2FA}
                loading={loading}
                block
                style={{
                  height: 44,
                  fontWeight: 600,
                  fontSize: 14,
                  borderRadius: 8,
                  background: 'var(--brand-primary)',
                  marginBottom: 16,
                }}
              >
                Xác Thực & Đăng Nhập
              </Button>

              <div style={{ textAlign: 'center', marginTop: 12 }}>
                {!isBackupMode ? (
                  <Button
                    type="link"
                    icon={<KeyOutlined />}
                    onClick={() => {
                      setIsBackupMode(true);
                      setTwoFactorCode('');
                      clearError();
                    }}
                    style={{ fontSize: 13 }}
                  >
                    Bạn không mang điện thoại? Dùng mã dự phòng
                  </Button>
                ) : (
                  <Button
                    type="link"
                    icon={<MobileOutlined />}
                    onClick={() => {
                      setIsBackupMode(false);
                      setTwoFactorCode('');
                      clearError();
                    }}
                    style={{ fontSize: 13 }}
                  >
                    Quay lại nhập mã OTP từ ứng dụng
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
