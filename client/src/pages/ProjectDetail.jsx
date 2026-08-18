import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Select,
  Modal,
  Form,
  InputNumber,
  Progress,
  Tag,
  Table,
  Tabs,
  Space,
  Typography,
  Descriptions,
  Avatar,
  Popconfirm,
  Empty,
  Spin,
  Alert,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  UserOutlined,
  TeamOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import projectService from '../services/projectService';
import resourceService from '../services/resourceService';
import { useAuth } from '../context/AuthContext';
import {
  PROJECT_STATUSES,
  PRIORITY_OPTIONS,
  TASK_STATUSES,
  ROLES,
} from '../constants';
import './ProjectDetail.css';

const { Title, Text, Paragraph } = Typography;

// Vai trò thành viên — khớp enum Project.members[].role ở server
const MEMBER_ROLES = [
  { value: 'lead', label: 'Trưởng nhóm', color: 'gold' },
  { value: 'developer', label: 'Lập trình viên', color: 'blue' },
  { value: 'designer', label: 'Thiết kế', color: 'purple' },
  { value: 'tester', label: 'Kiểm thử', color: 'cyan' },
  { value: 'devops', label: 'DevOps', color: 'geekblue' },
];

const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

const formatDate = (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '—');

const tagFor = (options, value, key = 'value') => {
  const found = options.find((o) => o[key] === value);
  return found || { label: value || '—', color: 'default' };
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberForm] = Form.useForm();

  const canManage = user?.role === ROLES.ADMIN || user?.role === ROLES.PM;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await projectService.getById(id);
      setProject(res.data.data.project);
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Không thể tải dự án');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Danh sách nhân sự dùng làm nguồn chọn thành viên. Lấy từ /resources vì
  // GET /auth/users chỉ dành cho admin, trong khi PM cũng cần thêm thành viên.
  const loadStaff = useCallback(async () => {
    try {
      const res = await resourceService.getAll({ limit: 100 });
      setStaff(res.data.data.resources || []);
    } catch {
      /* danh sách chọn rỗng — form vẫn mở được */
    }
  }, []);

  useEffect(() => {
    load();
    loadStaff();
  }, [load, loadStaff]);

  const tasks = project?.tasks || [];
  const members = project?.members || [];

  const taskStats = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'done').length;
    const totalEstimated = tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const totalActual = tasks.reduce((s, t) => s + (t.actualHours || 0), 0);
    return { total: tasks.length, done, totalEstimated, totalActual };
  }, [tasks]);

  // Nhân sự chưa có trong dự án (không cho thêm trùng — server cũng chặn bằng 400)
  const availableStaff = useMemo(() => {
    const taken = new Set(members.map((m) => m.user?._id || m.user).filter(Boolean));
    return staff.filter((r) => r.user?._id && !taken.has(r.user._id));
  }, [staff, members]);

  const openAddMember = () => {
    setEditingMember(null);
    memberForm.resetFields();
    memberForm.setFieldsValue({ role: 'developer', allocation: 100 });
    setMemberModalOpen(true);
  };

  const openEditMember = (member) => {
    setEditingMember(member);
    memberForm.setFieldsValue({
      role: member.role || 'developer',
      allocation: member.allocation ?? 100,
    });
    setMemberModalOpen(true);
  };

  const handleMemberSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingMember) {
        const userId = editingMember.user?._id || editingMember.user;
        const res = await projectService.updateMember(id, userId, {
          role: values.role,
          allocation: values.allocation,
        });
        setProject((prev) => ({ ...prev, members: res.data.data.project.members }));
        message.success('Cập nhật thành viên thành công');
      } else {
        const res = await projectService.addMember(id, {
          user: values.user,
          role: values.role,
          allocation: values.allocation,
        });
        setProject((prev) => ({ ...prev, members: res.data.data.project.members }));
        message.success('Thêm thành viên thành công');
      }
      setMemberModalOpen(false);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể lưu thành viên');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const userId = member.user?._id || member.user;
    try {
      const res = await projectService.removeMember(id, userId);
      setProject((prev) => ({ ...prev, members: res.data.data.project.members }));
      message.success('Đã xóa thành viên khỏi dự án');
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xóa thành viên');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div style={{ maxWidth: 1400 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')} style={{ marginBottom: 16 }}>
          Quay lại danh sách
        </Button>
        <Alert type="error" showIcon message="Không mở được dự án" description={loadError || 'Dự án không tồn tại'} />
      </div>
    );
  }

  const statusTag = tagFor(PROJECT_STATUSES, project.status);
  const priorityTag = tagFor(PRIORITY_OPTIONS, project.priority);

  const memberColumns = [
    {
      title: 'Thành viên',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar src={record.user?.avatar || undefined} icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
          <div>
            <Text strong style={{ display: 'block', fontSize: 13 }}>{record.user?.name || 'Không rõ'}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.user?.email || ''}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (role) => {
        const t = tagFor(MEMBER_ROLES, role);
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    {
      title: 'Phân bổ (Allocation)',
      dataIndex: 'allocation',
      key: 'allocation',
      width: 200,
      render: (allocation = 0) => (
        <Progress
          percent={allocation}
          size="small"
          status={allocation > 100 ? 'exception' : 'normal'}
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: 'Tham gia từ',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      width: 130,
      render: (d) => <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(d)}</Text>,
    },
    ...(canManage
      ? [{
          title: 'Hành động',
          key: 'actions',
          width: 100,
          render: (_, record) => (
            <Space size="small">
              <Button type="text" icon={<EditOutlined />} onClick={() => openEditMember(record)} />
              <Popconfirm
                title="Xóa thành viên khỏi dự án?"
                onConfirm={() => handleRemoveMember(record)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          ),
        }]
      : []),
  ];

  const taskColumns = [
    {
      title: 'Công việc',
      dataIndex: 'title',
      key: 'title',
      render: (title) => <Text strong style={{ fontSize: 13 }}>{title}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const s = tagFor(TASK_STATUSES, status, 'key');
        return <Tag color={s.badgeColor}>{s.label}</Tag>;
      },
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority) => {
        const p = tagFor(PRIORITY_OPTIONS, priority);
        return <Tag color={p.color}>{p.label}</Tag>;
      },
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 190,
      render: (assignee) =>
        assignee ? (
          <Space size={6}>
            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
            <Text style={{ fontSize: 13 }}>{assignee.name}</Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>Chưa gán</Text>
        ),
    },
    {
      title: 'Giờ (ƯT / TT)',
      key: 'hours',
      width: 120,
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {r.estimatedHours || 0}h / {r.actualHours || 0}h
        </Text>
      ),
    },
    {
      title: 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: 140,
      render: (progress = 0) => <Progress percent={progress} size="small" />,
    },
  ];

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div className="pd-header">
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/projects')}
            style={{ paddingLeft: 0, marginBottom: 4 }}
          >
            Danh sách dự án
          </Button>
          <Space align="center" wrap>
            <Title level={3} style={{ margin: 0 }}>{project.name}</Title>
            {project.code && <Tag color="purple">{project.code}</Tag>}
            <Tag color={statusTag.color}>{statusTag.label}</Tag>
            <Tag color={priorityTag.color}>{priorityTag.label}</Tag>
          </Space>
          {project.description && (
            <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 720 }}>
              {project.description}
            </Paragraph>
          )}
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>Tải lại</Button>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Tiến độ dự án"
              value={project.progress || 0}
              suffix="%"
              prefix={<ProjectOutlined style={{ color: '#6366f1' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Công việc"
              value={taskStats.done}
              suffix={`/ ${taskStats.total}`}
              prefix={<ClockCircleOutlined style={{ color: '#10b981' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Thành viên"
              value={members.length}
              prefix={<TeamOutlined style={{ color: '#f59e0b' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card hoverable>
            <Statistic
              title="Ngân sách"
              value={formatMoney(project.budget)}
              valueStyle={{ fontSize: 18 }}
              prefix={<DollarOutlined style={{ color: '#3b82f6' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        type="card"
        items={[
          {
            key: 'overview',
            label: 'Tổng quan',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card title="Thông tin dự án">
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label="Mã dự án">{project.code || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Quản lý">
                        {project.manager ? (
                          <Space size={6}>
                            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
                            <span>{project.manager.name}</span>
                            <Text type="secondary" style={{ fontSize: 12 }}>{project.manager.email}</Text>
                          </Space>
                        ) : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Thời gian">
                        {formatDate(project.startDate)} → {formatDate(project.endDate)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngân sách">{formatMoney(project.budget)}</Descriptions.Item>
                      <Descriptions.Item label="Tags">
                        {project.tags?.length
                          ? project.tags.map((t) => <Tag key={t}>{t}</Tag>)
                          : <Text type="secondary">Không có</Text>}
                      </Descriptions.Item>
                      <Descriptions.Item label="Tạo lúc">{formatDate(project.createdAt)}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card title="Khối lượng công việc">
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Tiến độ tổng thể</Text>
                        <Progress percent={project.progress || 0} status={project.progress === 100 ? 'success' : 'active'} />
                      </div>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic title="Giờ ước tính" value={taskStats.totalEstimated} suffix="h" valueStyle={{ fontSize: 20 }} />
                        </Col>
                        <Col span={12}>
                          <Statistic title="Giờ thực tế" value={taskStats.totalActual} suffix="h" valueStyle={{ fontSize: 20 }} />
                        </Col>
                      </Row>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Công việc hoàn thành</Text>
                        <Progress
                          percent={taskStats.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0}
                          strokeColor="#10b981"
                        />
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'tasks',
            label: `Công việc (${tasks.length})`,
            children: (
              <Card styles={{ body: { padding: 0 } }}>
                {tasks.length === 0 ? (
                  <Empty description="Dự án chưa có công việc nào" style={{ padding: 48 }} />
                ) : (
                  <Table
                    rowKey="_id"
                    dataSource={tasks}
                    columns={taskColumns}
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'members',
            label: `Thành viên (${members.length})`,
            children: (
              <Card
                styles={{ body: { padding: 0 } }}
                title={canManage ? undefined : 'Danh sách thành viên'}
                extra={
                  canManage && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAddMember}>
                      Thêm thành viên
                    </Button>
                  )
                }
              >
                {members.length === 0 ? (
                  <Empty description="Dự án chưa có thành viên nào" style={{ padding: 48 }} />
                ) : (
                  <Table
                    rowKey={(r) => r.user?._id || r._id}
                    dataSource={members}
                    columns={memberColumns}
                    pagination={false}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Modal thêm / sửa thành viên */}
      <Modal
        title={editingMember ? 'Cập nhật thành viên' : 'Thêm thành viên vào dự án'}
        open={memberModalOpen}
        onCancel={() => setMemberModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={memberForm} layout="vertical" onFinish={handleMemberSubmit} style={{ marginTop: 12 }}>
          {editingMember ? (
            <Form.Item label="Thành viên">
              <Space>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
                <Text strong>{editingMember.user?.name}</Text>
              </Space>
            </Form.Item>
          ) : (
            <Form.Item
              name="user"
              label="Nhân sự"
              rules={[{ required: true, message: 'Vui lòng chọn nhân sự' }]}
            >
              <Select
                placeholder={availableStaff.length ? 'Chọn nhân sự' : 'Tất cả nhân sự đã ở trong dự án'}
                disabled={!availableStaff.length}
                showSearch
                optionFilterProp="label"
                options={availableStaff.map((r) => ({
                  value: r.user._id,
                  label: `${r.user.name} — ${r.position}`,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item name="role" label="Vai trò trong dự án" rules={[{ required: true }]}>
            <Select options={MEMBER_ROLES.map((r) => ({ value: r.value, label: r.label }))} />
          </Form.Item>

          <Form.Item
            name="allocation"
            label="Phân bổ (% thời gian dành cho dự án)"
            rules={[{ required: true, message: 'Vui lòng nhập mức phân bổ' }]}
          >
            <InputNumber min={0} max={100} step={10} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setMemberModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingMember ? 'Lưu thay đổi' : 'Thêm thành viên'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
