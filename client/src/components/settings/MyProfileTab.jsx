import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Row, Col, Typography, Avatar, Tag, Select, message, Space, Divider } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  ApartmentOutlined,
  IdcardOutlined,
  BankOutlined,
  SaveOutlined,
  CheckCircleFilled,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { roleLabel } from '../../i18n/enums';
import authService from '../../services/authService';

const { Title, Text } = Typography;

export default function MyProfileTab({ user, updateProfile }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        jobTitle: user.jobTitle || user.position || '',
        department: user.department || '',
        companyName: user.companyName || 'Công ty Công nghệ RAO',
        manager: user.manager?._id || (typeof user.manager === 'string' ? user.manager : undefined),
      });
    }
  }, [user, form]);

  useEffect(() => {
    const loadPotentialManagers = async () => {
      try {
        const res = await authService.getCompanyManagers();
        const list = res.data?.managers || [];
        const managerOptions = list
          .filter((u) => u._id !== user?._id)
          .map((u) => ({
            value: u._id,
            label: `${u.name} (${u.jobTitle || (u.role === 'admin' ? 'Quản trị viên' : 'Quản lý')})`,
          }));

        // Đảm bảo nếu user.manager đã có giá trị thì luôn xuất hiện trong danh sách options
        const currentMgrId = user?.manager?._id || (typeof user?.manager === 'string' ? user?.manager : null);
        if (currentMgrId && !managerOptions.some((m) => m.value === currentMgrId)) {
          const mgrName = user.manager?.name || 'Người quản lý';
          const mgrTitle = user.manager?.jobTitle || 'Quản lý';
          managerOptions.unshift({
            value: currentMgrId,
            label: `${mgrName} (${mgrTitle})`,
          });
        }

        setManagers(managerOptions);
      } catch (err) {
        console.error('Lỗi khi tải danh sách quản lý:', err);
      }
    };
    loadPotentialManagers();
  }, [user]);

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        phone: values.phone,
        jobTitle: values.jobTitle,
        department: values.department,
        companyName: values.companyName,
        manager: values.manager,
      };
      const result = await updateProfile(payload);
      if (result.success) {
        message.success(result.message || 'Đã cập nhật hồ sơ thành công!');
      } else {
        message.error(result.message || 'Lỗi khi cập nhật hồ sơ');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <Row gutter={[24, 24]}>
        {/* Cột trái: Tóm tắt thông tin tài khoản & Thẻ ID */}
        <Col xs={24} lg={8}>
          <div
            className="saas-card"
            style={{
              padding: 24,
              textAlign: 'center',
              background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              borderRadius: 14,
            }}
          >
            <Avatar
              size={90}
              src={user?.avatar}
              icon={<UserOutlined />}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                fontSize: 36,
                marginBottom: 16,
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
              }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>

            <Title level={4} style={{ margin: '0 0 4px 0', fontWeight: 800 }}>
              {user?.name}
            </Title>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
              {user?.jobTitle || user?.position || 'Thành viên hệ thống'}
            </Text>

            <Space size={6} wrap style={{ justifyContent: 'center', marginBottom: 16 }}>
              <Tag color={user?.role === 'admin' ? 'purple' : user?.role === 'project_manager' ? 'blue' : 'cyan'}>
                <SafetyCertificateOutlined style={{ marginRight: 4 }} />
                {roleLabel(user?.role)}
              </Tag>
              <Tag color="success">
                <CheckCircleFilled style={{ marginRight: 4 }} />
                Đang hoạt động
              </Tag>
            </Space>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div>
                <Text type="secondary">Mã định danh:</Text>
                <div style={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {user?._id?.substring(0, 10).toUpperCase() || 'BASE-001'}
                </div>
              </div>
              <div>
                <Text type="secondary">Tổ chức / Doanh nghiệp:</Text>
                <div style={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {user?.companyName || 'Công ty Công nghệ RAO'}
                </div>
              </div>
              <div>
                <Text type="secondary">Phòng ban trực thuộc:</Text>
                <div style={{ fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                  {user?.department || 'Kỹ thuật & Công nghệ'}
                </div>
              </div>
              <div>
                <Text type="secondary">Quản lý trực tiếp:</Text>
                <div style={{ fontWeight: 600, color: isDark ? '#60a5fa' : '#2563eb' }}>
                  {user?.manager?.name
                    ? `${user.manager.name} (${user.manager.jobTitle || 'Quản lý'})`
                    : (managers.find((m) => m.value === (user?.manager?._id || user?.manager))?.label || 'Chưa thiết lập')}
                </div>
              </div>
            </div>
          </div>
        </Col>

        {/* Cột phải: Form cập nhật thông tin chuẩn Base Account */}
        <Col xs={24} lg={16}>
          <div
            className="saas-card"
            style={{
              padding: 24,
              background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              borderRadius: 14,
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700 }}>
                Thông tin tài khoản & Vị trí công tác
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Cập nhật thông tin nhận diện cá nhân của bạn trên toàn bộ ứng dụng Base Platform
              </Text>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="name"
                    label={t('auth.name') || 'Họ và tên'}
                    rules={[{ required: true, message: t('auth.required.name') || 'Vui lòng nhập họ tên' }]}
                  >
                    <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Nguyễn Văn A" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name="email" label={t('settings.loginEmail') || 'Email đăng nhập (Cố định)'}>
                    <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="phone" label={t('common.phone') || 'Số điện thoại liên hệ'}>
                    <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="0912 345 678" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name="jobTitle" label="Vị trí công việc / Chức danh">
                    <Input prefix={<IdcardOutlined style={{ color: '#94a3b8' }} />} placeholder="VD: Trưởng phòng Kỹ thuật" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="department" label={t('settings.department') || 'Phòng ban làm việc'}>
                    <Input prefix={<ApartmentOutlined style={{ color: '#94a3b8' }} />} placeholder="VD: Engineering, Product, QA" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item name="companyName" label="Tên công ty / Doanh nghiệp">
                    <Input prefix={<BankOutlined style={{ color: '#94a3b8' }} />} placeholder="Tên công ty của bạn" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="manager" label="Người quản lý trực tiếp (Direct Manager)">
                <Select
                  placeholder="Chọn người quản lý trực tiếp của bạn..."
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={managers}
                />
              </Form.Item>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={submitting}
                  style={{ background: '#2563eb', height: 40, padding: '0 24px', borderRadius: 8, fontWeight: 600 }}
                >
                  {t('common.saveChanges') || 'Lưu thay đổi'}
                </Button>
              </div>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
}
