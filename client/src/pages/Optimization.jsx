import { useCallback, useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Tabs,
  Slider,
  Select,
  InputNumber,
  Button,
  Table,
  Statistic,
  Progress,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Tooltip,
  Alert,
  Spin,
  Empty,
  Divider,
} from 'antd';
import {
  PlayCircleOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  DiffOutlined,
  CheckOutlined,
  ReloadOutlined,
  EyeOutlined,
  SlidersOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import optimizationService from '../services/optimizationService';
import projectService from '../services/projectService';
import analyticsService from '../services/analyticsService';

const { Title, Text, Paragraph } = Typography;

const ALGO_OPTIONS = [
  { value: 'genetic', label: '🧬 Genetic Algorithm', desc: 'Multi-objective GA, tìm giải pháp tối ưu toàn diện' },
  { value: 'csp', label: '🔗 CSP Solver', desc: 'Backtracking + AC-3, đảm bảo thoả mãn ràng buộc cứng' },
  { value: 'hybrid', label: '⚡ Hybrid (CSP → GA)', desc: 'Kết hợp CSP lọc miền giá trị + GA tối ưu hóa' },
];

function formatTime(ms) {
  if (!ms) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function Optimization() {
  const [algorithm, setAlgorithm] = useState('genetic');
  const [projects, setProjects] = useState([]);
  const [params, setParams] = useState({
    projectId: '',
    populationSize: 100,
    maxGenerations: 500,
    crossoverRate: 0.8,
    mutationRate: 0.1,
    workloadWeight: 0.3,
    skillWeight: 0.35,
    costWeight: 0.15,
    overallocationWeight: 0.2,
  });
  const [running, setRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('result');

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectService.getAll({ limit: 100 });
      setProjects(res.data.data.projects || []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await optimizationService.getHistory();
      setHistory(res.data.data.results || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadHistory();
  }, [loadProjects, loadHistory]);

  const loadComparison = useCallback(async (resultId) => {
    if (!resultId) return;
    setComparisonLoading(true);
    try {
      const res = await analyticsService.getOptimizationComparison(resultId);
      setComparisonData(res.data.data);
    } catch {
      setComparisonData(null);
    } finally {
      setComparisonLoading(false);
    }
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setCurrentResult(null);
    setComparisonData(null);

    try {
      let res;
      if (algorithm === 'genetic') {
        res = await optimizationService.runGenetic(params);
      } else if (algorithm === 'csp') {
        res = await optimizationService.runCSP({ projectId: params.projectId });
      } else {
        res = await optimizationService.runHybrid(params);
      }

      const result = res.data.data.result;
      setCurrentResult(result);
      setActiveTab('result');

      if (result.status === 'completed') {
        message.success(`Tối ưu hóa hoàn thành trong ${formatTime(result.executionTime)}!`);
        loadComparison(result._id);
      } else {
        message.error(result.errorMessage || 'Không tìm thấy giải pháp khả thi.');
      }

      await loadHistory();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi chạy tối ưu hóa.');
    } finally {
      setRunning(false);
    }
  };

  const handleApply = async (resultId) => {
    try {
      const res = await optimizationService.applyResult(resultId);
      message.success(res.data.message || 'Đã áp dụng kết quả phân bổ thành công');
      await loadHistory();
      if (currentResult?._id === resultId) {
        setCurrentResult((prev) => ({ ...prev, isApplied: true }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể áp dụng kết quả.');
    }
  };

  const viewResult = async (id) => {
    try {
      const res = await optimizationService.getById(id);
      const resData = res.data.data.result;
      setCurrentResult(resData);
      setActiveTab('result');
      if (resData.status === 'completed') {
        loadComparison(resData._id);
      }
    } catch {
      /* ignore */
    }
  };

  const assignmentColumns = [
    {
      title: 'Công việc (Task)',
      key: 'task',
      render: (_, record) => (
        <div>
          <Text strong>{record.taskTitle || 'Task'}</Text>
          {record.estimatedHours && (
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              ({record.estimatedHours}h)
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Nhân sự được gán',
      key: 'resource',
      render: (_, record) => (
        <Space>
          <Tag color="purple">{record.resourceName || 'Resource'}</Tag>
          {record.department && <Text type="secondary" style={{ fontSize: 12 }}>{record.department}</Text>}
        </Space>
      ),
    },
    {
      title: 'Độ khớp kỹ năng (Skill Match)',
      key: 'skillMatch',
      width: 200,
      render: (_, record) => {
        // CSP không tính điểm khớp kỹ năng nên assignments của nó không có field này
        if (typeof record.skillMatch !== 'number') {
          return <Text type="secondary">—</Text>;
        }
        const score = record.skillMatch;
        return <Progress percent={score} size="small" status={score >= 80 ? 'success' : 'normal'} />;
      },
    },
  ];

  const historyColumns = [
    {
      title: 'Thuật toán',
      dataIndex: 'algorithm',
      key: 'algorithm',
      render: (algo) => {
        const icon = algo === 'genetic' ? '🧬' : algo === 'csp' ? '🔗' : '⚡';
        return <Tag color="blue">{icon} {algo?.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Fitness',
      dataIndex: 'fitness',
      key: 'fitness',
      render: (fitness) => <Text strong style={{ color: '#6366f1' }}>{fitness || '—'}</Text>,
    },
    {
      title: 'Quy mô',
      key: 'scale',
      render: (_, record) => (
        <Text type="secondary">{record.taskCount} Tasks / {record.resourceCount} Nhân sự</Text>
      ),
    },
    {
      title: 'Thời gian chạy',
      dataIndex: 'executionTime',
      key: 'executionTime',
      render: (time) => formatTime(time || 0),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => (
        <Space>
          <Tag color={record.status === 'completed' ? 'success' : 'error'}>
            {record.status === 'completed' ? 'Hoàn thành' : 'Thất bại'}
          </Tag>
          {record.isApplied && <Tag color="cyan">Đã áp dụng</Tag>}
        </Space>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => viewResult(record._id)}>
            Xem
          </Button>
          {record.status === 'completed' && !record.isApplied && (
            <Popconfirm
              title="Áp dụng phương án này?"
              description="Hệ thống sẽ cập nhật người thực hiện cho tất cả công việc liên quan."
              onConfirm={() => handleApply(record._id)}
              okText="Áp dụng"
              cancelText="Hủy"
            >
              <Button size="small" type="primary" icon={<CheckOutlined />}>
                Áp dụng
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>Tối ưu hóa Phân bổ Nguồn lực</Title>
        <Text type="secondary">
          Áp dụng thuật toán Genetic Algorithm (GA) & CSP Solver để tự động phân bổ nhân sự cân bằng workload, tối đa skill match và hạn chế burnout
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left: Optimizer Config */}
        <Col xs={24} lg={8}>
          <Card title={<span><SlidersOutlined /> Cấu hình Thuật toán</span>} styles={{ body: { padding: '20px' } }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Chọn thuật toán tối ưu</Text>
              <Select
                style={{ width: '100%' }}
                value={algorithm}
                onChange={setAlgorithm}
                options={ALGO_OPTIONS}
                size="large"
              />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                {ALGO_OPTIONS.find((o) => o.value === algorithm)?.desc}
              </Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Lọc theo dự án (Tùy chọn)</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Tất cả dự án"
                value={params.projectId || undefined}
                onChange={(val) => setParams((p) => ({ ...p, projectId: val || '' }))}
                allowClear
                options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
              />
            </div>

            {algorithm !== 'csp' && (
              <>
                <Divider style={{ margin: '16px 0' }}>Tham số thuật toán GA</Divider>
                <Row gutter={12} style={{ marginBottom: 12 }}>
                  <Col span={12}>
                    <Text style={{ fontSize: 12 }}>Population Size</Text>
                    <InputNumber
                      min={10}
                      max={500}
                      value={params.populationSize}
                      onChange={(val) => setParams((p) => ({ ...p, populationSize: val }))}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Text style={{ fontSize: 12 }}>Max Generations</Text>
                    <InputNumber
                      min={50}
                      max={2000}
                      value={params.maxGenerations}
                      onChange={(val) => setParams((p) => ({ ...p, maxGenerations: val }))}
                      style={{ width: '100%' }}
                    />
                  </Col>
                </Row>

                <Row gutter={12} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Text style={{ fontSize: 12 }}>Crossover Rate</Text>
                    <InputNumber
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={params.crossoverRate}
                      onChange={(val) => setParams((p) => ({ ...p, crossoverRate: val }))}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Text style={{ fontSize: 12 }}>Mutation Rate</Text>
                    <InputNumber
                      min={0.01}
                      max={0.5}
                      step={0.01}
                      value={params.mutationRate}
                      onChange={(val) => setParams((p) => ({ ...p, mutationRate: val }))}
                      style={{ width: '100%' }}
                    />
                  </Col>
                </Row>

                <Divider style={{ margin: '16px 0' }}>Trọng số Fitness</Divider>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12 }}>Cân bằng tải (Workload)</Text>
                    <Text strong style={{ fontSize: 12 }}>{params.workloadWeight}</Text>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={params.workloadWeight}
                    onChange={(val) => setParams((p) => ({ ...p, workloadWeight: val }))}
                  />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12 }}>Khớp kỹ năng (Skill Match)</Text>
                    <Text strong style={{ fontSize: 12 }}>{params.skillWeight}</Text>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={params.skillWeight}
                    onChange={(val) => setParams((p) => ({ ...p, skillWeight: val }))}
                  />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12 }}>Tránh quá tải (Overload Penalty)</Text>
                    <Text strong style={{ fontSize: 12 }}>{params.overallocationWeight}</Text>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={params.overallocationWeight}
                    onChange={(val) => setParams((p) => ({ ...p, overallocationWeight: val }))}
                  />
                </div>
              </>
            )}

            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleRun}
              loading={running}
              block
              size="large"
              style={{ marginTop: 16, height: 44, borderRadius: 8 }}
            >
              {running ? 'Đang chạy thuật toán...' : `Bắt đầu Tối ưu hóa`}
            </Button>
          </Card>
        </Col>

        {/* Right: Output & Results */}
        <Col xs={24} lg={16}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            items={[
              {
                key: 'result',
                label: (
                  <span>
                    <ThunderboltOutlined /> Kết quả tối ưu
                  </span>
                ),
                children: currentResult ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {/* Metrics Row */}
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Card hoverable styles={{ body: { padding: '16px' } }}>
                          <Statistic
                            title="Fitness Score"
                            value={currentResult.fitness || '—'}
                            valueStyle={{ color: '#6366f1', fontWeight: 700 }}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card hoverable styles={{ body: { padding: '16px' } }}>
                          <Statistic title="Thời gian chạy" value={formatTime(currentResult.executionTime || 0)} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card hoverable styles={{ body: { padding: '16px' } }}>
                          <Statistic title="Số thế hệ (Gen)" value={currentResult.generations || currentResult.iterations || '—'} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card hoverable styles={{ body: { padding: '16px' } }}>
                          <Statistic
                            title="Quá tải (Overload)"
                            value={currentResult.metrics?.overallocatedResources || 0}
                            valueStyle={{ color: (currentResult.metrics?.overallocatedResources || 0) > 0 ? '#ef4444' : '#10b981' }}
                          />
                        </Card>
                      </Col>
                    </Row>

                    {/* Convergence History Mini Visualizer */}
                    {currentResult.convergenceHistory && currentResult.convergenceHistory.length > 1 && (
                      <Card title="📈 Quá trình hội tụ (Convergence over Generations)" size="small">
                        <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 3, padding: '10px 0' }}>
                          {currentResult.convergenceHistory.slice(-40).map((point, idx) => {
                            const heightPct = Math.max(10, Math.min(100, (point.bestFitness || point.fitness || 0) * 100));
                            return (
                              <Tooltip key={idx} title={`Gen ${point.generation}: Fitness ${(point.bestFitness || point.fitness || 0).toFixed(4)}`}>
                                <div
                                  style={{
                                    flex: 1,
                                    height: `${heightPct}%`,
                                    background: 'linear-gradient(to top, #6366f1, #14b8a6)',
                                    borderRadius: '2px 2px 0 0',
                                    opacity: 0.85,
                                  }}
                                />
                              </Tooltip>
                            );
                          })}
                        </div>
                      </Card>
                    )}

                    {/* Action Bar */}
                    <Card styles={{ body: { padding: '16px 20px' } }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>Phương án phân bổ tối ưu</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Đã tìm thấy gán việc cho {currentResult.assignments?.length || 0} công việc
                          </Text>
                        </div>
                        {!currentResult.isApplied ? (
                          <Popconfirm
                            title="Xác nhận áp dụng phương án phân bổ?"
                            description="Hệ thống sẽ cập nhật người thực hiện công việc vào database."
                            onConfirm={() => handleApply(currentResult._id)}
                            okText="Đồng ý"
                            cancelText="Hủy"
                          >
                            <Button type="primary" icon={<CheckOutlined />} size="large">
                              Áp dụng phương án này
                            </Button>
                          </Popconfirm>
                        ) : (
                          <Tag color="success" style={{ padding: '6px 12px', fontSize: 13 }}>
                            <CheckCircleOutlined /> Đã áp dụng vào hệ thống
                          </Tag>
                        )}
                      </div>
                    </Card>

                    {/* Hybrid: pha CSP thu hẹp không gian tìm kiếm cho pha GA */}
                    {currentResult.domainReduction?.restricted && (
                      <Card size="small" title="🔗 Pha CSP đã thu hẹp không gian tìm kiếm">
                        <Space size={32} wrap>
                          <Statistic
                            title="Cặp (công việc × nhân sự) còn lại"
                            value={currentResult.domainReduction.feasiblePairs}
                            suffix={`/ ${currentResult.domainReduction.totalPairs}`}
                          />
                          <Statistic
                            title="Giảm được"
                            value={Math.round(
                              (1 -
                                currentResult.domainReduction.feasiblePairs /
                                  currentResult.domainReduction.totalPairs) *
                                100
                            )}
                            suffix="%"
                            valueStyle={{ color: '#10b981' }}
                          />
                        </Space>
                        {currentResult.domainReduction.tasksReopened > 0 && (
                          <Alert
                            type="warning"
                            showIcon
                            style={{ marginTop: 12 }}
                            message={`${currentResult.domainReduction.tasksReopened} công việc không có nhân sự nào đủ điều kiện`}
                            description="Những công việc này được mở lại cho toàn bộ nhân sự, nếu không thuật toán sẽ không gán được ai. Kiểm tra lại kỹ năng yêu cầu và lịch nghỉ."
                          />
                        )}
                      </Card>
                    )}

                    {/* Ràng buộc bị vi phạm — CSP/Hybrid mới có báo cáo này */}
                    {currentResult.constraintReport?.details?.violated?.length > 0 && (
                      <Card
                        size="small"
                        title={
                          <Space>
                            <WarningOutlined style={{ color: '#f59e0b' }} />
                            <span>
                              Ràng buộc bị vi phạm ({currentResult.constraintReport.details.violated.length})
                            </span>
                          </Space>
                        }
                        extra={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {currentResult.constraintReport.satisfied} ràng buộc đạt yêu cầu
                          </Text>
                        }
                      >
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          {currentResult.constraintReport.details.violated.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                              <Tag color={item.type === 'dependency' ? 'orange' : 'red'} style={{ margin: 0 }}>
                                {item.type === 'dependency' ? 'Phụ thuộc' : 'Khối lượng'}
                              </Tag>
                              <Text strong style={{ fontSize: 13 }}>{item.subject}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>— {item.detail}</Text>
                            </div>
                          ))}
                        </Space>
                        {currentResult.constraintReport.details.violated.some((i) => i.type === 'dependency') && (
                          <Alert
                            type="info"
                            showIcon
                            style={{ marginTop: 12 }}
                            message="Thuật toán chỉ chọn người, không đổi được ngày tháng"
                            description="Các vi phạm về thứ tự trước/sau nằm ở dữ liệu lịch. Hãy sửa ngày trực tiếp trên sơ đồ Gantt rồi chạy lại tối ưu hóa."
                          />
                        )}
                      </Card>
                    )}

                    {/* Assignments Table */}
                    <Card title="Chi tiết Phân công (Task Assignments)" styles={{ body: { padding: 0 } }}>
                      <Table
                        columns={assignmentColumns}
                        dataSource={currentResult.assignments || []}
                        rowKey={(r, idx) => r.taskId || r.task || idx}
                        pagination={{ pageSize: 8 }}
                      />
                    </Card>
                  </Space>
                ) : (
                  <Card>
                    <Empty
                      description="Chưa có kết quả tối ưu. Hãy chọn tham số và bấm 'Bắt đầu Tối ưu hóa' ở bên trái."
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </Card>
                ),
              },
              {
                key: 'compare',
                label: (
                  <span>
                    <DiffOutlined /> So sánh Trước / Sau
                  </span>
                ),
                disabled: !currentResult,
                children: (
                  <Spin spinning={comparisonLoading}>
                    {comparisonData ? (
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        <Row gutter={[16, 16]}>
                          <Col span={8}>
                            <Card hoverable>
                              <Statistic
                                title="Độ lệch tải (Workload StdDev)"
                                value={comparisonData.metrics?.after?.stdDev || 0}
                                precision={2}
                                suffix={
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    (Trước: {comparisonData.metrics?.before?.stdDev?.toFixed(2) || 0})
                                  </Text>
                                }
                              />
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card hoverable>
                              <Statistic
                                title="Nhân sự quá tải"
                                value={comparisonData.metrics?.after?.overloadedCount || 0}
                                valueStyle={{ color: '#10b981' }}
                                suffix={
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    (Trước: {comparisonData.metrics?.before?.overloadedCount || 0})
                                  </Text>
                                }
                              />
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card hoverable>
                              <Statistic
                                title="Skill Match trung bình"
                                value={comparisonData.metrics?.after?.avgSkillMatch || 85}
                                suffix="%"
                                valueStyle={{ color: '#6366f1' }}
                              />
                            </Card>
                          </Col>
                        </Row>

                        <Card title="So sánh tải công việc từng nhân sự (Workload Distribution)" styles={{ body: { padding: 0 } }}>
                          <Table
                            dataSource={comparisonData.resources || []}
                            rowKey="resourceId"
                            pagination={false}
                            columns={[
                              { title: 'Nhân sự', dataIndex: 'resourceName', key: 'name' },
                              { title: 'Vị trí', dataIndex: 'position', key: 'pos' },
                              {
                                title: 'Workload Trước (h)',
                                dataIndex: 'beforeWorkload',
                                key: 'before',
                                render: (w) => <Text>{w || 0}h</Text>,
                              },
                              {
                                title: 'Workload Sau tối ưu (h)',
                                dataIndex: 'afterWorkload',
                                key: 'after',
                                render: (w) => <Text strong style={{ color: '#6366f1' }}>{w || 0}h</Text>,
                              },
                              {
                                title: 'Thay đổi (Delta)',
                                key: 'delta',
                                render: (_, r) => {
                                  const delta = (r.afterWorkload || 0) - (r.beforeWorkload || 0);
                                  const color = delta < 0 ? '#10b981' : delta > 0 ? '#3b82f6' : 'default';
                                  return (
                                    <Tag color={color}>
                                      {delta > 0 ? `+${delta}h` : `${delta}h`}
                                    </Tag>
                                  );
                                },
                              },
                            ]}
                          />
                        </Card>
                      </Space>
                    ) : (
                      <Empty description="Chưa có dữ liệu so sánh" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                  </Spin>
                ),
              },
              {
                key: 'history',
                label: (
                  <span>
                    <HistoryOutlined /> Lịch sử chạy ({history.length})
                  </span>
                ),
                children: (
                  <Card styles={{ body: { padding: 0 } }}>
                    <Table
                      columns={historyColumns}
                      dataSource={history}
                      rowKey="_id"
                      pagination={{ pageSize: 8 }}
                    />
                  </Card>
                ),
              },
            ]}
          />
        </Col>
      </Row>
    </div>
  );
}
