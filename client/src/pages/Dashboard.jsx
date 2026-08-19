import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Button, Typography, Progress, Tag, Timeline, Space, Spin, Empty } from 'antd';
import {
  ProjectOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  FolderOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import analyticsService from '../services/analyticsService';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS as STATUS_LABELS,
  TASK_STATUS_BADGE_COLORS as STATUS_COLORS,
  TASK_STATUS_COLORS,
  taskStatusCountKey,
} from '../constants';

const { Title, Text } = Typography;

export default function Dashboard() {
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

  const p = data?.projects || {};
  const t = data?.tasks || {};
  const r = data?.resources || {};

  const taskDistribution = TASK_STATUSES.map((status) => ({
    key: status.key,
    label: status.label,
    value: t[taskStatusCountKey(status.key)] || 0,
    color: status.color,
  }));

  return (
    <Spin spinning={loading} size="large">
      <div style={{ maxWidth: 1400 }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>Dashboard</Title>
            <Text type="secondary">Tổng quan hệ thống quản lý nguồn lực và phân bổ nhân sự</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
        </div>

        {/* Stats Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Dự án hoạt động"
                value={p.active || 0}
                prefix={<ProjectOutlined style={{ color: '#6366f1' }} />}
                suffix={<Text type="secondary" style={{ fontSize: 13 }}>/ {p.total || 0}</Text>}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>{p.completed || 0} hoàn thành</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Công việc đang chạy"
                value={(t.inProgress || 0) + (t.review || 0)}
                prefix={<UnorderedListOutlined style={{ color: '#14b8a6' }} />}
                suffix={<Text type="secondary" style={{ fontSize: 13 }}>/ {t.total || 0}</Text>}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>{t.done || 0} hoàn thành</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Nhân sự hoạt động"
                value={r.total || 0}
                prefix={<TeamOutlined style={{ color: '#10b981' }} />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>{r.avgUtilization || 0}% utilization trung bình</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable>
              <Statistic
                title="Nhân sự quá tải"
                value={r.overloaded || 0}
                prefix={<WarningOutlined style={{ color: (r.overloaded || 0) > 0 ? '#ef4444' : '#10b981' }} />}
                valueStyle={{ color: (r.overloaded || 0) > 0 ? '#ef4444' : '#10b981' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {(r.overloaded || 0) > 0 ? 'Cần tối ưu hóa' : 'Tất cả đều ổn'}
              </Text>
            </Card>
          </Col>
        </Row>

        {/* Quick Actions + Recent Tasks */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={10}>
            <Card title="⚡ Hành động nhanh" style={{ height: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button type="primary" icon={<FolderOutlined />} block size="large"
                  onClick={() => navigate('/projects')} style={{ textAlign: 'left' }}
                >
                  Quản lý dự án
                </Button>
                <Button icon={<ThunderboltOutlined />} block size="large"
                  onClick={() => navigate('/optimization')}
                  style={{ textAlign: 'left', borderColor: '#14b8a6', color: '#14b8a6' }}
                >
                  Tối ưu hóa phân bổ
                </Button>
                <Button icon={<TeamOutlined />} block size="large"
                  onClick={() => navigate('/resources')} style={{ textAlign: 'left' }}
                >
                  Quản lý nhân sự
                </Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card title="📋 Hoạt động gần đây" style={{ height: '100%' }}>
              {(data?.recentTasks || []).length === 0 ? (
                <Empty description="Chưa có hoạt động" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Timeline
                  items={(data?.recentTasks || []).slice(0, 8).map((task) => ({
                    color: TASK_STATUS_COLORS[task.status] || '#6366f1',
                    children: (
                      <div>
                        <Text strong>{task.title}</Text>
                        <span> — </span>
                        <Tag color={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status] || task.status}</Tag>
                        {task.project && <Text type="secondary" style={{ fontSize: 12 }}> ({task.project.code || task.project.name})</Text>}
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {task.assignee?.name || ''} • {new Date(task.updatedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
            <Card title="📊 Phân bổ công việc">
              {t.total > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {taskDistribution.map((s) => (
                    <div key={s.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ fontSize: 13 }}>{s.label}</Text>
                        <Text strong>{s.value}</Text>
                      </div>
                      <Progress
                        percent={Math.round((s.value / t.total) * 100)}
                        showInfo={false}
                        strokeColor={s.color}
                        trailColor="rgba(148,163,184,0.1)"
                        size="small"
                      />
                    </div>
                  ))}
                </Space>
              ) : (
                <Empty description="Chưa có công việc" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="⏱️ Giờ công">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="Ước tính" value={t.totalEstimatedHours || 0} suffix="h" valueStyle={{ fontSize: 22 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Thực tế" value={t.totalActualHours || 0} suffix="h" valueStyle={{ fontSize: 22 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Capacity tổng" value={Math.round(r.totalCapacity || 0)} suffix="h" valueStyle={{ fontSize: 22 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Workload hiện tại" value={Math.round(r.totalWorkload || 0)} suffix="h" valueStyle={{ fontSize: 22 }} />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Recent Optimizations */}
        {data?.recentOptimizations && data.recentOptimizations.length > 0 && (
          <Card
            title="🧬 Tối ưu hóa gần đây"
            extra={<Button type="link" onClick={() => navigate('/optimization')}>Xem tất cả</Button>}
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
                      <Text type="secondary">Fitness: {opt.fitness}</Text>
                      <Text type="secondary">{opt.taskCount}T / {opt.resourceCount}R</Text>
                      {opt.isApplied && <Tag color="success">Đã áp dụng</Tag>}
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
