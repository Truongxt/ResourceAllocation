import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
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
import { roleLabel } from '../i18n/enums';

const { Title, Text } = Typography;

export default function Settings() {
  const { t } = useTranslation();
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
        message.success(result.message || t('settings.profileSaved'));
      } else {
        message.error(result.message || t('settings.profileFailed'));
      }
    } catch {
      message.error(t('settings.profileError'));
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
        message.success(t('settings.passwordChanged'));
        passwordForm.resetFields();
      } else {
        message.error(result.message || t('settings.passwordFailed'));
      }
    } catch {
      message.error(t('settings.passwordError'));
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>{t('settings.title')}</Title>
        <Text type="secondary">{t('settings.subtitle')}</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Profile Card */}
        <Col xs={24} md={12}>
          <Card title={<span><UserOutlined /> {t('settings.profile')}</span>}>
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
                  {user?.role ? roleLabel(user.role) : ''}
                </Tag>
              </div>
            </div>

            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleProfileSubmit}
            >
              <Form.Item label={t('settings.loginEmail')}>
                <Input prefix={<MailOutlined />} value={user?.email || ''} disabled />
              </Form.Item>

              <Form.Item
                name="name"
                label={t('auth.name')}
                rules={[{ required: true, message: t('auth.required.name') }]}
              >
                <Input prefix={<UserOutlined />} placeholder={t('auth.namePlaceholder')} />
              </Form.Item>

              <Form.Item name="department" label={t('settings.department')}>
                <Input prefix={<ApartmentOutlined />} placeholder={t('settings.departmentPlaceholder')} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={updatingProfile}
                >
                  {t('common.saveChanges')}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Security / Password Card */}
        <Col xs={24} md={12}>
          <Card title={<span><SafetyCertificateOutlined /> {t('settings.changePassword')}</span>}>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordSubmit}
            >
              <Form.Item
                name="currentPassword"
                label={t('settings.currentPassword')}
                rules={[{ required: true, message: t('settings.required.current') }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label={t('settings.newPassword')}
                rules={[
                  { required: true, message: t('settings.required.new') },
                  { min: 6, message: t('auth.required.passwordMin') },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder={t('settings.minChars')} />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={t('settings.confirmNewPassword')}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('settings.required.confirm') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(t('auth.required.confirmMismatch')));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder={t('settings.confirmPlaceholder')} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<LockOutlined />}
                  loading={updatingPassword}
                >
                  {t('settings.updatePassword')}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
