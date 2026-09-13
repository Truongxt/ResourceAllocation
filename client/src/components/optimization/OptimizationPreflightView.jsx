/**
 * ============================================================================
 * PRE-FLIGHT READINESS & WORKFLOW GUIDE (Optimization Preflight View)
 * ============================================================================
 *
 * Hiển thị bảng điều khiển kiểm tra mức độ sẵn sàng của dữ liệu (công việc, nhân sự,
 * giờ công) cùng hướng dẫn quy trình 4 bước và giới thiệu thuật toán thay cho
 * hộp trống đơn điệu khi chưa có kết quả tối ưu hóa.
 */

import React from 'react';
import { Row, Col, Typography, Button, Space, Tag, Alert, Progress } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  ScheduleOutlined,
  ClockCircleOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';

const { Title, Text, Paragraph } = Typography;

export default function OptimizationPreflightView({
  readiness = null,
  loading = false,
  onRun,
  running = false,
  algorithm = 'genetic',
  projectName = '',
  t,
}) {
  const { isDark } = useTheme();

  const totalTasks = readiness?.totalTasks ?? 0;
  const unassignedTasks = readiness?.unassignedTasks ?? 0;
  const totalResources = readiness?.totalResources ?? 0;
  const totalEstHours = readiness?.totalEstimatedHours ?? 0;
  const totalCapHours = readiness?.totalCapacityHours ?? 0;
  const skillsCount = readiness?.skillsCount ?? 0;
  const isReady = readiness?.ready ?? (totalTasks > 0 && totalResources > 0);
  const issues = readiness?.issues || [];

  const capacityRatio = totalCapHours > 0 ? Math.min(100, Math.round((totalEstHours / totalCapHours) * 100)) : 0;

  const algoLabels = {
    genetic: { name: 'Genetic Algorithm (GA)', desc: 'Tiến hóa sinh học đa mục tiêu, tìm điểm cân bằng Pareto tối ưu' },
    csp: { name: 'Constraint Satisfaction Problem (CSP)', desc: 'Thỏa mãn ràng buộc cứng: kỹ năng, định mức tải và deadline' },
    hybrid: { name: 'Hybrid (CSP Solver + GA)', desc: 'CSP lọc không gian nghiệm sạch, GA tối ưu hóa sâu đa mục tiêu' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header Banner & Trạng thái Sẵn sàng */}
      <div
        className="saas-card"
        style={{
          padding: '24px 26px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          borderRadius: 14,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
                Tổng quan Dữ liệu & Mức độ Sẵn sàng
              </Title>
              {isReady ? (
                <Tag
                  color="success"
                  style={{
                    borderRadius: 12,
                    padding: '2px 10px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCircleOutlined /> Sẵn sàng chạy
                </Tag>
              ) : (
                <Tag color="warning" style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 700 }}>
                  Cần bổ sung dữ liệu
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Phạm vi tối ưu:{' '}
              <Text strong style={{ color: '#818cf8' }}>
                {projectName || 'Toàn bộ dự án công ty'}
              </Text>{' '}
              • Thuật toán đang chọn:{' '}
              <Tag color="purple" style={{ borderRadius: 6, margin: 0, fontWeight: 600 }}>
                {algoLabels[algorithm]?.name || algorithm}
              </Tag>
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={onRun}
            loading={running}
            disabled={!isReady}
            style={{
              background: isReady ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : undefined,
              boxShadow: isReady ? '0 4px 14px rgba(99, 102, 241, 0.4)' : undefined,
              height: 44,
              padding: '0 24px',
              fontWeight: 700,
              borderRadius: 10,
            }}
          >
            {running ? 'Đang chạy giải thuật...' : 'Chạy Tối ưu hóa ngay'}
          </Button>
        </div>

        {issues.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 16, borderRadius: 8 }}
            message="Lưu ý trước khi thực hiện:"
            description={
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {issues.map((iss, idx) => (
                  <li key={idx}>{iss}</li>
                ))}
              </ul>
            }
          />
        )}
      </div>

      {/* 2. Bộ 4 thẻ Thống kê Đầu vào Trực quan */}
      <Row gutter={[16, 16]}>
        {/* Thẻ 1: Công việc cần xử lý */}
        <Col xs={12} sm={6}>
          <div
            className="saas-card"
            style={{
              padding: '18px 18px',
              background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
              borderRadius: 12,
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Công việc
                </Text>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScheduleOutlined />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#818cf8', lineHeight: 1 }} className="tabular-nums">
                {totalTasks}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                <span style={{ color: unassignedTasks > 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{unassignedTasks}</span> việc chưa gán
              </Text>
            </div>
          </div>
        </Col>

        {/* Thẻ 2: Nhân sự khả dụng */}
        <Col xs={12} sm={6}>
          <div
            className="saas-card"
            style={{
              padding: '18px 18px',
              background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
              borderRadius: 12,
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Nhân sự khả dụng
                </Text>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TeamOutlined />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#06b6d4', lineHeight: 1 }} className="tabular-nums">
                {totalResources}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Sẵn sàng nhận phân bổ
              </Text>
            </div>
          </div>
        </Col>

        {/* Thẻ 3: Tải giờ công / Năng lực */}
        <Col xs={12} sm={6}>
          <div
            className="saas-card"
            style={{
              padding: '18px 18px',
              background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
              borderRadius: 12,
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Giờ công / Định mức
                </Text>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClockCircleOutlined />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981', lineHeight: 1 }} className="tabular-nums">
                {totalEstHours}h <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>/ {totalCapHours}h</span>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <Progress percent={capacityRatio} size="small" strokeColor="#10b981" showInfo={false} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <Text type="secondary" style={{ fontSize: 10 }}>Tỷ lệ tải dự kiến</Text>
                <Text strong style={{ fontSize: 10, color: capacityRatio > 90 ? '#ef4444' : '#10b981' }}>{capacityRatio}%</Text>
              </div>
            </div>
          </div>
        </Col>

        {/* Thẻ 4: Kỹ năng chuyên môn */}
        <Col xs={12} sm={6}>
          <div
            className="saas-card"
            style={{
              padding: '18px 18px',
              background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
              borderRadius: 12,
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Kỹ năng yêu cầu
                </Text>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AimOutlined />
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }} className="tabular-nums">
                {skillsCount}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Ma trận kỹ năng đối sánh
              </Text>
            </div>
          </div>
        </Col>
      </Row>

      {/* 3. Quy trình 4 Bước Tối ưu hóa Thông minh */}
      <div
        className="saas-card"
        style={{
          padding: 22,
          background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
          borderRadius: 14,
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Title level={5} style={{ margin: '0 0 4px 0', fontWeight: 700 }}>
            Quy trình Tối ưu hóa Nguồn lực 4 Bước
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Hệ thống tự động thực thi chu trình khép kín đảm bảo tính khả thi và cân bằng tối ưu
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          {/* Bước 1 */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                padding: '16px 14px',
                borderRadius: 10,
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}`,
                height: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#6366f1',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  1
                </span>
                <Text strong style={{ fontSize: 13 }}>Quét dữ liệu</Text>
              </div>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                Đọc ma trận kỹ năng, giờ công ước tính, hạn chót và định mức tải của từng thành viên.
              </Paragraph>
            </div>
          </Col>

          {/* Bước 2 */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                padding: '16px 14px',
                borderRadius: 10,
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}`,
                height: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#06b6d4',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  2
                </span>
                <Text strong style={{ fontSize: 13 }}>Tính toán AI</Text>
              </div>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                Thuật toán GA / CSP mô phỏng qua hàng trăm thế hệ để tìm phương án phân công tối ưu.
              </Paragraph>
            </div>
          </Col>

          {/* Bước 3 */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                padding: '16px 14px',
                borderRadius: 10,
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}`,
                height: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  3
                </span>
                <Text strong style={{ fontSize: 13 }}>Đánh giá KPI</Text>
              </div>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                Đo lường điểm thích nghi (Fitness), độ lệch tải, độ khớp kỹ năng và biểu đồ tiến hóa.
              </Paragraph>
            </div>
          </Col>

          {/* Bước 4 */}
          <Col xs={24} sm={12} lg={6}>
            <div
              style={{
                padding: '16px 14px',
                borderRadius: 10,
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}`,
                height: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#f59e0b',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  4
                </span>
                <Text strong style={{ fontSize: 13 }}>Áp dụng an toàn</Text>
              </div>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                Xem trước chi tiết từng công việc; Áp dụng 1-chạm hoặc Hoàn tác (Rollback) bất kỳ lúc nào.
              </Paragraph>
            </div>
          </Col>
        </Row>
      </div>

      {/* 4. Thẻ Giới thiệu Bộ ba Thuật toán */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: isDark ? 'rgba(99, 102, 241, 0.06)' : '#eef2ff',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>🧬</span>
              <Text strong style={{ fontSize: 13, color: '#6366f1' }}>Genetic Algorithm (GA)</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.5 }}>
              Giải thuật tiến hóa tự nhiên với đột biến và lai ghép. Phù hợp giải phóng các điểm nghẽn và tìm điểm cân bằng Pareto tốt nhất giữa chi phí, kỹ năng và tải.
            </Text>
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: isDark ? 'rgba(6, 182, 212, 0.06)' : '#ecfeff',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>🧩</span>
              <Text strong style={{ fontSize: 13, color: '#06b6d4' }}>CSP Solver</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.5 }}>
              Bài toán Thỏa mãn Ràng buộc cứng. Đảm bảo 100% không phân công sai kỹ năng bắt buộc, không trùng lịch và không vượt quá số giờ tối đa cho phép.
            </Text>
          </div>
        </Col>

        <Col xs={24} md={8}>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: isDark ? 'rgba(16, 185, 129, 0.06)' : '#ecfdf5',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <Text strong style={{ fontSize: 13, color: '#10b981' }}>Hybrid (CSP + GA)</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', lineHeight: 1.5 }}>
              Sức mạnh kết hợp: CSP thu hẹp không gian tìm kiếm loại bỏ nghiệm xấu, sau đó GA tối ưu hóa sâu để đạt giải pháp phân bổ hoàn hảo nhất.
            </Text>
          </div>
        </Col>
      </Row>
    </div>
  );
}
