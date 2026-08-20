import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Select, Divider } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants';
import { roleLabel } from '../i18n/enums';

const { Title, Text } = Typography;

// Nhãn vai trò lấy từ i18n; danh sách giá trị lấy từ constants để không lệch enum server.

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: 24,
    }}>
      <div style={{
        position: 'fixed', top: '15%', right: '10%', width: 300, height: 300,
        borderRadius: '50%', background: 'rgba(20,184,166,0.08)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <Card
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 16,
          border: '1px solid rgba(148,163,184,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        styles={{ body: { padding: '40px 36px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6366f1, #14b8a6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ThunderboltOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Title level={3} style={{ marginBottom: 4 }}>{t('auth.registerTitle')}</Title>
          <Text type="secondary">{t('auth.subtitle')}</Text>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon closable onClose={clearError} style={{ marginBottom: 20 }} />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}
          initialValues={{ role: 'member' }}
        >
          <Form.Item name="name" label={t('auth.name')}
            rules={[{ required: true, message: t('auth.required.name') }]}
          >
            <Input prefix={<UserOutlined />} placeholder={t('auth.namePlaceholder')} autoFocus />
          </Form.Item>

          <Form.Item name="email" label={t('auth.email')}
            rules={[
              { required: true, message: t('auth.required.email') },
              { type: 'email', message: t('auth.required.emailInvalid') },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="email@rao.com" />
          </Form.Item>

          <Form.Item name="password" label={t('auth.password')}
            rules={[
              { required: true, message: t('auth.required.password') },
              { min: 6, message: t('auth.required.passwordMin') },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.required.passwordMin')} />
          </Form.Item>

          <Form.Item name="confirmPassword" label={t('auth.confirmPassword')}
            dependencies={['password']}
            rules={[
              { required: true, message: t('auth.required.confirm') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error(t('auth.required.confirmMismatch')));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder={t('auth.confirmPassword')} />
          </Form.Item>

          <Form.Item name="role" label={t('auth.roleLabel')}>
            <Select options={roleOptions} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block
              style={{ height: 44, fontWeight: 600, borderRadius: 10 }}
            >
              {t('auth.createAccount')}
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text type="secondary" style={{ fontSize: 13 }}>{t('auth.haveAccount')}</Text>
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Link to="/login">
            <Button type="default" style={{ borderRadius: 10 }}>{t('auth.login')}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
