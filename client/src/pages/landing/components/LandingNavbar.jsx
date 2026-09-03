/**
 * ============================================================================
 * THANH ĐIỀU HƯỚNG TRANG CHỦ (Landing Navbar Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Thanh thông báo trên cùng về đề tài tốt nghiệp.
 *   - Logo thương hiệu RAO Studio, liên kết điều hướng mượt mà đến các mục:
 *     Tính năng, Thuật toán AI, Live Demo, So sánh với Jira, Đồ án.
 *   - Nút chuyển đổi Dark/Light mode và nút Đăng nhập / Bắt đầu ngay.
 */

import { Button, Tag, Space } from 'antd';
import {
  DashboardOutlined,
  LoginOutlined,
  UserAddOutlined,
} from '@ant-design/icons';

export default function LandingNavbar({
  isAuthenticated = false,
  user,
  isDark = false,
  toggleTheme,
  scrollToSection,
  navigate,
}) {
  return (
    <>
      {/* 1. Thanh thông báo toàn cục */}
      <div className="landing-top-announcement">
        <div className="announcement-content">
          <Tag color="purple" className="announcement-badge">
            Đồ Án Tốt Nghiệp 2026
          </Tag>
          <span className="announcement-text">
            Hệ thống Quản lý Luồng Công việc Đa Dự án & Tự động Tối ưu hóa Phân bổ Nguồn lực Thông minh (RAO Studio)
          </span>
          <a
            href="#benchmark-section"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('benchmark-section');
            }}
            className="announcement-link"
          >
            Xem Thực nghiệm Đánh giá →
          </a>
        </div>
      </div>

      {/* 2. Header Điều Hướng Chính */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-brand" onClick={() => navigate('/')}>
            <div className="brand-icon-box">⚡</div>
            <div className="brand-text-wrap">
              <span className="brand-name">RAO Studio</span>
              <span className="brand-badge">PRO</span>
            </div>
          </div>

          <nav className="landing-nav-menu">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('features');
              }}
              className="nav-link"
            >
              Tính năng
            </a>
            <a
              href="#algorithms"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('algorithms');
              }}
              className="nav-link"
            >
              Thuật toán AI
            </a>
            <a
              href="#sandbox"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('sandbox');
              }}
              className="nav-link"
            >
              Live Demo
            </a>
            <a
              href="#comparison"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('comparison');
              }}
              className="nav-link"
            >
              So sánh với Jira
            </a>
            <a
              href="#thesis-info"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('thesis-info');
              }}
              className="nav-link"
            >
              Đồ án
            </a>
          </nav>

          <div className="landing-header-actions">
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title="Chuyển đổi giao diện Sáng / Tối"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {isAuthenticated ? (
              <Button
                type="primary"
                size="large"
                icon={<DashboardOutlined />}
                onClick={() => navigate('/dashboard')}
                className="btn-primary-glow"
              >
                Vào Workspace ({user?.name || 'Dashboard'})
              </Button>
            ) : (
              <Space size="middle">
                <Button
                  type="text"
                  size="large"
                  icon={<LoginOutlined />}
                  onClick={() => navigate('/login')}
                  className="btn-text-nav"
                >
                  Đăng nhập
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<UserAddOutlined />}
                  onClick={() => navigate('/register')}
                  className="btn-primary-glow"
                >
                  Bắt đầu Ngay
                </Button>
              </Space>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
