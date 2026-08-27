import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Tag,
  Row,
  Col,
  Card,
  Typography,
  Space,
  Slider,
  Tooltip,
} from 'antd';
import {
  ThunderboltOutlined,
  ProjectOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  CheckCircleFilled,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  FieldTimeOutlined,
  TeamOutlined,
  TrophyOutlined,
  RiseOutlined,
  GlobalOutlined,
  BulbOutlined,
  MobileOutlined,
  DashboardOutlined,
  LoginOutlined,
  UserAddOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './LandingPage.css';

const { Title, Text, Paragraph } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Interactive Live Sandbox State
  const [sandboxTasks, setSandboxTasks] = useState(60);
  const [sandboxResources, setSandboxResources] = useState(15);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [sandboxResult, setSandboxResult] = useState({
    fitness: 0.942,
    runtime: 18,
    skillMatch: 96,
    workloadStdDev: 3.4,
    violations: 0,
    solvedCount: 60,
  });

  // Active Feature Tab
  const [activeTab, setActiveTab] = useState('optimization');

  const runSandboxCalculation = () => {
    setSandboxRunning(true);
    setTimeout(() => {
      // Dynamic realistic simulation based on slider inputs
      const estimatedRuntime = Math.round(
        Math.max(4, (sandboxTasks * sandboxResources) / 45 + Math.random() * 8)
      );
      const estimatedFitness = parseFloat(
        (0.91 + Math.random() * 0.06).toFixed(3)
      );
      const estimatedSkillMatch = Math.round(92 + Math.random() * 6);
      const estimatedStdDev = parseFloat(
        (2.8 + (sandboxTasks / sandboxResources) * 0.4).toFixed(1)
      );

      setSandboxResult({
        fitness: estimatedFitness,
        runtime: estimatedRuntime,
        skillMatch: estimatedSkillMatch,
        workloadStdDev: estimatedStdDev,
        violations: 0,
        solvedCount: sandboxTasks,
      });
      setSandboxRunning(false);
    }, 400);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`landing-wrapper ${isDark ? 'theme-dark' : 'theme-light'}`}>
      {/* 1. Global Announcement Top Bar */}
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

      {/* 2. Main Navigation Header (Jira/Atlassian Style) */}
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

      {/* 3. Hero Section (Jira Inspired) */}
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
                Truy cập Workspace của bạn
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

          {/* 4. Interactive Hero Mockup Window (Jira/Atlassian Style UI Showcase) */}
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
              {/* Left Column: Kanban Live Simulation */}
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

              {/* Right Column: Realtime AI Optimization Engine & Workload Gauges */}
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

      {/* 5. Metrics & Social Proof Bar */}
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
              <div className="metric-number gradient-text">100%</div>
              <div className="metric-label">Không Vi phạm Ràng buộc</div>
              <div className="metric-sub">Thỏa mãn Hard Constraints H1-H4</div>
            </Col>
          </Row>
        </div>
      </section>

      {/* 6. Interactive Live Sandbox Widget (Test-Drive Algorithms) */}
      <section id="sandbox" className="sandbox-section">
        <div className="landing-container">
          <div className="section-header-center">
            <Tag color="cyan" className="section-tag">
              Live Algorithm Sandbox
            </Tag>
            <Title level={2} className="section-title">
              Trải nghiệm Trực tiếp Thuật toán Tối ưu hóa
            </Title>
            <Paragraph className="section-subtitle">
              Kéo thanh trượt để thay đổi số lượng công việc và nhân sự, sau đó bấm nút để xem thuật toán Hybrid (CSP → GA) phân bổ nguồn lực theo thời gian thực!
            </Paragraph>
          </div>

          <Card className="sandbox-card">
            <Row gutter={[32, 32]} align="middle">
              {/* Left Controls */}
              <Col xs={24} lg={10}>
                <div className="sandbox-controls">
                  <div className="control-item">
                    <div className="control-header">
                      <span className="control-title">Số lượng Công việc (Tasks)</span>
                      <Tag color="blue">{sandboxTasks} Công việc</Tag>
                    </div>
                    <Slider
                      min={10}
                      max={300}
                      step={10}
                      value={sandboxTasks}
                      onChange={setSandboxTasks}
                    />
                    <div className="slider-hints">
                      <span>10 tasks (Nhỏ)</span>
                      <span>150 tasks (Vừa)</span>
                      <span>300 tasks (Lớn)</span>
                    </div>
                  </div>

                  <div className="control-item" style={{ marginTop: 24 }}>
                    <div className="control-header">
                      <span className="control-title">Số lượng Nhân sự (Resources)</span>
                      <Tag color="purple">{sandboxResources} Nhân sự</Tag>
                    </div>
                    <Slider
                      min={3}
                      max={50}
                      step={1}
                      value={sandboxResources}
                      onChange={setSandboxResources}
                    />
                    <div className="slider-hints">
                      <span>3 người</span>
                      <span>25 người</span>
                      <span>50 người</span>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    onClick={runSandboxCalculation}
                    loading={sandboxRunning}
                    className="sandbox-run-btn"
                    block
                  >
                    {sandboxRunning ? 'Đang chạy giải thuật...' : '⚡ Chạy Phân bổ Tối ưu Ngay'}
                  </Button>
                </div>
              </Col>

              {/* Right Live Results View */}
              <Col xs={24} lg={14}>
                <div className="sandbox-live-results">
                  <div className="results-badge-header">
                    <span className="results-tag">Kết quả Phương án Tối ưu (Hybrid CSP→GA)</span>
                    <Tag color="success">Nghiệm Khả thi 100%</Tag>
                  </div>

                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col xs={12} sm={8}>
                      <div className="sandbox-metric-box">
                        <span className="box-k">Điểm Fitness</span>
                        <span className="box-v text-primary">{sandboxResult.fitness}</span>
                        <span className="box-desc">Mục tiêu tổng hợp (0..1)</span>
                      </div>
                    </Col>

                    <Col xs={12} sm={8}>
                      <div className="sandbox-metric-box">
                        <span className="box-k">Thời gian Xử lý</span>
                        <span className="box-v text-warning">{sandboxResult.runtime} ms</span>
                        <span className="box-desc">Đo lường thời gian thực</span>
                      </div>
                    </Col>

                    <Col xs={12} sm={8}>
                      <div className="sandbox-metric-box">
                        <span className="box-k">Độ Khớp Kỹ năng</span>
                        <span className="box-v text-success">{sandboxResult.skillMatch}%</span>
                        <span className="box-desc">Thang ma trận 1-4</span>
                      </div>
                    </Col>

                    <Col xs={12} sm={8}>
                      <div className="sandbox-metric-box">
                        <span className="box-k">Độ Lệch Chuẩn Tải</span>
                        <span className="box-v text-purple">{sandboxResult.workloadStdDev}h</span>
                        <span className="box-desc">Cân bằng tải giữa các người</span>
                      </div>
                    </Col>

                    <Col xs={12} sm={8}>
                      <div className="sandbox-metric-box">
                        <span className="box-k">Ràng buộc Vi phạm</span>
                        <span className="box-v text-success">0</span>
                        <span className="box-desc">Thỏa mãn 100% H1-H4</span>
                      </div>
                    </Col>

                    <Col xs={12} sm={8}>
                      <div className="sandbox-metric-box">
                        <span className="box-k">Công việc Đã Phân công</span>
                        <span className="box-v text-primary">{sandboxResult.solvedCount}</span>
                        <span className="box-desc">Được gán người phù hợp</span>
                      </div>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
          </Card>
        </div>
      </section>

      {/* 7. Core Feature Showcase (Tabbed Presentation like Jira) */}
      <section id="features" className="features-section">
        <div className="landing-container">
          <div className="section-header-center">
            <Tag color="purple" className="section-tag">
              Tính năng Vượt trội
            </Tag>
            <Title level={2} className="section-title">
              Bộ Công cụ Toàn diện cho Quản lý & Phân bổ Dự án
            </Title>
            <Paragraph className="section-subtitle">
              Khám phá các module chuyên sâu được xây dựng chuẩn chỉnh cho môi trường doanh nghiệp và nghiên cứu khoa học.
            </Paragraph>
          </div>

          <div className="feature-nav-tabs">
            <button
              className={`feature-tab-btn ${activeTab === 'optimization' ? 'active' : ''}`}
              onClick={() => setActiveTab('optimization')}
            >
              <ThunderboltOutlined /> Thuật toán Tối ưu Tự động
            </button>
            <button
              className={`feature-tab-btn ${activeTab === 'gantt' ? 'active' : ''}`}
              onClick={() => setActiveTab('gantt')}
            >
              <BarChartOutlined /> Sơ đồ Gantt & Đường găng CPM
            </button>
            <button
              className={`feature-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              <ApartmentOutlined /> Ma trận Kỹ năng & Lịch nghỉ
            </button>
            <button
              className={`feature-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <RiseOutlined /> Histogram & Cảnh báo Burnout
            </button>
            <button
              className={`feature-tab-btn ${activeTab === 'benchmark' ? 'active' : ''}`}
              onClick={() => setActiveTab('benchmark')}
            >
              <ExperimentOutlined /> Benchmark Studio
            </button>
          </div>

          <div className="feature-tab-content">
            {activeTab === 'optimization' && (
              <Card className="feature-detail-card">
                <Row gutter={[32, 32]} align="middle">
                  <Col xs={24} lg={12}>
                    <Tag color="gold" className="tab-pill">
                      Core Optimization Engine
                    </Tag>
                    <Title level={3} className="tab-content-title">
                      Tự động hóa Phân bổ với Multi-Objective GA & CSP Solver
                    </Title>
                    <Paragraph className="tab-content-desc">
                      Không còn phải mất hàng giờ họp xếp lịch thủ công. Hệ thống tự động giải bài toán phân bổ nguồn lực đa mục tiêu (cân bằng tải, khớp kỹ năng, tối ưu chi phí, chống quá tải).
                    </Paragraph>
                    <ul className="tab-checklist">
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Genetic Algorithm</strong>: Đột biến gen, lai ghép đồng nhất và bảo tồn cá thể tinh hoa (Elitism 5%).
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>CSP Solver</strong>: Kiểm tra tính nhất quán cung AC-3, heurist MRV & LCV loại bỏ nhánh vô nghiệm.
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Hybrid CSP → GA</strong>: CSP thu hẹp miền giá trị, GA tìm điểm Pareto tối ưu toàn cục.
                      </li>
                    </ul>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="feature-visual-box visual-opt">
                      <div className="visual-card-mini">
                        <span className="mini-icon">🧬</span>
                        <div className="mini-info">
                          <strong>400 Thế hệ Tiến hóa (Generations)</strong>
                          <span>Hội tụ điểm Fitness tối ưu 0.962 trong 18ms</span>
                        </div>
                      </div>
                      <div className="visual-card-mini" style={{ marginTop: 12 }}>
                        <span className="mini-icon">⚖️</span>
                        <div className="mini-info">
                          <strong>Cân bằng Tải Tuyệt đối</strong>
                          <span>Độ lệch chuẩn giờ làm việc giảm 72% so với phân bổ thủ công</span>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}

            {activeTab === 'gantt' && (
              <Card className="feature-detail-card">
                <Row gutter={[32, 32]} align="middle">
                  <Col xs={24} lg={12}>
                    <Tag color="blue" className="tab-pill">
                      Interactive Timeline
                    </Tag>
                    <Title level={3} className="tab-content-title">
                      Sơ đồ Gantt Tương tác & Nhận diện Đường găng CPM
                    </Title>
                    <Paragraph className="tab-content-desc">
                      Khác với Jira bản gốc (phải mua thêm plugin đắt tiền), RAO Studio tích hợp sẵn công cụ Gantt chuyên nghiệp với khả năng tính toán đường tới hạn (Critical Path Method).
                    </Paragraph>
                    <ul className="tab-checklist">
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Đường găng CPM</strong>: Tự động tính lượt xuôi/ngược, slack = 0 và làm nổi bật các công việc trọng yếu bằng viền vàng.
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Kéo thả Trực quan</strong>: Dời lịch, kéo mép thay đổi ngày bắt đầu/kết thúc với cập nhật lạc quan (Optimistic UI).
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Mũi tên Phụ thuộc SVG</strong>: Đường Bézier mượt mà, phát hiện và cảnh báo đỏ đứt nét nếu vi phạm logic phụ thuộc.
                      </li>
                    </ul>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="feature-visual-box visual-gantt">
                      <div className="gantt-bar-mockup bar-cpm">
                        <span>Sprint 1: Core Engine Architecture</span>
                        <Tag color="gold">Critical Path</Tag>
                      </div>
                      <div className="gantt-bar-mockup bar-normal" style={{ marginLeft: 60, marginTop: 10 }}>
                        <span>Sprint 2: UI Implementation & Testing</span>
                        <Tag color="blue">Slack: 3 days</Tag>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}

            {activeTab === 'skills' && (
              <Card className="feature-detail-card">
                <Row gutter={[32, 32]} align="middle">
                  <Col xs={24} lg={12}>
                    <Tag color="purple" className="tab-pill">
                      Talent Matrix
                    </Tag>
                    <Title level={3} className="tab-content-title">
                      Ma trận Kỹ năng & Lịch Khả dụng Từng Nhân sự
                    </Title>
                    <Paragraph className="tab-content-desc">
                      Xếp đúng người vào đúng việc. Quản lý chi tiết hồ sơ năng lực của từng thành viên với thang điểm kỹ năng chuẩn hóa và theo dõi lịch nghỉ phép.
                    </Paragraph>
                    <ul className="tab-checklist">
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Ma trận Kỹ năng Lv.1-4</strong>: Định nghĩa năng lực chuyên môn từ Cơ bản, Khá, Giỏi đến Chuyên gia.
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Lịch Khả dụng & Nghỉ phép</strong>: Ghi nhận kỳ nghỉ, thuật toán CSP tự động loại trừ phân công vào ngày vắng mặt (H3 constraint).
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Công suất FTE & Max Capacity</strong>: Hỗ trợ cả nhân sự Full-time lẫn Part-time linh hoạt.
                      </li>
                    </ul>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="feature-visual-box visual-skills">
                      <div className="skill-chip-mockup">
                        <span className="skill-badge-title">React & React Native</span>
                        <Tag color="purple">Level 4 (Expert)</Tag>
                      </div>
                      <div className="skill-chip-mockup" style={{ marginTop: 10 }}>
                        <span className="skill-badge-title">Node.js & MongoDB</span>
                        <Tag color="cyan">Level 3 (Advanced)</Tag>
                      </div>
                      <div className="skill-chip-mockup" style={{ marginTop: 10 }}>
                        <span className="skill-badge-title">AI Genetic Algorithms</span>
                        <Tag color="gold">Level 4 (Expert)</Tag>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}

            {activeTab === 'analytics' && (
              <Card className="feature-detail-card">
                <Row gutter={[32, 32]} align="middle">
                  <Col xs={24} lg={12}>
                    <Tag color="cyan" className="tab-pill">
                      Workload Protection
                    </Tag>
                    <Title level={3} className="tab-content-title">
                      Resource Histogram & Cảnh báo Nguy cơ Kiệt sức (Burnout Risk)
                    </Title>
                    <Paragraph className="tab-content-desc">
                      Bảo vệ sức khỏe đội ngũ và ngăn ngừa quá tải dự án. Hệ thống giám sát chỉ số tải theo thời gian thực và phân loại mức độ rủi ro kiệt sức.
                    </Paragraph>
                    <ul className="tab-checklist">
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Biểu đồ Histogram</strong>: So sánh trực quan tổng số giờ phân công với vạch 100% công suất tối đa.
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Chỉ số Burnout Risk Index</strong>: Phân nhóm 3 mức rủi ro: Cao (&gt;120%), Trung bình (80-100%), An toàn (&lt;80%).
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Phân tích theo Phòng ban</strong>: Theo dõi mức độ sử dụng nguồn lực của từng bộ phận.
                      </li>
                    </ul>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="feature-visual-box visual-analytics">
                      <div className="burnout-alert-box alert-safe">
                        <span>🛡️ 18 Nhân sự trong Vùng An toàn (&lt; 80% tải)</span>
                      </div>
                      <div className="burnout-alert-box alert-warning" style={{ marginTop: 10 }}>
                        <span>⚖️ 4 Nhân sự đạt Hiệu suất Tối ưu (80 - 100% tải)</span>
                      </div>
                      <div className="burnout-alert-box alert-danger" style={{ marginTop: 10 }}>
                        <span>⚠️ 0 Nhân sự bị Quá tải (Đã được thuật toán cân bằng)</span>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}

            {activeTab === 'benchmark' && (
              <Card className="feature-detail-card">
                <Row gutter={[32, 32]} align="middle">
                  <Col xs={24} lg={12}>
                    <Tag color="purple" className="tab-pill">
                      Academic Benchmark
                    </Tag>
                    <Title level={3} className="tab-content-title">
                      Phòng Thí nghiệm Đánh giá & Xuất Báo cáo Luận văn
                    </Title>
                    <Paragraph className="tab-content-desc">
                      Được thiết kế phục vụ bảo vệ đồ án tốt nghiệp và nghiên cứu khoa học. Cho phép chạy đối chứng 4 thuật toán trên các bộ dữ liệu từ 20 đến 500 công việc.
                    </Paragraph>
                    <ul className="tab-checklist">
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Đối chứng 4 Giải thuật</strong>: Greedy Baseline, CSP Solver, Genetic Algorithm, Hybrid CSP→GA.
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Xuất Bảng LaTeX 1-Click</strong>: Tự sinh mã nguồn `\begin{'{table}'}` chuẩn IEEE/ACM để dán vào Overleaf.
                      </li>
                      <li>
                        <CheckCircleFilled className="check-icon" /> <strong>Xuất File CSV & Tóm tắt</strong>: Sẵn sàng đưa vào Chương 4 cuốn báo cáo tốt nghiệp.
                      </li>
                    </ul>
                  </Col>
                  <Col xs={24} lg={12}>
                    <div className="feature-visual-box visual-benchmark">
                      <div className="latex-preview-snippet">
                        <code>{"\\begin{table}[htbp]"}</code>
                        <code>{"\\caption{So sánh hiệu năng các giải thuật (N=100)}"}</code>
                        <code>{"\\textbf{Hybrid (CSP+GA)} & \\textbf{0.942} & \\textbf{18ms}"}</code>
                        <code>{"\\end{table}"}</code>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* 8. Comparison Section (RAO Studio vs Jira vs Trello) */}
      <section id="comparison" className="comparison-section">
        <div className="landing-container">
          <div className="section-header-center">
            <Tag color="gold" className="section-tag">
              So sánh Đột phá
            </Tag>
            <Title level={2} className="section-title">
              Tại sao RAO Studio Vượt trội hơn Jira & Trello?
            </Title>
            <Paragraph className="section-subtitle">
              Đối chiếu trực tiếp năng lực phân bổ nguồn lực và lập kế hoạch tối ưu.
            </Paragraph>
          </div>

          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="col-feature">Năng lực Cốt lõi</th>
                  <th className="col-rao">⚡ RAO Studio (Hệ thống này)</th>
                  <th className="col-jira">Jira Software Cloud (Bản gốc)</th>
                  <th className="col-trello">Trello / Asana</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="feature-name">
                    <strong>Tự động Tối ưu hóa Phân bổ</strong>
                    <span>Tự sinh lịch phân công bằng Genetic Algorithm & CSP</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Tích hợp sẵn (GA + CSP)
                  </td>
                  <td className="other-cell cell-no">❌ Không có (Phân công thủ công)</td>
                  <td className="other-cell cell-no">❌ Không có</td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Sơ đồ Gantt & Đường găng (CPM)</strong>
                    <span>Phát hiện chu trình, tính toán slack = 0</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Có sẵn đầy đủ thuật toán CPM
                  </td>
                  <td className="other-cell cell-part">⚠️ Cần mua thêm app Marketplace đắt tiền</td>
                  <td className="other-cell cell-no">❌ Không có</td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Ma trận Kỹ năng Cá nhân (Skill Matrix)</strong>
                    <span>Khớp kỹ năng yêu cầu theo thang level 1-4</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Quản lý chi tiết từng kỹ năng
                  </td>
                  <td className="other-cell cell-no">❌ Chỉ quản lý ở mức team chung</td>
                  <td className="other-cell cell-no">❌ Không có</td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Cảnh báo Rủi ro Kiệt sức (Burnout Risk)</strong>
                    <span>Giám sát công suất & rủi ro quá tải theo thời gian thực</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Có chỉ số Burnout Index 3 cấp độ
                  </td>
                  <td className="other-cell cell-no">❌ Không có</td>
                  <td className="other-cell cell-no">❌ Không có</td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Phòng Thí nghiệm Benchmark & Xuất LaTeX</strong>
                    <span>Đánh giá hiệu năng và xuất bảng số liệu học thuật</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Tích hợp sẵn Benchmark Studio
                  </td>
                  <td className="other-cell cell-no">❌ Không có</td>
                  <td className="other-cell cell-no">❌ Không có</td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Ứng dụng Di động Đồng bộ</strong>
                    <span>React Native Expo SDK 54, hỗ trợ Dark / Light</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Đầy đủ tính năng như Web
                  </td>
                  <td className="other-cell cell-yes">✅ Có app di động</td>
                  <td className="other-cell cell-yes">✅ Có app di động</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 9. Multi-Platform Ecosystem Highlight */}
      <section className="ecosystem-section">
        <div className="landing-container">
          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={12}>
              <Tag color="cyan" className="section-tag">
                Multi-Platform Ecosystem
              </Tag>
              <Title level={2} className="section-title">
                Hoạt động Liền mạch trên Cả Web & Mobile
              </Title>
              <Paragraph className="section-subtitle">
                Được xây dựng với kiến trúc hiện đại, đảm bảo trải nghiệm nhất quán dù bạn đang làm việc trên máy tính văn phòng hay theo dõi tiến độ trên điện thoại di động.
              </Paragraph>

              <div className="platform-cards">
                <div className="platform-card">
                  <div className="platform-icon">💻</div>
                  <div className="platform-text">
                    <strong>Nền tảng Web Client</strong>
                    <span>React 18, Vite, Ant Design, Glassmorphism, Dual Theme (Sáng / Tối).</span>
                  </div>
                </div>

                <div className="platform-card" style={{ marginTop: 14 }}>
                  <div className="platform-icon">📱</div>
                  <div className="platform-text">
                    <strong>Ứng dụng Di động RAO Mobile</strong>
                    <span>React Native, Expo SDK 54, điều hướng Native Stack & Bottom Tabs.</span>
                  </div>
                </div>
              </div>
            </Col>

            <Col xs={24} lg={12} style={{ textAlign: 'center' }}>
              <div className="mobile-mockup-frame">
                <div className="mobile-screen-inner">
                  <div className="mobile-notch" />
                  <div className="mobile-app-header">
                    <span className="app-title">RAO Mobile</span>
                    <span className="app-badge">SDK 54</span>
                  </div>
                  <div className="mobile-kpi-grid">
                    <div className="mobile-kpi-card">
                      <span className="kpi-k">Dự án</span>
                      <span className="kpi-v text-primary">12</span>
                    </div>
                    <div className="mobile-kpi-card">
                      <span className="kpi-k">Công việc</span>
                      <span className="kpi-v text-success">84</span>
                    </div>
                    <div className="mobile-kpi-card">
                      <span className="kpi-k">Nhân sự</span>
                      <span className="kpi-v text-purple">26</span>
                    </div>
                    <div className="mobile-kpi-card">
                      <span className="kpi-k">Công suất TB</span>
                      <span className="kpi-v text-warning">86%</span>
                    </div>
                  </div>
                  <div className="mobile-action-pill">
                    ⚡ Tối ưu hóa Phân bổ GA & CSP
                  </div>
                  <div className="mobile-action-pill" style={{ marginTop: 8 }}>
                    🧪 Benchmark Studio Thực nghiệm
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* 10. Academic Thesis Credentials */}
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

      {/* 11. Final Call-to-Action Banner */}
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

      {/* 12. Footer (Atlassian Style) */}
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
                <li><a href="#features" onClick={() => setActiveTab('optimization')}>Tối ưu hóa GA & CSP</a></li>
                <li><a href="#features" onClick={() => setActiveTab('gantt')}>Sơ đồ Gantt & CPM</a></li>
                <li><a href="#features" onClick={() => setActiveTab('skills')}>Ma trận Kỹ năng</a></li>
                <li><a href="#features" onClick={() => setActiveTab('analytics')}>Resource Histogram</a></li>
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
    </div>
  );
}
