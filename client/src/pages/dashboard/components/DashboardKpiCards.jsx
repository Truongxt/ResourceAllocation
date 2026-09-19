/**
 * ============================================================================
 * EXECUTIVE COMMAND RIBBON (Asymmetric High-Signal Dashboard Metrics)
 * ============================================================================
 * Replaces symmetrical generic AI Bento boxes with an intentional, high-signal
 * executive layout: 1 Core Health Index + 3 Focused Operational Telemetry Cards.
 */

import { Row, Col, Typography, Progress, Button } from 'antd';
import {
  ProjectOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export default function DashboardKpiCards({
  proj = {},
  task = {},
  res = {},
  projectCompletionRate = 0,
  taskCompletionRate = 0,
  avgUtil = 0,
  isDark = false,
  user,
  navigate,
  t,
}) {
  const overallHealthRate = Math.round((projectCompletionRate + taskCompletionRate) / 2);
  const isOverloaded = (res.overloaded || 0) > 0;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {/* 1. HERO METRIC: System Health & Execution Velocity (8 cols) */}
      <Col xs={24} lg={9}>
        <div
          className="saas-card"
          style={{
            padding: '20px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('dashboard.healthIndex', 'Chỉ số Thực thi & Sức khỏe')}
              </Text>
              {isOverloaded ? (
                <span className="pill-badge status-pill-danger" style={{ fontSize: 11 }}>
                  <WarningOutlined style={{ fontSize: 10 }} /> {res.overloaded} quá tải
                </span>
              ) : (
                <span className="pill-badge status-pill-success" style={{ fontSize: 11 }}>
                  <CheckCircleOutlined style={{ fontSize: 10 }} /> Ổn định
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '8px 0' }}>
              <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)' }} className="tabular-nums">
                {overallHealthRate}%
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                Tỷ lệ hoàn thành tổng thể
              </span>
            </div>

            <Progress
              percent={overallHealthRate}
              strokeColor="var(--brand-primary, #2563eb)"
              trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}
              size={['100%', 6]}
              showInfo={false}
              style={{ marginBottom: 12 }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 10,
              borderTop: '1px solid var(--border-subtle)',
              fontSize: 12,
              color: 'var(--text-tertiary)',
            }}
          >
            <span>
              <strong>{proj.completed || 0}</strong> dự án • <strong>{task.done || 0}</strong> việc xong
            </span>
            <Button
              type="link"
              size="small"
              onClick={() => navigate('/reports')}
              style={{ padding: 0, fontSize: 12, color: 'var(--brand-primary)' }}
            >
              Xem báo cáo <ArrowRightOutlined style={{ fontSize: 10 }} />
            </Button>
          </div>
        </div>
      </Col>

      {/* 2. OPERATIONAL TELEMETRY: 3 Focused Cards (15 cols) */}
      <Col xs={24} lg={15}>
        <Row gutter={[12, 12]}>
          {/* Card 1: Active Projects */}
          <Col xs={24} sm={8}>
            <div
              className="saas-card saas-card-interactive"
              style={{ padding: '16px 18px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              onClick={() => navigate('/projects')}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {t('dashboard.activeProjects', 'Dự án Hoạt động')}
                  </Text>
                  <ProjectOutlined style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0 10px' }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }} className="tabular-nums">
                    {proj.active || 0}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }} className="tabular-nums">
                    / {proj.total || 0} tổng
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Hoàn thành: <strong style={{ color: 'var(--brand-primary)' }}>{projectCompletionRate}%</strong>
              </div>
            </div>
          </Col>

          {/* Card 2: Running Tasks */}
          <Col xs={24} sm={8}>
            <div
              className="saas-card saas-card-interactive"
              style={{ padding: '16px 18px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              onClick={() => navigate('/tasks')}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {t('dashboard.runningTasks', 'Công việc Đang chạy')}
                  </Text>
                  <UnorderedListOutlined style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0 10px' }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }} className="tabular-nums">
                    {(task.inProgress || 0) + (task.review || 0)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }} className="tabular-nums">
                    / {task.total || 0} tổng
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Đạt tiến độ: <strong style={{ color: 'var(--status-success)' }}>{taskCompletionRate}%</strong>
              </div>
            </div>
          </Col>

          {/* Card 3: Team Utilization */}
          <Col xs={24} sm={8}>
            <div
              className="saas-card saas-card-interactive"
              style={{ padding: '16px 18px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              onClick={() => user?.role !== 'member' && navigate('/resources')}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {t('dashboard.activeResources', 'Tải Nhân sự')}
                  </Text>
                  <TeamOutlined style={{ color: 'var(--text-tertiary)', fontSize: 14 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '4px 0 10px' }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: avgUtil > 100 ? 'var(--status-danger)' : avgUtil > 80 ? 'var(--status-warning)' : 'var(--status-success)' }} className="tabular-nums">
                    {avgUtil}%
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }} className="tabular-nums">
                    / {res.total || 0} người
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Tình trạng: <strong style={{ color: avgUtil > 85 ? 'var(--status-warning)' : 'var(--status-success)' }}>{avgUtil > 85 ? 'Tải cao' : 'Lý tưởng'}</strong>
              </div>
            </div>
          </Col>
        </Row>
      </Col>
    </Row>
  );
}
