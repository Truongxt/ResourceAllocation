import { useCallback, useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Tabs,
  Table,
  Statistic,
  Progress,
  Tag,
  Button,
  Space,
  Typography,
  Spin,
  Empty,
} from 'antd';
import {
  DownloadOutlined,
  PrinterOutlined,
  ReloadOutlined,
  TeamOutlined,
  PieChartOutlined,
  ProjectOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import analyticsService from '../services/analyticsService';
import './Reports.css';

const { Title, Text } = Typography;

const BURNOUT_MAP = {
  high: { label: 'Cao (Nguy cơ)', color: 'error' },
  medium: { label: 'Trung bình', color: 'warning' },
  low: { label: 'Thấp (An toàn)', color: 'success' },
};

export default function Reports() {
  const [utilData, setUtilData] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('utilization');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [utilRes, taskRes] = await Promise.all([
        analyticsService.getUtilization(),
        analyticsService.getTaskAnalytics(),
      ]);
      setUtilData(utilRes.data.data);
      setTaskData(taskRes.data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportCSV = (type) => {
    let csv = '';
    if (type === 'utilization' && utilData?.resources) {
      csv = 'Tên,Phòng ban,Vị trí,Capacity,Workload,Utilization(%),Burnout Risk,Số task\n';
      for (const r of utilData.resources) {
        csv += `"${r.name}","${r.department}","${r.position}",${r.capacity},${r.workload},${r.utilization},${BURNOUT_MAP[r.burnoutRisk]?.label || r.burnoutRisk},${r.taskCount}\n`;
      }
    } else if (type === 'projects' && taskData?.byProject) {
      csv = 'Dự án,Tổng tasks,Hoàn thành,Tổng giờ,% Completion\n';
      for (const p of taskData.byProject) {
        csv += `"${p.projectName}",${p.count},${p.done},${p.totalHours},${Math.round(p.completion)}%\n`;
      }
    }

    if (!csv) return;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resourceColumns = [
    {
      title: 'Nhân sự',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.position}</Text>
        </div>
      ),
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      key: 'department',
      render: (dept) => (dept ? <Tag color="blue">{dept}</Tag> : '—'),
    },
    {
      title: 'Capacity / Workload',
      key: 'capacity',
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {r.workload || 0}h / <strong>{r.capacity || 40}h</strong>
        </Text>
      ),
    },
    {
      title: 'Mức sử dụng (Utilization)',
      dataIndex: 'utilization',
      key: 'utilization',
      width: 220,
      render: (util) => {
        const color = util > 100 ? '#ef4444' : util > 80 ? '#f59e0b' : '#10b981';
        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text strong style={{ color, fontSize: 12 }}>{util}%</Text>
            </div>
            <Progress percent={Math.min(util, 100)} showInfo={false} strokeColor={color} size="small" />
          </div>
        );
      },
    },
    {
      title: 'Nguy cơ Burnout',
      dataIndex: 'burnoutRisk',
      key: 'burnoutRisk',
      render: (risk) => {
        const item = BURNOUT_MAP[risk] || { label: risk, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Tasks đảm nhiệm',
      dataIndex: 'taskCount',
      key: 'taskCount',
      render: (count) => <Tag color="purple">{count || 0} tasks</Tag>,
    },
  ];

  const projectColumns = [
    {
      title: 'Dự án',
      dataIndex: 'projectName',
      key: 'name',
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: 'Số công việc',
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: 'Đã hoàn thành',
      dataIndex: 'done',
      key: 'done',
      render: (done, r) => `${done} / ${r.count}`,
    },
    {
      title: 'Tổng giờ công',
      dataIndex: 'totalHours',
      key: 'totalHours',
      render: (h) => `${h || 0}h`,
    },
    {
      title: 'Tiến độ hoàn thành',
      dataIndex: 'completion',
      key: 'completion',
      width: 200,
      render: (comp = 0) => (
        <Progress percent={Math.round(comp)} size="small" status={comp === 100 ? 'success' : 'active'} />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Báo cáo & Thống kê Nguồn lực</Title>
          <Text type="secondary">
            Phân tích Resource Histogram, Nguy cơ kiệt sức (Burnout Risk) và Báo cáo tiến độ đa dự án
          </Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => exportCSV(activeTab)}>
            Xuất CSV
          </Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            In / PDF
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load} title="Tải lại" />
        </Space>
      </div>

      <Spin spinning={loading}>
        {/* Summary Stats */}
        {utilData?.summary && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card hoverable>
                <Statistic
                  title="Tổng nhân sự"
                  value={utilData.summary.totalResources}
                  prefix={<TeamOutlined style={{ color: '#6366f1' }} />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card hoverable>
                <Statistic
                  title="Utilization Trung bình"
                  value={utilData.summary.avgUtilization}
                  suffix="%"
                  valueStyle={{
                    color: utilData.summary.avgUtilization > 100 ? '#ef4444' : '#10b981',
                  }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card hoverable>
                <Statistic
                  title="Nhân sự quá tải"
                  value={utilData.summary.overloaded}
                  valueStyle={{
                    color: utilData.summary.overloaded > 0 ? '#ef4444' : '#10b981',
                  }}
                  prefix={<WarningOutlined style={{ color: utilData.summary.overloaded > 0 ? '#ef4444' : '#10b981' }} />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card hoverable>
                <Statistic
                  title="Nguy cơ Burnout cao"
                  value={utilData.summary.highBurnoutRisk || 0}
                  valueStyle={{
                    color: (utilData.summary.highBurnoutRisk || 0) > 0 ? '#ef4444' : '#10b981',
                  }}
                />
              </Card>
            </Col>
          </Row>
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          items={[
            {
              key: 'utilization',
              label: (
                <span>
                  <TeamOutlined /> Resource Histogram ({utilData?.resources?.length || 0})
                </span>
              ),
              children: (
                <Card styles={{ body: { padding: 0 } }}>
                  <Table
                    columns={resourceColumns}
                    dataSource={utilData?.resources || []}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              ),
            },
            {
              key: 'departments',
              label: (
                <span>
                  <PieChartOutlined /> Phân bổ theo Phòng ban ({utilData?.byDepartment?.length || 0})
                </span>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  {(utilData?.byDepartment || []).map((dept) => (
                    <Col xs={24} sm={12} lg={8} key={dept.name}>
                      <Card title={dept.name} hoverable>
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Nhân sự:</Text>
                            <Text strong>{dept.count} người</Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Utilization TB:</Text>
                            <Text strong style={{ color: dept.avgUtil > 100 ? '#ef4444' : '#10b981' }}>
                              {dept.avgUtil}%
                            </Text>
                          </div>
                          <Progress
                            percent={Math.min(dept.avgUtil, 100)}
                            strokeColor={dept.avgUtil > 100 ? '#ef4444' : '#6366f1'}
                            size="small"
                          />
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ),
            },
            {
              key: 'projects',
              label: (
                <span>
                  <ProjectOutlined /> Báo cáo Dự án ({taskData?.byProject?.length || 0})
                </span>
              ),
              children: (
                <Card styles={{ body: { padding: 0 } }}>
                  <Table
                    columns={projectColumns}
                    dataSource={taskData?.byProject || []}
                    rowKey="projectId"
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              ),
            },
          ]}
        />
      </Spin>
    </div>
  );
}
