import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineUser,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';
import './Auth.css';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setErrorMsg(result.message);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-scale-in">
        {/* Left - Branding */}
        <div className="auth-branding">
          <div className="auth-branding-content">
            <div className="auth-logo">
              <span className="auth-logo-icon">R</span>
              <span className="auth-logo-text">RAO</span>
            </div>
            <h1 className="auth-branding-title">
              Resource Allocation<br />Optimization
            </h1>
            <p className="auth-branding-desc">
              Tạo tài khoản để bắt đầu quản lý dự án, phân bổ nhân sự 
              và tối ưu hóa hiệu suất làm việc.
            </p>
            <div className="auth-branding-features">
              <div className="auth-feature">
                <span className="auth-feature-icon">🚀</span>
                <span>Tối đa hóa hiệu suất nhân sự</span>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon">⚡</span>
                <span>Giảm thiểu burnout & xung đột</span>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon">📈</span>
                <span>Báo cáo & Analytics chi tiết</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Register Form */}
        <div className="auth-form-section">
          <div className="auth-form-wrapper">
            <h2 className="auth-form-title">Tạo tài khoản</h2>
            <p className="auth-form-subtitle">
              Điền thông tin bên dưới để tạo tài khoản mới.
            </p>

            {errorMsg && (
              <div className="auth-error" id="register-error">
                <span>⚠️</span>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" id="register-form">
              <div className="auth-input-group">
                <label htmlFor="register-name" className="auth-label">Họ và tên</label>
                <div className="auth-input-wrapper">
                  <HiOutlineUser className="auth-input-icon" />
                  <input
                    type="text"
                    id="register-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    className="auth-input"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="register-email" className="auth-label">Email</label>
                <div className="auth-input-wrapper">
                  <HiOutlineMail className="auth-input-icon" />
                  <input
                    type="email"
                    id="register-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="auth-input"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="register-password" className="auth-label">Mật khẩu</label>
                <div className="auth-input-wrapper">
                  <HiOutlineLockClosed className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="register-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Ít nhất 6 ký tự"
                    className="auth-input"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="register-confirm-password" className="auth-label">
                  Xác nhận mật khẩu
                </label>
                <div className="auth-input-wrapper">
                  <HiOutlineLockClosed className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="register-confirm-password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Nhập lại mật khẩu"
                    className="auth-input"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                id="register-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                    Đang tạo tài khoản...
                  </>
                ) : (
                  'Tạo tài khoản'
                )}
              </button>
            </form>

            <p className="auth-switch">
              Đã có tài khoản?{' '}
              <Link to="/login" className="auth-switch-link">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
