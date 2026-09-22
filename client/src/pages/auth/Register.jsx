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

  /**
   * Nhãn của một mục trong các Select của form này.
   *
   * `value` của chúng cố tình giữ nguyên tiếng Việt vì đó là **dữ liệu** được
   * gửi lên server và lưu vào `User.jobTitle` / `companySize` / …; dịch value
   * đi thì cùng một người chọn cùng một mục sẽ ra hai giá trị khác nhau tùy
   * ngôn ngữ đang bật. Chỉ phần người dùng đọc mới đi qua i18n.
   */
  const registerOption = (list, index) =>
    t(`auth.register.options.${list}.${index}`);

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
              label={t('auth.register.title')}
              rules={[{ required: true, message: t('auth.register.nameReq') }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#64748b' }} />}
                placeholder={t('auth.register.namePh')}
              />
            </Form.Item>

            {/* Sản phẩm quan tâm */}
            <Form.Item
              name="interestedProduct"
              label={t('auth.register.product')}
              rules={[{ required: true, message: t('auth.register.productReq') }]}
            >
              <Select
                popupClassName="base-select-dropdown"
                options={[
                  { value: 'RAO Work+: Phân bổ nhân sự & Quản trị công việc AI', label: registerOption('products', 0) },
                  { value: 'RAO Schedule+: Lịch biểu tác vụ đa góc nhìn (Day/Week/Month)', label: registerOption('products', 1) },
                  { value: 'RAO Optimize+: Tối ưu hóa thuật toán kép CSP & Di truyền (GA)', label: registerOption('products', 2) },
                  { value: 'RAO Analytics+: Phân tích khối lượng công việc, FTE & Ngân sách', label: registerOption('products', 3) },
                ]}
              />
            </Form.Item>

            {/* Email & Số điện thoại */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label={t('auth.register.email')}
                  rules={[
                    { required: true, message: t('auth.register.emailReq') },
                    { type: 'email', message: t('auth.required.emailInvalid') },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined style={{ color: '#64748b' }} />}
                    placeholder={t('auth.register.emailPh')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label={t('auth.register.phone')}
                  rules={[{ required: true, message: t('auth.register.phoneReq') }]}
                >
                  <Input
                    prefix={<PhoneOutlined style={{ color: '#64748b' }} />}
                    placeholder={t('auth.register.phonePh')}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Vị trí công việc & Tên công ty (Đúng chuẩn Base.vn) */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="jobTitle"
                  label={t('auth.register.jobTitle')}
                  rules={[{ required: true, message: t('auth.register.jobTitleReq') }]}
                >
                  <Select
                    placeholder={t('auth.register.jobTitlePh')}
                    popupClassName="base-select-dropdown"
                    options={[
                      { value: 'CEO / Founder / Chủ tịch', label: registerOption('jobTitles', 0) },
                      { value: 'Giám đốc (CFO, CTO, GĐ Nhân sự...)', label: registerOption('jobTitles', 1) },
                      { value: 'Quản lý (Manager)', label: registerOption('jobTitles', 2) },
                      { value: 'Nhân viên (Staff)', label: registerOption('jobTitles', 3) },
                      { value: 'Vị trí khác (Others)', label: registerOption('jobTitles', 4) },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="companyName"
                  label={t('auth.register.companyName')}
                  rules={[{ required: true, message: t('auth.register.companyNameReq') }]}
                >
                  <Input
                    prefix={<ApartmentOutlined style={{ color: '#64748b' }} />}
                    placeholder={t('auth.register.companyNamePh')}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Khu vực & Quy mô nhân sự */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="location"
                  label={t('auth.register.location')}
                  rules={[{ required: true, message: t('auth.register.locationReq') }]}
                >
                  <Select
                    placeholder={t('auth.register.locationPh')}
                    popupClassName="base-select-dropdown"
                    options={[
                      { value: 'Khu vực miền Bắc - VN', label: registerOption('locations', 0) },
                      { value: 'Khu vực miền Trung - VN', label: registerOption('locations', 1) },
                      { value: 'Khu vực miền Nam - VN', label: registerOption('locations', 2) },
                      { value: 'Quốc tế / Toàn cầu', label: registerOption('locations', 3) },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="companySize"
                  label={t('auth.register.companySize')}
                  rules={[{ required: true, message: t('auth.register.companySizeReq') }]}
                >
                  <Select
                    placeholder={t('auth.register.companySizePh')}
                    popupClassName="base-select-dropdown"
                    options={[
                      { value: '1–15 nhân sự', label: registerOption('companySizes', 0) },
                      { value: '16–30 nhân sự', label: registerOption('companySizes', 1) },
                      { value: '31–60 nhân sự', label: registerOption('companySizes', 2) },
                      { value: '61–200 nhân sự', label: registerOption('companySizes', 3) },
                      { value: '201–500 nhân sự', label: registerOption('companySizes', 4) },
                      { value: '501–1000 nhân sự', label: registerOption('companySizes', 5) },
                      { value: 'Hơn 1000 nhân sự', label: registerOption('companySizes', 6) },
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
                  label={t('auth.register.password')}
                  rules={[
                    { required: true, message: t('auth.required.password') },
                    { min: 6, message: t('auth.register.passwordMin') },
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
                  label={t('auth.register.confirmPassword')}
                  dependencies={['password']}
                  rules={[
                    { required: true, message: t('auth.register.confirmReq') },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                        return Promise.reject(new Error(t('auth.register.confirmMismatch')));
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
                    value ? Promise.resolve() : Promise.reject(new Error(t('auth.register.termsReq'))),
                },
              ]}
              style={{ marginBottom: 20 }}
            >
              <Checkbox style={{ color: '#94a3b8', fontSize: 12.5, lineHeight: 1.4 }}>
                {t('auth.register.terms')}
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
