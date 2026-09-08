/**
 * ============================================================================
 * KHỐI TÍNH NĂNG CỐT LÕI (Landing Core Features Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Trình bày 5 module nghiệp vụ chủ lực dưới dạng Tab trực quan:
 *     1. Thuật toán Tối ưu Tự động (Multi-Objective GA & CSP)
 *     2. Sơ đồ Gantt & Đường găng CPM (Critical Path Method)
 *     3. Ma trận Kỹ năng & Lịch Khả dụng (Skill Matrix & Leaves)
 *     4. Histogram Tải & Cảnh báo Nguy cơ Kiệt sức (Burnout Protection)
 *     5. Phòng Thí nghiệm Benchmark & Xuất Báo cáo Luận văn (Academic Lab)
 */

import { Tag, Typography, Card, Row, Col } from 'antd';
import {
  ThunderboltOutlined,
  BarChartOutlined,
  ApartmentOutlined,
  RiseOutlined,
  ExperimentOutlined,
  CheckCircleFilled,
  SafetyCertificateOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function LandingFeatures({ activeTab, setActiveTab }) {
  return (
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

        {/* Thanh chọn Tab tính năng */}
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

        {/* Nội dung chi tiết từng Tab */}
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
                      <span className="mini-icon"><ThunderboltOutlined style={{ color: '#818cf8', fontSize: 18 }} /></span>
                      <div className="mini-info">
                        <strong>400 Thế hệ Tiến hóa (Generations)</strong>
                        <span>Hội tụ điểm Fitness tối ưu 0.962 trong 18ms</span>
                      </div>
                    </div>
                    <div className="visual-card-mini" style={{ marginTop: 12 }}>
                      <span className="mini-icon"><ApartmentOutlined style={{ color: '#06b6d4', fontSize: 18 }} /></span>
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
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <SafetyCertificateOutlined style={{ color: '#10b981', fontSize: 16 }} />
                        18 Nhân sự trong Vùng An toàn (&lt; 80% tải)
                      </span>
                    </div>
                    <div className="burnout-alert-box alert-warning" style={{ marginTop: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircleOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
                        4 Nhân sự đạt Hiệu suất Tối ưu (80 - 100% tải)
                      </span>
                    </div>
                    <div className="burnout-alert-box alert-danger" style={{ marginTop: 10 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <WarningOutlined style={{ color: '#ef4444', fontSize: 16 }} />
                        0 Nhân sự bị Quá tải (Đã được thuật toán cân bằng)
                      </span>
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
                      <CheckCircleFilled className="check-icon" /> <strong>Xuất Bảng LaTeX 1-Click</strong>: Tự sinh mã nguồn chuẩn IEEE/ACM để dán vào Overleaf.
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
  );
}
