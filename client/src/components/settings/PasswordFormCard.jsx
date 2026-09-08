/**
 * ============================================================================
 * THẺ ĐỔI MẬT KHẨU TÀI KHOẢN (Password Form Card Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép người dùng cập nhật mật khẩu đăng nhập tài khoản.
 *   - Kiểm tra tính hợp lệ: Mật khẩu hiện tại, mật khẩu mới (tối thiểu 6 ký tự)
 *     và xác nhận mật khẩu mới phải khớp 100%.
 *
 * Props:
 *   - @param {Function} changePassword - Hàm từ AuthContext gửi lệnh đổi mật khẩu lên server
 *   - @param {Function} t - Hàm dịch ngôn ngữ i18n
 */

import { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function PasswordFormCard({ changePassword, t }) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  /**
   * Xử lý gửi biểu mẫu đổi mật khẩu
   * @param {Object} values - { currentPassword, newPassword, confirmPassword }
   */
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const result = await changePassword(values);
      if (result.success) {
        message.success(result.message || t('settings.passwordSaved') || 'Đã đổi mật khẩu thành công');
        form.resetFields();
      } else {
        message.error(result.message || t('settings.passwordFailed') || 'Lỗi đổi mật khẩu');
      }
    } catch {
      message.error(t('settings.passwordError') || 'Lỗi hệ thống khi đổi mật khẩu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="saas-card" style={{ padding: 24, height: '100%' }}>
      <Title level={5} style={{ marginBottom: 18, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
        <LockOutlined style={{ marginRight: 8, color: '#6366f1' }} />
        <span>{t('settings.password') || 'Bảo mật & Đổi Mật khẩu'}</span>
      </Title>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Mật khẩu hiện tại */}
        <Form.Item
          name="currentPassword"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.currentPassword') || 'Mật khẩu hiện tại'}</span>}
          rules={[{ required: true, message: t('settings.currentPasswordRequired') || 'Vui lòng nhập mật khẩu hiện tại' }]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#64748b' }} />}
            placeholder="••••••••"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* Mật khẩu mới */}
        <Form.Item
          name="newPassword"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.newPassword') || 'Mật khẩu mới'}</span>}
          rules={[
            { required: true, message: t('settings.newPasswordRequired') || 'Vui lòng nhập mật khẩu mới' },
            { min: 6, message: t('settings.newPasswordMin') || 'Mật khẩu phải có tối thiểu 6 ký tự' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#64748b' }} />}
            placeholder="••••••••"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* Xác nhận mật khẩu mới */}
        <Form.Item
          name="confirmPassword"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>{t('settings.confirmPassword') || 'Xác nhận mật khẩu mới'}</span>}
          dependencies={['newPassword']}
          rules={[
            { required: true, message: t('settings.confirmPasswordRequired') || 'Vui lòng xác nhận mật khẩu' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(t('settings.confirmPasswordMismatch') || 'Mật khẩu xác nhận không khớp')
                );
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#64748b' }} />}
            placeholder="••••••••"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        {/* Nút thực hiện đổi mật khẩu */}
        <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<LockOutlined />}
            loading={submitting}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            {t('settings.changePassword') || 'Đổi mật khẩu'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
