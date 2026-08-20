import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Row, Col, Card, Statistic, Button, Typography, Progress, Tag, Timeline, Space, Spin, Empty } from 'antd';
import {
  ProjectOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  FolderOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import analyticsService from '../services/analyticsService';
import { taskStatusLabel } from '../i18n/enums';
import { formatShortDateTime } from '../i18n/format';
import {
  TASK_STATUSES,
  TASK_STATUS_BADGE_COLORS as STATUS_COLORS,
  TASK_STATUS_COLORS,
  taskStatusCountKey,
} from '../constants';

const { Title, Text } = Typography;

export default function Dashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getDashboard();
      setData(res.data.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Viết tắt cho ba nhóm thống kê. Không đặt tên `t` cho tasks nữa — `t` giờ là
  // hàm dịch của i18next.
  const proj = data?.projects || {};
  const task = data?.tasks || {};
  const res = data?.resources || {};

  const taskDistribution = TASK_STATUSES.map((status) => ({
    key: status.key,
    label: taskStatusLabel(status.key),
    value: task[taskStatusCountKey(status.key)] || 0,
    color: status.color,
  }));

  return (
    <Spin spinning={loading} size="large">
      <div style={{ maxWidth: 1400 }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>{t('nav.dashboard')}</Title>
            <Text type="secondary">{t('dashboard.subtitle')}</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={load}>{t('common.reload')}</Button>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title={t('dashboard.activeProjects')}
                value={proj.active || 0}
                prefix={<ProjectOutlined style={{ color: '#6366f1' }} />}
                suffix={<Text type="secondary" style={{ fontSize: 13 }}>/ {proj.total || 0}</Text>}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('dashboard.completedCount', { count: proj.completed || 0 })}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title={t('dashboard.runningTasks')}
                value={(task.inProgress || 0) + (task.review || 0)}
                prefix={<UnorderedListOutlined style={{ color: '#14b8a6' }} />}
                suffix={<Text type="secondary" style={{ fontSize: 13 }}>/ {task.total || 0}</Text>}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('dashboard.completedCount', { count: task.done || 0 })}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title={t('dashboard.activeResources')}
                value={res.total || 0}
                prefix={<TeamOutlined style={{ color: '#10b981' }} />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('dashboard.avgUtilization', { value: res.avgUtilization || 0 })}
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title={t('dashboard.overloadedResources')}
                value={res.overloaded || 0}
                prefix={<WarningOutlined style={{ color: (res.overloaded || 0) > 0 ? '#ef4444' : '#10b981' }} />}
                valueStyle={{ color: (res.overloaded || 0) > 0 ? '#ef4444' : '#10b981' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {(res.overloaded || 0) > 0 ? t('dashboard.needsOptimizing') : t('dashboard.allFine')}
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions + Recent Tasks */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={10}>
            <Card title={`⚡ ${t('dashboard.quickActions')}`} style={{ height: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button type="primary" icon={<FolderOutlined />} block size="large"
                  onClick={() => navigate('/projects')} style={{ textAlign: 'left' }}
                >
                  {t('dashboard.manageProjects')}
                </Button>
                <Button icon={<ThunderboltOutlined />} block size="large"
                  onClick={() => navigate('/optimization')}
                  style={{ textAlign: 'left', borderColor: '#14b8a6', color: '#14b8a6' }}
                >
                  {t('dashboard.optimizeAllocation')}
                </Button>
                <Button icon={<TeamOutlined />} block size="large"
                  onClick={() => navigate('/resources')} style={{ textAlign: 'left' }}
                >
                  {t('dashboard.manageResources')}
                </Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card title={`📋 ${t('dashboard.recentActivity')}`} style={{ height: '100%' }}>
              {(data?.recentTasks || []).length === 0 ? (
                <Empty description={t('dashboard.noActivity')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Timeline
                  items={(data?.recentTasks || []).slice(0, 8).map((item) => ({
                    color: TASK_STATUS_COLORS[item.status] || '#6366f1',
                    children: (
                      <div>
                        <Text strong>{item.title}</Text>
                        <span> — </span>
                        <Tag color={STATUS_COLORS[item.status]}>{taskStatusLabel(item.status)}</Tag>
                        {item.project && <Text type="secondary" style={{ fontSize: 12 }}> ({item.project.code || item.project.name})</Text>}
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.assignee?.name || ''} • {formatShortDateTime(item.updatedAt)}
                        </Text>
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* Task Distribution + Hours */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={14}>
            <Card title={`📊 ${t('dashboard.taskDistribution')}`}>
              {task.total > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {taskDistribution.map((s) => (
                    <div key={s.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ fontSize: 13 }}>{s.label}</Text>
                        <Text strong>{s.value}</Text>
                      </div>
                      <Progress
                        percent={Math.round((s.value / task.total) * 100)}
                        showInfo={false}
                        strokeColor={s.color}
                        trailColor="rgba(148,163,184,0.1)"
                        size="small"
                      />
                    </div>
                  ))}
                </Space>
              ) : (
                <Empty description={t('dashboard.noTasks')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title={`⏱️ ${t('dashboard.workHours')}`}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title={t('dashboard.estimated')} value={task.totalEstimatedHours || 0} suffix="h" valueStyle={{ fontSize: 22 }} />
                </Col>
                <Col span={12}>
                  <Statistic title={t('dashboard.actual')} value={task.totalActualHours || 0} suffix="h" valueStyle={{ fontSize: 22 }} />
                </Col>
                <Col span={12}>
                  <Statistic title={t('dashboard.totalCapacity')} value={Math.round(res.totalCapacity || 0)} suffix="h" valueStyle={{ fontSize: 22 }} />
                </Col>
                <Col span={12}>
                  <Statistic title={t('dashboard.currentWorkload')} value={Math.round(res.totalWorkload || 0)} suffix="h" valueStyle={{ fontSize: 22 }} />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Recent Optimizations */}
        {data?.recentOptimizations && data.recentOptimizations.length > 0 && (
          <Card
            title={`🧬 ${t('dashboard.recentOptimizations')}`}
            extra={<Button type="link" onClick={() => navigate('/optimization')}>{t('common.viewAll')}</Button>}
          >
            <Row gutter={[12, 12]}>
              {data.recentOptimizations.map((opt) => (
                <Col xs={24} sm={12} lg={8} key={opt._id}>
                  <Card
                    size="small"
                    hoverable
                    onClick={() => navigate('/optimization')}
                    style={{ cursor: 'pointer' }}
                  >
                    <Space>
                      <Text>{opt.algorithm === 'genetic' ? '🧬' : opt.algorithm === 'csp' ? '🔗' : '⚡'}</Text>
                      <Text strong>{opt.algorithm.toUpperCase()}</Text>
                      <Text type="secondary">{t('optimization.fitness')}: {opt.fitness}</Text>
                      <Text type="secondary">{t('dashboard.taskResourceCount', { tasks: opt.taskCount, resources: opt.resourceCount })}</Text>
                      {opt.isApplied && <Tag color="success">{t('optimization.applied')}</Tag>}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}
      </div>
    </Spin>
  );
}
