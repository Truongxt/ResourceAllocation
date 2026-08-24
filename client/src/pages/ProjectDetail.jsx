import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Row,
  Col,
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
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import projectService from '../services/projectService';
import resourceService from '../services/resourceService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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

const MEMBER_ROLES = [
  { value: 'lead', color: 'gold' },
  { value: 'developer', color: 'blue' },
  { value: 'designer', color: 'purple' },
  { value: 'tester', color: 'cyan' },
  { value: 'devops', color: 'geekblue' },
];

const formatDate = (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '—');
const colorOf = (options, value, key = 'value') => options.find((o) => o[key] === value)?.color || 'default';

export default function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

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
      setLoadError(error.response?.data?.message || t('projectDetail.loadFailed') || 'Không thể tải chi tiết dự án');
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const loadStaff = useCallback(async () => {
    try {
      const res = await resourceService.getAll({ status: 'available' });
      setStaff(res.data.data.resources || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    loadStaff();
  }, [load, loadStaff]);

  const members = project?.members || [];
  const tasks = project?.tasks || [];

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress' || t.status === 'review').length;
    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActual = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    return { total, done, inProgress, totalEstimated, totalActual };
  }, [tasks]);

  const availableStaff = useMemo(() => {
    const existingIds = new Set(members.map((m) => m.user?._id || m.user).filter(Boolean));
    return staff.filter((s) => s.user?._id && !existingIds.has(s.user._id));
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
      user: member.user?._id || member.user,
      role: member.role || 'developer',
      allocation: member.allocation ?? 100,
    });
    setMemberModalOpen(true);
  };

  const handleMemberSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        role: values.role,
        allocation: Number(values.allocation) || 0,
      };

      if (editingMember) {
        const memberUserId = editingMember.user?._id || editingMember.user;
        await projectService.updateMember(id, memberUserId, payload);
        message.success(t('projectDetail.memberUpdated') || 'Đã cập nhật thành viên');
      } else {
        await projectService.addMember(id, { user: values.user, ...payload });
        message.success(t('projectDetail.memberAdded') || 'Đã thêm thành viên');
      }
      setMemberModalOpen(false);
      await load();
    } catch (error) {
      message.error(error.response?.data?.message || t('projectDetail.memberSaveFailed') || 'Lỗi khi lưu thành viên');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const memberUserId = member.user?._id || member.user;
    try {
      await projectService.removeMember(id, memberUserId);
      message.success(t('projectDetail.memberRemoved') || 'Đã xóa thành viên');
      await load();
    } catch (error) {
      message.error(error.response?.data?.message || t('projectDetail.memberRemoveFailed') || 'Lỗi khi xóa thành viên');
    }
  };

  if (loading && !project) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')} style={{ marginBottom: 16 }}>
          {t('projectDetail.backToList') || 'Quay lại danh sách'}
        </Button>
        <Alert
          type="error"
          showIcon
          message={t('projectDetail.cannotOpen') || 'Không thể mở dự án'}
          description={loadError || t('projectDetail.notFound') || 'Không tìm thấy dự án'}
        />
      </div>
    );
  }

  const memberColumns = [
    {
      title: t('projectDetail.member') || 'Thành viên',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar src={record.user?.avatar || undefined} icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
          <div>
            <Text strong style={{ display: 'block', fontSize: 13 }}>
              {record.user?.name || t('projectDetail.unknownUser') || 'Thành viên'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.user?.email || ''}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('projectDetail.role') || 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (role) => (
        <Tag color={colorOf(MEMBER_ROLES, role)} style={{ borderRadius: 10 }}>
          {t(`projectDetail.memberRole.${role}`, { defaultValue: role || '—' })}
        </Tag>
      ),
    },
    {
      title: t('projectDetail.allocation') || 'Phân bổ (%)',
      dataIndex: 'allocation',
      key: 'allocation',
      width: 200,
      render: (allocation = 0) => (
        <Progress
          percent={allocation}
          size="small"
          strokeColor="#6366f1"
          status={allocation > 100 ? 'exception' : 'normal'}
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: t('projectDetail.joinedAt') || 'Ngày tham gia',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      width: 130,
      render: (d) => <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(d)}</Text>,
    },
    ...(canManage
      ? [{
          title: t('common.actions') || 'Thao tác',
          key: 'actions',
          width: 100,
          render: (_, record) => (
            <Space size="small">
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditMember(record)} />
              <Popconfirm
                title={t('projectDetail.removeMemberConfirm') || 'Xác nhận xóa thành viên khỏi dự án?'}
                onConfirm={() => handleRemoveMember(record)}
                okText={t('common.delete') || 'Xóa'}
                cancelText={t('common.cancel') || 'Hủy'}
                okButtonProps={{ danger: true }}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          ),
        }]
      : []),
  ];

  const taskColumns = [
    {
      title: t('nav.tasks') || 'Công việc',
      dataIndex: 'title',
      key: 'title',
      render: (title) => <Text strong style={{ fontSize: 13 }}>{title}</Text>,
    },
    {
      title: t('common.status') || 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => (
        <Tag color={TASK_STATUSES.find((s) => s.key === status)?.badgeColor || 'default'} style={{ borderRadius: 10 }}>
          {taskStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: t('common.priority') || 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      render: (priority) => (
        <Tag color={colorOf(PRIORITY_OPTIONS, priority)} style={{ borderRadius: 10 }}>{priorityLabel(priority)}</Tag>
      ),
    },
    {
      title: t('projectDetail.assignee') || 'Người thực hiện',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 190,
      render: (assignee) =>
        assignee ? (
          <Space size={6}>
            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
            <Text style={{ fontSize: 13 }}>{assignee.name}</Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>{t('common.unassigned') || 'Chưa gán'}</Text>
        ),
    },
    {
      title: t('projectDetail.hoursColumn') || 'Ước tính / Thực tế',
      key: 'hours',
      width: 140,
      render: (_, r) => (
        <Text type="secondary" style={{ fontSize: 12 }} className="tabular-nums">
          {r.estimatedHours || 0}h / {r.actualHours || 0}h
        </Text>
      ),
    },
    {
      title: t('gantt.progress') || 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: 140,
      render: (progress = 0) => <Progress percent={progress} size="small" strokeColor="#6366f1" />,
    },
  ];

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      {/* Top Navigation & Title */}
      <div style={{ marginBottom: 20 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/projects')}
          style={{ paddingLeft: 0, marginBottom: 8, color: '#818cf8', fontWeight: 600 }}
        >
          {t('projectDetail.projectList') || 'Quay lại danh sách dự án'}
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Title level={3} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>{project.name}</Title>
              {project.code && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                  }}
                >
                  {project.code}
                </span>
              )}
              <Tag color={colorOf(PROJECT_STATUSES, project.status)} style={{ borderRadius: 10 }}>
                {projectStatusLabel(project.status)}
              </Tag>
              <Tag color={colorOf(PRIORITY_OPTIONS, project.priority)} style={{ borderRadius: 10 }}>
                {priorityLabel(project.priority)}
              </Tag>
            </div>
            {project.description && (
              <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 720, fontSize: 13 }}>
                {project.description}
              </Paragraph>
            )}
          </div>
          <Button icon={<ReloadOutlined />} onClick={load}>{t('common.reload') || 'Tải lại'}</Button>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} md={6}>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="icon-chip icon-chip-primary">
              <ProjectOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('projectDetail.projectProgress') || 'Tiến độ dự án'}
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#818cf8' }} className="tabular-nums">
                {project.progress || 0}%
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} md={6}>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="icon-chip icon-chip-success">
              <CheckCircleOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('nav.tasks') || 'Công việc'}
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }} className="tabular-nums">
                {taskStats.done} <span style={{ fontSize: 14, color: '#94a3b8' }}>/ {taskStats.total}</span>
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} md={6}>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="icon-chip icon-chip-warning">
              <TeamOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('projectDetail.members') || 'Thành viên'}
              </Text>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }} className="tabular-nums">
                {members.length}
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} md={6}>
          <div className="saas-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="icon-chip icon-chip-info">
              <DollarOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('projects.budget') || 'Ngân sách'}
              </Text>
              <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                {formatCurrency(project.budget)}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Tabs View */}
      <Tabs
        type="card"
        items={[
          {
            key: 'overview',
            label: t('projectDetail.overview') || 'Tổng quan',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <div className="saas-card" style={{ padding: 20 }}>
                    <Title level={5} style={{ marginBottom: 16 }}>{t('projectDetail.projectInfo') || 'Thông tin Dự án'}</Title>
                    <Descriptions column={1} size="small" bordered>
                      <Descriptions.Item label={t('projects.form.code') || 'Mã dự án'}>{project.code || '—'}</Descriptions.Item>
                      <Descriptions.Item label={t('projectDetail.manager') || 'Quản lý dự án (PM)'}>
                        {project.manager ? (
                          <Space size={6}>
                            <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                            <span>{project.manager.name}</span>
                            <Text type="secondary" style={{ fontSize: 12 }}>({project.manager.email})</Text>
                          </Space>
                        ) : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('gantt.period') || 'Thời gian'}>
                        {formatDate(project.startDate)} → {formatDate(project.endDate)}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('projects.budget') || 'Ngân sách'}>
                        {formatCurrency(project.budget)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Tags">
                        {project.tags?.length
                          ? project.tags.map((tag) => <Tag key={tag} style={{ borderRadius: 6 }}>{tag}</Tag>)
                          : <Text type="secondary">{t('common.none') || 'Không có'}</Text>}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('projectDetail.createdAt') || 'Ngày tạo'}>
                        {formatDate(project.createdAt)}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </Col>
                <Col xs={24} lg={10}>
                  <div className="saas-card" style={{ padding: 20, height: '100%' }}>
                    <Title level={5} style={{ marginBottom: 16 }}>{t('projectDetail.workload') || 'Khối lượng & Giờ công'}</Title>
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{t('projectDetail.overallProgress') || 'Tiến độ tổng thể'}</Text>
                        <Progress percent={project.progress || 0} strokeColor="#6366f1" status={project.progress === 100 ? 'success' : 'active'} />
                      </div>
                      <Row gutter={16}>
                        <Col span={12}>
                          <div style={{ padding: 12, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>{t('projectDetail.estimatedHours') || 'Ước tính'}</Text>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#818cf8' }} className="tabular-nums">{taskStats.totalEstimated}h</div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ padding: 12, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>{t('projectDetail.actualHours') || 'Thực tế'}</Text>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }} className="tabular-nums">{taskStats.totalActual}h</div>
                          </div>
                        </Col>
                      </Row>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{t('projectDetail.tasksCompleted') || 'Tỷ lệ hoàn thành công việc'}</Text>
                        <Progress
                          percent={taskStats.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0}
                          strokeColor="#10b981"
                        />
                      </div>
                    </Space>
                  </div>
                </Col>
              </Row>
            ),
          },
          {
            key: 'tasks',
            label: `${t('nav.tasks') || 'Công việc'} (${tasks.length})`,
            children: (
              <div className="saas-card" style={{ overflow: 'hidden' }}>
                {tasks.length === 0 ? (
                  <Empty description={t('projectDetail.noTasks') || 'Chưa có công việc'} style={{ padding: 48 }} />
                ) : (
                  <Table
                    rowKey="_id"
                    dataSource={tasks}
                    columns={taskColumns}
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'members',
            label: `${t('projectDetail.members') || 'Thành viên'} (${members.length})`,
            children: (
              <div className="saas-card" style={{ overflow: 'hidden', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Title level={5} style={{ margin: 0 }}>{t('projectDetail.memberList') || 'Danh sách Thành viên'}</Title>
                  {canManage && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openAddMember}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                      }}
                    >
                      {t('projectDetail.addMember') || 'Thêm thành viên'}
                    </Button>
                  )}
                </div>
                {members.length === 0 ? (
                  <Empty description={t('projectDetail.noMembers') || 'Chưa có thành viên'} style={{ padding: 48 }} />
                ) : (
                  <Table
                    rowKey={(r) => r.user?._id || r._id}
                    dataSource={members}
                    columns={memberColumns}
                    pagination={false}
                  />
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Member Modal */}
      <Modal
        title={editingMember ? (t('projectDetail.editMember') || 'Chỉnh sửa thành viên') : (t('projectDetail.addMemberTitle') || 'Thêm thành viên vào dự án')}
        open={memberModalOpen}
        onCancel={() => setMemberModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={memberForm} layout="vertical" onFinish={handleMemberSubmit} style={{ marginTop: 12 }}>
          {editingMember ? (
            <Form.Item label={t('projectDetail.member') || 'Thành viên'}>
              <Space>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                <Text strong>{editingMember.user?.name}</Text>
              </Space>
            </Form.Item>
          ) : (
            <Form.Item
              name="user"
              label={t('nav.resources') || 'Chọn nhân sự'}
              rules={[{ required: true, message: t('projectDetail.pickStaffRequired') || 'Vui lòng chọn nhân sự' }]}
            >
              <Select
                placeholder={availableStaff.length ? (t('projectDetail.pickStaff') || 'Chọn nhân sự...') : (t('projectDetail.allStaffAlreadyIn') || 'Tất cả nhân sự đã tham gia')}
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

          <Form.Item name="role" label={t('projectDetail.roleInProject') || 'Vai trò trong dự án'} rules={[{ required: true }]}>
            <Select
              options={MEMBER_ROLES.map((r) => ({
                value: r.value,
                label: t(`projectDetail.memberRole.${r.value}`, { defaultValue: r.value }),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="allocation"
            label={t('projectDetail.allocationLabel') || 'Tỷ lệ phân bổ công việc'}
            rules={[{ required: true, message: t('projectDetail.allocationRequired') || 'Vui lòng nhập tỷ lệ' }]}
          >
            <InputNumber min={0} max={100} step={10} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setMemberModalOpen(false)}>{t('common.cancel') || 'Hủy'}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                }}
              >
                {editingMember ? (t('common.saveChanges') || 'Lưu thay đổi') : (t('projectDetail.addMember') || 'Thêm vào dự án')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
