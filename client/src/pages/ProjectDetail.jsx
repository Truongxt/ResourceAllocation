import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { projectStatusLabel, priorityLabel, taskStatusLabel } from '../i18n/enums';
import { formatCurrency } from '../i18n/format';
import './ProjectDetail.css';

const { Title, Text, Paragraph } = Typography;

// Vai trò thành viên — khớp enum Project.members[].role ở server.
// Nhãn ở `projectDetail.memberRole.*`; ở đây chỉ giữ giá trị và màu.
const MEMBER_ROLES = [
  { value: 'lead', color: 'gold' },
  { value: 'developer', color: 'blue' },
  { value: 'designer', color: 'purple' },
  { value: 'tester', color: 'cyan' },
  { value: 'devops', color: 'geekblue' },
];

const formatDate = (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '—');

const colorOf = (options, value, key = 'value') =>
  options.find((o) => o[key] === value)?.color || 'default';

export default function ProjectDetail() {
  const { t } = useTranslation();
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
      setLoadError(error.response?.data?.message || t('projectDetail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

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
    const done = tasks.filter((item) => item.status === 'done').length;
    const totalEstimated = tasks.reduce((sum, item) => sum + (item.estimatedHours || 0), 0);
    const totalActual = tasks.reduce((sum, item) => sum + (item.actualHours || 0), 0);
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
        message.success(t('projectDetail.memberUpdated'));
      } else {
        const res = await projectService.addMember(id, {
          user: values.user,
          role: values.role,
          allocation: values.allocation,
        });
        setProject((prev) => ({ ...prev, members: res.data.data.project.members }));
        message.success(t('projectDetail.memberAdded'));
      }
      setMemberModalOpen(false);
    } catch (error) {
      message.error(error.response?.data?.message || t('projectDetail.memberSaveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const userId = member.user?._id || member.user;
    try {
      const res = await projectService.removeMember(id, userId);
      setProject((prev) => ({ ...prev, members: res.data.data.project.members }));
      message.success(t('projectDetail.memberRemoved'));
    } catch (error) {
      message.error(error.response?.data?.message || t('projectDetail.memberRemoveFailed'));
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
          {t('projectDetail.backToList')}
        </Button>
        <Alert
          type="error"
          showIcon
          message={t('projectDetail.cannotOpen')}
          description={loadError || t('projectDetail.notFound')}
        />
      </div>
    );
  }

  const memberColumns = [
    {
      title: t('projectDetail.member'),
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar src={record.user?.avatar || undefined} icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
          <div>
            <Text strong style={{ display: 'block', fontSize: 13 }}>
              {record.user?.name || t('projectDetail.unknownUser')}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.user?.email || ''}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('projectDetail.role'),
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (role) => (
        <Tag color={colorOf(MEMBER_ROLES, role)}>
          {t(`projectDetail.memberRole.${role}`, { defaultValue: role || '—' })}
        </Tag>
      ),
    },
    {
      title: t('projectDetail.allocation'),
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
      title: t('projectDetail.joinedAt'),
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      width: 130,
      render: (d) => <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(d)}</Text>,
    },
    ...(canManage
      ? [{
          title: t('common.actions'),
          key: 'actions',
          width: 100,
          render: (_, record) => (
            <Space size="small">
              <Button type="text" icon={<EditOutlined />} onClick={() => openEditMember(record)} />
              <Popconfirm
                title={t('projectDetail.removeMemberConfirm')}
                onConfirm={() => handleRemoveMember(record)}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
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
      title: t('nav.tasks'),
      dataIndex: 'title',
      key: 'title',
      render: (title) => <Text strong style={{ fontSize: 13 }}>{title}</Text>,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => (
        <Tag color={TASK_STATUSES.find((s) => s.key === status)?.badgeColor || 'default'}>
          {taskStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: t('common.priority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority) => (
        <Tag color={colorOf(PRIORITY_OPTIONS, priority)}>{priorityLabel(priority)}</Tag>
      ),
    },
    {
      title: t('projectDetail.assignee'),
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
          <Text type="secondary" style={{ fontSize: 12 }}>{t('common.unassigned')}</Text>
        ),
    },
    {
      title: t('projectDetail.hoursColumn'),
      key: 'hours',
      width: 120,
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {r.estimatedHours || 0}h / {r.actualHours || 0}h
        </Text>
      ),
    },
    {
      title: t('gantt.progress'),
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
            {t('projectDetail.projectList')}
          </Button>
          <Space align="center" wrap>
            <Title level={3} style={{ margin: 0 }}>{project.name}</Title>
            {project.code && <Tag color="purple">{project.code}</Tag>}
            <Tag color={colorOf(PROJECT_STATUSES, project.status)}>
              {projectStatusLabel(project.status)}
            </Tag>
            <Tag color={colorOf(PRIORITY_OPTIONS, project.priority)}>
              {priorityLabel(project.priority)}
            </Tag>
          </Space>
          {project.description && (
            <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 720 }}>
              {project.description}
            </Paragraph>
          )}
        </div>
        <Button icon={<ReloadOutlined />} onClick={load}>{t('common.reload')}</Button>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} md={6}>
          <Card hoverable>
            <Statistic
              title={t('projectDetail.projectProgress')}
              value={project.progress || 0}
              suffix="%"
              prefix={<ProjectOutlined style={{ color: '#6366f1' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card hoverable>
            <Statistic
              title={t('nav.tasks')}
              value={taskStats.done}
              suffix={`/ ${taskStats.total}`}
              prefix={<ClockCircleOutlined style={{ color: '#10b981' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card hoverable>
            <Statistic
              title={t('projectDetail.members')}
              value={members.length}
              prefix={<TeamOutlined style={{ color: '#f59e0b' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card hoverable>
            <Statistic
              title={t('projects.budget')}
              value={formatCurrency(project.budget)}
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
            label: t('projectDetail.overview'),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card title={t('projectDetail.projectInfo')}>
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label={t('projects.form.code')}>{project.code || '—'}</Descriptions.Item>
                      <Descriptions.Item label={t('projectDetail.manager')}>
                        {project.manager ? (
                          <Space size={6}>
                            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
                            <span>{project.manager.name}</span>
                            <Text type="secondary" style={{ fontSize: 12 }}>{project.manager.email}</Text>
                          </Space>
                        ) : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('gantt.period')}>
                        {formatDate(project.startDate)} → {formatDate(project.endDate)}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('projects.budget')}>
                        {formatCurrency(project.budget)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Tags">
                        {project.tags?.length
                          ? project.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                          : <Text type="secondary">{t('common.none')}</Text>}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('projectDetail.createdAt')}>
                        {formatDate(project.createdAt)}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card title={t('projectDetail.workload')}>
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{t('projectDetail.overallProgress')}</Text>
                        <Progress percent={project.progress || 0} status={project.progress === 100 ? 'success' : 'active'} />
                      </div>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic title={t('projectDetail.estimatedHours')} value={taskStats.totalEstimated} suffix="h" valueStyle={{ fontSize: 20 }} />
                        </Col>
                        <Col span={12}>
                          <Statistic title={t('projectDetail.actualHours')} value={taskStats.totalActual} suffix="h" valueStyle={{ fontSize: 20 }} />
                        </Col>
                      </Row>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{t('projectDetail.tasksCompleted')}</Text>
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
            label: `${t('nav.tasks')} (${tasks.length})`,
            children: (
              <Card styles={{ body: { padding: 0 } }}>
                {tasks.length === 0 ? (
                  <Empty description={t('projectDetail.noTasks')} style={{ padding: 48 }} />
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
            label: `${t('projectDetail.members')} (${members.length})`,
            children: (
              <Card
                styles={{ body: { padding: 0 } }}
                title={canManage ? undefined : t('projectDetail.memberList')}
                extra={
                  canManage && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAddMember}>
                      {t('projectDetail.addMember')}
                    </Button>
                  )
                }
              >
                {members.length === 0 ? (
                  <Empty description={t('projectDetail.noMembers')} style={{ padding: 48 }} />
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
        title={editingMember ? t('projectDetail.editMember') : t('projectDetail.addMemberTitle')}
        open={memberModalOpen}
        onCancel={() => setMemberModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={memberForm} layout="vertical" onFinish={handleMemberSubmit} style={{ marginTop: 12 }}>
          {editingMember ? (
            <Form.Item label={t('projectDetail.member')}>
              <Space>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
                <Text strong>{editingMember.user?.name}</Text>
              </Space>
            </Form.Item>
          ) : (
            <Form.Item
              name="user"
              label={t('nav.resources')}
              rules={[{ required: true, message: t('projectDetail.pickStaffRequired') }]}
            >
              <Select
                placeholder={
                  availableStaff.length
                    ? t('projectDetail.pickStaff')
                    : t('projectDetail.allStaffAlreadyIn')
                }
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

          <Form.Item name="role" label={t('projectDetail.roleInProject')} rules={[{ required: true }]}>
            <Select
              options={MEMBER_ROLES.map((r) => ({
                value: r.value,
                label: t(`projectDetail.memberRole.${r.value}`),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="allocation"
            label={t('projectDetail.allocationLabel')}
            rules={[{ required: true, message: t('projectDetail.allocationRequired') }]}
          >
            <InputNumber min={0} max={100} step={10} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setMemberModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingMember ? t('common.saveChanges') : t('projectDetail.addMember')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
