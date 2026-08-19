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
  Alert,
  Segmented,
  Select,
  Tooltip,
} from 'antd';
import {
  DownloadOutlined,
  PrinterOutlined,
  ReloadOutlined,
  TeamOutlined,
  PieChartOutlined,
  ProjectOutlined,
  WarningOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import analyticsService from '../services/analyticsService';
import './Reports.css';

const { Title, Text } = Typography;

const BURNOUT_MAP = {
  high: { label: 'Cao (Nguy cơ)', color: 'error' },
  medium: { label: 'Trung bình', color: 'warning' },
  low: { label: 'Thấp (An toàn)', color: 'success' },
};

/**
 * Màu một ô trong dải nhiệt theo thời gian.
 * Capacity bằng 0 mà vẫn có tải là trường hợp riêng — không phải "quá tải nhiều phần
 * trăm" mà là được giao việc rơi vào ngày nghỉ, nên tô màu khác hẳn.
 */
function heatColor(load, capacity) {
  if (capacity <= 0) return load > 0 ? '#7f1d1d' : '#f1f5f9';
  const ratio = load / capacity;
  if (ratio === 0) return '#f1f5f9';
  if (ratio <= 0.7) return '#a7f3d0';
  if (ratio <= 1) return '#34d399';
  if (ratio <= 1.2) return '#fbbf24';
  return '#ef4444';
}

const heatTitle = (label, load, capacity) => {
  if (capacity <= 0) {
    return load > 0
      ? `${label}: ${load}h được giao nhưng không có ngày làm việc nào`
      : `${label}: ngày nghỉ`;
  }
  return `${label}: ${load}h / ${capacity}h (${Math.round((load / capacity) * 100)}%)`;
};

export default function Reports() {
  const [utilData, setUtilData] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('utilization');
  const [trend, setTrend] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [granularity, setGranularity] = useState('week');
  const [trendProject, setTrendProject] = useState('');

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

  const loadTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const res = await analyticsService.getWorkloadTrend({
        granularity,
        ...(trendProject ? { projectId: trendProject } : {}),
      });
      setTrend(res.data.data.trend);
    } catch {
      setTrend(null);
    } finally {
      setTrendLoading(false);
    }
  }, [granularity, trendProject]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

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
    } else if (type === 'trend' && trend?.buckets?.length) {
      // Mỗi mốc thời gian một cột, để dán thẳng vào Excel rồi vẽ lại được.
      const header = trend.buckets.map((b) => b.label).join(',');
      csv = `Nhân sự,Loại,${header}\n`;
      for (const row of trend.resources) {
        csv += `"${row.name}",Tải (giờ),${row.load.join(',')}\n`;
        csv += `"${row.name}",Năng lực (giờ),${row.capacity.join(',')}\n`;
      }
      csv += `TỔNG,Tải (giờ),${trend.totals.map((t) => t.load).join(',')}\n`;
      csv += `TỔNG,Năng lực (giờ),${trend.totals.map((t) => t.capacity).join(',')}\n`;
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
                  value={utilData.summary.highBurnout || 0}
                  valueStyle={{
                    color: (utilData.summary.highBurnout || 0) > 0 ? '#ef4444' : '#10b981',
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
            {
              key: 'trend',
              label: (
                <span>
                  <LineChartOutlined /> Xu hướng theo thời gian
                </span>
              ),
              children: (
                <Spin spinning={trendLoading}>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card styles={{ body: { padding: '12px 16px' } }}>
                      <Space wrap size={16}>
                        <Segmented
                          value={granularity}
                          onChange={setGranularity}
                          options={[
                            { label: 'Theo ngày', value: 'day' },
                            { label: 'Theo tuần', value: 'week' },
                          ]}
                        />
                        <Select
                          style={{ minWidth: 240 }}
                          placeholder="Tất cả dự án"
                          value={trendProject || undefined}
                          onChange={(value) => setTrendProject(value || '')}
                          allowClear
                          options={(taskData?.byProject || []).map((p) => ({
                            value: p._id,
                            label: p.projectCode ? `${p.projectCode} — ${p.projectName}` : p.projectName,
                          }))}
                        />
                      </Space>
                    </Card>

                    <Alert
                      type="info"
                      showIcon
                      message="Đây là khối lượng đã cam kết, không phải nhật ký quá khứ"
                      description="Biểu đồ trải số giờ ước tính của từng công việc lên khoảng ngày làm việc của nó rồi cộng theo từng người, nên dùng để thấy trước tuần nào ai sẽ quá tải. Hệ thống không lưu ảnh chụp workload theo ngày, nên nó không cho biết tháng trước ai đã thực sự làm bao nhiêu giờ."
                    />

                    {trend?.buckets?.length ? (
                      <>
                        {trend.truncated && (
                          <Alert
                            type="warning"
                            showIcon
                            message="Khoảng thời gian quá dài nên biểu đồ đã bị cắt bớt"
                            description="Hãy lọc theo một dự án để xem trọn vẹn."
                          />
                        )}
                        {(trend.excluded.unscheduledHours > 0 || trend.excluded.unassignedHours > 0) && (
                          <Alert
                            type="warning"
                            showIcon
                            message="Có giờ công không đặt được lên trục thời gian"
                            description={
                              <>
                                {trend.excluded.unscheduledHours > 0 && (
                                  <div>
                                    <Text strong>{trend.excluded.unscheduledHours} giờ</Text> thuộc{' '}
                                    {trend.excluded.unscheduledTasks} công việc chưa có ngày bắt đầu/kết
                                    thúc (hoặc ngày kết thúc đứng trước ngày bắt đầu).
                                  </div>
                                )}
                                {trend.excluded.unassignedHours > 0 && (
                                  <div>
                                    <Text strong>{trend.excluded.unassignedHours} giờ</Text> thuộc{' '}
                                    {trend.excluded.unassignedTasks} công việc chưa giao cho ai, hoặc
                                    người được giao không còn là nhân sự đang hoạt động.
                                  </div>
                                )}
                                Số giờ này không xuất hiện trong biểu đồ bên dưới.
                              </>
                            }
                          />
                        )}

                        <Card
                          title="Tổng tải so với năng lực"
                          extra={
                            <Space size={16}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                ▇ tải &nbsp; ┄ năng lực
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {trend.granularity === 'week' ? 'gộp theo tuần' : 'theo ngày'}
                              </Text>
                            </Space>
                          }
                        >
                          {(() => {
                            const peak = Math.max(
                              1,
                              ...trend.totals.map((t) => Math.max(t.load, t.capacity))
                            );
                            // Nhiều mốc quá thì nhãn chồng lên nhau, chỉ in thưa ra.
                            const labelEvery = Math.ceil(trend.buckets.length / 12);

                            return (
                              <>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 200 }}>
                                  {trend.totals.map((point, index) => {
                                    const over =
                                      point.capacity > 0 ? point.load > point.capacity : point.load > 0;
                                    return (
                                      <Tooltip
                                        key={trend.buckets[index].key}
                                        title={heatTitle(
                                          trend.buckets[index].label,
                                          point.load,
                                          point.capacity
                                        )}
                                      >
                                        <div
                                          style={{
                                            flex: 1,
                                            minWidth: 4,
                                            height: '100%',
                                            position: 'relative',
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: '100%',
                                              height: `${(point.load / peak) * 100}%`,
                                              background: over ? '#ef4444' : '#6366f1',
                                              borderRadius: '2px 2px 0 0',
                                            }}
                                          />
                                          {point.capacity > 0 && (
                                            <div
                                              style={{
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                bottom: `${(point.capacity / peak) * 100}%`,
                                                borderTop: '2px dashed #94a3b8',
                                              }}
                                            />
                                          )}
                                        </div>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                                <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
                                  {trend.buckets.map((bucket, index) => (
                                    <div
                                      key={bucket.key}
                                      style={{
                                        flex: 1,
                                        minWidth: 4,
                                        fontSize: 10,
                                        color: '#94a3b8',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                      }}
                                    >
                                      {index % labelEvery === 0 ? bucket.label.replace('Tuần ', '') : ''}
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </Card>

                        <Card styles={{ body: { padding: 0 } }} title="Từng nhân sự theo thời gian">
                          <Table
                            size="small"
                            rowKey="_id"
                            dataSource={trend.resources}
                            pagination={{ pageSize: 10, showSizeChanger: false }}
                            scroll={{ x: 'max-content' }}
                            columns={[
                              {
                                title: 'Nhân sự',
                                dataIndex: 'name',
                                key: 'name',
                                width: 190,
                                render: (name, row) => (
                                  <div style={{ lineHeight: 1.35 }}>
                                    <Text strong style={{ fontSize: 13 }}>{name}</Text>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 11 }}>{row.position}</Text>
                                  </div>
                                ),
                              },
                              {
                                title: 'Đỉnh',
                                dataIndex: 'peakUtilization',
                                key: 'peak',
                                width: 110,
                                render: (peak, row) =>
                                  row.worksWhileUnavailable ? (
                                    <Tag color="error">giao vào ngày nghỉ</Tag>
                                  ) : (
                                    <Tag color={peak > 120 ? 'error' : peak > 100 ? 'warning' : 'success'}>
                                      {peak}%
                                    </Tag>
                                  ),
                              },
                              {
                                title: `Dải theo thời gian (${trend.buckets.length} mốc)`,
                                key: 'strip',
                                render: (_, row) => (
                                  <div style={{ display: 'flex', gap: 1 }}>
                                    {row.load.map((load, index) => (
                                      <Tooltip
                                        key={trend.buckets[index].key}
                                        title={heatTitle(
                                          trend.buckets[index].label,
                                          load,
                                          row.capacity[index]
                                        )}
                                      >
                                        <div
                                          style={{
                                            width: 10,
                                            height: 22,
                                            borderRadius: 2,
                                            background: heatColor(load, row.capacity[index]),
                                          }}
                                        />
                                      </Tooltip>
                                    ))}
                                  </div>
                                ),
                              },
                            ]}
                          />
                        </Card>
                      </>
                    ) : (
                      <Card>
                        <Empty
                          description="Chưa có công việc nào vừa có ngày tháng vừa có người thực hiện, nên chưa dựng được chuỗi thời gian."
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      </Card>
                    )}
                  </Space>
                </Spin>
              ),
            },
          ]}
        />
      </Spin>
    </div>
  );
}
