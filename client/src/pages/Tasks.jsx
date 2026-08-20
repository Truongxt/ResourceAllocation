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
  // Công việc cùng dự án, dùng làm nguồn cho ô chọn tiền nhiệm. Tải riêng vì
  // danh sách chính đang bị lọc/tìm kiếm nên không đủ để chọn.
  const [projectTasks, setProjectTasks] = useState([]);
  const [form] = Form.useForm();
  const selectedProject = Form.useWatch('project', form);

  // Khớp với phân quyền ở server: Admin/PM toàn quyền, Member chỉ cập nhật
  // tiến độ công việc được giao cho mình (xem middleware/taskAccess.js)
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
    } catch (err) {
      message.error(err.response?.data?.message || t('tasks.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectService.getAll({ limit: 100 });
      setProjects(res.data.data.projects || []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadResources = useCallback(async () => {
    try {
      const res = await resourceService.getAll({ limit: 100 });
      setResources(res.data.data.resources || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadResources();
  }, [loadProjects, loadResources]);

  useEffect(() => {
    const timer = setTimeout(loadTasks, filters.search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [loadTasks]);

  useEffect(() => {
    if (!modalOpen || !canManageTasks || !selectedProject) {
      setProjectTasks([]);
      return;
    }
    let cancelled = false;
    taskService
      .getAll({ project: selectedProject, limit: 100 })
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

  // Gợi ý tên kỹ năng từ Skill Matrix của nhân sự. Thuật toán so khớp kỹ năng
  // theo TÊN, nên gõ lệch một chữ là điểm khớp về 0 mà không có cảnh báo nào.
  const knownSkillOptions = useMemo(() => {
    const names = new Set();
    resources.forEach((r) => (r.skills || []).forEach((s) => s?.name && names.add(s.name.trim())));
    return [...names]
      .sort((a, b) => a.localeCompare(b, currentLocale()))
      .map((value) => ({ value }));
  }, [resources]);

  // Loại chính công việc đang sửa và mọi công việc phụ thuộc vào nó — chọn chúng
  // làm tiền nhiệm sẽ tạo vòng lặp. Server kiểm tra lại điều này khi lưu.
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
      inProgress: tasks.filter((item) => item.status === 'in_progress' || item.status === 'review')
        .length,
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
      // Giữ nguyên level/weight đã lưu — trước đây form chỉ đọc tên rồi ghi đè
      // level về 2, nên mỗi lần sửa task là mất luôn mức yêu cầu đã đặt.
      requiredSkills: (task.requiredSkills || []).map((s) =>
        typeof s === 'string'
          ? { name: s, level: 3, weight: 1 }
          : { name: s.name, level: s.level ?? 3, weight: s.weight ?? 1 }
      ),
      dependencies: (task.dependencies || []).map((d) => d?._id || d).filter(Boolean),
      dateRange:
        task.startDate && task.endDate ? [dayjs(task.startDate), dayjs(task.endDate)] : undefined,
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
        // Người được giao việc chỉ được gửi các trường về tiến độ; gửi thừa
        // trường khác sẽ bị server từ chối (middleware/taskAccess.js)
        const updatePayload = canManageTasks
          ? payload
          : {
              status: payload.status,
              progress: payload.progress,
              actualHours: payload.actualHours,
            };
        await taskService.update(editingTask._id, updatePayload);
        message.success(t('tasks.updated'));
      } else {
        await taskService.create(payload);
        message.success(t('tasks.created'));
      }
      setModalOpen(false);
      await loadTasks();
    } catch (err) {
      message.error(err.response?.data?.message || t('tasks.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await taskService.remove(id);
      message.success(t('tasks.deleted'));
      await loadTasks();
    } catch (err) {
      message.error(err.response?.data?.message || t('tasks.deleteFailed'));
    }
  };

  // Drag & Drop handlers for Kanban
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
      message.error(t('tasks.statusUpdateFailed'));
      await loadTasks();
    }
  };

  const tableColumns = [
    {
      title: t('nav.tasks'),
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>{text}</Text>
          {record.project && (
            <Tag color="purple" style={{ marginLeft: 8 }}>
              {record.project.code || record.project.name}
            </Tag>
          )}
          {record.description && (
            <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ fontSize: 12, margin: '2px 0 0' }}>
              {record.description}
            </Paragraph>
          )}
          {(record.requiredSkills || []).length > 0 && (
            <Space size={[4, 4]} wrap style={{ marginTop: 4 }}>
              {record.requiredSkills.map((skill, idx) => (
                <Tooltip
                  key={idx}
                  title={t('tasks.skillTooltip', {
                    level: skill.level ?? 3,
                    weight: skill.weight ?? 1,
                  })}
                >
                  <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>
                    {skill.name} Lv.{skill.level ?? 3}
                    {(skill.weight ?? 1) !== 1 && ` ×${skill.weight}`}
                  </Tag>
                </Tooltip>
              ))}
            </Space>
          )}
        </div>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => (
        <Tag color={STATUS_COLS.find((c) => c.key === status)?.badgeColor || 'default'}>
          {taskStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: t('common.priority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (priority) => (
        <Tag color={PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || 'default'}>
          {priorityLabel(priority)}
        </Tag>
      ),
    },
    {
      title: t('projectDetail.assignee'),
      dataIndex: 'assignee',
      key: 'assignee',
      width: 180,
      render: (assignee) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
          <Text style={{ fontSize: 13, fontWeight: 500 }}>
            {assignee?.name || t('common.unassigned')}
          </Text>
        </Space>
      ),
    },
    {
      title: t('gantt.progress'),
      dataIndex: 'progress',
      key: 'progress',
      width: 140,
      render: (progress = 0) => (
        <Progress percent={progress} size="small" status={progress === 100 ? 'success' : 'active'} />
      ),
    },
    {
      title: t('tasks.hoursColumn'),
      key: 'hours',
      width: 160,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.estimatedHours || 0}h / <strong>{record.actualHours || 0}h</strong>
        </Text>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={canEditTask(record) ? t('common.edit') : t('tasks.editForbidden')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              disabled={!canEditTask(record)}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          {canManageTasks && (
            <Tooltip title={t('common.delete')}>
              <Popconfirm
                title={t('tasks.deleteConfirm')}
                onConfirm={() => handleDelete(record._id)}
                okText={t('common.delete')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>{t('pageTitle./tasks')}</Title>
          <Text type="secondary">{t('tasks.subtitle')}</Text>
        </div>
        <Space>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'kanban', icon: <AppstoreOutlined />, label: 'Kanban' },
              { value: 'list', icon: <UnorderedListOutlined />, label: t('tasks.listView') },
            ]}
          />
          {canManageTasks && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} id="btn-create-task">
              {t('tasks.create')}
            </Button>
          )}
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic title={t('tasks.stats.total')} value={stats.total} prefix={<ClockCircleOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic title={t('enums.taskStatus.in_progress')} value={stats.inProgress} prefix={<SyncOutlined spin style={{ color: '#2563eb' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic title={t('enums.taskStatus.done')} value={stats.done} prefix={<CheckCircleOutlined style={{ color: '#059669' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic
              title={t('enums.taskStatus.blocked')}
              value={stats.blocked}
              valueStyle={{ color: stats.blocked > 0 ? '#dc2626' : undefined }}
              prefix={<CloseCircleOutlined style={{ color: stats.blocked > 0 ? '#dc2626' : '#94a3b8' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t('tasks.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('gantt.allProjects')}
              value={filters.project || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, project: val || '' }))}
              allowClear
              options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('common.priority')}
              value={filters.priority || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, priority: val || '' }))}
              allowClear
              options={priorityOptions()}
            />
          </Col>
          <Col xs={24} md={2} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadTasks} title={t('common.reload')} />
          </Col>
        </Row>
      </Card>

      {/* View Content */}
      {view === 'list' ? (
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            columns={tableColumns}
            dataSource={tasks}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (count) => t('tasks.totalCount', { count }),
            }}
          />
        </Card>
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
                <div className="kanban-column-header-antd" style={{ borderTop: `3px solid ${col.color}` }}>
                  <Space>
                    <Text strong>{taskStatusLabel(col.key)}</Text>
                    <Tag>{colTasks.length}</Tag>
                  </Space>
                </div>

                <div className="kanban-column-body-antd">
                  {colTasks.length === 0 ? (
                    <div className="kanban-empty-antd">
                      <Text type="secondary" style={{ fontSize: 12 }}>{t('tasks.dropHere')}</Text>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <Card
                        key={task._id}
                        size="small"
                        hoverable
                        className="kanban-task-card"
                        draggable={canEditTask(task)}
                        onDragStart={(e) => handleDragStart(e, task._id)}
                        style={{ marginBottom: 10, cursor: canEditTask(task) ? 'grab' : 'default' }}
                        styles={{ body: { padding: '12px' } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 13, flex: 1 }}>{task.title}</Text>
                          <Space size={2}>
                            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(task)} />
                          </Space>
                        </div>

                        {task.project && (
                          <div style={{ marginBottom: 8 }}>
                            <Tag color="purple" style={{ fontSize: 11 }}>
                              {task.project.code || task.project.name}
                            </Tag>
                          </div>
                        )}

                        <div style={{ marginBottom: 8 }}>
                          <Progress percent={task.progress || 0} size="small" />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space size={6}>
                            <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
                            <Text style={{ fontSize: 12, fontWeight: 500 }}>
                              {task.assignee?.name
                                ? task.assignee.name.split(' ').slice(-1)[0]
                                : t('common.unassigned')}
                            </Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            ⏱️ {task.estimatedHours || 0}h
                          </Text>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <Modal
        title={editingTask ? t('tasks.editTitle') : t('tasks.createTitle')}
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
            message={t('tasks.memberNotice.title')}
            description={t('tasks.memberNotice.body')}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label={t('tasks.form.title')}
            rules={[{ required: true, message: t('tasks.form.titleRequired') }]}
          >
            <Input
              placeholder={t('tasks.form.titlePlaceholder')}
              disabled={!canManageTasks}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="project"
                label={t('common.project')}
                rules={[{ required: true, message: t('tasks.form.projectRequired') }]}
              >
                <Select
                  placeholder={t('tasks.form.projectPlaceholder')}
                  disabled={!canManageTasks}
                  options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label={t('common.status')} rules={[{ required: true }]}>
                <Select options={taskStatusOptions().map((s) => ({ value: s.key, label: s.label }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="assignee" label={t('projectDetail.assignee')}>
                <Select
                  placeholder={t('tasks.form.assigneePlaceholder')}
                  allowClear
                  disabled={!canManageTasks}
                  options={resources.map((r) => ({
                    value: r.user?._id || r.userId || r._id,
                    label: (
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
                        <span>{r.user?.name || r.userName || r.position}</span>
                        <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{r.position}</Tag>
                      </Space>
                    ),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label={t('common.priority')} rules={[{ required: true }]}>
                <Select options={priorityOptions()} disabled={!canManageTasks} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={t('tasks.form.description')}>
            <TextArea
              rows={3}
              placeholder={t('tasks.form.descriptionPlaceholder')}
              disabled={!canManageTasks}
            />
          </Form.Item>

          <Form.Item
            label={t('tasks.form.requiredSkills')}
            extra={t('tasks.form.requiredSkillsHint')}
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
                        rules={[{ required: true, message: t('tasks.form.skillNameRequired') }]}
                        style={{ width: 210, marginBottom: 0 }}
                      >
                        <AutoComplete
                          placeholder={t('tasks.form.skillNamePlaceholder')}
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
                          placeholder={t('tasks.form.skillLevel')}
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, 'weight']}
                        style={{ width: 130, marginBottom: 0 }}
                        tooltip={t('tasks.form.weightTooltip')}
                      >
                        <InputNumber
                          min={0}
                          max={1}
                          step={0.1}
                          addonBefore={t('tasks.form.weightShort')}
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
                    {t('tasks.form.addSkill')}
                  </Button>
                </>
              )}
            </Form.List>
          </Form.Item>

          {canManageTasks && (
            <Form.Item
              name="dependencies"
              label={t('tasks.form.dependencies')}
              extra={
                selectedProject
                  ? t('tasks.form.dependenciesHint')
                  : t('tasks.form.dependenciesPickProject')
              }
            >
              <Select
                mode="multiple"
                allowClear
                disabled={!selectedProject}
                placeholder={t('tasks.form.dependenciesPlaceholder')}
                options={dependencyOptions}
                notFoundContent={t('tasks.form.dependenciesEmpty')}
                optionFilterProp="label"
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="progress" label={t('tasks.form.progress')}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="estimatedHours" label={t('tasks.form.estimatedHours')}>
                <InputNumber min={0} style={{ width: '100%' }} disabled={!canManageTasks} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actualHours" label={t('tasks.form.actualHours')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dateRange" label={t('projects.form.dateRange')}>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabled={!canManageTasks}
            />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingTask ? t('common.saveChanges') : t('tasks.create')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
