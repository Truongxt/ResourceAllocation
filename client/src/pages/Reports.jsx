import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatDayMonth } from '../i18n/format';
import './Reports.css';

const { Title, Text } = Typography;

const BURNOUT_COLORS = { high: 'error', medium: 'warning', low: 'success' };

/**
 * Nhãn một mốc thời gian.
 *
 * Server chỉ trả `start`; nhãn dựng ở đây vì "Tuần" và "Week" là chuyện hiển thị.
 * `bare` bỏ tiền tố khi nhãn nằm dày đặc dưới trục — chỗ đó không đủ chỗ, mà
 * lặp lại "Tuần" trên từng cột cũng không thêm thông tin gì.
 */
const bucketLabel = (bucket, granularity, t, { bare = false } = {}) => {
  const date = formatDayMonth(bucket.start);
  if (granularity !== 'week' || bare) return date;
  return t('reports.weekOf', { date });
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

const heatTitle = (label, load, capacity, t) => {
  if (capacity <= 0) {
    return load > 0 ? t('reports.heat.noWorkday', { label, load }) : t('reports.heat.off', { label });
  }
  return t('reports.heat.normal', {
    label,
    load,
    capacity,
    percent: Math.round((load / capacity) * 100),
  });
};

export default function Reports() {
  const { t } = useTranslation();
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
      csv = `${t('reports.csv.utilHeader')}\n`;
      for (const r of utilData.resources) {
        const risk = t(`reports.burnout.${r.burnoutRisk}`, { defaultValue: r.burnoutRisk });
        csv += `"${r.name}","${r.department}","${r.position}",${r.capacity},${r.workload},${r.utilization},${risk},${r.taskCount}\n`;
      }
    } else if (type === 'projects' && taskData?.byProject) {
      csv = `${t('reports.csv.projectHeader')}\n`;
      for (const p of taskData.byProject) {
        csv += `"${p.projectName}",${p.count},${p.done},${p.totalHours},${Math.round(p.completion)}%\n`;
      }
    } else if (type === 'trend' && trend?.buckets?.length) {
      // Mỗi mốc thời gian một cột, để dán thẳng vào Excel rồi vẽ lại được.
      const header = trend.buckets
        .map((b) => bucketLabel(b, trend.granularity, t))
        .join(',');
      const loadRow = t('reports.csv.loadRow');
      const capacityRow = t('reports.csv.capacityRow');
      csv = `${t('reports.csv.trendHeader')},${header}\n`;
      for (const row of trend.resources) {
        csv += `"${row.name}",${loadRow},${row.load.join(',')}\n`;
        csv += `"${row.name}",${capacityRow},${row.capacity.join(',')}\n`;
      }
      const totalRow = t('reports.csv.totalRow');
      csv += `${totalRow},${loadRow},${trend.totals.map((point) => point.load).join(',')}\n`;
      csv += `${totalRow},${capacityRow},${trend.totals.map((point) => point.capacity).join(',')}\n`;
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
      title: t('reports.columns.resource'),
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
      title: t('reports.columns.department'),
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
      title: t('reports.columns.utilization'),
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
      title: t('reports.columns.burnout'),
      dataIndex: 'burnoutRisk',
      key: 'burnoutRisk',
      render: (risk) => (
        <Tag color={BURNOUT_COLORS[risk] || 'default'}>
          {t(`reports.burnout.${risk}`, { defaultValue: risk })}
        </Tag>
      ),
    },
    {
      title: t('reports.columns.taskCount'),
      dataIndex: 'taskCount',
      key: 'taskCount',
      render: (count) => <Tag color="purple">{count || 0} tasks</Tag>,
    },
  ];

  const projectColumns = [
    {
      title: t('common.project'),
      dataIndex: 'projectName',
      key: 'name',
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: t('reports.columns.taskTotal'),
      dataIndex: 'count',
      key: 'count',
    },
    {
      title: t('reports.columns.completed'),
      dataIndex: 'done',
      key: 'done',
      render: (done, r) => `${done} / ${r.count}`,
    },
    {
      title: t('reports.columns.totalHours'),
      dataIndex: 'totalHours',
      key: 'totalHours',
      render: (h) => `${h || 0}h`,
    },
    {
      title: t('reports.columns.completion'),
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
          <Title level={3} style={{ marginBottom: 4 }}>{t('reports.title')}</Title>
          <Text type="secondary">{t('reports.subtitle')}</Text>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => exportCSV(activeTab)}>
            {t('reports.exportCsv')}
          </Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            {t('reports.printPdf')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load} title={t('common.reload')} />
        </Space>
      </div>

      <Spin spinning={loading}>
        {/* Summary Stats */}
        {utilData?.summary && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card hoverable>
                <Statistic
                  title={t('reports.stats.totalResources')}
                  value={utilData.summary.totalResources}
                  prefix={<TeamOutlined style={{ color: '#6366f1' }} />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card hoverable>
                <Statistic
                  title={t('reports.stats.avgUtilization')}
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
                  title={t('dashboard.overloadedResources')}
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
                  title={t('reports.stats.highBurnout')}
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
                  <TeamOutlined /> {t('reports.tabs.utilization')} ({utilData?.resources?.length || 0})
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
                  <PieChartOutlined /> {t('reports.tabs.departments')} ({utilData?.byDepartment?.length || 0})
                </span>
              ),
              children: (
                <Row gutter={[16, 16]}>
                  {(utilData?.byDepartment || []).map((dept) => (
                    <Col xs={24} sm={12} lg={8} key={dept.name}>
                      <Card title={dept.name} hoverable>
                        <Space direction="vertical" style={{ width: '100%' }} size="small">
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">{t('reports.columns.resource')}:</Text>
                            <Text strong>{t('reports.peopleCount', { count: dept.count })}</Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">{t('reports.avgUtilShort')}:</Text>
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
                  <ProjectOutlined /> {t('reports.tabs.projects')} ({taskData?.byProject?.length || 0})
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
                  <LineChartOutlined /> {t('reports.tabs.trend')}
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
                            { label: t('reports.byDay'), value: 'day' },
                            { label: t('reports.byWeek'), value: 'week' },
                          ]}
                        />
                        <Select
                          style={{ minWidth: 240 }}
                          placeholder={t('gantt.allProjects')}
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
                      message={t('reports.commitmentNotice.title')}
                      description={t('reports.commitmentNotice.body')}
                    />

                    {trend?.buckets?.length ? (
                      <>
                        {trend.truncated && (
                          <Alert
                            type="warning"
                            showIcon
                            message={t('reports.truncated.title')}
                            description={t('reports.truncated.body')}
                          />
                        )}
                        {(trend.excluded.unscheduledHours > 0 || trend.excluded.unassignedHours > 0) && (
                          <Alert
                            type="warning"
                            showIcon
                            message={t('reports.excluded.title')}
                            description={
                              <>
                                {trend.excluded.unscheduledHours > 0 && (
                                  <div>
                                    {t('reports.excluded.unscheduled', {
                                      hours: trend.excluded.unscheduledHours,
                                      count: trend.excluded.unscheduledTasks,
                                    })}
                                  </div>
                                )}
                                {trend.excluded.unassignedHours > 0 && (
                                  <div>
                                    {t('reports.excluded.unassigned', {
                                      hours: trend.excluded.unassignedHours,
                                      count: trend.excluded.unassignedTasks,
                                    })}
                                  </div>
                                )}
                                {t('reports.excluded.footer')}
                              </>
                            }
                          />
                        )}

                        <Card
                          title={t('reports.loadVsCapacity')}
                          extra={
                            <Space size={16}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('reports.legendBars')}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {trend.granularity === 'week'
                                  ? t('reports.groupedByWeek')
                                  : t('reports.groupedByDay')}
                              </Text>
                            </Space>
                          }
                        >
                          {(() => {
                            const peak = Math.max(
                              1,
                              ...trend.totals.map((point) => Math.max(point.load, point.capacity))
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
                                          bucketLabel(trend.buckets[index], trend.granularity, t),
                                          point.load,
                                          point.capacity,
                                          t
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
                                      {index % labelEvery === 0
                                        ? bucketLabel(bucket, trend.granularity, t, { bare: true })
                                        : ''}
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </Card>

                        <Card styles={{ body: { padding: 0 } }} title={t('reports.perPerson')}>
                          <Table
                            size="small"
                            rowKey="_id"
                            dataSource={trend.resources}
                            pagination={{ pageSize: 10, showSizeChanger: false }}
                            scroll={{ x: 'max-content' }}
                            columns={[
                              {
                                title: t('reports.columns.resource'),
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
                                title: t('reports.columns.peak'),
                                dataIndex: 'peakUtilization',
                                key: 'peak',
                                width: 110,
                                render: (peak, row) =>
                                  row.worksWhileUnavailable ? (
                                    <Tag color="error">{t('reports.assignedOnDayOff')}</Tag>
                                  ) : (
                                    <Tag color={peak > 120 ? 'error' : peak > 100 ? 'warning' : 'success'}>
                                      {peak}%
                                    </Tag>
                                  ),
                              },
                              {
                                title: t('reports.columns.strip', { count: trend.buckets.length }),
                                key: 'strip',
                                render: (_, row) => (
                                  <div style={{ display: 'flex', gap: 1 }}>
                                    {row.load.map((load, index) => (
                                      <Tooltip
                                        key={trend.buckets[index].key}
                                        title={heatTitle(
                                          bucketLabel(trend.buckets[index], trend.granularity, t),
                                          load,
                                          row.capacity[index],
                                          t
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
                          description={t('reports.noTrend')}
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
