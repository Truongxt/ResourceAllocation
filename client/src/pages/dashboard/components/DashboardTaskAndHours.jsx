/**
 * ============================================================================
 * PHÂN BỔ TRẠNG THÁI CÔNG VIỆC & GIỜ CÔNG (Task & Hours Breakdown Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Bên trái: Tiến độ phân bổ các trạng thái công việc (Todo, In progress, Review, Done) theo %.
 *   - Bên phải: Tổng hợp 4 chỉ số giờ công: Giờ ước tính, Giờ thực tế, Tổng Capacity và Workload hiện tại.
 */

import { Row, Col, Typography, Tag, Space, Progress, Empty } from 'antd';
import { BarChartOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function DashboardTaskAndHours({
  task = {},
  res = {},
  taskDistribution = [],
  isDark = false,
  t,
}) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {/* Cột trái: Phân bổ trạng thái công việc */}
      <Col xs={24} lg={14}>
        <div className="saas-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChartOutlined style={{ fontSize: 16, color: '#818cf8' }} />
              <Text strong style={{ fontSize: 14 }}>
                {t('dashboard.taskDistribution') || 'Phân bổ Trạng thái Công việc'}
              </Text>
            </div>
            <Tag color="purple" style={{ borderRadius: 12, fontWeight: 600 }}>
              {task.total || 0} Tổng công việc
            </Tag>
          </div>

          {task.total > 0 ? (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {taskDistribution.map((s) => {
                const pct = task.total > 0 ? Math.round((s.value / task.total) * 100) : 0;
                return (
                  <div key={s.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#e2e8f0' : '#334155' }}>
                        {s.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }} className="tabular-nums">
                          {s.value}
                        </span>
                        <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>({pct}%)</span>
                      </div>
                    </div>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      strokeColor={s.color}
                      trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}
                      size={['100%', 8]}
                    />
                  </div>
                );
              })}
            </Space>
          ) : (
            <Empty description={t('dashboard.noTasks') || 'Chưa có công việc'} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </Col>

      {/* Cột phải: Tổng hợp Giờ công & Năng suất */}
      <Col xs={24} lg={10}>
        <div className="saas-card" style={{ padding: 20, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ClockCircleOutlined style={{ fontSize: 16, color: '#06b6d4' }} />
            <Text strong style={{ fontSize: 14 }}>
              {t('dashboard.workHours') || 'Tổng hợp Giờ công & Năng suất'}
            </Text>
          </div>

          <Row gutter={[12, 12]}>
            <Col span={12}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: 10,
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('dashboard.estimated') || 'Ước tính'}
                </Text>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#818cf8' }} className="tabular-nums">
                  {task.totalEstimatedHours || 0} <span style={{ fontSize: 13, fontWeight: 500 }}>giờ</span>
                </div>
              </div>
            </Col>

            <Col span={12}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: 10,
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('dashboard.actual') || 'Thực tế'}
                </Text>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#10b981' }} className="tabular-nums">
                  {task.totalActualHours || 0} <span style={{ fontSize: 13, fontWeight: 500 }}>giờ</span>
                </div>
              </div>
            </Col>

            <Col span={12}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: 10,
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('dashboard.totalCapacity') || 'Tổng Capacity'}
                </Text>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                  {Math.round(res.totalCapacity || 0)} <span style={{ fontSize: 13, fontWeight: 500 }}>giờ</span>
                </div>
              </div>
            </Col>

            <Col span={12}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: 10,
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e2e8f0',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                  {t('dashboard.currentWorkload') || 'Workload Hiện tại'}
                </Text>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#06b6d4' }} className="tabular-nums">
                  {Math.round(res.totalWorkload || 0)} <span style={{ fontSize: 13, fontWeight: 500 }}>giờ</span>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </Col>
    </Row>
  );
}
