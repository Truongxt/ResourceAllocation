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
    <div className="auth-container">
      {/* Cột trái: Showcase & Giá trị nền tảng (Enterprise Branding & Trust) */}
      <div className="auth-hero-pane">
        {/* Top: Logo & Platform Tagline */}
        <div style={{ zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <AppLogo size={38} isDark={true} subtitle="Enterprise SaaS Platform" />
            <Tag color="#1e3a8a" style={{ border: '1px solid #3b82f6', color: '#93c5fd', borderRadius: 20, padding: '2px 12px', fontSize: 11, fontWeight: 600 }}>
              AI ENGINE V2.0
            </Tag>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '4px 12px', borderRadius: 20, marginBottom: 16 }}>
            <ThunderboltFilled style={{ color: '#60a5fa', fontSize: 13 }} />
            <span style={{ color: '#93c5fd', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>
              NỀN TẢNG QUẢN TRỊ & TỐI ƯU NGUỒN LỰC DOANH NGHIỆP
            </span>
          </div>
        </div>

        {/* Middle: Headline & Value Proposition Bullets */}
        <div style={{ zIndex: 2, margin: '20px 0' }}>
          <Title level={1} style={{ color: '#ffffff', fontWeight: 800, fontSize: 32, lineHeight: 1.3, marginBottom: 14 }}>
            Đăng ký trải nghiệm & <br />
            <span style={{ background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Nhận tư vấn giải pháp
            </span>
          </Title>

          <Paragraph style={{ color: '#94a3b8', fontSize: 14.5, lineHeight: 1.6, marginBottom: 24, maxWidth: 520 }}>
            Hơn 10,000+ dự án & doanh nghiệp tin dùng nền tảng RAO để tối ưu hóa việc phân bổ nhân sự, cân bằng tải công việc bằng thuật toán GA/CSP và cắt giảm tới 40% chi phí vận hành.
          </Paragraph>

          {/* 3 Lợi ích nổi bật */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <div className="base-feature-item">
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <RocketFilled style={{ color: '#38bdf8', fontSize: 17 }} />
              </div>
              <div>
                <Text strong style={{ color: '#f8fafc', fontSize: 14, display: 'block', marginBottom: 2 }}>
                  Thuật toán AI kép (GA & CSP)
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                  Tự động ghép nối công việc với nhân sự phù hợp nhất theo ma trận kỹ năng và độ khả dụng thời gian thực.
                </Text>
              </div>
            </div>

            <div className="base-feature-item">
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <AppstoreOutlined style={{ color: '#a78bfa', fontSize: 17 }} />
              </div>
              <div>
                <Text strong style={{ color: '#f8fafc', fontSize: 14, display: 'block', marginBottom: 2 }}>
                  Lịch biểu & Gantt Chart trực quan
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                  Quản lý tiến độ công việc theo Ngày, Tuần, Tháng tương tự Google Calendar với khả năng lọc theo phòng ban và nhân sự.
                </Text>
              </div>
            </div>

            <div className="base-feature-item">
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <CheckCircleFilled style={{ color: '#34d399', fontSize: 17 }} />
              </div>
              <div>
                <Text strong style={{ color: '#f8fafc', fontSize: 14, display: 'block', marginBottom: 2 }}>
                  Kiểm soát tải & Ngăn ngừa Burnout
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                  Cảnh báo quá tải tức thì, theo dõi FTE, chi phí dự án và số giờ làm việc theo thời gian thực.
                </Text>
              </div>
            </div>
          </div>

          {/* Social Proof Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '14px 18px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>99.2%</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Độ khớp kỹ năng AI</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa' }}>-40%</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Thời gian phân bổ</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#34d399' }}>10K+</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Công việc tối ưu</div>
            </div>
          </div>
        </div>

        {/* Bottom: Contact Hotline & Security */}
        <div style={{ zIndex: 2, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12.5 }}>
            <CustomerServiceOutlined style={{ color: '#38bdf8' }} />
            <span>Hotline tư vấn giải pháp: <strong style={{ color: '#f8fafc' }}>1900 6868</strong> (8h - 18h)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12 }}>
            <SafetyCertificateOutlined style={{ color: '#10b981' }} />
            <span>ISO 27001 Certified</span>
          </div>
        </div>
      </div>

      {/* Cột phải: Form Đăng ký Demo (Base.vn Dark Modern Form) */}
      <div className="auth-form-pane">
        <div className="base-auth-card">
          <div style={{ marginBottom: 20 }}>
            <Link to="/home" style={{ color: '#60a5fa', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              ← Quay lại Trang chủ (Home)
            </Link>
            <Title level={2} style={{ color: '#ffffff', marginBottom: 4, fontWeight: 800, fontSize: 24, letterSpacing: '-0.3px' }}>
              {t('auth.registerTitle') || 'Đăng ký tư vấn & Trải nghiệm Demo'}
            </Title>
            <Text style={{ color: '#94a3b8', fontSize: 13.5 }}>
              Khởi tạo tài khoản dùng thử miễn phí 14 ngày không giới hạn tính năng
            </Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={clearError}
              style={{ marginBottom: 20, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}
            />
          )}

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
                Nhận tư vấn giải pháp & Trải nghiệm ngay <ArrowRightOutlined />
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Text style={{ color: '#94a3b8', fontSize: 13.5 }}>
              Đã có tài khoản hệ thống?{' '}
            </Text>
            <Link to="/login" style={{ fontWeight: 600, color: '#60a5fa' }}>
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

