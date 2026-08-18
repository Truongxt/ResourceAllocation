import { useCallback, useEffect, useState } from 'react';
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
  Spin,
  Empty,
  Tooltip,
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

const { Title, Text, Paragraph } = Typography;

const ENTITY_TYPE_OPTIONS = [
  { value: 'project', label: 'Dự án (Project)', icon: <ProjectOutlined />, color: 'purple' },
  { value: 'task', label: 'Công việc (Task)', icon: <CheckCircleOutlined />, color: 'blue' },
  { value: 'resource', label: 'Nhân sự (Resource)', icon: <TeamOutlined />, color: 'cyan' },
  { value: 'department', label: 'Phòng ban (Department)', icon: <ApartmentOutlined />, color: 'geekblue' },
  { value: 'optimization', label: 'Tối ưu hóa (Optimization)', icon: <ThunderboltOutlined />, color: 'gold' },
  { value: 'auth', label: 'Xác thực (Auth)', icon: <SafetyCertificateOutlined />, color: 'green' },
  { value: 'system', label: 'Hệ thống (System)', icon: <HistoryOutlined />, color: 'default' },
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

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffSec = Math.floor((now - past) / 1000);
  if (diffSec < 60) return 'Vừa xong';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return `${Math.floor(diffSec / 86400)} ngày trước`;
}

export default function ActivityLogs() {
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
      message.error(err.response?.data?.message || 'Không thể tải nhật ký hoạt động');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    const t = setTimeout(loadData, filters.search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadData]);

  const handleClearLogs = async () => {
    setClearing(true);
    try {
      const res = await activityLogService.clear();
      message.success(res.data.message || 'Đã xóa toàn bộ nhật ký');
      await loadData();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xóa nhật ký');
    } finally {
      setClearing(false);
    }
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (date) => (
        <div>
          <Text strong style={{ fontSize: 13, display: 'block' }}>
            {dayjs(date).format('DD/MM/YYYY HH:mm:ss')}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {formatTimeAgo(date)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Người thực hiện',
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
              {record.userName || record.user?.name || 'Hệ thống'}
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
      title: 'Phân loại',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 130,
      render: (type) => {
        const item = ENTITY_TYPE_OPTIONS.find((o) => o.value === type) || {
          label: type,
          color: 'default',
        };
        return <Tag color={item.color}>{item.label.split(' ')[0]}</Tag>;
      },
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 160,
      render: (action) => (
        <Tag color={ACTION_COLOR_MAP[action] || 'blue'}>{action}</Tag>
      ),
    },
    {
      title: 'Nội dung chi tiết',
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
            Nhật ký Hoạt động (Activity Logs & Audit Trail)
          </Title>
          <Text type="secondary">
            Ghi lại toàn bộ lịch sử thao tác, phân công nhiệm vụ, tối ưu hóa và truy vết người dùng trong hệ thống
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            Tải lại
          </Button>
          {user?.role === 'admin' && (
            <Popconfirm
              title="Xác nhận xóa sạch toàn bộ nhật ký hoạt động?"
              description="Hành động này không thể hoàn tác."
              onConfirm={handleClearLogs}
              okText="Xóa sạch"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} loading={clearing}>
                Xóa nhật ký
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
                title="Tổng số hoạt động"
                value={stats.total}
                prefix={<HistoryOutlined style={{ color: '#4f46e5' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable>
              <Statistic
                title="Hoạt động hôm nay"
                value={stats.todayCount}
                valueStyle={{ color: '#059669' }}
                prefix={<ClockCircleOutlined style={{ color: '#059669' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable>
              <Statistic
                title="Người thao tác nhiều nhất"
                value={stats.topUsers?.[0]?.userName || '—'}
                valueStyle={{ fontSize: 18, color: '#2563eb' }}
                suffix={
                  stats.topUsers?.[0]?.count ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({stats.topUsers[0].count} lần)
                    </Text>
                  ) : null
                }
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable>
              <Statistic
                title="Phân loại phổ biến nhất"
                value={stats.byEntityType?.[0]?.type?.toUpperCase() || '—'}
                valueStyle={{ fontSize: 18, color: '#f59e0b' }}
                suffix={
                  stats.byEntityType?.[0]?.count ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({stats.byEntityType[0].count} logs)
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
              placeholder="Tìm theo mô tả, người thực hiện hoặc tên đối tượng..."
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
              placeholder="Tất cả phân loại (Module)"
              value={filters.entityType || undefined}
              onChange={(val) =>
                setFilters((prev) => ({ ...prev, entityType: val || '' }))
              }
              allowClear
              options={ENTITY_TYPE_OPTIONS}
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
            showTotal: (t) => `Tổng số ${t} nhật ký ghi nhận`,
          }}
        />
      </Card>
    </div>
  );
}
