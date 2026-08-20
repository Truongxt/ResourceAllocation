import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Switch,
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
  ExperimentOutlined,
} from '@ant-design/icons';
import optimizationService from '../services/optimizationService';
import projectService from '../services/projectService';
import analyticsService from '../services/analyticsService';
import { formatDateTime, formatNumber } from '../i18n/format';

const { Title, Text } = Typography;

const ALGO_VALUES = ['genetic', 'csp', 'hybrid'];

const ALGO_META = {
  genetic: { icon: '🧬', label: 'GA', color: 'purple' },
  csp: { icon: '🔗', label: 'CSP', color: 'blue' },
  hybrid: { icon: '⚡', label: 'Hybrid', color: 'gold' },
};

// Đơn vị đi kèm từng chỉ số so sánh. Nằm ở client vì "giờ"/"người" là câu chữ;
// server chỉ gửi `key`, `digits` và `higherIsBetter`.
const METRIC_UNIT_KEYS = {
  averageSkillMatch: 'percent',
  workloadVariance: 'hours',
  overallocatedResources: 'people',
  averageUtilization: 'percent',
  executionTime: 'ms',
};

// Số phương án đặt cạnh nhau được. Trên 4 cột thì bảng tràn ngang và không đọc nổi,
// server cũng từ chối ở cùng ngưỡng này.
const MAX_COMPARE = 4;

function formatTime(ms) {
  if (!ms) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMetric(value, metric, t) {
  if (typeof value !== 'number') return '—';
  const text = metric.digits > 0 ? value.toFixed(metric.digits) : formatNumber(Math.round(value));
  const unitKey = METRIC_UNIT_KEYS[metric.key];
  return unitKey ? `${text} ${t(`optimization.unit.${unitKey}`)}` : text;
}

/** Đầu cột trong bảng so sánh: cần đủ ngữ cảnh để biết đang so cái gì với cái gì. */
function ResultHeader({ result, t }) {
  const meta = ALGO_META[result.algorithm] || { icon: '•', label: result.algorithm, color: 'default' };
  const scope =
    result.projectFilter?.code || result.projectFilter?.name || t('optimization.wholeSystem');

  return (
    <Space direction="vertical" size={2} style={{ lineHeight: 1.35 }}>
      <Space size={4}>
        <Tag color={meta.color} style={{ margin: 0 }}>{meta.icon} {meta.label}</Tag>
        {result.isApplied && (
          <Tag color="cyan" style={{ margin: 0 }}>{t('optimization.applied')}</Tag>
        )}
      </Space>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
        {formatDateTime(result.createdAt)}
      </Text>
      <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
        {t('optimization.scopeSummary', { count: result.taskCount, scope })}
      </Text>
    </Space>
  );
}

export default function Optimization() {
  const { t } = useTranslation();
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [onlyDiff, setOnlyDiff] = useState(false);

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
        message.success(t('optimization.runDone', { time: formatTime(result.executionTime) }));
        loadComparison(result._id);
      } else {
        message.error(result.errorMessage || t('optimization.noFeasible'));
      }

      await loadHistory();
    } catch (err) {
      message.error(err.response?.data?.message || t('optimization.runFailed'));
    } finally {
      setRunning(false);
    }
  };

  const handleApply = async (resultId) => {
    try {
      const res = await optimizationService.applyResult(resultId);
      message.success(res.data.message || t('optimization.applySuccess'));
      await loadHistory();
      if (currentResult?._id === resultId) {
        setCurrentResult((prev) => ({ ...prev, isApplied: true }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || t('optimization.applyFailed'));
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

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setBenchmarkLoading(true);
    setActiveTab('benchmark');
    try {
      const res = await optimizationService.compare(selectedIds);
      setBenchmark(res.data.data.comparison);
    } catch (err) {
      message.error(err.response?.data?.message || t('optimization.compareFailed'));
      setBenchmark(null);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const assignmentColumns = [
    {
      title: t('nav.tasks'),
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
      title: t('optimization.assignedTo'),
      key: 'resource',
      render: (_, record) => (
        <Space>
          <Tag color="purple">{record.resourceName || 'Resource'}</Tag>
          {record.department && <Text type="secondary" style={{ fontSize: 12 }}>{record.department}</Text>}
        </Space>
      ),
    },
    {
      title: t('optimization.skillMatch'),
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
      title: t('optimization.algorithm'),
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
      title: t('optimization.scale'),
      key: 'scale',
      render: (_, record) => (
        <Text type="secondary">
          {t('dashboard.taskResourceCount', {
            tasks: record.taskCount,
            resources: record.resourceCount,
          })}
        </Text>
      ),
    },
    {
      title: t('optimization.runtime'),
      dataIndex: 'executionTime',
      key: 'executionTime',
      render: (time) => formatTime(time || 0),
    },
    {
      title: t('common.status'),
      key: 'status',
      render: (_, record) => (
        <Space>
          <Tag color={record.status === 'completed' ? 'success' : 'error'}>
            {record.status === 'completed'
              ? t('enums.taskStatus.done')
              : t('optimization.failed')}
          </Tag>
          {record.isApplied && <Tag color="cyan">{t('optimization.applied')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => viewResult(record._id)}>
            {t('optimization.view')}
          </Button>
          {record.status === 'completed' && !record.isApplied && (
            <Popconfirm
              title={t('optimization.applyConfirm')}
              description={t('optimization.applyConfirmBody')}
              onConfirm={() => handleApply(record._id)}
              okText={t('common.apply')}
              cancelText={t('common.cancel')}
            >
              <Button size="small" type="primary" icon={<CheckOutlined />}>
                {t('common.apply')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const resultColumns = benchmark?.results || [];

  const metricColumns = [
    {
      title: t('optimization.metricColumn'),
      dataIndex: 'key',
      key: 'label',
      width: 230,
      render: (key, row) => (
        <div style={{ lineHeight: 1.35 }}>
          <Text strong style={{ fontSize: 13 }}>
            {t(`optimization.metric.${key}`, { defaultValue: key })}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {row.higherIsBetter === null
              ? t('optimization.direction.neutral')
              : row.higherIsBetter
                ? t('optimization.direction.higher')
                : t('optimization.direction.lower')}
          </Text>
        </div>
      ),
    },
    ...resultColumns.map((result, index) => ({
      title: <ResultHeader result={result} t={t} />,
      key: result._id,
      align: 'center',
      render: (_, row) => {
        const isBest = row.bestIndex === index;
        return (
          <Text
            strong={isBest}
            style={{ fontSize: 13, color: isBest ? '#10b981' : undefined }}
          >
            {formatMetric(row.values[index], row, t)}
            {isBest && ' ★'}
          </Text>
        );
      },
    })),
  ];

  const diffRows = onlyDiff
    ? (benchmark?.assignments.rows || []).filter((row) => !row.agreed)
    : benchmark?.assignments.rows || [];

  const diffColumns = [
    {
      title: t('nav.tasks'),
      dataIndex: 'taskTitle',
      key: 'task',
      width: 230,
      render: (title, row) => (
        <Space size={6} align="start">
          {!row.agreed && (
            <Tag color={row.comparable ? 'orange' : 'default'} style={{ margin: 0 }}>
              {row.comparable ? t('optimization.diffDiffers') : t('optimization.diffMissing')}
            </Tag>
          )}
          <Text style={{ fontSize: 13 }}>{title}</Text>
        </Space>
      ),
    },
    ...resultColumns.map((result, index) => {
      const meta = ALGO_META[result.algorithm] || { icon: '•', label: result.algorithm, color: 'default' };
      return {
        title: <Tag color={meta.color} style={{ margin: 0 }}>{meta.icon} {meta.label}</Tag>,
        key: `${result._id}-assignment`,
        render: (_, row) => {
          const cell = row.cells[index];
          if (!cell) {
            return (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('optimization.notAssigned')}
              </Text>
            );
          }
          return (
            <div style={{ lineHeight: 1.35 }}>
              <Text style={{ fontSize: 13 }}>
                {cell.resourceName || t('projectDetail.unknownUser')}
              </Text>
              {typeof cell.skillMatch === 'number' && (
                <>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t('optimization.matchPercent', { percent: Math.round(cell.skillMatch) })}
                  </Text>
                </>
              )}
            </div>
          );
        },
      };
    }),
  ];

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>{t('optimization.title')}</Title>
        <Text type="secondary">{t('optimization.subtitle')}</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left: Optimizer Config */}
        <Col xs={24} lg={8}>
          <Card
            title={<span><SlidersOutlined /> {t('optimization.config')}</span>}
            styles={{ body: { padding: '20px' } }}
          >
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                {t('optimization.pickAlgorithm')}
              </Text>
              <Select
                style={{ width: '100%' }}
                value={algorithm}
                onChange={setAlgorithm}
                options={ALGO_VALUES.map((value) => ({
                  value,
                  label: t(`optimization.algo.${value}.label`),
                }))}
                size="large"
              />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                {t(`optimization.algo.${algorithm}.desc`)}
              </Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                {t('optimization.filterByProject')}
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder={t('gantt.allProjects')}
                value={params.projectId || undefined}
                onChange={(val) => setParams((p) => ({ ...p, projectId: val || '' }))}
                allowClear
                options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
              />
            </div>

            {algorithm !== 'csp' && (
              <>
                <Divider style={{ margin: '16px 0' }}>{t('optimization.gaParams')}</Divider>
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

                <Divider style={{ margin: '16px 0' }}>{t('optimization.fitnessWeights')}</Divider>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12 }}>{t('optimization.weightWorkload')}</Text>
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
                    <Text style={{ fontSize: 12 }}>{t('optimization.weightSkill')}</Text>
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
                    <Text style={{ fontSize: 12 }}>{t('optimization.weightOverload')}</Text>
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
              {running ? t('optimization.running') : t('optimization.run')}
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
                    <ThunderboltOutlined /> {t('optimization.tabs.result')}
                  </span>
                ),
                children: currentResult ? (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {/* Metrics Row */}
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Card hoverable styles={{ body: { padding: '16px' } }}>
                          <Statistic
                            title={t('optimization.fitnessScore')}
                            value={currentResult.fitness || '—'}
                            valueStyle={{ color: '#6366f1', fontWeight: 700 }}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card hoverable styles={{ body: { padding: '16px' } }}>
                          <Statistic title={t('optimization.runtime')} value={formatTime(currentResult.executionTime || 0)} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card hoverable styles={{ body: { padding: '16px' } }}>
                          <Statistic title={t('optimization.generations')} value={currentResult.generations || currentResult.iterations || '—'} />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card hoverable styles={{ body: { padding: '16px' } }}>
                          <Statistic
                            title={t('resources.overloaded')}
                            value={currentResult.metrics?.overallocatedResources || 0}
                            valueStyle={{ color: (currentResult.metrics?.overallocatedResources || 0) > 0 ? '#ef4444' : '#10b981' }}
                          />
                        </Card>
                      </Col>
                    </Row>

                    {/* Convergence History Mini Visualizer */}
                    {currentResult.convergenceHistory && currentResult.convergenceHistory.length > 1 && (
                      <Card title={`📈 ${t('optimization.convergence')}`} size="small">
                        <div style={{ display: 'flex', alignItems: 'flex-end', height: 80, gap: 3, padding: '10px 0' }}>
                          {currentResult.convergenceHistory.slice(-40).map((point, idx) => {
                            const heightPct = Math.max(10, Math.min(100, (point.bestFitness || point.fitness || 0) * 100));
                            return (
                              <Tooltip
                                key={idx}
                                title={t('optimization.convergencePoint', {
                                  gen: point.generation,
                                  fitness: (point.bestFitness || point.fitness || 0).toFixed(4),
                                })}
                              >
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
                          <Text strong>{t('optimization.bestPlan')}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('optimization.assignedFound', {
                              count: currentResult.assignments?.length || 0,
                            })}
                          </Text>
                        </div>
                        {!currentResult.isApplied ? (
                          <Popconfirm
                            title={t('optimization.applyConfirm')}
                            description={t('optimization.applyConfirmDb')}
                            onConfirm={() => handleApply(currentResult._id)}
                            okText={t('common.confirm')}
                            cancelText={t('common.cancel')}
                          >
                            <Button type="primary" icon={<CheckOutlined />} size="large">
                              {t('optimization.applyThis')}
                            </Button>
                          </Popconfirm>
                        ) : (
                          <Tag color="success" style={{ padding: '6px 12px', fontSize: 13 }}>
                            <CheckCircleOutlined /> {t('optimization.appliedToSystem')}
                          </Tag>
                        )}
                      </div>
                    </Card>

                    {/* Hybrid: pha CSP thu hẹp không gian tìm kiếm cho pha GA */}
                    {currentResult.domainReduction?.restricted && (
                      <Card size="small" title={`🔗 ${t('optimization.domain.title')}`}>
                        <Space size={32} wrap>
                          <Statistic
                            title={t('optimization.domain.pairsLeft')}
                            value={currentResult.domainReduction.feasiblePairs}
                            suffix={`/ ${currentResult.domainReduction.totalPairs}`}
                          />
                          <Statistic
                            title={t('optimization.domain.reducedBy')}
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
                            message={t('optimization.domain.reopened', {
                              count: currentResult.domainReduction.tasksReopened,
                            })}
                            description={t('optimization.domain.reopenedBody')}
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
                              {t('optimization.metric.violatedConstraints')} (
                              {currentResult.constraintReport.details.violated.length})
                            </span>
                          </Space>
                        }
                        extra={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('optimization.constraintsSatisfied', {
                              count: currentResult.constraintReport.satisfied,
                            })}
                          </Text>
                        }
                      >
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          {currentResult.constraintReport.details.violated.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                              <Tag color={item.type === 'dependency' ? 'orange' : 'red'} style={{ margin: 0 }}>
                                {item.type === 'dependency'
                                  ? t('optimization.violation.dependency')
                                  : t('optimization.violation.workload')}
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
                            message={t('optimization.datesNotice.title')}
                            description={t('optimization.datesNotice.body')}
                          />
                        )}
                      </Card>
                    )}

                    {/* Assignments Table */}
                    <Card title={t('optimization.assignmentDetail')} styles={{ body: { padding: 0 } }}>
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
                      description={t('optimization.noResult')}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  </Card>
                ),
              },
              {
                key: 'compare',
                label: (
                  <span>
                    <DiffOutlined /> {t('optimization.tabs.compare')}
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
                                title={t('optimization.metric.workloadVariance')}
                                value={comparisonData.metrics?.after?.stdDev || 0}
                                precision={2}
                                suffix={
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    ({t('optimization.before')}: {comparisonData.metrics?.before?.stdDev?.toFixed(2) || 0})
                                  </Text>
                                }
                              />
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card hoverable>
                              <Statistic
                                title={t('dashboard.overloadedResources')}
                                value={comparisonData.metrics?.after?.overloadedCount || 0}
                                valueStyle={{ color: '#10b981' }}
                                suffix={
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    ({t('optimization.before')}: {comparisonData.metrics?.before?.overloadedCount || 0})
                                  </Text>
                                }
                              />
                            </Card>
                          </Col>
                          <Col span={8}>
                            <Card hoverable>
                              <Statistic
                                title={t('optimization.metric.averageSkillMatch')}
                                value={comparisonData.metrics?.after?.avgSkillMatch || 85}
                                suffix="%"
                                valueStyle={{ color: '#6366f1' }}
                              />
                            </Card>
                          </Col>
                        </Row>

                        <Card title={t('optimization.workloadDistribution')} styles={{ body: { padding: 0 } }}>
                          <Table
                            dataSource={comparisonData.resources || []}
                            rowKey="resourceId"
                            pagination={false}
                            columns={[
                              { title: t('reports.columns.resource'), dataIndex: 'resourceName', key: 'name' },
                              { title: t('resources.position'), dataIndex: 'position', key: 'pos' },
                              {
                                title: t('optimization.workloadBefore'),
                                dataIndex: 'beforeWorkload',
                                key: 'before',
                                render: (w) => <Text>{w || 0}h</Text>,
                              },
                              {
                                title: t('optimization.workloadAfter'),
                                dataIndex: 'afterWorkload',
                                key: 'after',
                                render: (w) => <Text strong style={{ color: '#6366f1' }}>{w || 0}h</Text>,
                              },
                              {
                                title: t('optimization.delta'),
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
                      <Empty description={t('optimization.noComparison')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                  </Spin>
                ),
              },
              {
                key: 'history',
                label: (
                  <span>
                    <HistoryOutlined /> {t('optimization.tabs.history')} ({history.length})
                  </span>
                ),
                children: (
                  <Card
                    styles={{ body: { padding: 0 } }}
                    title={
                      <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
                        {t('optimization.pickHint', { max: MAX_COMPARE })}
                      </Text>
                    }
                    extra={
                      <Space>
                        {selectedIds.length > 0 && (
                          <Button size="small" onClick={() => setSelectedIds([])}>
                            {t('optimization.clearSelection')}
                          </Button>
                        )}
                        <Button
                          type="primary"
                          size="small"
                          icon={<ExperimentOutlined />}
                          disabled={selectedIds.length < 2}
                          loading={benchmarkLoading}
                          onClick={handleCompare}
                        >
                          {t('optimization.compare')}
                          {selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                        </Button>
                      </Space>
                    }
                  >
                    <Table
                      columns={historyColumns}
                      dataSource={history}
                      rowKey="_id"
                      pagination={{ pageSize: 8 }}
                      rowSelection={{
                        selectedRowKeys: selectedIds,
                        onChange: setSelectedIds,
                        // Chặn ngay ở checkbox thay vì để người dùng chọn 6 cái rồi mới
                        // nhận lỗi 400 từ server.
                        getCheckboxProps: (record) => ({
                          disabled:
                            selectedIds.length >= MAX_COMPARE && !selectedIds.includes(record._id),
                        }),
                      }}
                    />
                  </Card>
                ),
              },
              {
                key: 'benchmark',
                label: (
                  <span>
                    <ExperimentOutlined /> {t('optimization.tabs.benchmark')}
                    {benchmark ? ` (${benchmark.results.length})` : ''}
                  </span>
                ),
                children: (
                  <Spin spinning={benchmarkLoading}>
                    {benchmark ? (
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {benchmark.warnings.map((warning, idx) => (
                          <Alert
                            key={idx}
                            type="warning"
                            showIcon
                            message={t(`optimization.warning.${warning.code}`, {
                              count: warning.count,
                              counts: (warning.counts || []).join(' / '),
                            })}
                          />
                        ))}

                        <Card title={t('optimization.metricsTable')} styles={{ body: { padding: 0 } }}>
                          <Table
                            columns={metricColumns}
                            dataSource={benchmark.metrics}
                            rowKey="key"
                            pagination={false}
                            size="small"
                            scroll={{ x: 'max-content' }}
                          />
                        </Card>

                        <Card
                          title={t('optimization.diffTitle')}
                          extra={
                            <Space size={8}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('optimization.onlyDiff')}
                              </Text>
                              <Switch size="small" checked={onlyDiff} onChange={setOnlyDiff} />
                            </Space>
                          }
                          styles={{ body: { padding: 0 } }}
                        >
                          <div style={{ padding: '12px 16px' }}>
                            {benchmark.assignments.agreementRate === null ? (
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                {t('optimization.noAgreement', { count: benchmark.results.length })}
                              </Text>
                            ) : (
                              <Text style={{ fontSize: 13 }}>
                                {t('optimization.agreement', {
                                  agreed: benchmark.assignments.agreed,
                                  comparable: benchmark.assignments.comparable,
                                  rate: benchmark.assignments.agreementRate,
                                })}
                                {benchmark.assignments.total > benchmark.assignments.comparable && (
                                  <Text type="secondary">
                                    {' '}
                                    {t('optimization.excludedTasks', {
                                      count:
                                        benchmark.assignments.total -
                                        benchmark.assignments.comparable,
                                    })}
                                  </Text>
                                )}
                              </Text>
                            )}
                          </div>
                          <Table
                            columns={diffColumns}
                            dataSource={diffRows}
                            rowKey="task"
                            size="small"
                            pagination={{ pageSize: 10, showSizeChanger: false }}
                            scroll={{ x: 'max-content' }}
                            locale={{
                              emptyText: onlyDiff
                                ? t('optimization.identicalPlans')
                                : t('optimization.noAssignments'),
                            }}
                          />
                        </Card>
                      </Space>
                    ) : (
                      <Card>
                        <Empty
                          description={t('optimization.benchmarkHint', { max: MAX_COMPARE })}
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      </Card>
                    )}
                  </Spin>
                ),
              },
            ]}
          />
        </Col>
      </Row>
    </div>
  );
}
