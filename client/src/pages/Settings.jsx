import { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Space,
  Tag,
  Avatar,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  ApartmentOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const ROLE_LABELS = {
  admin: 'Quản trị viên (Admin)',
  project_manager: 'Project Manager',
  member: 'Thành viên (Member)',
};

export default function Settings() {
  const { user, updateProfile, changePassword } = useAuth();
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
        message.success(result.message || 'Cập nhật thông tin thành công');
      } else {
        message.error(result.message || 'Cập nhật thất bại');
      }
    } catch {
      message.error('Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordSubmit = async (values) => {
    setUpdatingPassword(true);
    try {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (result.success) {
        message.success('Đổi mật khẩu thành công');
        passwordForm.resetFields();
      } else {
        message.error(result.message || 'Đổi mật khẩu thất bại');
      }
    } catch {
      message.error('Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>Cài đặt tài khoản</Title>
        <Text type="secondary">Quản lý thông tin hồ sơ cá nhân và bảo mật tài khoản</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Profile Card */}
        <Col xs={24} md={12}>
          <Card title={<span><UserOutlined /> Hồ sơ cá nhân</span>}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <Avatar
                size={56}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#6366f1' }}
              >
                {(user?.name || 'U')[0].toUpperCase()}
              </Avatar>
              <div>
                <Text strong style={{ fontSize: 16, display: 'block' }}>{user?.name}</Text>
                <Tag color="purple" style={{ marginTop: 4 }}>
                  {ROLE_LABELS[user?.role] || user?.role}
                </Tag>
              </div>
            </div>

            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleProfileSubmit}
            >
              <Form.Item label="Email đăng nhập">
                <Input prefix={<MailOutlined />} value={user?.email || ''} disabled />
              </Form.Item>

              <Form.Item
                name="name"
                label="Họ và tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
              </Form.Item>

              <Form.Item name="department" label="Bộ phận / Phòng ban">
                <Input prefix={<ApartmentOutlined />} placeholder="VD: Engineering, Design, QA" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={updatingProfile}
                >
                  Lưu thay đổi
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Security / Password Card */}
        <Col xs={24} md={12}>
          <Card title={<span><SafetyCertificateOutlined /> Đổi mật khẩu</span>}>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordSubmit}
            >
              <Form.Item
                name="currentPassword"
                label="Mật khẩu hiện tại"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Tối thiểu 6 ký tự" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu mới"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<LockOutlined />}
                  loading={updatingPassword}
                >
                  Cập nhật mật khẩu
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
