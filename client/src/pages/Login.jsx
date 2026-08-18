import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Divider } from 'antd';
import { LockOutlined, MailOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text, Paragraph } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    clearError();
    const result = await login(values);
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
      {/* Decorative background orbs */}
      <div style={{
        position: 'fixed', top: '15%', left: '10%', width: 300, height: 300,
        borderRadius: '50%', background: 'rgba(99,102,241,0.08)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '15%', width: 250, height: 250,
        borderRadius: '50%', background: 'rgba(20,184,166,0.06)', filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <Card
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 16,
          border: '1px solid rgba(148,163,184,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        styles={{ body: { padding: '40px 36px' } }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6366f1, #14b8a6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ThunderboltOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Title level={3} style={{ marginBottom: 4 }}>Đăng nhập hệ thống</Title>
          <Text type="secondary">Resource Allocation Optimization</Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={clearError}
            style={{ marginBottom: 20 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@rao.com" autoFocus />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block
              style={{ height: 44, fontWeight: 600, borderRadius: 10 }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text type="secondary" style={{ fontSize: 13 }}>Chưa có tài khoản?</Text>
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Link to="/register">
            <Button type="default" style={{ borderRadius: 10 }}>
              Tạo tài khoản mới
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
