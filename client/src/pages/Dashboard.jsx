import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Row, Col, Card, Button, Typography, Progress, Tag, Space, Spin, Empty, Avatar, Tooltip } from 'antd';
import {
  ProjectOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  FolderOutlined,
  ReloadOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import analyticsService from '../services/analyticsService';
import { taskStatusLabel } from '../i18n/enums';
import { formatShortDateTime, formatTimeAgo } from '../i18n/format';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  TASK_STATUSES,
  TASK_STATUS_BADGE_COLORS as STATUS_COLORS,
  TASK_STATUS_COLORS,
  taskStatusCountKey,
} from '../constants';
import './Dashboard.css';

const { Title, Text, Paragraph } = Typography;

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getDashboard();
      setData(res.data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const proj = data?.projects || {};
  const task = data?.tasks || {};
  const res = data?.resources || {};

  const taskDistribution = TASK_STATUSES.map((status) => ({
    key: status.key,
    label: taskStatusLabel(status.key),
    value: task[taskStatusCountKey(status.key)] || 0,
    color: status.color,
  }));

  const projectCompletionRate = proj.total > 0 ? Math.round(((proj.completed || 0) / proj.total) * 100) : 0;
  const taskCompletionRate = task.total > 0 ? Math.round(((task.done || 0) / task.total) * 100) : 0;
  const avgUtil = Math.round(res.avgUtilization || 0);

  return (
    <Spin spinning={loading} size="large">
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        {/* Page Top Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Title level={3} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {t('dashboard.welcome', { defaultValue: 'Tổng quan Hệ thống' })}
              </Title>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                Real-time Sync
              </span>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('dashboard.subtitle') || 'Theo dõi phân bổ nguồn lực, tiến độ công việc và cảnh báo tải'}
            </Text>
          </div>

          <Space size="small">
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => navigate('/optimization')}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                fontWeight: 600,
              }}
            >
              {t('dashboard.optimizeAllocation') || 'Tối ưu hóa ngay'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={load}>
              {t('common.reload') || 'Làm mới'}
            </Button>
          </Space>
        </div>

        {/* 4 Executive KPI Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Card 1: Projects */}
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

          {/* Card 2: Tasks */}
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

          {/* Card 3: Resources */}
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

          {/* Card 4: Overload Warning */}
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
                    width: (res.overloaded || 0) > 0 ? '100%' : '0%',
                    background: '#ef4444',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                <span>{(res.overloaded || 0) > 0 ? t('dashboard.needsOptimizing') : t('dashboard.allFine')}</span>
                <span style={{ fontWeight: 600, color: (res.overloaded || 0) > 0 ? '#ef4444' : '#10b981' }}>
                  {(res.overloaded || 0) > 0 ? 'Chi tiết →' : 'An toàn'}
                </span>
              </div>
            </div>
          </Col>
        </Row>

        {/* Middle Section: Quick Actions + Recent Activity */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Quick Action Tiles */}
          <Col xs={24} lg={10}>
            <div className="saas-card" style={{ padding: 20, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <Text strong style={{ fontSize: 14 }}>
                  {t('dashboard.quickActions') || 'Lối tắt Nhanh'}
                </Text>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Tile 1 */}
                <div
                  onClick={() => navigate('/optimization')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: isDark ? 'rgba(99, 102, 241, 0.08)' : '#eef2ff',
                    border: isDark ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid #e0e7ff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  className="quick-action-tile"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 18,
                      }}
                    >
                      <ThunderboltOutlined />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 13, display: 'block', color: isDark ? '#f8fafc' : '#1e1b4b' }}>
                        {t('dashboard.optimizeAllocation') || 'Chạy Tối ưu hóa Phân bổ'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Thuật toán GA / CSP tự động cân bằng tải
                      </Text>
                    </div>
                  </div>
                  <ArrowRightOutlined style={{ color: '#818cf8', fontSize: 14 }} />
                </div>

                {/* Tile 2 */}
                <div
                  onClick={() => navigate('/tasks')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: isDark ? 'rgba(6, 182, 212, 0.08)' : '#ecfeff',
                    border: isDark ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid #cffafe',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  className="quick-action-tile"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 18,
                      }}
                    >
                      <UnorderedListOutlined />
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 13, display: 'block', color: isDark ? '#f8fafc' : '#164e63' }}>
                        {t('dashboard.manageTasks') || 'Bảng Kanban Công việc'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Kéo thả và cập nhật tiến độ công việc
                      </Text>
                    </div>
                  </div>
                  <ArrowRightOutlined style={{ color: '#22d3ee', fontSize: 14 }} />
                </div>

                {/* Tile 3 */}
                <div
                  onClick={() => navigate(user?.role === 'member' ? '/projects' : '/resources')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 10,
                    background: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
                    border: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid #dcfce7',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  className="quick-action-tile"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 18,
                      }}
                    >
                      {user?.role === 'member' ? <ProjectOutlined /> : <TeamOutlined />}
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 13, display: 'block', color: isDark ? '#f8fafc' : '#14532d' }}>
                        {user?.role === 'member' ? (t('nav.projects') || 'Dự án của tôi') : (t('dashboard.manageResources') || 'Quản lý Đội ngũ & Kỹ năng')}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {user?.role === 'member' ? 'Xem danh sách dự án tham gia' : 'Ma trận kỹ năng và phân bổ phòng ban'}
                      </Text>
                    </div>
                  </div>
                  <ArrowRightOutlined style={{ color: '#34d399', fontSize: 14 }} />
                </div>
              </div>
            </div>
          </Col>

          {/* Activity Stream */}
          <Col xs={24} lg={14}>
            <div className="saas-card" style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📋</span>
                  <Text strong style={{ fontSize: 14 }}>
                    {t('dashboard.recentActivity') || 'Nhật ký Hoạt động Gần đây'}
                  </Text>
                </div>
                <Button type="link" size="small" onClick={() => navigate('/activity-logs')} style={{ padding: 0, color: '#818cf8' }}>
                  {t('common.viewAll') || 'Xem tất cả →'}
                </Button>
              </div>

              {(data?.recentTasks || []).length === 0 ? (
                <Empty description={t('dashboard.noActivity') || 'Chưa có hoạt động nào'} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: 'auto' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 250 }}>
                  {(data?.recentTasks || []).slice(0, 6).map((item) => (
                    <div
                      key={item._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: TASK_STATUS_COLORS[item.status] || '#6366f1',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <Text strong style={{ fontSize: 13, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.title}
                          </Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            {item.project && (
                              <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
                                📁 {item.project.name}
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>•</span>
                            <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                              👤 {item.assignee?.name || 'Chưa gán'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <Tag color={STATUS_COLORS[item.status]} style={{ margin: 0, borderRadius: 12, fontSize: 11 }}>
                          {taskStatusLabel(item.status)}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {formatTimeAgo(item.updatedAt, t)}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* Bottom Section: Task Distribution + Work Hours Breakdown */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {/* Task Distribution */}
          <Col xs={24} lg={14}>
            <div className="saas-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📊</span>
                  <Text strong style={{ fontSize: 14 }}>
                    {t('dashboard.taskDistribution') || 'Phân bổ Trạng thái Công việc'}
                  </Text>
                </div>
                <Tag color="purple" style={{ borderRadius: 12, fontWeight: 600 }}>
                  {task.total || 0} Tổng công việc
                </Tag>
              </div>

              {task.total > 0 ? (
                <Space orientation="vertical" style={{ width: '100%' }} size="middle">
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

          {/* Work Hours Breakdown */}
          <Col xs={24} lg={10}>
            <div className="saas-card" style={{ padding: 20, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 16 }}>⏱️</span>
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
      </div>
    </Spin>
  );
}
