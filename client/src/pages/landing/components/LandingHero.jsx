/**
 * ============================================================================
 * PHẦN HERO BANNER TRANG CHỦ (Landing Hero Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Tiêu đề giới thiệu hệ thống RAO Studio.
 *   - Nút hành động kêu gọi (CTA: Truy cập Workspace, Trải nghiệm Miễn phí).
 *   - Cửa sổ mô phỏng trực quan (Mockup Window): Bảng Kanban trực tiếp và
 *     bảng đo lường AI Real-time Solver.
 *   - Thanh 4 chỉ số ấn tượng (4 Thuật toán, 98.6% Khớp kỹ năng, <150ms tốc độ, 0 Vi phạm ràng buộc).
 */

import { Button, Tag, Typography, Row, Col } from 'antd';
import {
  DashboardOutlined,
  ArrowRightOutlined,
  ExperimentOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function LandingHero({
  isAuthenticated = false,
  user,
  navigate,
  scrollToSection,
}) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-background-effects">
          <div className="hero-glow-blob blob-1" />
          <div className="hero-glow-blob blob-2" />
          <div className="hero-grid-pattern" />
        </div>

        <div className="hero-container">
          <div className="hero-badge-pill">
            <span className="badge-sparkle">✨</span>
            <span className="badge-text">
              Thế hệ Tiếp theo của Quản trị Dự án & Tối ưu Nguồn lực
            </span>
          </div>

          <Title level={1} className="hero-main-title">
            Biến kế hoạch đa dự án thành <br />
            <span className="gradient-text">lịch trình tối ưu tự động</span>
          </Title>

          <Paragraph className="hero-subtitle">
            Hệ thống điều phối luồng công việc thông minh kết hợp sức mạnh của{' '}
            <strong>Genetic Algorithm (GA)</strong> và <strong>CSP Solver</strong>. Tự động
            phân bổ nhân sự, cân bằng 100% khối lượng công việc, tối đa hóa mức độ khớp kỹ
            năng và loại bỏ hoàn toàn rủi ro kiệt sức (Burnout).
          </Paragraph>

          <div className="hero-cta-group">
            {isAuthenticated ? (
              <Button
                type="primary"
                size="large"
                icon={<DashboardOutlined />}
                onClick={() => navigate('/dashboard')}
                className="hero-btn-primary"
              >
                Truy cập Workspace ({user?.name || 'Dashboard'})
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate('/register')}
                className="hero-btn-primary"
              >
                Trải nghiệm Miễn phí Ngay
              </Button>
            )}

            <Button
              size="large"
              icon={<ExperimentOutlined />}
              onClick={() => {
                if (isAuthenticated) navigate('/benchmark');
                else scrollToSection('sandbox');
              }}
              className="hero-btn-secondary"
            >
              Khám phá Benchmark Studio
            </Button>
          </div>

          <div className="hero-trust-badges">
            <span className="trust-item">
              <CheckCircleFilled className="trust-icon" /> Không cần cấu hình phức tạp
            </span>
            <span className="trust-item">
              <CheckCircleFilled className="trust-icon" /> Đáp ứng 100% Ràng buộc cứng (Hard Constraints)
            </span>
            <span className="trust-item">
              <CheckCircleFilled className="trust-icon" /> Xuất Báo cáo Luận văn LaTeX & CSV 1-Click
            </span>
          </div>

          {/* Cửa sổ mô phỏng giao diện tương tác (Mockup Window) */}
          <div className="hero-mockup-window">
            <div className="mockup-header-bar">
              <div className="mockup-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <div className="mockup-title-bar">
                <span className="mockup-url">rao.studio/workspace/multi-project-optimization</span>
              </div>
              <div className="mockup-actions">
                <Tag color="success" style={{ margin: 0 }}>
                  ● GA & CSP Solver Active
                </Tag>
              </div>
            </div>

            <div className="mockup-body-grid">
              {/* Cột trái: Bảng Kanban trực quan */}
              <div className="mockup-column-kanban">
                <div className="mockup-pane-title">
                  <span>📋 Bảng Công việc Kanban</span>
                  <Tag color="purple">3 Dự án Đồng thời</Tag>
                </div>
                <div className="mockup-task-cards">
                  <div className="mockup-task-item task-done">
                    <div className="task-item-header">
                      <span className="task-name">Thiết kế Kiến trúc Microservices</span>
                      <span className="task-badge-status status-done">Done</span>
                    </div>
                    <div className="task-item-meta">
                      <Tag color="blue">Node.js Lv.4</Tag>
                      <Tag color="cyan">Docker Lv.3</Tag>
                      <span className="task-time">16h · Nguyễn Văn A</span>
                    </div>
                  </div>

                  <div className="mockup-task-item task-active">
                    <div className="task-item-header">
                      <span className="task-name">Tối ưu hóa Thuật toán CSP + GA</span>
                      <span className="task-badge-status status-progress">In Progress</span>
                    </div>
                    <div className="task-item-meta">
                      <Tag color="purple">AI / ML Lv.4</Tag>
                      <Tag color="geekblue">Python Lv.3</Tag>
                      <span className="task-time">24h · Trần Xuân Trường</span>
                    </div>
                  </div>

                  <div className="mockup-task-item task-todo">
                    <div className="task-item-header">
                      <span className="task-name">Kiểm thử Tải & Xác thực Ràng buộc H1-H4</span>
                      <span className="task-badge-status status-todo">To Do</span>
                    </div>
                    <div className="task-item-meta">
                      <Tag color="orange">QA Testing Lv.3</Tag>
                      <span className="task-time">12h · Lê Thị C</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cột phải: Bộ giải toán Real-time & Đo tải trọng */}
              <div className="mockup-column-analytics">
                <div className="mockup-pane-title">
                  <span>⚡ Tối ưu hóa Phân bổ (Real-time Solver)</span>
                  <Tag color="gold">Fitness: 0.962</Tag>
                </div>

                <div className="mockup-solver-stat-card">
                  <div className="solver-stat-row">
                    <div className="stat-box">
                      <span className="stat-k">Độ Khớp Kỹ năng</span>
                      <span className="stat-v text-success">98.4%</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-k">Cân bằng Tải (StdDev)</span>
                      <span className="stat-v text-primary">2.1h</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-k">Thời gian Xử lý</span>
                      <span className="stat-v text-warning">14ms</span>
                    </div>
                  </div>
                </div>

                <div className="mockup-workload-gauges">
                  <div className="gauge-label-row">
                    <span className="gauge-name">Kỹ sư Backend Team (5 thành viên)</span>
                    <span className="gauge-percent text-success">82% (Cân bằng lý tưởng)</span>
                  </div>
                  <div className="gauge-bar-track">
                    <div className="gauge-bar-fill fill-green" style={{ width: '82%' }} />
                  </div>

                  <div className="gauge-label-row" style={{ marginTop: 12 }}>
                    <span className="gauge-name">Kỹ sư Frontend & Mobile (4 thành viên)</span>
                    <span className="gauge-percent text-primary">78% (Headroom an toàn)</span>
                  </div>
                  <div className="gauge-bar-track">
                    <div className="gauge-bar-fill fill-blue" style={{ width: '78%' }} />
                  </div>

                  <div className="gauge-label-row" style={{ marginTop: 12 }}>
                    <span className="gauge-name">Kỹ sư AI & DevOps (3 thành viên)</span>
                    <span className="gauge-percent text-purple">88% (Tối ưu năng suất)</span>
                  </div>
                  <div className="gauge-bar-track">
                    <div className="gauge-bar-fill fill-purple" style={{ width: '88%' }} />
                  </div>
                </div>

                <div className="mockup-cpm-banner">
                  <span className="cpm-icon">📈</span>
                  <div className="cpm-text">
                    <strong>Đường găng CPM:</strong> Nhận diện chính xác 4 công việc trên Critical Path, tự động ưu tiên gán Senior có level kỹ năng cao nhất.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Thanh thống kê 4 chỉ số nổi bật */}
      <section className="metrics-bar-section">
        <div className="landing-container">
          <Row gutter={[24, 24]} align="middle" justify="center">
            <Col xs={12} sm={6} className="metric-col">
              <div className="metric-number gradient-text">4</div>
              <div className="metric-label">Giải thuật Tối ưu</div>
              <div className="metric-sub">GA · CSP · Hybrid · Greedy</div>
            </Col>

            <Col xs={12} sm={6} className="metric-col">
              <div className="metric-number gradient-text">98.6%</div>
              <div className="metric-label">Độ Khớp Kỹ năng</div>
              <div className="metric-sub">Ma trận Skill Matrix Lv.1-4</div>
            </Col>

            <Col xs={12} sm={6} className="metric-col">
              <div className="metric-number gradient-text">&lt; 150ms</div>
              <div className="metric-label">Tốc độ Giải Quyết</div>
              <div className="metric-sub">Quy mô 500 tasks / 60 nhân sự</div>
            </Col>

            <Col xs={12} sm={6} className="metric-col">
              <div className="metric-number gradient-text">0</div>
              <div className="metric-label">Vi Phạm Ràng Buộc</div>
              <div className="metric-sub">Thỏa mãn 100% Hard Constraints</div>
            </Col>
          </Row>
        </div>
      </section>
    </>
  );
}
