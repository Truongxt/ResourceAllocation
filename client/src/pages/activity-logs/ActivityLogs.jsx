import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  Row,
  Col,
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
import activityLogService from '../../services/activityLogService';
import { useAuth } from '../../context/AuthContext';
import { formatTimeAgo } from '../../i18n/format';

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
  LOGOUT: 'default',
};

const ACTION_OPTIONS = Object.keys(ACTION_COLOR_MAP);

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
    action: '',
    startDate: '',
    endDate: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };
      if (filters.search) params.search = filters.search;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
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
      width: 180,
      render: (date) => (
        <div className="tabular-nums">
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
            style={{ backgroundColor: 'var(--brand-primary, #2563eb)' }}
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
            {item ? t(`activityLogs.entity.${type}`, type) : type}
          </Tag>
        );
      },
    },
    {
      title: t('activityLogs.columns.action'),
      dataIndex: 'action',
      key: 'action',
      width: 170,
      render: (action) => (
        <Tag color={ACTION_COLOR_MAP[action] || 'blue'}>
          {t(`activityLogs.action.${action}`, action)}
        </Tag>
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

  const hasActiveFilters = Boolean(
    filters.search || filters.entityType || filters.action || filters.startDate
  );

  const resetFilters = () => {
    setFilters({ search: '', entityType: '', action: '', startDate: '', endDate: '' });
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Unified Header with Inline Live Telemetry */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {t('activityLogs.title', 'Nhật ký Hoạt động')}
            </h1>
            {stats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="pill-badge status-pill-neutral tabular-nums">
                  {t('activityLogs.stats.total', 'Tổng')}: <strong style={{ color: 'var(--text-primary)', marginLeft: 4 }}>{stats.total || 0}</strong>
                </span>
                <span className="pill-badge status-pill-success tabular-nums">
                  {t('activityLogs.stats.today', 'Hôm nay')}: <strong style={{ color: 'var(--status-success)', marginLeft: 4 }}>+{stats.todayCount || 0}</strong>
                </span>
                {stats.topUsers?.[0]?.userName && (
                  <span className="pill-badge status-pill-primary">
                    <UserOutlined style={{ fontSize: 11 }} /> {stats.topUsers[0].userName}
                  </span>
                )}
                {stats.byEntityType?.[0]?.type && (
                  <span className="pill-badge status-pill-info">
                    {stats.byEntityType[0].type.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: 12.5, marginTop: 2, display: 'block' }}>
            {t('activityLogs.subtitle', 'Theo dõi toàn bộ lịch sử thao tác, phân quyền và biến động dữ liệu')}
          </Text>
        </div>

        <Space size="small">
          <Button icon={<ReloadOutlined />} onClick={loadData} size="middle">
            {t('common.reload', 'Tải lại')}
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
              <Button danger icon={<DeleteOutlined />} loading={clearing} size="middle">
                {t('activityLogs.clear', 'Xóa nhật ký')}
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* Unified Table Workspace: Filter Header + Table Surface combined into 1 clean container */}
      <div className="saas-card" style={{ overflow: 'hidden' }}>
        {/* Integrated Top Control Toolbar */}
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--surface-card)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
            <Input
              prefix={<SearchOutlined style={{ color: 'var(--text-tertiary)' }} />}
              placeholder={t('activityLogs.searchPlaceholder', 'Tìm theo mô tả, người dùng, IP...')}
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              allowClear
              style={{ width: 240 }}
            />
            <Select
              style={{ width: 180 }}
              placeholder={t('activityLogs.allCategories', 'Module')}
              value={filters.entityType || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, entityType: val || '' }))}
              allowClear
              options={ENTITY_TYPES.map((item) => ({
                value: item.value,
                label: (
                  <Space size={6}>
                    {item.icon}
                    <span>{t(`activityLogs.entity.${item.value}`, item.value)}</span>
                  </Space>
                ),
              }))}
            />
            <Select
              style={{ width: 170 }}
              placeholder={t('activityLogs.allActions', 'Hành động')}
              value={filters.action || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, action: val || '' }))}
              allowClear
              options={ACTION_OPTIONS.map((action) => ({
                value: action,
                label: t(`activityLogs.action.${action}`, action),
              }))}
            />
            <DatePicker.RangePicker
              style={{ width: 230 }}
              format="DD/MM/YYYY"
              placeholder={[t('activityLogs.startDate', 'Từ ngày'), t('activityLogs.endDate', 'Đến ngày')]}
              onChange={(dates) => {
                setFilters((prev) => ({
                  ...prev,
                  startDate: dates?.[0]?.toISOString() || '',
                  endDate: dates?.[1]?.toISOString() || '',
                }));
              }}
            />
            {hasActiveFilters && (
              <Button type="link" size="small" onClick={resetFilters} style={{ padding: 0, color: 'var(--brand-primary)' }}>
                {t('common.clearFilter', 'Xóa bộ lọc')}
              </Button>
            )}
          </div>
        </div>

        {/* Data Grid */}
        <Table
          size="middle"
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
            showTotal: (count) => t('activityLogs.totalLogs', { count }) || `Tổng số: ${count} nhật ký`,
          }}
        />
      </div>
    </div>
  );
}
