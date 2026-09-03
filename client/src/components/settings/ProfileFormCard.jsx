/**
 * ============================================================================
 * THẺ CẬP NHẬT HỒ SƠ CÁ NHÂN (Profile Form Card Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép người dùng xem và cập nhật Họ tên, Phòng ban làm việc.
 *   - Email là trường định danh tài khoản nên được hiển thị ở chế độ disabled (chỉ đọc).
 *
 * Props:
 *   - @param {Object} user - Thông tin tài khoản người dùng đang đăng nhập
 *   - @param {Function} updateProfile - Hàm từ AuthContext gửi yêu cầu cập nhật lên server
 *   - @param {Function} t - Hàm dịch ngôn ngữ i18n
 */

import { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, MailOutlined, ApartmentOutlined, SaveOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function ProfileFormCard({ user, updateProfile, t }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Khởi tạo giá trị ban đầu cho form khi dữ liệu user sẵn sàng
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name || '',
        department: user.department || '',
      });
    }
  }, [user, form]);

  /**
   * Xử lý gửi biểu mẫu cập nhật hồ sơ
   * @param {Object} values - { name, department }
   */
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const result = await updateProfile(values);
      if (result.success) {
        message.success(result.message || t('settings.profileSaved') || 'Đã lưu thông tin hồ sơ');
      } else {
        message.error(result.message || t('settings.profileFailed') || 'Lỗi cập nhật hồ sơ');
      }
    } catch {
      message.error(t('settings.profileError') || 'Lỗi hệ thống khi cập nhật hồ sơ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="saas-card" style={{ padding: 24, height: '100%' }}>
      <Title level={5} style={{ marginBottom: 18, fontWeight: 700 }}>
        👤 {t('settings.profile') || 'Thông tin Cá nhân'}
      </Title>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Họ và tên */}
        <Form.Item
          name="name"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.name') || 'Họ và tên'}</span>}
          rules={[{ required: true, message: t('settings.nameRequired') || 'Vui lòng nhập họ và tên' }]}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#64748b' }} />}
            placeholder={t('settings.namePlaceholder') || 'Họ và tên của bạn'}
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* Email đăng nhập (Chỉ đọc) */}
        <Form.Item
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Email</span>}
        >
          <Input
            prefix={<MailOutlined style={{ color: '#64748b' }} />}
            value={user?.email}
            disabled
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* Phòng ban */}
        <Form.Item
          name="department"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.department') || 'Phòng ban'}</span>}
        >
          <Input
            prefix={<ApartmentOutlined style={{ color: '#64748b' }} />}
            placeholder={t('settings.departmentPlaceholder') || 'VD: IT, Kỹ thuật, QA...'}
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* Nút lưu thay đổi */}
        <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={submitting}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            {t('settings.saveProfile') || 'Lưu thay đổi'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
