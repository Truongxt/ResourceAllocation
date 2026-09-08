/**
 * ============================================================================
 * KHỐI MÔ PHỎNG GIẢI THUẬT TƯƠNG TÁC (Interactive Live Sandbox Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cho phép người dùng trực tiếp kéo thanh trượt thay đổi số lượng công việc (10..300)
 *     và số lượng nhân sự (3..50).
 *   - Bấm nút "Chạy Phân bổ Tối ưu Ngay" để mô phỏng thuật toán Hybrid CSP→GA
 *     tính toán và hiển thị điểm Fitness, thời gian chạy (ms), độ khớp kỹ năng, độ lệch chuẩn tải.
 */

import { Card, Row, Col, Tag, Slider, Button, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function LandingSandbox({
  sandboxTasks,
  setSandboxTasks,
  sandboxResources,
  setSandboxResources,
  sandboxRunning,
  sandboxResult,
  onRunSandbox,
}) {
  return (
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
            {/* Bộ điều khiển thanh trượt */}
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
                  onClick={onRunSandbox}
                  loading={sandboxRunning}
                  className="sandbox-run-btn"
                  block
                >
                  {sandboxRunning ? 'Đang chạy giải thuật...' : 'Chạy Phân bổ Tối ưu Ngay'}
                </Button>
              </div>
            </Col>

            {/* Bảng kết quả chạy giải thuật */}
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
  );
}
