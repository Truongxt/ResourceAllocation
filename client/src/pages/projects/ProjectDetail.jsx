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
  Switch,
  Card,
  Divider,
  Input,
  DatePicker,
  Tooltip,
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
  KeyOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import projectService from '../../services/projectService';
import resourceService from '../../services/resourceService';
import taskService from '../../services/taskService';
import TaskDetailDrawer from '../../components/tasks/TaskDetailDrawer';
import TaskFormModal from '../tasks/components/TaskFormModal';
import { getTaskPermissions } from '../../utils/taskPermissions';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  PROJECT_STATUSES,
  PRIORITY_OPTIONS,
  TASK_STATUSES,
  ROLES,
} from '../../constants';
import { projectStatusLabel, priorityLabel, taskStatusLabel } from '../../i18n/enums';
import { formatCurrency } from '../../i18n/format';
import './ProjectDetail.css';
import { depId } from '../../utils/gantt';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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

  // Task management state
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskForm] = Form.useForm();

  // Quick deadline extension modal state
  const [quickDeadlineModalOpen, setQuickDeadlineModalOpen] = useState(false);
  const [quickDeadlineTask, setQuickDeadlineTask] = useState(null);
  const [quickDeadlineDate, setQuickDeadlineDate] = useState(null);
  const [quickDeadlineReason, setQuickDeadlineReason] = useState('');
  const [quickDeadlineSubmitting, setQuickDeadlineSubmitting] = useState(false);

  const canManage = user?.role === ROLES.ADMIN || user?.role === ROLES.PM;

  // Base Wework: Cập nhật cài đặt phân quyền thao tác trong dự án
  const handleTogglePermission = async (key, checked) => {
    try {
      const updated = {
        ...(project.permissions || {}),
        [key]: checked,
      };
      await projectService.updatePermissions(id, updated);
      setProject((prev) => ({
        ...prev,
        permissions: updated,
      }));
      message.success('Đã cập nhật cài đặt phân quyền thành công');
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật phân quyền');
    }
  };

  // Cấu hình luồng công việc (Thất bại / Đánh giá). Gộp với state tại chỗ để bật
  // tắt xong thấy ngay, không phải tải lại cả trang dự án.
  const handleUpdateWorkflowConfig = async (section, patch) => {
    const current = project?.[section] || {};
    const next = { ...current, ...patch };
    try {
      await projectService.updateWorkflowConfig(id, { [section]: next });
      setProject((prev) => ({ ...prev, [section]: next }));
      message.success('Đã cập nhật cấu hình luồng công việc');
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật cấu hình');
    }
  };

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

  // === Task Action Handlers ===
  const handleOpenDetail = (record) => {
    setSelectedDetailTaskId(record._id);
    setDetailDrawerOpen(true);
  };

  const handleOpenQuickDeadline = (record) => {
    setQuickDeadlineTask(record);
    setQuickDeadlineDate(record.endDate ? dayjs(record.endDate) : null);
    setQuickDeadlineReason('');
    setQuickDeadlineModalOpen(true);
  };

  const handleSubmitQuickDeadline = async () => {
    if (!quickDeadlineTask || !quickDeadlineDate) {
      message.warning('Vui lòng chọn thời hạn mới');
      return;
    }
    setQuickDeadlineSubmitting(true);
    try {
      await taskService.updateDeadline(quickDeadlineTask._id, {
        newEndDate: quickDeadlineDate.toISOString(),
        reason: quickDeadlineReason || 'Gia hạn theo yêu cầu tiến độ',
      });
      message.success('Đã gia hạn thời hạn thành công!');
      setQuickDeadlineModalOpen(false);
      setQuickDeadlineTask(null);
      setQuickDeadlineDate(null);
      setQuickDeadlineReason('');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi gia hạn thời hạn');
    } finally {
      setQuickDeadlineSubmitting(false);
    }
  };

  const handleOpenCreateTask = () => {
    setEditingTask(null);
    taskForm.resetFields();
    taskForm.setFieldsValue({
      project: id,
      priority: 'medium',
      status: 'todo',
      progress: 0,
      estimatedHours: 0,
      actualHours: 0,
    });
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (record) => {
    setEditingTask(record);
    taskForm.resetFields();
    taskForm.setFieldsValue({
      title: record.title,
      description: record.description,
      project: record.project?._id || record.project || id,
      assignee: record.assignee?._id || record.assignee,
      priority: record.priority || 'medium',
      status: record.status || 'todo',
      progress: record.progress || 0,
      estimatedHours: record.estimatedHours || 0,
      actualHours: record.actualHours || 0,
      requiredSkills: record.requiredSkills || [],
      // Giữ nguyên loại quan hệ đã lưu; bản ghi cũ chưa migrate không có `type`
      // nên rơi về finish_to_start — đúng ngữ nghĩa chúng vẫn đang chạy.
      dependencies: (record.dependencies || []).map((d) => ({
        task: depId(d),
        type: d?.type || 'finish_to_start',
      })),
      taskGroup: record.taskGroup?._id || record.taskGroup,
      followers: (record.followers || []).map((f) => f._id || f),
      parentTask: record.parentTask?._id || record.parentTask,
      dateRange:
        record.startDate && record.endDate
          ? [dayjs(record.startDate), dayjs(record.endDate)]
          : record.endDate
          ? [dayjs(record.startDate || record.createdAt || new Date()), dayjs(record.endDate)]
          : undefined,
    });
    setTaskModalOpen(true);
  };

  const handleTaskFormSubmit = async (values) => {
    setTaskSubmitting(true);
    try {
      const payload = {
        ...values,
        project: values.project || id,
        startDate: values.dateRange?.[0] ? values.dateRange[0].toISOString() : undefined,
        endDate: values.dateRange?.[1] ? values.dateRange[1].toISOString() : undefined,
      };
      delete payload.dateRange;

      if (editingTask) {
        if (!canManage) {
          const perms = getTaskPermissions(editingTask, project, user);
          const filteredPayload = {};
          if (payload.status !== undefined) filteredPayload.status = payload.status;
          if (payload.progress !== undefined) filteredPayload.progress = payload.progress;
          if (payload.actualHours !== undefined) filteredPayload.actualHours = payload.actualHours;

          if (perms.canEditDeadline) {
            if (payload.startDate !== undefined) filteredPayload.startDate = payload.startDate;
            if (payload.endDate !== undefined) filteredPayload.endDate = payload.endDate;
          }
          if (perms.canEditDetails) {
            if (payload.title !== undefined) filteredPayload.title = payload.title;
            if (payload.description !== undefined) filteredPayload.description = payload.description;
          }
          if (perms.canChangeAssignee && payload.assignee !== undefined) {
            filteredPayload.assignee = payload.assignee;
          }

          await taskService.update(editingTask._id, filteredPayload);
        } else {
          await taskService.update(editingTask._id, payload);
        }
        message.success(t('tasks.updated') || 'Đã cập nhật công việc');
      } else {
        await taskService.create(payload);
        message.success(t('tasks.created') || 'Đã tạo công việc mới');
      }
      setTaskModalOpen(false);
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || t('tasks.saveFailed') || 'Lỗi lưu công việc');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await taskService.remove(taskId);
      message.success(t('tasks.deleted') || 'Đã xóa công việc');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || t('tasks.deleteFailed') || 'Lỗi khi xóa công việc');
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
      render: (title, record) => (
        <div style={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(record)}>
          <Text strong style={{ fontSize: 13, color: '#6366f1' }}>{title}</Text>
          {record.taskGroup?.name && (
            <Tag color={record.taskGroup.color || 'blue'} style={{ marginLeft: 6, fontSize: 10, borderRadius: 4 }}>
              {record.taskGroup.name}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: t('common.status') || 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
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
      width: 110,
      render: (priority) => (
        <Tag color={colorOf(PRIORITY_OPTIONS, priority)} style={{ borderRadius: 10 }}>{priorityLabel(priority)}</Tag>
      ),
    },
    {
      title: t('projectDetail.assignee') || 'Người thực hiện',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 170,
      render: (assignee) =>
        assignee ? (
          <Space size={6}>
            <Avatar size="small" src={assignee.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
            <Text style={{ fontSize: 13 }}>{assignee.name}</Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>{t('common.unassigned') || 'Chưa gán'}</Text>
        ),
    },
    {
      title: 'Thời hạn (Deadline)',
      key: 'deadline',
      width: 220,
      render: (_, record) => {
        const hasStart = Boolean(record.startDate);
        const hasEnd = Boolean(record.endDate);
        const isOverdue = hasEnd && record.status !== 'done' && dayjs(record.endDate).isBefore(dayjs());

        if (!hasStart && !hasEnd) {
          return <Text type="secondary" style={{ fontSize: 12 }}>Chưa đặt hạn</Text>;
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <CalendarOutlined style={{ color: isOverdue ? '#ef4444' : '#6366f1', fontSize: 11 }} />
              {hasStart && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(record.startDate).format('DD/MM/YYYY HH:mm')} →{' '}
                </Text>
              )}
              <Text strong={isOverdue} style={{ color: isOverdue ? '#ef4444' : undefined, fontSize: 12 }}>
                {hasEnd ? dayjs(record.endDate).format('DD/MM/YYYY HH:mm') : '—'}
              </Text>
            </div>
            {isOverdue && (
              <Tag color="error" style={{ fontSize: 10, borderRadius: 4, margin: 0, width: 'fit-content' }}>
                Quá hạn
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: t('projectDetail.hoursColumn') || 'Ước tính / Thực tế',
      key: 'hours',
      width: 130,
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
      width: 120,
      render: (progress = 0) => <Progress percent={progress} size="small" strokeColor="#6366f1" />,
    },
    {
      title: t('common.actions') || 'Thao tác',
      key: 'actions',
      width: 130,
      align: 'right',
      render: (_, record) => {
        const perms = getTaskPermissions(record, project, user);
        const canEdit = canManage || perms.canEditDetails || perms.canEditDeadline || perms.canChangeAssignee;
        const canDelete = canManage || perms.canDelete;

        return (
          <Space size={2} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Xem chi tiết">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined style={{ color: '#6366f1' }} />}
                onClick={() => handleOpenDetail(record)}
              />
            </Tooltip>
            {perms.canEditDeadline && (
              <Tooltip title="Gia hạn thời hạn (Deadline)">
                <Button
                  type="text"
                  size="small"
                  icon={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
                  onClick={() => handleOpenQuickDeadline(record)}
                />
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip title={t('common.edit') || 'Sửa'}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEditTask(record)}
                />
              </Tooltip>
            )}
            {canDelete && (
              <Popconfirm
                title="Xác nhận xóa công việc này?"
                onConfirm={() => handleDeleteTask(record._id)}
                okText={t('common.delete') || 'Xóa'}
                cancelText={t('common.cancel') || 'Hủy'}
                okButtonProps={{ danger: true }}
              >
                <Tooltip title={t('common.delete') || 'Xóa'}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
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
              <Title level={3} style={{ margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>{project.name}</Title>
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
              <div style={{ fontSize: 24, fontWeight: 600, color: '#818cf8' }} className="tabular-nums">
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
              <div style={{ fontSize: 24, fontWeight: 600, color: '#10b981' }} className="tabular-nums">
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
              <div style={{ fontSize: 24, fontWeight: 600, color: '#f59e0b' }} className="tabular-nums">
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
              <div style={{ fontSize: 18, fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
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
                            <div style={{ fontSize: 20, fontWeight: 600, color: '#818cf8' }} className="tabular-nums">{taskStats.totalEstimated}h</div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ padding: 12, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>{t('projectDetail.actualHours') || 'Thực tế'}</Text>
                            <div style={{ fontSize: 20, fontWeight: 600, color: '#10b981' }} className="tabular-nums">{taskStats.totalActual}h</div>
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
              <div className="saas-card" style={{ overflow: 'hidden', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <Title level={5} style={{ margin: 0 }}>Danh sách công việc dự án</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Nhấp vào công việc để xem chi tiết, điều chỉnh tiến độ hoặc gia hạn hạn chót hoàn thành
                    </Text>
                  </div>
                  {(canManage || project.permissions?.allowMembersCreateTasks !== false) && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleOpenCreateTask}
                      style={{
                        background: 'var(--brand-primary)',
                        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                      }}
                    >
                      {t('tasks.create') || 'Tạo công việc'}
                    </Button>
                  )}
                </div>
                {tasks.length === 0 ? (
                  <Empty description={t('projectDetail.noTasks') || 'Chưa có công việc'} style={{ padding: 48 }} />
                ) : (
                  <Table
                    rowKey="_id"
                    dataSource={tasks}
                    columns={taskColumns}
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                    onRow={(record) => ({
                      onClick: () => handleOpenDetail(record),
                      style: { cursor: 'pointer' },
                    })}
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
                        background: 'var(--brand-primary)',
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
          {
            key: 'permissions',
            label: (
              <span>
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                Phân quyền thao tác
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Alert
                  type="info"
                  showIcon
                  icon={<KeyOutlined />}
                  message="Phân quyền đối với thao tác trong công việc (Chuẩn Base Wework)"
                  description="Cấu hình các quyền hạn bổ sung (tương ứng với biểu tượng chìa khóa 🔑) cho người thực hiện, người theo dõi và thành viên trong dự án này."
                />

                {/* Luồng công việc: Thất bại & Đánh giá kết quả */}
                <Card
                  title={(
                    <Space>
                      <KeyOutlined style={{ color: '#8b5cf6' }} />
                      <Text strong>Luồng công việc</Text>
                    </Space>
                  )}
                  className="saas-card"
                  size="small"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép đánh dấu công việc Thất bại</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Công việc không hoàn thành được sẽ đóng lại kèm lý do, và được đếm riêng
                          trong báo cáo thay vì nằm mãi ở trạng thái quá hạn
                        </Text>
                      </div>
                      <Switch
                        checked={Boolean(project.failureConfig?.enabled)}
                        disabled={!canManage}
                        onChange={(checked) => handleUpdateWorkflowConfig('failureConfig', { enabled: checked })}
                      />
                    </div>

                    {project.failureConfig?.enabled && (
                      <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border-color, #e2e8f0)' }}>
                        <Text strong style={{ display: 'block', marginBottom: 6 }}>Ngoài Quản trị viên và Quản lý dự án, ai được đánh dấu?</Text>
                        <Select
                          mode="multiple"
                          allowClear
                          disabled={!canManage}
                          style={{ width: '100%', maxWidth: 420 }}
                          placeholder="Mặc định: chỉ Quản trị viên và Quản lý dự án"
                          value={project.failureConfig?.allowedRoles || []}
                          onChange={(value) => handleUpdateWorkflowConfig('failureConfig', { allowedRoles: value })}
                          options={[
                            { value: 'assigner', label: 'Người giao việc' },
                            { value: 'assignee', label: 'Người thực hiện' },
                            { value: 'follower', label: 'Người theo dõi' },
                          ]}
                        />
                      </div>
                    )}

                    <Divider style={{ margin: 0 }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Bắt buộc đánh giá trước khi hoàn thành</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Người thực hiện báo xong thì công việc chuyển sang Chờ đánh giá; chỉ người
                          đánh giá mới kết luận Hoàn thành hay trả lại
                        </Text>
                      </div>
                      <Switch
                        checked={Boolean(project.reviewConfig?.enabled)}
                        disabled={!canManage}
                        onChange={(checked) => handleUpdateWorkflowConfig('reviewConfig', { enabled: checked })}
                      />
                    </div>

                    {project.reviewConfig?.enabled && (
                      <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border-color, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 6 }}>Người đánh giá</Text>
                          <Select
                            mode="multiple"
                            allowClear
                            disabled={!canManage}
                            style={{ width: '100%', maxWidth: 420 }}
                            placeholder="Bỏ trống: chỉ Quản trị viên và Quản lý dự án duyệt"
                            value={(project.reviewConfig?.reviewers || []).map((r) => r?._id || r)}
                            onChange={(value) => handleUpdateWorkflowConfig('reviewConfig', { reviewers: value })}
                            options={members.map((m) => ({
                              value: m.user?._id || m.user,
                              label: m.user?.name || m.user?.email,
                            }))}
                          />
                        </div>
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 6 }}>Thời hạn đánh giá (giờ)</Text>
                          <InputNumber
                            min={1}
                            max={720}
                            disabled={!canManage}
                            value={project.reviewConfig?.slaHours ?? 24}
                            onChange={(value) => value && handleUpdateWorkflowConfig('reviewConfig', { slaHours: value })}
                          />
                          <Text type="secondary" style={{ fontSize: 13, marginLeft: 12 }}>
                            Quá hạn này, công việc hiện cảnh báo trong danh sách chờ đánh giá
                          </Text>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Group 1: Quyền hạn của Người thực hiện (Assignee) */}
                <Card
                  title={<Space><KeyOutlined style={{ color: '#6366f1' }} /><Text strong>Quyền hạn của Người thực hiện (Assignee)</Text></Space>}
                  className="saas-card"
                  size="small"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép chỉnh sửa / gia hạn deadline</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Người thực hiện được phép cập nhật thời hạn hoàn thành công việc hoặc xin gia hạn
                        </Text>
                      </div>
                      <Switch
                        checked={Boolean(project.permissions?.allowAssigneeEditDeadline)}
                        disabled={!canManage}
                        onChange={(checked) => handleTogglePermission('allowAssigneeEditDeadline', checked)}
                      />
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép sửa tiêu đề và mô tả công việc</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Người thực hiện được thay đổi nội dung tiêu đề và thông tin chi tiết nhiệm vụ
                        </Text>
                      </div>
                      <Switch
                        checked={project.permissions?.allowAssigneeEditTitleDesc ?? false}
                        disabled={!canManage}
                        onChange={(checked) => handleTogglePermission('allowAssigneeEditTitleDesc', checked)}
                      />
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép bàn giao / chuyển giao công việc</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Người thực hiện có thể gán lại công việc này cho thành viên khác phụ trách
                        </Text>
                      </div>
                      <Switch
                        checked={project.permissions?.allowAssigneeReassign ?? false}
                        disabled={!canManage}
                        onChange={(checked) => handleTogglePermission('allowAssigneeReassign', checked)}
                      />
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép xóa công việc</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Người thực hiện có quyền xóa bỏ công việc khỏi dự án
                        </Text>
                      </div>
                      <Switch
                        checked={project.permissions?.allowAssigneeDeleteTask ?? false}
                        disabled={!canManage}
                        onChange={(checked) => handleTogglePermission('allowAssigneeDeleteTask', checked)}
                      />
                    </div>
                  </div>
                </Card>

                {/* Group 2: Quyền hạn của Người tạo & Người theo dõi */}
                <Card
                  title={<Space><KeyOutlined style={{ color: '#10b981' }} /><Text strong>Quyền hạn của Người tạo & Người theo dõi (Followers)</Text></Space>}
                  className="saas-card"
                  size="small"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép Người tạo xóa công việc của mình</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Người tạo ra công việc được quyền xóa công việc nếu chưa hoàn thành hoặc không còn cần thiết
                        </Text>
                      </div>
                      <Switch
                        checked={project.permissions?.allowCreatorDeleteTask ?? true}
                        disabled={!canManage}
                        onChange={(checked) => handleTogglePermission('allowCreatorDeleteTask', checked)}
                      />
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép Người theo dõi đánh dấu hoàn thành</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Người theo dõi có quyền chuyển trạng thái công việc sang hoàn thành (done)
                        </Text>
                      </div>
                      <Switch
                        checked={project.permissions?.allowFollowerMarkDone ?? false}
                        disabled={!canManage}
                        onChange={(checked) => handleTogglePermission('allowFollowerMarkDone', checked)}
                      />
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép Người theo dõi bình luận & trao đổi</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Người theo dõi có quyền gửi nhận xét, phản hồi và tệp đính kèm trong công việc
                        </Text>
                      </div>
                      <Switch
                        checked={project.permissions?.allowFollowerComment ?? true}
                        disabled={!canManage}
                        onChange={(checked) => handleTogglePermission('allowFollowerComment', checked)}
                      />
                    </div>
                  </div>
                </Card>

                {/* Group 3: Quyền hạn của Thành viên & Khách */}
                <Card
                  title={<Space><TeamOutlined style={{ color: '#f59e0b' }} /><Text strong>Quyền hạn của Thành viên & Khách trong dự án</Text></Space>}
                  className="saas-card"
                  size="small"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép Thành viên tạo công việc mới</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Bất kỳ thành viên nào trong dự án cũng có thể tạo công việc mới
                        </Text>
                      </div>
                      <Switch
                        checked={project.permissions?.allowMembersCreateTasks ?? true}
                        disabled={!canManage}
                        onChange={(checked) => handleTogglePermission('allowMembersCreateTasks', checked)}
                      />
                    </div>
                    <Divider style={{ margin: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Cho phép Khách (Guest) tạo công việc</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          Người dùng có vai trò khách trong dự án được phép tạo công việc
                        </Text>
                      </div>
                      <Switch
                        checked={project.permissions?.allowGuestCreateTask ?? false}
                        disabled={!canManage}
                        onChange={(checked) => handleTogglePermission('allowGuestCreateTask', checked)}
                      />
                    </div>
                  </div>
                </Card>
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
                  background: 'var(--brand-primary)',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                }}
              >
                {editingMember ? (t('common.saveChanges') || 'Lưu thay đổi') : (t('projectDetail.addMember') || 'Thêm vào dự án')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer chi tiết công việc (Base Wework) */}
      <TaskDetailDrawer
        open={detailDrawerOpen}
        taskId={selectedDetailTaskId}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedDetailTaskId(null);
        }}
        currentUser={user}
        onTaskUpdated={load}
        onOpenEdit={handleOpenEditTask}
        companyUsers={staff.map((r) => ({
          _id: r.user?._id || r.userId || r._id,
          name: r.user?.name || r.userName || r.position,
          email: r.user?.email || r.email,
          avatar: r.user?.avatar || r.avatar,
          position: r.position,
        }))}
      />

      {/* Modal Tạo / Sửa công việc */}
      <TaskFormModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        editingTask={editingTask}
        form={taskForm}
        canManageTasks={canManage}
        currentUser={user}
        projects={project ? [project] : []}
        resources={staff}
        knownSkillOptions={[]}
        dependencyOptions={(tasks || []).filter((t) => !editingTask || t._id !== editingTask._id)}
        selectedProject={id}
        taskGroups={[]}
        onSubmit={handleTaskFormSubmit}
        submitting={taskSubmitting}
        t={t}
      />

      {/* Modal Gia hạn Deadline nhanh (1-Click) */}
      <Modal
        open={quickDeadlineModalOpen}
        onCancel={() => {
          setQuickDeadlineModalOpen(false);
          setQuickDeadlineTask(null);
        }}
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#f59e0b' }} />
            <span>Gia hạn thời hạn hoàn thành (Deadline)</span>
          </Space>
        }
        onOk={handleSubmitQuickDeadline}
        confirmLoading={quickDeadlineSubmitting}
        okText="Lưu gia hạn"
        cancelText="Hủy"
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ display: 'block', marginBottom: 2 }}>
              Công việc: {quickDeadlineTask?.title}
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Hạn chót hiện tại:{' '}
              {quickDeadlineTask?.endDate
                ? dayjs(quickDeadlineTask.endDate).format('DD/MM/YYYY HH:mm')
                : 'Chưa thiết lập'}
            </Text>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Thời hạn mới (*):
            </Text>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              value={quickDeadlineDate}
              onChange={setQuickDeadlineDate}
              placeholder="Chọn ngày và giờ hoàn thành mới"
            />
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Lý do điều chỉnh thời hạn:
            </Text>
            <TextArea
              rows={3}
              placeholder="Nhập lý do gia hạn hoặc ghi chú tiến độ..."
              value={quickDeadlineReason}
              onChange={(e) => setQuickDeadlineReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
