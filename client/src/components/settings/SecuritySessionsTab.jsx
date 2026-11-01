import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Modal,
  message,
  Space,
  Popconfirm,
  Alert,
  Divider,
} from 'antd';
import {
  LockOutlined,
  SafetyCertificateOutlined,
  DesktopOutlined,
  LogoutOutlined,
  CheckCircleFilled,
  WarningOutlined,
  QrcodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  KeyOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;

export default function SecuritySessionsTab({ changePassword, user }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { logoutAll, refreshUser } = useAuth();
  const [form] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(user?.twoFactorEnabled));
  const [remainingBackupCodes, setRemainingBackupCodes] = useState(0);
  const [loading2FAStatus, setLoading2FAStatus] = useState(false);

  // Setup modal state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupStep, setSetupStep] = useState(0); // 0: QR, 1: Verify OTP, 2: Backup Codes
  const [setupData, setSetupData] = useState({ secret: '', qrCode: '', otpauthUri: '' });
  const [setupOtp, setSetupOtp] = useState('');
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState([]);

  // Disable 2FA modal state
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableOtp, setDisableOtp] = useState('');
  const [disabling2FA, setDisabling2FA] = useState(false);

  // Regenerate backup codes modal
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenConfirmVal, setRegenConfirmVal] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [regenCodesList, setRegenCodesList] = useState([]);

  useEffect(() => {
    loadSessions();
    load2FAStatus();
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

  const load2FAStatus = async () => {
    setLoading2FAStatus(true);
    try {
      const res = await authService.get2FAStatus();
      if (res.success && res.data) {
        setTwoFactorEnabled(Boolean(res.data.twoFactorEnabled));
        setRemainingBackupCodes(res.data.remainingBackupCodes || 0);
      }
    } catch (err) {
      console.error('Lỗi khi tải trạng thái 2FA:', err);
    } finally {
      setLoading2FAStatus(false);
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

  // Bắt đầu mở setup 2FA
  const handleStartSetup2FA = async () => {
    setEnabling2FA(true);
    try {
      const res = await authService.setup2FA();
      if (res.success && res.data) {
        setSetupData(res.data);
        setSetupStep(0);
        setSetupOtp('');
        setNewBackupCodes([]);
        setShowSetupModal(true);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tạo mã thiết lập 2FA');
    } finally {
      setEnabling2FA(false);
    }
  };

  // Xác nhận OTP để kích hoạt 2FA
  const handleConfirmEnable2FA = async () => {
    if (!setupOtp || setupOtp.length !== 6) {
      message.warning('Vui lòng nhập đúng mã OTP gồm 6 chữ số');
      return;
    }

    setEnabling2FA(true);
    try {
      const res = await authService.enable2FA(setupOtp);
      if (res.success && res.data) {
        setTwoFactorEnabled(true);
        setNewBackupCodes(res.data.backupCodes || []);
        setRemainingBackupCodes(res.data.backupCodes?.length || 10);
        setSetupStep(2); // Chuyển sang bước hiển thị mã dự phòng
        message.success('Đã kích hoạt bảo mật 2 lớp thành công!');
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setEnabling2FA(false);
    }
  };

  // Tắt 2FA
  const handleConfirmDisable2FA = async () => {
    if (!disablePassword && !disableOtp) {
      message.warning('Vui lòng nhập mật khẩu hoặc mã OTP hiện tại');
      return;
    }

    setDisabling2FA(true);
    try {
      const res = await authService.disable2FA({
        password: disablePassword || undefined,
        code: disableOtp || undefined,
      });
      if (res.success) {
        setTwoFactorEnabled(false);
        setRemainingBackupCodes(0);
        setShowDisableModal(false);
        setDisablePassword('');
        setDisableOtp('');
        message.success('Đã tắt bảo mật 2 lớp thành công');
        if (refreshUser) refreshUser();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tắt 2FA. Kiểm tra lại thông tin xác nhận.');
    } finally {
      setDisabling2FA(false);
    }
  };

  // Tạo lại mã dự phòng
  const handleRegenerateBackupCodes = async () => {
    if (!regenConfirmVal) {
      message.warning('Vui lòng nhập mật khẩu hoặc mã OTP để xác thực');
      return;
    }

    setRegenerating(true);
    try {
      // Thử dùng như mã OTP nếu là 6 số, ngược lại coi là mật khẩu
      const payload = /^\d{6}$/.test(regenConfirmVal.trim())
        ? { code: regenConfirmVal.trim() }
        : { password: regenConfirmVal };

      const res = await authService.regenerateBackupCodes(payload);
      if (res.success && res.data) {
        setRegenCodesList(res.data.backupCodes || []);
        setRemainingBackupCodes(res.data.backupCodes?.length || 10);
        message.success('Đã tạo mới 10 mã dự phòng!');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Xác thực không chính xác');
    } finally {
      setRegenerating(false);
    }
  };

  // Tải file mã dự phòng text
  const downloadBackupCodesFile = (codes) => {
    const text = `MA DU PHONG BAO MAT 2 LOP (2FA) - RAO PLATFORM\nTai khoan: ${user?.email || ''}\nNgay tao: ${new Date().toLocaleString('vi-VN')}\n\nLuu y: Moi ma chi su dung duoc 1 lan duy nhat.\n------------------------------------------\n` +
      codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n------------------------------------------\nHay bao mat file nay can than.';

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rao-backup-codes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Đã tải file mã dự phòng');
  };

  // Sao chép danh sách mã
  const copyAllCodes = (codes) => {
    const text = codes.join('\n');
    navigator.clipboard.writeText(text);
    message.success('Đã sao chép 10 mã dự phòng vào bộ nhớ tạm');
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
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div>
                  <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SafetyCertificateOutlined style={{ color: twoFactorEnabled ? '#10b981' : '#64748b' }} />
                    <span>Bảo Mật 2 Lớp (2FA)</span>
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Xác thực bằng ứng dụng Google Authenticator hoặc mã dự phòng
                  </Text>
                </div>
                {twoFactorEnabled ? (
                  <Tag color="success" icon={<CheckCircleFilled />}>
                    Đang bảo vệ
                  </Tag>
                ) : (
                  <Tag color="default">Chưa kích hoạt</Tag>
                )}
              </div>

              {!twoFactorEnabled ? (
                <div
                  style={{
                    padding: '20px',
                    background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
                    borderRadius: 12,
                    border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <QrcodeOutlined style={{ fontSize: 24 }} />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                        Bảo vệ tài khoản bằng Authenticator
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12.5, lineHeight: 1.5, display: 'block' }}>
                        Khi bật 2FA, mỗi lần đăng nhập bạn sẽ cần nhập mã OTP 6 số từ ứng dụng trên điện thoại (Google Authenticator, Microsoft Authenticator, Authy).
                      </Text>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      onClick={handleStartSetup2FA}
                      loading={enabling2FA || loading2FAStatus}
                      style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600, borderRadius: 8 }}
                    >
                      Kích hoạt 2FA ngay
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '20px',
                    background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
                    borderRadius: 12,
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <Text strong style={{ fontSize: 14, display: 'block', color: isDark ? '#34d399' : '#065f46' }}>
                        Tài khoản đã được bảo vệ bằng mã OTP
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Mã xác thực được sinh tự động bởi ứng dụng Authenticator
                      </Text>
                    </div>
                    <Tag color="cyan" style={{ fontSize: 12, padding: '4px 8px' }}>
                      Mã dự phòng còn lại: <strong>{remainingBackupCodes}</strong> / 10
                    </Tag>
                  </div>

                  <Space wrap style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      icon={<KeyOutlined />}
                      onClick={() => {
                        setRegenConfirmVal('');
                        setRegenCodesList([]);
                        setShowRegenModal(true);
                      }}
                    >
                      Tạo lại mã dự phòng
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => {
                        setDisablePassword('');
                        setDisableOtp('');
                        setShowDisableModal(true);
                      }}
                    >
                      Tắt bảo mật 2 lớp
                    </Button>
                  </Space>
                </div>
              )}
            </div>

            <div
              style={{
                padding: '12px 14px',
                background: isDark ? 'rgba(59, 130, 246, 0.08)' : '#eff6ff',
                borderRadius: 10,
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CheckCircleFilled style={{ color: '#3b82f6', marginTop: 3 }} />
                <div style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#1e3a8a', lineHeight: 1.5 }}>
                  <strong>Chuẩn bảo mật TOTP RFC 6238:</strong> Tương thích hoàn toàn với Google Authenticator, Microsoft Authenticator, 1Password và Authy kèm hệ thống 10 mã khôi phục một lần.
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

      {/* MODAL THIẾT LẬP 2FA (3 BƯỚC) */}
      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyCertificateOutlined style={{ color: '#10b981' }} />
            {setupStep === 0 && 'Bước 1/2: Quét mã QR bằng Authenticator'}
            {setupStep === 1 && 'Bước 2/2: Nhập mã OTP xác nhận'}
            {setupStep === 2 && 'Hoàn tất: Lưu 10 mã dự phòng của bạn'}
          </span>
        }
        open={showSetupModal}
        onCancel={() => {
          if (setupStep === 2) {
            setShowSetupModal(false);
          } else {
            setShowSetupModal(false);
          }
        }}
        footer={null}
        width={520}
        destroyOnClose
      >
        {setupStep === 0 && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
              Mở ứng dụng <strong>Google Authenticator</strong> hoặc <strong>Microsoft Authenticator</strong> trên điện thoại, chọn biểu tượng dấu cộng (<strong>+</strong>) và quét mã bên dưới:
            </Text>

            {setupData.qrCode ? (
              <div style={{ display: 'inline-block', padding: 12, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                <img src={setupData.qrCode} alt="2FA QR Code" style={{ width: 220, height: 220, display: 'block' }} />
              </div>
            ) : null}

            <div style={{ marginTop: 16, background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc', padding: '12px 16px', borderRadius: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Nếu không thể quét mã, hãy nhập khóa bí mật này vào ứng dụng:
              </Text>
              <Paragraph
                copyable={{ text: setupData.secret }}
                style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#2563eb', margin: 0 }}
              >
                {setupData.secret}
              </Paragraph>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => setShowSetupModal(false)}>Hủy</Button>
              <Button type="primary" onClick={() => setSetupStep(1)} style={{ background: '#2563eb' }}>
                Tôi đã quét xong → Tiếp tục
              </Button>
            </div>
          </div>
        )}

        {setupStep === 1 && (
          <div style={{ padding: '10px 0' }}>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
              Nhập mã 6 chữ số đang hiển thị trên ứng dụng xác thực để kiểm tra kết nối:
            </Text>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
              <Input.OTP
                length={6}
                size="large"
                value={setupOtp}
                onChange={(val) => setSetupOtp(val)}
                onPressEnter={handleConfirmEnable2FA}
                autoFocus
              />
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setSetupStep(0)}>← Quay lại bước quét mã</Button>
              <Button
                type="primary"
                onClick={handleConfirmEnable2FA}
                loading={enabling2FA}
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
              >
                Xác nhận & Kích hoạt 2FA
              </Button>
            </div>
          </div>
        )}

        {setupStep === 2 && (
          <div style={{ padding: '10px 0' }}>
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message="LƯU Ý QUAN TRỌNG: Hãy lưu lại 10 mã dự phòng này!"
              description="Nếu bị mất điện thoại hoặc không mở được ứng dụng xác thực, các mã này là cách DUY NHẤT để bạn đăng nhập lại vào tài khoản. Mỗi mã chỉ dùng được 1 lần."
              style={{ marginBottom: 16 }}
            />

            <div
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '16px',
                marginBottom: 20,
              }}
            >
              <Row gutter={[12, 10]}>
                {newBackupCodes.map((code, idx) => (
                  <Col span={12} key={idx}>
                    <Tag
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: 14,
                        padding: '6px 0',
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}
                      color="blue"
                    >
                      {code}
                    </Tag>
                  </Col>
                ))}
              </Row>
            </div>

            <Space wrap style={{ width: '100%', justifyContent: 'center', marginBottom: 20 }}>
              <Button icon={<CopyOutlined />} onClick={() => copyAllCodes(newBackupCodes)}>
                Sao chép tất cả mã
              </Button>
              <Button icon={<DownloadOutlined />} onClick={() => downloadBackupCodesFile(newBackupCodes)}>
                Tải file văn bản (.txt)
              </Button>
            </Space>

            <div style={{ textAlign: 'right' }}>
              <Button
                type="primary"
                onClick={() => setShowSetupModal(false)}
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 600, padding: '0 24px' }}
              >
                Tôi đã lưu an toàn & Hoàn tất
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL TẠO LẠI MÃ DỰ PHÒNG */}
      <Modal
        title={
          <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyOutlined style={{ color: '#2563eb' }} />
            Tạo lại danh sách mã dự phòng mới
          </span>
        }
        open={showRegenModal}
        onCancel={() => setShowRegenModal(false)}
        footer={null}
        width={480}
        destroyOnClose
      >
        {regenCodesList.length === 0 ? (
          <div style={{ padding: '8px 0' }}>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
              Việc tạo lại sẽ hủy bỏ toàn bộ các mã dự phòng cũ trước đây. Vui lòng nhập mật khẩu hoặc mã OTP hiện tại để xác nhận:
            </Text>
            <Input.Password
              placeholder="Nhập mật khẩu tài khoản hoặc mã OTP 6 số"
              value={regenConfirmVal}
              onChange={(e) => setRegenConfirmVal(e.target.value)}
              style={{ marginBottom: 20 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => setShowRegenModal(false)}>Hủy</Button>
              <Button type="primary" onClick={handleRegenerateBackupCodes} loading={regenerating} style={{ background: '#2563eb' }}>
                Xác nhận tạo mới
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            <Alert
              type="success"
              message="Đã tạo mới 10 mã dự phòng thành công!"
              description="Các mã cũ đã bị vô hiệu hóa hoàn toàn. Vui lòng lưu lại danh sách mới bên dưới:"
              style={{ marginBottom: 16 }}
            />
            <div
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '16px',
                marginBottom: 20,
              }}
            >
              <Row gutter={[12, 10]}>
                {regenCodesList.map((code, idx) => (
                  <Col span={12} key={idx}>
                    <Tag
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: 14,
                        padding: '6px 0',
                        fontWeight: 700,
                        letterSpacing: 1,
                      }}
                      color="blue"
                    >
                      {code}
                    </Tag>
                  </Col>
                ))}
              </Row>
            </div>
            <Space wrap style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}>
              <Button icon={<CopyOutlined />} onClick={() => copyAllCodes(regenCodesList)}>
                Sao chép tất cả
              </Button>
              <Button icon={<DownloadOutlined />} onClick={() => downloadBackupCodesFile(regenCodesList)}>
                Tải file .txt
              </Button>
            </Space>
            <div style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={() => setShowRegenModal(false)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL TẮT 2FA */}
      <Modal
        title={
          <span style={{ fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloseCircleOutlined />
            Tắt bảo mật 2 lớp (2FA)
          </span>
        }
        open={showDisableModal}
        onCancel={() => setShowDisableModal(false)}
        footer={null}
        width={440}
        destroyOnClose
      >
        <div style={{ padding: '8px 0' }}>
          <Alert
            type="error"
            showIcon
            message="Cảnh báo an toàn"
            description="Tắt 2FA sẽ làm giảm mức độ bảo vệ tài khoản của bạn trước nguy cơ bị đánh cắp mật khẩu."
            style={{ marginBottom: 16 }}
          />

          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Nhập mật khẩu hoặc mã OTP hiện tại để xác nhận:
          </Text>

          <Input.Password
            placeholder="Mật khẩu tài khoản của bạn"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', margin: '4px 0 12px 0' }}>
            — hoặc —
          </Text>

          <Input
            placeholder="Mã OTP 6 số từ ứng dụng xác thực"
            value={disableOtp}
            onChange={(e) => setDisableOtp(e.target.value)}
            style={{ marginBottom: 20 }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setShowDisableModal(false)}>Hủy</Button>
            <Button type="primary" danger onClick={handleConfirmDisable2FA} loading={disabling2FA}>
              Xác nhận tắt 2FA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
