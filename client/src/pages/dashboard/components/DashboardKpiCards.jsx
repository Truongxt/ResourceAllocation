/**
 * ============================================================================
 * KHỐI 4 THẺ KPI TỔNG QUAN (Dashboard KPI Cards Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Hiển thị 4 chỉ số điều hành cốt lõi của hệ thống:
 *     1. Dự án đang hoạt động / Tổng số dự án
 *     2. Công việc đang chạy / Tổng số công việc
 *     3. Nhân sự sẵn sàng & Tỷ lệ sử dụng trung bình (Utilization %)
 *     4. Cảnh báo số lượng nhân sự bị quá tải (Overload Warning)
 */

import { Row, Col, Typography, Progress } from 'antd';
import {
  ProjectOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  WarningOutlined,
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
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {/* Thẻ 1: Dự án */}
      <Col xs={24} sm={12} lg={6}>
        <div
          className="saas-card saas-card-interactive"
          style={{ padding: '20px', cursor: 'pointer' }}
          onClick={() => navigate('/projects')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('dashboard.activeProjects') || 'Dự án Hoạt động'}
              </Text>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                  {proj.active || 0}
                </span>
                <span style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }} className="tabular-nums">
                  / {proj.total || 0}
                </span>
              </div>
            </div>
            <div className="icon-chip icon-chip-primary">
              <ProjectOutlined />
            </div>
          </div>
          <Progress
            percent={projectCompletionRate}
            strokeColor="#6366f1"
            trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}
            size="small"
            showInfo={false}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
            <span>{t('dashboard.completedCount', { count: proj.completed || 0 }) || `${proj.completed || 0} đã hoàn thành`}</span>
            <span style={{ fontWeight: 600, color: '#818cf8' }}>{projectCompletionRate}%</span>
          </div>
        </div>
      </Col>

      {/* Thẻ 2: Công việc */}
      <Col xs={24} sm={12} lg={6}>
        <div
          className="saas-card saas-card-interactive"
          style={{ padding: '20px', cursor: 'pointer' }}
          onClick={() => navigate('/tasks')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('dashboard.runningTasks') || 'Công việc Đang chạy'}
              </Text>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                  {(task.inProgress || 0) + (task.review || 0)}
                </span>
                <span style={{ fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }} className="tabular-nums">
                  / {task.total || 0}
                </span>
              </div>
            </div>
            <div className="icon-chip icon-chip-info">
              <UnorderedListOutlined />
            </div>
          </div>
          <Progress
            percent={taskCompletionRate}
            strokeColor="#06b6d4"
            trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}
            size="small"
            showInfo={false}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
            <span>{t('dashboard.completedCount', { count: task.done || 0 }) || `${task.done || 0} hoàn thành`}</span>
            <span style={{ fontWeight: 600, color: '#22d3ee' }}>{taskCompletionRate}%</span>
          </div>
        </div>
      </Col>

      {/* Thẻ 3: Nhân sự */}
      <Col xs={24} sm={12} lg={6}>
        <div
          className="saas-card saas-card-interactive"
          style={{ padding: '20px', cursor: user?.role !== 'member' ? 'pointer' : 'default' }}
          onClick={() => user?.role !== 'member' && navigate('/resources')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('dashboard.activeResources') || 'Nhân sự Sẵn sàng'}
              </Text>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                  {res.total || 0}
                </span>
                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: 4 }}>
                  100% Hoạt động
                </span>
              </div>
            </div>
            <div className="icon-chip icon-chip-success">
              <TeamOutlined />
            </div>
          </div>
          <Progress
            percent={avgUtil}
            strokeColor={avgUtil > 100 ? '#ef4444' : avgUtil > 80 ? '#f59e0b' : '#10b981'}
            trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}
            size="small"
            showInfo={false}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
            <span>{t('dashboard.avgUtilization', { value: avgUtil }) || `Utilization TB: ${avgUtil}%`}</span>
            <span style={{ fontWeight: 600, color: '#10b981' }}>{avgUtil}%</span>
          </div>
        </div>
      </Col>

      {/* Thẻ 4: Cảnh báo quá tải */}
      <Col xs={24} sm={12} lg={6}>
        <div
          className="saas-card saas-card-interactive"
          style={{
            padding: '20px',
            cursor: 'pointer',
            borderColor: (res.overloaded || 0) > 0 ? 'rgba(239, 68, 68, 0.4)' : undefined,
          }}
          onClick={() => navigate('/reports')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('dashboard.overloadedResources') || 'Cảnh báo Quá tải'}
              </Text>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: (res.overloaded || 0) > 0 ? '#ef4444' : '#10b981',
                  }}
                  className="tabular-nums"
                >
                  {res.overloaded || 0}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: (res.overloaded || 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                    color: (res.overloaded || 0) > 0 ? '#f87171' : '#34d399',
                  }}
                >
                  {(res.overloaded || 0) > 0 ? 'Cần tối ưu' : 'Ổn định'}
                </span>
              </div>
            </div>
            <div className={`icon-chip ${(res.overloaded || 0) > 0 ? 'icon-chip-danger' : 'icon-chip-success'}`}>
              <WarningOutlined />
            </div>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(((res.overloaded || 0) / Math.max(res.total || 1, 1)) * 100, 100)}%`,
                background: '#ef4444',
                borderRadius: 3,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
            <span>{t('dashboard.burnoutRisk') || 'Nguy cơ kiệt sức'}</span>
            <span style={{ fontWeight: 600, color: (res.overloaded || 0) > 0 ? '#ef4444' : '#10b981' }}>
              {(res.overloaded || 0) > 0 ? 'Phát hiện' : 'An toàn'}
            </span>
          </div>
        </div>
      </Col>
    </Row>
  );
}
