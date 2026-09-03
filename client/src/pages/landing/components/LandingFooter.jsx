/**
 * ============================================================================
 * CHÂN TRANG & THÔNG TIN LUẬN VĂN (Landing Footer Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Hiển thị thông tin chính thức của Đồ án Tốt nghiệp (Sinh viên: Trần Xuân Trường).
 *   - Khối kêu gọi hành động cuối trang (CTA Banner).
 *   - Chân trang phong cách Enterprise SaaS với liên kết nhanh và bản quyền.
 */

import { Tag, Typography, Row, Col, Card, Button } from 'antd';
import {
  ExperimentOutlined,
  DashboardOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function LandingFooter({
  isAuthenticated = false,
  navigate,
  setActiveTab,
}) {
  return (
    <>
      {/* 1. Khối Thông tin Đồ án Tốt nghiệp */}
      <section id="thesis-info" className="thesis-section">
        <div className="landing-container">
          <Card className="thesis-card">
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} md={16}>
                <Tag color="purple">Thông tin Luận văn Tốt nghiệp</Tag>
                <Title level={3} className="thesis-title">
                  Đồ án Tốt nghiệp Đại học Chuyên ngành Công nghệ Thông tin
                </Title>
                <Paragraph className="thesis-desc">
                  <strong>Đề tài:</strong> Nghiên cứu và Xây dựng Hệ thống Quản lý Luồng Công việc Đa Dự án và Tự động Hóa Phân bổ Nguồn lực bằng Thuật toán Di truyền (Genetic Algorithm) kết hợp Thỏa mãn Ràng buộc (CSP).
                </Paragraph>
                <div className="thesis-meta-tags">
                  <Tag color="blue">Sinh viên: Trần Xuân Trường</Tag>
                  <Tag color="cyan">Tech Stack: React · Node.js · MongoDB · React Native Expo</Tag>
                  <Tag color="green">Hoàn thành 100% 79/79 Tính năng</Tag>
                </div>
              </Col>

              <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<ExperimentOutlined />}
                  onClick={() => navigate('/benchmark')}
                  className="btn-primary-glow"
                >
                  Mở Benchmark Studio
                </Button>
              </Col>
            </Row>
          </Card>
        </div>
      </section>

      {/* 2. Banner Kêu gọi Hành động Cuối Trang (Final CTA) */}
      <section className="cta-banner-section">
        <div className="landing-container">
          <div className="cta-banner-inner">
            <Title level={2} className="cta-title">
              Sẵn sàng Tối ưu hóa Nguồn lực cho Đội ngũ của Bạn?
            </Title>
            <Paragraph className="cta-subtitle">
              Bắt đầu ngay hôm nay để trải nghiệm sự khác biệt của hệ thống phân bổ nguồn lực tự động thông minh.
            </Paragraph>
            <div className="cta-buttons">
              {isAuthenticated ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<DashboardOutlined />}
                  onClick={() => navigate('/dashboard')}
                  className="hero-btn-primary"
                >
                  Vào Dashboard Ngay
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate('/register')}
                  className="hero-btn-primary"
                >
                  Tạo Tài khoản & Bắt đầu Miễn phí
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Chân trang Doanh nghiệp (Atlassian Style Footer) */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-top-row">
            <div className="footer-brand-col">
              <div className="footer-brand">
                <span className="brand-icon">⚡</span>
                <span className="brand-title">RAO Studio</span>
              </div>
              <p className="footer-brand-desc">
                Hệ thống Quản lý Dự án & Tự động Tối ưu hóa Phân bổ Nguồn lực Thông minh.
              </p>
            </div>

            <div className="footer-links-col">
              <span className="footer-heading">Sản phẩm & Module</span>
              <ul className="footer-links-list">
                <li>
                  <a href="#features" onClick={() => setActiveTab('optimization')}>
                    Tối ưu hóa GA & CSP
                  </a>
                </li>
                <li>
                  <a href="#features" onClick={() => setActiveTab('gantt')}>
                    Sơ đồ Gantt & CPM
                  </a>
                </li>
                <li>
                  <a href="#features" onClick={() => setActiveTab('skills')}>
                    Ma trận Kỹ năng
                  </a>
                </li>
                <li>
                  <a href="#features" onClick={() => setActiveTab('analytics')}>
                    Resource Histogram
                  </a>
                </li>
              </ul>
            </div>

            <div className="footer-links-col">
              <span className="footer-heading">Nghiên cứu Khoa học</span>
              <ul className="footer-links-list">
                <li><a href="#sandbox">Live Algorithm Sandbox</a></li>
                <li><a href="#benchmark-section" onClick={() => navigate('/benchmark')}>Benchmark Studio</a></li>
                <li><a href="#comparison">Bảng so sánh Jira</a></li>
                <li><a href="#thesis-info">Thông tin Đồ án</a></li>
              </ul>
            </div>

            <div className="footer-links-col">
              <span className="footer-heading">Công nghệ Sử dụng</span>
              <ul className="footer-links-list">
                <li><span>React 18 & Vite & Ant Design</span></li>
                <li><span>Node.js Express & MongoDB</span></li>
                <li><span>React Native (Expo SDK 54)</span></li>
                <li><span>Socket.IO Real-time WebSockets</span></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-row">
            <span className="footer-copy">
              © 2026 RAO Studio. Đồ án Tốt nghiệp Chuyên ngành CNTT. All rights reserved.
            </span>
            <div className="footer-bottom-links">
              <span>Bảo mật dữ liệu</span>
              <span>·</span>
              <span>Điều khoản sử dụng</span>
              <span>·</span>
              <span>Tài liệu API</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
