/**
 * ============================================================================
 * KHỐI SO SÁNH NĂNG LỰC & HỆ SINH THÁI (Landing Comparison Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Bảng so sánh năng lực đối đầu trực tiếp giữa RAO Studio vs Jira Cloud vs Trello.
 *   - Giới thiệu hệ sinh thái đa nền tảng (Web Client React 18 + Mobile React Native Expo SDK 54).
 */

import { Tag, Typography, Row, Col, Space } from 'antd';
import {
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  LaptopOutlined,
  MobileOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function LandingComparison() {
  return (
    <>
      {/* 1. Bảng So sánh Năng lực RAO Studio vs Jira vs Trello */}
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

          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="col-feature">Năng lực Cốt lõi</th>
                  <th className="col-rao">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ThunderboltOutlined style={{ color: '#818cf8' }} />
                      RAO Studio (Hệ thống này)
                    </span>
                  </th>
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
                  <td className="other-cell cell-no">
                    <CloseCircleOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    Không có (Phân công thủ công)
                  </td>
                  <td className="other-cell cell-no">
                    <CloseCircleOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    Không có
                  </td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Sơ đồ Gantt & Đường găng (CPM)</strong>
                    <span>Phát hiện chu trình, tính toán slack = 0</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Có sẵn đầy đủ thuật toán CPM
                  </td>
                  <td className="other-cell cell-part">
                    <WarningOutlined style={{ color: '#f59e0b', marginRight: 6 }} />
                    Cần mua thêm app Marketplace đắt tiền
                  </td>
                  <td className="other-cell cell-no">
                    <CloseCircleOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    Không có
                  </td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Ma trận Kỹ năng Cá nhân (Skill Matrix)</strong>
                    <span>Khớp kỹ năng yêu cầu theo thang level 1-4</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Quản lý chi tiết từng kỹ năng
                  </td>
                  <td className="other-cell cell-no">
                    <CloseCircleOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    Chỉ quản lý ở mức team chung
                  </td>
                  <td className="other-cell cell-no">
                    <CloseCircleOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    Không có
                  </td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Cảnh báo Rủi ro Kiệt sức (Burnout Risk)</strong>
                    <span>Giám sát công suất & rủi ro quá tải theo thời gian thực</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Có chỉ số Burnout Index 3 cấp độ
                  </td>
                  <td className="other-cell cell-no">
                    <CloseCircleOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    Không có
                  </td>
                  <td className="other-cell cell-no">
                    <CloseCircleOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    Không có
                  </td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Phòng Thí nghiệm Benchmark & Xuất LaTeX</strong>
                    <span>Đánh giá hiệu năng và xuất bảng số liệu học thuật</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Tích hợp sẵn Benchmark Studio
                  </td>
                  <td className="other-cell cell-no">
                    <CloseCircleOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    Không có
                  </td>
                  <td className="other-cell cell-no">
                    <CloseCircleOutlined style={{ color: '#ef4444', marginRight: 6 }} />
                    Không có
                  </td>
                </tr>

                <tr>
                  <td className="feature-name">
                    <strong>Ứng dụng Di động Đồng bộ</strong>
                    <span>React Native Expo SDK 54, hỗ trợ Dark / Light</span>
                  </td>
                  <td className="rao-cell cell-yes">
                    <CheckCircleFilled className="cell-icon text-success" /> Đầy đủ tính năng như Web
                  </td>
                  <td className="other-cell cell-yes">
                    <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
                    Có app di động
                  </td>
                  <td className="other-cell cell-yes">
                    <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
                    Có app di động
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 2. Hệ sinh thái Đa Nền tảng (Web + Mobile) */}
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
                  <div className="platform-icon">
                    <LaptopOutlined style={{ fontSize: 24, color: '#6366f1' }} />
                  </div>
                  <div className="platform-text">
                    <strong>Nền tảng Web Client</strong>
                    <span>React 18, Vite, Ant Design, Glassmorphism, Dual Theme (Sáng / Tối).</span>
                  </div>
                </div>

                <div className="platform-card" style={{ marginTop: 14 }}>
                  <div className="platform-icon">
                    <MobileOutlined style={{ fontSize: 24, color: '#06b6d4' }} />
                  </div>
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
                  <div className="mobile-action-pill" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <ThunderboltOutlined style={{ color: '#818cf8' }} />
                    <span>Tối ưu hóa Phân bổ GA & CSP</span>
                  </div>
                  <div className="mobile-action-pill" style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <ExperimentOutlined style={{ color: '#06b6d4' }} />
                    <span>Benchmark Studio Thực nghiệm</span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>
    </>
  );
}
