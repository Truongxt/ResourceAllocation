import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Space } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  ThunderboltOutlined,
  CheckCircleFilled,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  BranchesOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import AppLogo from '../../components/common/AppLogo';
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
    <main className="auth-workspace">
      <aside className="auth-context">
        <Link to="/home" className="auth-brand"><AppLogo size={36} subtitle="" /></Link>
        <div><span className="auth-eyebrow">RAO / WORKSPACE</span><h1>{t('workspace.authHeadline')}</h1><p>{t('workspace.authHint')}</p>
        <ul><li>{t('nav.projects')}</li><li>{t('nav.tasks')}</li><li>{t('nav.resources')}</li></ul></div>
        <span className="auth-context-footer">Resource Allocation</span>
      </aside>
      <section className="auth-form-area">
        <div className="base-auth-card">
          <Link to="/home" className="auth-back">← {t('workspace.backHome')}</Link>
          <Title level={2}>{t('auth.loginTitle')}</Title>
          <p className="auth-form-hint">{t('workspace.loginHint')}</p>
          <details className="auth-demo"><summary>{t('workspace.demoAccount')}</summary><Button block onClick={() => handleQuickLogin('truongprolavua2004@gmail.com', '123123')}>{t('workspace.openDemo')}</Button></details>
          {error && <Alert title={error} type="error" showIcon closable onClose={clearError} className="auth-error" />}
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
          <div className="auth-switch"><Text type="secondary">{t('auth.noAccount')} </Text><Link to="/register">{t('auth.registerTitle')}</Link></div>
        </div>
      </section>
    </main>
  );
}
