import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Select, Divider } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const roleOptions = [
  { value: 'member', label: 'Thành viên (Member)' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'admin', label: 'Quản trị viên (Admin)' },
];

export default function Register() {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuth();
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
          <Title level={3} style={{ marginBottom: 4 }}>Tạo tài khoản</Title>
          <Text type="secondary">Đăng ký tham gia hệ thống RAO</Text>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon closable onClose={clearError} style={{ marginBottom: 20 }} />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large" requiredMark={false}
          initialValues={{ role: 'member' }}
        >
          <Form.Item name="name" label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" autoFocus />
          </Form.Item>

          <Form.Item name="email" label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="email@rao.com" />
          </Form.Item>

          <Form.Item name="password" label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Tối thiểu 6 ký tự" />
          </Form.Item>

          <Form.Item name="confirmPassword" label="Xác nhận mật khẩu"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" />
          </Form.Item>

          <Form.Item name="role" label="Vai trò trong hệ thống">
            <Select options={roleOptions} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block
              style={{ height: 44, fontWeight: 600, borderRadius: 10 }}
            >
              Tạo tài khoản
            </Button>
          </Form.Item>
        </Form>

        <Divider plain>
          <Text type="secondary" style={{ fontSize: 13 }}>Đã có tài khoản?</Text>
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Link to="/login">
            <Button type="default" style={{ borderRadius: 10 }}>Đăng nhập</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
