import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Avatar,
} from 'antd';
import {
  HistoryOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  UserOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import activityLogService from '../services/activityLogService';
import { useAuth } from '../context/AuthContext';
import { formatTimeAgo } from '../i18n/format';

const { Title, Text } = Typography;

// Giá trị và biểu tượng cố định; nhãn lấy từ `activityLogs.entity.*` lúc render.
const ENTITY_TYPES = [
  { value: 'project', icon: <ProjectOutlined />, color: 'purple' },
  { value: 'task', icon: <CheckCircleOutlined />, color: 'blue' },
  { value: 'resource', icon: <TeamOutlined />, color: 'cyan' },
  { value: 'department', icon: <ApartmentOutlined />, color: 'geekblue' },
  { value: 'optimization', icon: <ThunderboltOutlined />, color: 'gold' },
  { value: 'auth', icon: <SafetyCertificateOutlined />, color: 'green' },
  { value: 'system', icon: <HistoryOutlined />, color: 'default' },
];

const ACTION_COLOR_MAP = {
  CREATE_PROJECT: 'green',
  UPDATE_PROJECT: 'blue',
  DELETE_PROJECT: 'red',
  CREATE_TASK: 'green',
  UPDATE_TASK: 'blue',
  UPDATE_TASK_STATUS: 'cyan',
  DELETE_TASK: 'red',
  RUN_OPTIMIZATION: 'gold',
  APPLY_OPTIMIZATION: 'volcano',
  CREATE_RESOURCE: 'green',
  UPDATE_RESOURCE: 'blue',
  DELETE_RESOURCE: 'red',
  LOGIN: 'purple',
};

export default function ActivityLogs() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [filters, setFilters] = useState({
    search: '',
    entityType: '',
    startDate: '',
    endDate: '',
  });

  const entityOptions = useMemo(
    () =>
      ENTITY_TYPES.map((o) => ({
        ...o,
        label: `${t(`activityLogs.entity.${o.value}`)} (${o.value})`,
      })),
    [t]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };
      if (filters.search) params.search = filters.search;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [logsRes, statsRes] = await Promise.all([
        activityLogService.getAll(params),
        activityLogService.getStats(),
      ]);

      setLogs(logsRes.data.data.logs || []);
      setTotal(logsRes.data.total || 0);
      setStats(statsRes.data.data);
    } catch (err) {
      message.error(err.response?.data?.message || t('activityLogs.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, t]);

  useEffect(() => {
    const timer = setTimeout(loadData, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleClearLogs = async () => {
    setClearing(true);
    try {
      const res = await activityLogService.clear();
      message.success(res.data.message || t('activityLogs.cleared'));
      await loadData();
    } catch (err) {
      message.error(err.response?.data?.message || t('activityLogs.clearFailed'));
    } finally {
      setClearing(false);
    }
  };

  const columns = [
    {
      title: t('activityLogs.columns.time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date) => (
        <div>
          <Text strong style={{ fontSize: 13, display: 'block' }}>
            {dayjs(date).format('DD/MM/YYYY HH:mm:ss')}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatTimeAgo(date, t)}
          </Text>
        </div>
      ),
    },
    {
      title: t('activityLogs.columns.actor'),
      key: 'user',
      width: 190,
      render: (_, record) => (
        <Space>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            style={{ backgroundColor: '#4f46e5' }}
          />
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>
              {record.userName || record.user?.name || t('activityLogs.system')}
            </Text>
            {record.userEmail && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {record.userEmail}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: t('activityLogs.columns.category'),
      dataIndex: 'entityType',
      key: 'entityType',
      width: 130,
      render: (type) => {
        const item = ENTITY_TYPES.find((o) => o.value === type);
        return (
          <Tag color={item?.color || 'default'}>
            {item ? t(`activityLogs.entity.${type}`) : type}
          </Tag>
        );
      },
    },
    {
      title: t('activityLogs.columns.action'),
      dataIndex: 'action',
      key: 'action',
      width: 160,
      render: (action) => (
        <Tag color={ACTION_COLOR_MAP[action] || 'blue'}>{action}</Tag>
      ),
    },
    {
      title: t('activityLogs.columns.detail'),
      dataIndex: 'description',
      key: 'description',
      render: (desc, record) => (
        <div>
          <Text style={{ fontSize: 13 }}>{desc}</Text>
          {record.ipAddress && (
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
              IP: {record.ipAddress}
            </Text>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            {t('activityLogs.title')}
          </Title>
          <Text type="secondary">{t('activityLogs.subtitle')}</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            {t('common.reload')}
          </Button>
          {user?.role === 'admin' && (
            <Popconfirm
              title={t('activityLogs.clearConfirm')}
              description={t('common.cannotUndo')}
              onConfirm={handleClearLogs}
              okText={t('activityLogs.clearOk')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} loading={clearing}>
                {t('activityLogs.clear')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* KPI Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card hoverable>
              <Statistic
                title={t('activityLogs.stats.total')}
                value={stats.total}
                prefix={<HistoryOutlined style={{ color: '#4f46e5' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable>
              <Statistic
                title={t('activityLogs.stats.today')}
                value={stats.todayCount}
                valueStyle={{ color: '#059669' }}
                prefix={<ClockCircleOutlined style={{ color: '#059669' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable>
              <Statistic
                title={t('activityLogs.stats.topUser')}
                value={stats.topUsers?.[0]?.userName || '—'}
                valueStyle={{ fontSize: 18, color: '#2563eb' }}
                suffix={
                  stats.topUsers?.[0]?.count ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({t('activityLogs.stats.timesCount', { count: stats.topUsers[0].count })})
                    </Text>
                  ) : null
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable>
              <Statistic
                title={t('activityLogs.stats.topCategory')}
                value={stats.byEntityType?.[0]?.type?.toUpperCase() || '—'}
                valueStyle={{ fontSize: 18, color: '#f59e0b' }}
                suffix={
                  stats.byEntityType?.[0]?.count ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({t('activityLogs.stats.logsCount', { count: stats.byEntityType[0].count })})
                    </Text>
                  ) : null
                }
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Toolbar / Filters */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t('activityLogs.searchPlaceholder')}
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('activityLogs.allCategories')}
              value={filters.entityType || undefined}
              onChange={(val) =>
                setFilters((prev) => ({ ...prev, entityType: val || '' }))
              }
              allowClear
              options={entityOptions}
            />
          </Col>
          <Col xs={12} md={8}>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              onChange={(dates) => {
                setFilters((prev) => ({
                  ...prev,
                  startDate: dates?.[0]?.toISOString() || '',
                  endDate: dates?.[1]?.toISOString() || '',
                }));
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            showTotal: (count) => t('activityLogs.totalLogs', { count }),
          }}
        />
      </Card>
    </div>
  );
}
