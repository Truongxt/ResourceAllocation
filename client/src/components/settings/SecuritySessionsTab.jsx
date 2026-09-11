import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Row, Col, Typography, Switch, Table, Tag, Modal, message, Space, Popconfirm } from 'antd';
import {
  LockOutlined,
  SafetyCertificateOutlined,
  DesktopOutlined,
  LogoutOutlined,
  CheckCircleFilled,
  WarningOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;

export default function SecuritySessionsTab({ changePassword, user, updateProfile }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { logoutAll } = useAuth();
  const [form] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState(Boolean(user?.twoFactorEnabled));
  const [updating2FA, setUpdating2FA] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await authService.getSessions();
      setSessions(res.data?.sessions || []);
    } catch (err) {
      console.error('Lỗi khi tải phiên đăng nhập:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handlePasswordSubmit = async (values) => {
    setChangingPassword(true);
    try {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (result.success) {
        message.success(result.message || 'Đã đổi mật khẩu thành công!');
        form.resetFields();
        loadSessions();
      } else {
        message.error(result.message || 'Đổi mật khẩu thất bại');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggle2FA = async (checked) => {
    setUpdating2FA(true);
    try {
      const res = await updateProfile({ twoFactorEnabled: checked });
      if (res.success) {
        setTwoFactor(checked);
        message.success(checked ? 'Đã kích hoạt bảo mật 2 lớp (2FA)' : 'Đã tắt bảo mật 2 lớp');
      }
    } catch (err) {
      message.error('Không thể cập nhật 2FA');
    } finally {
      setUpdating2FA(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await authService.revokeSession(sessionId);
      message.success('Đã đăng xuất khỏi thiết bị');
      loadSessions();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể đăng xuất thiết bị');
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll();
      message.success('Đã đăng xuất khỏi tất cả thiết bị');
    } catch (err) {
      message.error('Không thể thực hiện đăng xuất tất cả');
    }
  };

  const columns = [
    {
      title: 'Thiết bị & Trình duyệt',
      dataIndex: 'userAgent',
      key: 'userAgent',
      render: (text) => (
        <Space>
          <DesktopOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>
              {text?.includes('Windows') ? 'Máy tính Windows' : text?.includes('Mac') ? 'Máy tính macOS' : 'Trình duyệt Web'}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {text?.substring(0, 50)}...
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Địa chỉ IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (ip) => <Tag color="blue">{ip}</Tag>,
    },
    {
      title: 'Đăng nhập lúc',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (d) => <Text style={{ fontSize: 12 }}>{new Date(d).toLocaleString('vi-VN')}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title="Đăng xuất thiết bị này?"
          description="Phiên làm việc trên thiết bị này sẽ bị chấm dứt ngay lập tức."
          onConfirm={() => handleRevokeSession(record._id)}
          okText="Đăng xuất"
          cancelText="Hủy"
        >
          <Button type="link" danger size="small">
            Đăng xuất
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: '8px 0' }}>
      <Row gutter={[24, 24]}>
        {/* Đổi mật khẩu cá nhân */}
        <Col xs={24} lg={12}>
          <div
            className="saas-card"
            style={{
              padding: 24,
              height: '100%',
              background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              borderRadius: 14,
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <LockOutlined style={{ color: '#3b82f6' }} />
                <span>Đổi Mật Khẩu Đăng Nhập</span>
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Mật khẩu mới phải có tối thiểu 6 ký tự để bảo vệ tài khoản của bạn
              </Text>
            </div>

            <Form form={form} layout="vertical" onFinish={handlePasswordSubmit}>
              <Form.Item
                name="currentPassword"
                label="Mật khẩu hiện tại"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="••••••••" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="••••••••" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu mới"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="••••••••" />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={changingPassword}
                  style={{ background: '#2563eb', height: 40, padding: '0 20px', borderRadius: 8, fontWeight: 600 }}
                >
                  Cập nhật mật khẩu
                </Button>
              </div>
            </Form>
          </div>
        </Col>

        {/* Bảo mật 2 lớp (2FA) */}
        <Col xs={24} lg={12}>
          <div
            className="saas-card"
            style={{
              padding: 24,
              height: '100%',
              background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              borderRadius: 14,
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <SafetyCertificateOutlined style={{ color: '#10b981' }} />
                <span>Bảo Mật 2 Lớp (2FA)</span>
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Gia tăng độ an toàn cho tài khoản doanh nghiệp của bạn
              </Text>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
                borderRadius: 12,
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                marginBottom: 20,
              }}
            >
              <div>
                <Text strong style={{ fontSize: 14, display: 'block' }}>
                  Xác thực hai yếu tố (Two-Factor Authentication)
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {twoFactor
                    ? 'Tài khoản của bạn đang được bảo vệ bởi lớp bảo mật nâng cao'
                    : 'Yêu cầu mã xác thực OTP khi đăng nhập trên thiết bị lạ'}
                </Text>
              </div>
              <Switch checked={twoFactor} onChange={handleToggle2FA} loading={updating2FA} />
            </div>

            <div style={{ padding: '14px 16px', background: isDark ? 'rgba(59, 130, 246, 0.08)' : '#eff6ff', borderRadius: 10, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CheckCircleFilled style={{ color: '#3b82f6', marginTop: 3 }} />
                <div style={{ fontSize: 12.5, color: isDark ? '#cbd5e1' : '#1e3a8a', lineHeight: 1.5 }}>
                  <strong>Quy chuẩn bảo mật Base Account:</strong> Mọi phiên đăng nhập đều được mã hóa và xác thực chữ ký SHA-256 kèm cơ chế xoay vòng Refresh Token tự động chống tấn công giả mạo.
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Danh sách các phiên đăng nhập đang hoạt động (Active Sessions) */}
      <div
        className="saas-card"
        style={{
          marginTop: 24,
          padding: 24,
          background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
          border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          borderRadius: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DesktopOutlined style={{ color: '#3b82f6' }} />
              <span>Thiết Bị & Phiên Đăng Nhập Đang Hoạt Động</span>
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Danh sách các trình duyệt và thiết bị hiện đang duy trì phiên đăng nhập vào tài khoản của bạn
            </Text>
          </div>

          <Popconfirm
            title="Đăng xuất khỏi mọi thiết bị?"
            description="Tất cả các phiên làm việc trên các máy tính và điện thoại khác sẽ bị đăng xuất ngay lập tức."
            onConfirm={handleLogoutAll}
            okText="Đăng xuất tất cả"
            cancelText="Hủy"
          >
            <Button icon={<LogoutOutlined />} danger>
              Đăng xuất khỏi mọi thiết bị
            </Button>
          </Popconfirm>
        </div>

        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="_id"
          loading={loadingSessions}
          pagination={false}
          size="middle"
        />
      </div>
    </div>
  );
}
