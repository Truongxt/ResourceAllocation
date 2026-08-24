import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Progress,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Tooltip,
  Segmented,
  Avatar,
  Empty,
  AutoComplete,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  UserOutlined,
  MinusCircleOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import taskService from '../services/taskService';
import projectService from '../services/projectService';
import resourceService from '../services/resourceService';
import {
  TASK_STATUSES as STATUS_COLS,
  PRIORITY_OPTIONS,
  ROLES,
} from '../constants';
import { invalidPredecessors } from '../utils/gantt';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  requiredSkillLevelOptions,
  taskStatusLabel,
  taskStatusOptions,
  priorityLabel,
  priorityOptions,
} from '../i18n/enums';
import { currentLocale } from '../i18n/format';
import './Tasks.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function Tasks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState('kanban');
  const [filters, setFilters] = useState({ search: '', project: '', priority: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [form] = Form.useForm();
  const selectedProject = Form.useWatch('project', form);

  const canManageTasks = user?.role === ROLES.ADMIN || user?.role === ROLES.PM;
  const isAssignedToMe = (task) => {
    const assigneeId = task?.assignee?._id || task?.assignee;
    return !!assigneeId && !!user?._id && assigneeId === user._id;
  };
  const canEditTask = (task) => canManageTasks || isAssignedToMe(task);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await taskService.getAll(params);
      setTasks(res.data.data.tasks || []);
    } catch {
      message.error(t('tasks.loadFailed') || 'Không thể tải danh sách công việc');
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectService.getAll();
      setProjects(res.data.data.projects || []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadResources = useCallback(async () => {
    try {
      const res = await resourceService.getAll();
      setResources(res.data.data.resources || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadTasks, filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadTasks, filters.search]);

  useEffect(() => {
    loadProjects();
    loadResources();
  }, [loadProjects, loadResources]);

  useEffect(() => {
    if (!modalOpen || !canManageTasks || !selectedProject) {
      setProjectTasks([]);
      return;
    }
    let cancelled = false;
    taskService
      .getAll({ project: selectedProject })
      .then((res) => {
        if (!cancelled) setProjectTasks(res.data.data.tasks || []);
      })
      .catch(() => {
        if (!cancelled) setProjectTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, canManageTasks, selectedProject]);

  const knownSkillOptions = useMemo(() => {
    const names = new Set();
    resources.forEach((r) => (r.skills || []).forEach((s) => s?.name && names.add(s.name.trim())));
    return [...names]
      .sort((a, b) => a.localeCompare(b, currentLocale()))
      .map((value) => ({ value }));
  }, [resources]);

  const dependencyOptions = useMemo(() => {
    const blocked = invalidPredecessors(projectTasks, editingTask?._id);
    return projectTasks
      .filter((item) => !blocked.has(String(item._id)))
      .map((item) => ({
        value: item._id,
        label: item.startDate
          ? t('tasks.dependencyFrom', {
              title: item.title,
              date: dayjs(item.startDate).format('DD/MM'),
            })
          : item.title,
      }));
  }, [projectTasks, editingTask, t]);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      done: tasks.filter((item) => item.status === 'done').length,
      inProgress: tasks.filter((item) => item.status === 'in_progress' || item.status === 'review').length,
      blocked: tasks.filter((item) => item.status === 'blocked').length,
    }),
    [tasks]
  );

  const kanbanCols = useMemo(() => {
    const grouped = {};
    STATUS_COLS.forEach((col) => {
      grouped[col.key] = [];
    });
    tasks.forEach((item) => {
      if (grouped[item.status]) grouped[item.status].push(item);
    });
    return grouped;
  }, [tasks]);

  const openCreate = () => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'todo',
      priority: 'medium',
      progress: 0,
      estimatedHours: 8,
      assignee: undefined,
      requiredSkills: [],
      dependencies: [],
    });
    setModalOpen(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    const assigneeId = task.assignee?._id || (typeof task.assignee === 'string' ? task.assignee : undefined);
    form.setFieldsValue({
      title: task.title || '',
      description: task.description || '',
      project: task.project?._id || task.project || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      progress: task.progress || 0,
      assignee: assigneeId,
      requiredSkills: (task.requiredSkills || []).map((s) =>
        typeof s === 'string'
          ? { name: s, level: 3, weight: 1 }
          : { name: s.name, level: s.level ?? 3, weight: s.weight ?? 1 }
      ),
      dependencies: (task.dependencies || []).map((d) => d?._id || d).filter(Boolean),
      dateRange: task.startDate && task.endDate ? [dayjs(task.startDate), dayjs(task.endDate)] : undefined,
      estimatedHours: task.estimatedHours || 8,
      actualHours: task.actualHours || 0,
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (values) => {
    setSubmitting(true);
    const payload = {
      title: values.title,
      description: values.description,
      project: values.project,
      status: values.status,
      priority: values.priority,
      progress: values.progress || 0,
      estimatedHours: Number(values.estimatedHours) || 0,
      actualHours: Number(values.actualHours) || 0,
      assignee: values.assignee || null,
      dependencies: values.dependencies || [],
      requiredSkills: (values.requiredSkills || [])
        .filter((s) => s?.name?.trim())
        .map((s) => ({
          name: s.name.trim(),
          level: Number(s.level) || 3,
          weight: s.weight === undefined || s.weight === null ? 1 : Number(s.weight),
        })),
    };

    if (values.dateRange && values.dateRange.length === 2) {
      payload.startDate = values.dateRange[0].toISOString();
      payload.endDate = values.dateRange[1].toISOString();
    }

    try {
      if (editingTask) {
        const updatePayload = canManageTasks
          ? payload
          : {
              status: payload.status,
              progress: payload.progress,
              actualHours: payload.actualHours,
            };
        await taskService.update(editingTask._id, updatePayload);
        message.success(t('tasks.updated') || 'Đã cập nhật công việc');
      } else {
        await taskService.create(payload);
        message.success(t('tasks.created') || 'Đã tạo công việc mới');
      }
      setModalOpen(false);
      await loadTasks();
    } catch (err) {
      message.error(err.response?.data?.message || t('tasks.saveFailed') || 'Lỗi khi lưu công việc');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await taskService.remove(id);
      message.success(t('tasks.deleted') || 'Đã xóa công việc');
      await loadTasks();
    } catch (err) {
      message.error(err.response?.data?.message || t('tasks.deleteFailed') || 'Lỗi khi xóa công việc');
    }
  };

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    const task = tasks.find((item) => item._id === draggedTaskId);
    if (!task || task.status === newStatus) {
      setDraggedTaskId(null);
      return;
    }

    setTasks((prev) =>
      prev.map((item) => (item._id === draggedTaskId ? { ...item, status: newStatus } : item))
    );
    setDraggedTaskId(null);

    try {
      await taskService.updateStatus(draggedTaskId, newStatus);
    } catch {
      message.error(t('tasks.statusUpdateFailed') || 'Lỗi khi cập nhật trạng thái');
      await loadTasks();
    }
  };

  const tableColumns = [
    {
      title: t('nav.tasks') || 'Công việc',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ fontSize: 14, color: isDark ? '#f8fafc' : '#0f172a' }}>{text}</Text>
            {record.project && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#818cf8',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                }}
              >
                {record.project.code || record.project.name}
              </span>
            )}
          </div>
          {record.description && (
            <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ fontSize: 12, margin: '2px 0 0' }}>
              {record.description}
            </Paragraph>
          )}
          {(record.requiredSkills || []).length > 0 && (
            <Space size={[4, 4]} wrap style={{ marginTop: 4 }}>
              {record.requiredSkills.map((skill, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(6, 182, 212, 0.1)',
                    color: '#22d3ee',
                  }}
                >
                  {skill.name} Lv.{skill.level ?? 3}
                </span>
              ))}
            </Space>
          )}
        </div>
      ),
    },
    {
      title: t('common.status') || 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => (
        <Tag color={STATUS_COLS.find((c) => c.key === status)?.badgeColor || 'default'} style={{ borderRadius: 10 }}>
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
        <Tag color={PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || 'default'} style={{ borderRadius: 10 }}>
          {priorityLabel(priority)}
        </Tag>
      ),
    },
    {
      title: t('projectDetail.assignee') || 'Người thực hiện',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 180,
      render: (assignee) =>
        assignee ? (
          <Space size={8}>
            <Avatar size={24} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
            <Text style={{ fontSize: 13, fontWeight: 500 }}>{assignee.name}</Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>{t('common.unassigned') || 'Chưa phân công'}</Text>
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
      width: 130,
      render: (progress = 0) => (
        <Progress percent={progress} size="small" strokeColor="#6366f1" />
      ),
    },
    {
      title: t('common.actions') || 'Thao tác',
      key: 'actions',
      width: 90,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          {canEditTask(record) && (
            <Tooltip title={t('common.edit') || 'Sửa'}>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canManageTasks && (
            <Tooltip title={t('common.delete') || 'Xóa'}>
              <Popconfirm
                title={t('tasks.deleteConfirm') || 'Xác nhận xóa công việc?'}
                onConfirm={() => handleDelete(record._id)}
                okText={t('common.delete') || 'Xóa'}
                cancelText={t('common.cancel') || 'Hủy'}
                okButtonProps={{ danger: true }}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: '0 0 4px 0', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {t('pageTitle./tasks') || 'Quản lý Công việc'}
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {t('tasks.subtitle') || 'Theo dõi, phân công và kéo thả công việc theo bảng Kanban thời gian thực'}
          </Text>
        </div>

        <Space size="small">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'kanban', icon: <AppstoreOutlined />, label: 'Kanban' },
              { value: 'list', icon: <UnorderedListOutlined />, label: t('tasks.listView') || 'Danh sách' },
            ]}
          />
          {canManageTasks && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreate}
              id="btn-create-task"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                fontWeight: 600,
              }}
            >
              {t('tasks.create') || 'Tạo công việc'}
            </Button>
          )}
        </Space>
      </div>

      {/* 4 Top KPI Metric Chips */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="icon-chip icon-chip-primary">
              <ClockCircleOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('tasks.stats.total') || 'Tổng công việc'}
              </Text>
              <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                {stats.total}
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="icon-chip icon-chip-info">
              <SyncOutlined spin />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('enums.taskStatus.in_progress') || 'Đang thực hiện'}
              </Text>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#06b6d4' }} className="tabular-nums">
                {stats.inProgress}
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="icon-chip icon-chip-success">
              <CheckCircleOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('enums.taskStatus.done') || 'Hoàn thành'}
              </Text>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }} className="tabular-nums">
                {stats.done}
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div className="saas-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`icon-chip ${stats.blocked > 0 ? 'icon-chip-danger' : 'icon-chip-primary'}`}>
              <CloseCircleOutlined />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                {t('enums.taskStatus.blocked') || 'Bị chặn'}
              </Text>
              <div style={{ fontSize: 22, fontWeight: 800, color: stats.blocked > 0 ? '#ef4444' : isDark ? '#f8fafc' : '#0f172a' }} className="tabular-nums">
                {stats.blocked}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Toolbar / Filters */}
      <div className="saas-card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined style={{ color: '#64748b' }} />}
              placeholder={t('tasks.searchPlaceholder') || 'Tìm kiếm theo tiêu đề công việc...'}
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('gantt.allProjects') || 'Tất cả dự án'}
              value={filters.project || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, project: val || '' }))}
              allowClear
              options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('common.priority') || 'Tất cả độ ưu tiên'}
              value={filters.priority || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, priority: val || '' }))}
              allowClear
              options={priorityOptions()}
            />
          </Col>
          <Col xs={24} md={2} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadTasks} title={t('common.reload') || 'Tải lại'} />
          </Col>
        </Row>
      </div>

      {/* View Content */}
      {view === 'list' ? (
        <div className="saas-card" style={{ overflow: 'hidden' }}>
          <Table
            columns={tableColumns}
            dataSource={tasks}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (count) => t('tasks.totalCount', { count }) || `Tổng số: ${count} công việc`,
            }}
          />
        </div>
      ) : (
        /* Kanban View */
        <div className="kanban-board-antd">
          {STATUS_COLS.map((col) => {
            const colTasks = kanbanCols[col.key] || [];
            return (
              <div
                key={col.key}
                className="kanban-column-antd"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div
                  className="kanban-column-header-antd"
                  style={{ borderTop: `3px solid ${col.color}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a' }}>
                      {taskStatusLabel(col.key)}
                    </Text>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                        color: isDark ? '#cbd5e1' : '#475569',
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  {canManageTasks && (
                    <Tooltip title="Thêm công việc vào cột này">
                      <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined style={{ fontSize: 12 }} />}
                        onClick={() => {
                          setEditingTask(null);
                          form.resetFields();
                          form.setFieldsValue({ status: col.key, priority: 'medium', estimatedHours: 8 });
                          setModalOpen(true);
                        }}
                      />
                    </Tooltip>
                  )}
                </div>

                <div className="kanban-column-body-antd">
                  {colTasks.length === 0 ? (
                    <div className="kanban-empty-antd">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('tasks.dropHere') || 'Kéo thả công việc vào đây'}
                      </Text>
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const priorityOpt = PRIORITY_OPTIONS.find((p) => p.value === task.priority);

                      return (
                        <div
                          key={task._id}
                          className="kanban-task-card"
                          draggable={canEditTask(task)}
                          onDragStart={(e) => handleDragStart(e, task._id)}
                          style={{
                            padding: '12px 14px',
                            cursor: canEditTask(task) ? 'grab' : 'default',
                          }}
                        >
                          {/* Top Card Badge Row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {task.project && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    color: '#818cf8',
                                    border: '1px solid rgba(99, 102, 241, 0.25)',
                                  }}
                                >
                                  {task.project.code || task.project.name}
                                </span>
                              )}
                              <Tag color={priorityOpt?.color || 'default'} style={{ borderRadius: 6, margin: 0, fontSize: 10 }}>
                                {priorityLabel(task.priority)}
                              </Tag>
                            </div>

                            <Space size={2}>
                              {canEditTask(task) && (
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<EditOutlined style={{ fontSize: 12 }} />}
                                  onClick={() => openEdit(task)}
                                />
                              )}
                            </Space>
                          </div>

                          {/* Task Title */}
                          <div style={{ marginBottom: 10 }}>
                            <Text strong style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#0f172a', lineHeight: 1.35, display: 'block' }}>
                              {task.title}
                            </Text>
                          </div>

                          {/* Progress bar if > 0 */}
                          {(task.progress || 0) > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <Progress
                                percent={task.progress || 0}
                                size="small"
                                strokeColor="#6366f1"
                                trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}
                              />
                            </div>
                          )}

                          {/* Skills chip if present */}
                          {(task.requiredSkills || []).length > 0 && (
                            <div style={{ marginBottom: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {task.requiredSkills.slice(0, 2).map((s, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: 'rgba(6, 182, 212, 0.1)',
                                    color: '#22d3ee',
                                  }}
                                >
                                  {s.name}
                                </span>
                              ))}
                              {task.requiredSkills.length > 2 && (
                                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                  +{task.requiredSkills.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Card Footer: Assignee & Hours */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: 8,
                              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #f1f5f9',
                            }}
                          >
                            <Space size={6}>
                              <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1', fontSize: 11 }} />
                              <Text style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>
                                {task.assignee?.name || t('common.unassigned') || 'Chưa gán'}
                              </Text>
                            </Space>

                            <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }} className="tabular-nums">
                              ⏱️ {task.estimatedHours || 0}h
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <Modal
        title={editingTask ? (t('tasks.editTitle') || 'Chỉnh sửa công việc') : (t('tasks.createTitle') || 'Tạo công việc mới')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={680}
        destroyOnClose
      >
        {!canManageTasks && (
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            message={t('tasks.memberNotice.title') || 'Thông báo phân quyền'}
            description={t('tasks.memberNotice.body') || 'Bạn đang đăng nhập với quyền thành viên. Bạn chỉ có thể cập nhật tiến độ công việc được giao.'}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label={t('tasks.form.title') || 'Tiêu đề công việc'}
            rules={[{ required: true, message: t('tasks.form.titleRequired') || 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Thiết kế giao diện bảng Kanban..." disabled={!canManageTasks} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="project"
                label={t('common.project') || 'Thuộc dự án'}
                rules={[{ required: true, message: t('tasks.form.projectRequired') || 'Vui lòng chọn dự án' }]}
              >
                <Select
                  placeholder={t('tasks.form.projectPlaceholder') || 'Chọn dự án...'}
                  disabled={!canManageTasks}
                  options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label={t('common.status') || 'Trạng thái'} rules={[{ required: true }]}>
                <Select options={taskStatusOptions().map((s) => ({ value: s.key, label: s.label }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="assignee" label={t('projectDetail.assignee') || 'Phân công nhân sự'}>
                <Select
                  placeholder={t('tasks.form.assigneePlaceholder') || 'Chọn nhân sự phụ trách...'}
                  allowClear
                  disabled={!canManageTasks}
                  options={resources.map((r) => ({
                    value: r.user?._id || r.userId || r._id,
                    label: (
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                        <span>{r.user?.name || r.userName || r.position}</span>
                        <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{r.position}</Tag>
                      </Space>
                    ),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label={t('common.priority') || 'Độ ưu tiên'} rules={[{ required: true }]}>
                <Select options={priorityOptions()} disabled={!canManageTasks} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={t('tasks.form.description') || 'Mô tả chi tiết'}>
            <TextArea rows={3} placeholder="Mô tả công việc..." disabled={!canManageTasks} />
          </Form.Item>

          <Form.Item
            label={t('tasks.form.requiredSkills') || 'Kỹ năng yêu cầu cho thuật toán phân bổ AI'}
            extra={t('tasks.form.requiredSkillsHint') || 'Thuật toán GA / CSP sẽ dựa vào kỹ năng này để tìm nhân sự phù hợp nhất'}
            style={{ marginBottom: 12 }}
          >
            <Form.List name="requiredSkills">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'name']}
                        rules={[{ required: true, message: t('tasks.form.skillNameRequired') || 'Nhập tên kỹ năng' }]}
                        style={{ width: 210, marginBottom: 0 }}
                      >
                        <AutoComplete
                          placeholder="React, Nodejs, SQL..."
                          options={knownSkillOptions}
                          filterOption={(input, option) =>
                            option.value.toLowerCase().includes(input.toLowerCase())
                          }
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'level']}
                        style={{ width: 210, marginBottom: 0 }}
                      >
                        <Select
                          options={requiredSkillLevelOptions()}
                          placeholder="Cấp độ yêu cầu"
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'weight']}
                        style={{ width: 130, marginBottom: 0 }}
                      >
                        <InputNumber
                          min={0}
                          max={1}
                          step={0.1}
                          addonBefore="Trọng số"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>

                      <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                    </Space>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add({ level: 3, weight: 1 })}
                    block
                    icon={<PlusOutlined />}
                  >
                    {t('tasks.form.addSkill') || 'Thêm kỹ năng'}
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>

          {canManageTasks && (
            <Form.Item
              name="dependencies"
              label={t('tasks.form.dependencies') || 'Công việc tiền nhiệm (CSP Dependency)'}
              extra={selectedProject ? 'Công việc này chỉ có thể bắt đầu sau khi các công việc tiền nhiệm hoàn thành' : 'Vui lòng chọn dự án trước'}
            >
              <Select
                mode="multiple"
                allowClear
                disabled={!selectedProject}
                placeholder="Chọn công việc tiền nhiệm..."
                options={dependencyOptions}
                optionFilterProp="label"
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="progress" label={t('tasks.form.progress') || 'Tiến độ (%)'}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="estimatedHours" label={t('tasks.form.estimatedHours') || 'Giờ ước tính'}>
                <InputNumber min={0} style={{ width: '100%' }} disabled={!canManageTasks} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actualHours" label={t('tasks.form.actualHours') || 'Giờ thực tế'}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dateRange" label={t('projects.form.dateRange') || 'Thời gian thực hiện'}>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabled={!canManageTasks}
            />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>{t('common.cancel') || 'Hủy'}</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                }}
              >
                {editingTask ? (t('common.saveChanges') || 'Lưu thay đổi') : (t('tasks.create') || 'Tạo công việc')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
