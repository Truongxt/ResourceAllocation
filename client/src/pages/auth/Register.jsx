import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Alert, Select, Checkbox, Row, Col, Space, Tag } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  UserOutlined,
  PhoneOutlined,
  ApartmentOutlined,
  TeamOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  CheckCircleFilled,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  ThunderboltFilled,
  CustomerServiceOutlined,
  RocketFilled,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import AppLogo from '../../components/common/AppLogo';
import './Auth.css';

const { Title, Text, Paragraph } = Typography;

export default function Register() {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    clearError();
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
      phone: values.phone,
      companyName: values.companyName,
      jobTitle: values.jobTitle,
      companySize: values.companySize,
      interestedProduct: values.interestedProduct,
      location: values.location,
    };
    const result = await register(payload);
    setLoading(false);
    if (result.success) navigate('/');
  };

  return (
    <main className="auth-workspace">
      <aside className="auth-context">
        <Link to="/home" className="auth-brand"><AppLogo size={36} subtitle="" /></Link>
        <div><span className="auth-eyebrow">RAO / WORKSPACE</span><h1>{t('workspace.authHeadline')}</h1><p>{t('workspace.authHint')}</p>
        <ul><li>{t('nav.projects')}</li><li>{t('nav.tasks')}</li><li>{t('nav.resources')}</li></ul></div>
        <span className="auth-context-footer">Resource Allocation</span>
      </aside>
      <section className="auth-form-area">
        <div className="base-auth-card">
          <Link to="/home" className="auth-back">← {t('workspace.backHome')}</Link>
          <Title level={2}>{t('auth.registerTitle')}</Title>
          <p className="auth-form-hint">{t('workspace.registerHint')}</p>

          {error && <Alert title={error} type="error" showIcon closable onClose={clearError} className="auth-error" />}
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            size="large"
            requiredMark="optional"
            initialValues={{
              jobTitle: 'Quản lý (Manager)',
              companySize: '31–60 nhân sự',
              interestedProduct: 'RAO Work+: Phân bổ nhân sự & Quản trị công việc AI',
              location: 'Khu vực miền Bắc - VN',
              terms: true,
            }}
          >
            {/* Họ và tên */}
            <Form.Item
              name="name"
              label="Họ và tên"
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên của bạn' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#64748b' }} />}
                placeholder="Nhập tên của bạn"
              />
            </Form.Item>

            {/* Sản phẩm quan tâm */}
            <Form.Item
              name="interestedProduct"
              label="Sản phẩm quan tâm"
              rules={[{ required: true, message: 'Vui lòng chọn sản phẩm quan tâm' }]}
            >
              <Select
                popupClassName="base-select-dropdown"
                options={[
                  { value: 'RAO Work+: Phân bổ nhân sự & Quản trị công việc AI', label: 'RAO Work+: Phân bổ nhân sự & Quản trị công việc AI' },
                  { value: 'RAO Schedule+: Lịch biểu tác vụ đa góc nhìn (Day/Week/Month)', label: 'RAO Schedule+: Lịch biểu tác vụ đa góc nhìn (Day/Week/Month)' },
                  { value: 'RAO Optimize+: Tối ưu hóa thuật toán kép CSP & Di truyền (GA)', label: 'RAO Optimize+: Tối ưu hóa thuật toán kép CSP & Di truyền (GA)' },
                  { value: 'RAO Analytics+: Phân tích khối lượng công việc, FTE & Ngân sách', label: 'RAO Analytics+: Phân tích khối lượng công việc, FTE & Ngân sách' },
                ]}
              />
            </Form.Item>

            {/* Email & Số điện thoại */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email doanh nghiệp"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email công việc' },
                    { type: 'email', message: 'Email không hợp lệ' },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: '#64748b' }} />}
                    placeholder="email@congty.com"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                >
                  <Input
                    prefix={<PhoneOutlined style={{ color: '#64748b' }} />}
                    placeholder="0912 345 678"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Vị trí công việc & Tên công ty (Đúng chuẩn Base.vn) */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="jobTitle"
                  label="Vị trí công việc"
                  rules={[{ required: true, message: 'Vui lòng lựa chọn vị trí công việc' }]}
                >
                  <Select
                    placeholder="Lựa chọn vị trí công việc"
                    popupClassName="base-select-dropdown"
                    options={[
                      { value: 'CEO / Founder / Chủ tịch', label: 'CEO / Founder / Chủ tịch' },
                      { value: 'Giám đốc (CFO, CTO, GĐ Nhân sự...)', label: 'Giám đốc (CFO, CTO, GĐ Nhân sự...)' },
                      { value: 'Quản lý (Manager)', label: 'Quản lý (Manager)' },
                      { value: 'Nhân viên (Staff)', label: 'Nhân viên (Staff)' },
                      { value: 'Vị trí khác (Others)', label: 'Vị trí khác (Others)' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="companyName"
                  label="Tên công ty"
                  rules={[{ required: true, message: 'Vui lòng nhập tên công ty' }]}
                >
                  <Input
                    prefix={<ApartmentOutlined style={{ color: '#64748b' }} />}
                    placeholder="Nhập tên công ty..."
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Khu vực & Quy mô nhân sự */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="location"
                  label="Khu vực / Tỉnh thành"
                  rules={[{ required: true, message: 'Vui lòng chọn khu vực' }]}
                >
                  <Select
                    placeholder="Lựa chọn khu vực"
                    popupClassName="base-select-dropdown"
                    options={[
                      { value: 'Khu vực miền Bắc - VN', label: 'Khu vực miền Bắc - VN' },
                      { value: 'Khu vực miền Trung - VN', label: 'Khu vực miền Trung - VN' },
                      { value: 'Khu vực miền Nam - VN', label: 'Khu vực miền Nam - VN' },
                      { value: 'Quốc tế / Toàn cầu', label: 'Quốc tế / Toàn cầu' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="companySize"
                  label="Quy mô nhân sự"
                  rules={[{ required: true, message: 'Vui lòng chọn quy mô nhân sự' }]}
                >
                  <Select
                    placeholder="Lựa chọn quy mô nhân sự"
                    popupClassName="base-select-dropdown"
                    options={[
                      { value: '1–15 nhân sự', label: '1–15 nhân sự' },
                      { value: '16–30 nhân sự', label: '16–30 nhân sự' },
                      { value: '31–60 nhân sự', label: '31–60 nhân sự' },
                      { value: '61–200 nhân sự', label: '61–200 nhân sự' },
                      { value: '201–500 nhân sự', label: '201–500 nhân sự' },
                      { value: '501–1000 nhân sự', label: '501–1000 nhân sự' },
                      { value: 'Hơn 1000 nhân sự', label: 'Hơn 1000 nhân sự' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Khởi tạo mật khẩu đăng nhập */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="Mật khẩu khởi tạo"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu' },
                    { min: 6, message: 'Tối thiểu 6 ký tự' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#64748b' }} />}
                    placeholder="••••••••"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="confirmPassword"
                  label="Xác nhận mật khẩu"
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
                  <Input.Password
                    prefix={<LockOutlined style={{ color: '#64748b' }} />}
                    placeholder="••••••••"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Checkbox điều khoản Base.vn */}
            <Form.Item
              name="terms"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value ? Promise.resolve() : Promise.reject(new Error('Vui lòng đồng ý với điều khoản sử dụng')),
                },
              ]}
              style={{ marginBottom: 20 }}
            >
              <Checkbox style={{ color: '#94a3b8', fontSize: 12.5, lineHeight: 1.4 }}>
                Tôi xác nhận đồng ý với mục đích giao tiếp, nhận thông tin tư vấn giải pháp và các điều khoản sử dụng của nền tảng RAO.
              </Checkbox>
            </Form.Item>

            {/* Nút gửi chính */}
            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="base-submit-btn"
              >
                {t('auth.registerTitle')} <ArrowRightOutlined />
              </Button>
            </Form.Item>
          </Form>
          <div className="auth-switch"><Text type="secondary">{t('workspace.haveAccount')} </Text><Link to="/login">{t('auth.login')}</Link></div>
        </div>
      </section>
    </main>
  );
}
