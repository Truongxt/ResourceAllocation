import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import './Auth.css';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const result = await login(formData);
    
    if (result.success) {
      navigate(from, { replace: true });
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
              Hệ thống quản lý luồng công việc đa dự án và tối ưu hóa phân bổ nhân sự 
              với thuật toán Genetic Algorithm & CSP.
            </p>
            <div className="auth-branding-features">
              <div className="auth-feature">
                <span className="auth-feature-icon">📊</span>
                <span>Gantt Chart & Resource Histogram</span>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon">🧬</span>
                <span>Genetic Algorithm tối ưu hóa</span>
              </div>
              <div className="auth-feature">
                <span className="auth-feature-icon">👥</span>
                <span>Skill Matrix & Workload Balancing</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Login Form */}
        <div className="auth-form-section">
          <div className="auth-form-wrapper">
            <h2 className="auth-form-title">Đăng nhập</h2>
            <p className="auth-form-subtitle">
              Chào mừng bạn trở lại! Vui lòng đăng nhập để tiếp tục.
            </p>

            {errorMsg && (
              <div className="auth-error" id="login-error">
                <span>⚠️</span>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form" id="login-form">
              <div className="auth-input-group">
                <label htmlFor="login-email" className="auth-label">Email</label>
                <div className="auth-input-wrapper">
                  <HiOutlineMail className="auth-input-icon" />
                  <input
                    type="email"
                    id="login-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="auth-input"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="login-password" className="auth-label">Mật khẩu</label>
                <div className="auth-input-wrapper">
                  <HiOutlineLockClosed className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu"
                    className="auth-input"
                    required
                    autoComplete="current-password"
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

              <button
                type="submit"
                className="auth-submit-btn"
                id="login-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </form>

            <p className="auth-switch">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="auth-switch-link">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
