import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import taskService from '../services/taskService';
import projectService from '../services/projectService';
import resourceService from '../services/resourceService';
import { TASK_STATUSES as STATUS_COLS, PRIORITY_OPTIONS, ROLES } from '../constants';
import { invalidPredecessors } from '../utils/gantt';
import { useAuth } from '../context/AuthContext';
import './Tasks.css';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function Tasks() {
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
      message.error(err.response?.data?.message || 'Không thể tải danh sách công việc');
    } finally {
      setLoading(false);
    }
  }, [filters]);

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

  // Loại chính công việc đang sửa và mọi công việc phụ thuộc vào nó — chọn chúng
  // làm tiền nhiệm sẽ tạo vòng lặp. Server kiểm tra lại điều này khi lưu.
  const dependencyOptions = useMemo(() => {
    const blocked = invalidPredecessors(projectTasks, editingTask?._id);
    return projectTasks
      .filter((t) => !blocked.has(String(t._id)))
      .map((t) => ({
        value: t._id,
        label: t.startDate ? `${t.title} · từ ${dayjs(t.startDate).format('DD/MM')}` : t.title,
      }));
  }, [projectTasks, editingTask]);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      done: tasks.filter((t) => t.status === 'done').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress' || t.status === 'review').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
    }),
    [tasks]
  );

  const kanbanCols = useMemo(() => {
    const grouped = {};
    STATUS_COLS.forEach((col) => {
      grouped[col.key] = [];
    });
    tasks.forEach((t) => {
      if (grouped[t.status]) grouped[t.status].push(t);
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
      requiredSkills: '',
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
      requiredSkills: (task.requiredSkills || []).map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean).join(', '),
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
      requiredSkills: values.requiredSkills
        ? values.requiredSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((name) => ({ name, level: 2 }))
        : [],
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
        message.success('Cập nhật công việc thành công');
      } else {
        await taskService.create(payload);
        message.success('Tạo công việc thành công');
      }
      setModalOpen(false);
      await loadTasks();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu công việc');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await taskService.remove(id);
      message.success('Xóa công việc thành công');
      await loadTasks();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xóa công việc');
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
    const task = tasks.find((t) => t._id === draggedTaskId);
    if (!task || task.status === newStatus) {
      setDraggedTaskId(null);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t._id === draggedTaskId ? { ...t, status: newStatus } : t))
    );
    setDraggedTaskId(null);

    try {
      await taskService.updateStatus(draggedTaskId, newStatus);
    } catch (err) {
      message.error('Không thể cập nhật trạng thái công việc');
      await loadTasks();
    }
  };

  const tableColumns = [
    {
      title: 'Công việc',
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
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const col = STATUS_COLS.find((c) => c.key === status) || { label: status, badgeColor: 'default' };
        return <Tag color={col.badgeColor}>{col.label}</Tag>;
      },
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      render: (priority) => {
        const opt = PRIORITY_OPTIONS.find((p) => p.value === priority) || { label: priority, color: 'default' };
        return <Tag color={opt.color}>{opt.label}</Tag>;
      },
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 180,
      render: (assignee) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#4f46e5' }} />
          <Text style={{ fontSize: 13, fontWeight: 500 }}>{assignee?.name || 'Chưa gán'}</Text>
        </Space>
      ),
    },
    {
      title: 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: 140,
      render: (progress = 0) => (
        <Progress percent={progress} size="small" status={progress === 100 ? 'success' : 'active'} />
      ),
    },
    {
      title: 'Giờ ước tính / thực tế',
      key: 'hours',
      width: 160,
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.estimatedHours || 0}h / <strong>{record.actualHours || 0}h</strong>
        </Text>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={canEditTask(record) ? 'Chỉnh sửa' : 'Chỉ người được giao hoặc quản lý mới sửa được'}>
            <Button
              type="text"
              icon={<EditOutlined />}
              disabled={!canEditTask(record)}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          {canManageTasks && (
            <Tooltip title="Xóa">
              <Popconfirm
                title="Xác nhận xóa công việc?"
                onConfirm={() => handleDelete(record._id)}
                okText="Xóa"
                cancelText="Hủy"
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
          <Title level={3} style={{ marginBottom: 4 }}>Quản lý Công việc</Title>
          <Text type="secondary">Tạo, phân công, theo dõi và quản lý công việc theo bảng Kanban hoặc danh sách</Text>
        </div>
        <Space>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'kanban', icon: <AppstoreOutlined />, label: 'Kanban' },
              { value: 'list', icon: <UnorderedListOutlined />, label: 'Danh sách' },
            ]}
          />
          {canManageTasks && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} id="btn-create-task">
              Tạo công việc
            </Button>
          )}
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic title="Tổng công việc" value={stats.total} prefix={<ClockCircleOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic title="Đang thực hiện" value={stats.inProgress} prefix={<SyncOutlined spin style={{ color: '#2563eb' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic title="Hoàn thành" value={stats.done} prefix={<CheckCircleOutlined style={{ color: '#059669' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable>
            <Statistic
              title="Bị chặn (Blocked)"
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
              placeholder="Tìm theo tiêu đề công việc..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Tất cả dự án"
              value={filters.project || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, project: val || '' }))}
              allowClear
              options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Mức ưu tiên"
              value={filters.priority || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, priority: val || '' }))}
              allowClear
              options={PRIORITY_OPTIONS}
            />
          </Col>
          <Col xs={24} md={2} style={{ textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadTasks} title="Tải lại" />
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
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng số ${total} công việc` }}
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
                    <Text strong>{col.label}</Text>
                    <Tag>{colTasks.length}</Tag>
                  </Space>
                </div>

                <div className="kanban-column-body-antd">
                  {colTasks.length === 0 ? (
                    <div className="kanban-empty-antd">
                      <Text type="secondary" style={{ fontSize: 12 }}>Kéo thả công việc vào đây</Text>
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
                              {task.assignee?.name ? task.assignee.name.split(' ').slice(-1)[0] : 'Chưa gán'}
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
        title={editingTask ? 'Cập nhật công việc' : 'Tạo công việc mới'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={680}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="Tiêu đề công việc"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Ví dụ: Thiết kế cơ sở dữ liệu cho Module Auth" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="project"
                label="Dự án"
                rules={[{ required: true, message: 'Vui lòng chọn dự án' }]}
              >
                <Select
                  placeholder="Chọn dự án"
                  options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                <Select options={STATUS_COLS.map((c) => ({ value: c.key, label: c.label }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="assignee" label="Người thực hiện (Assignee)">
                <Select
                  placeholder="-- Chưa gán người thực hiện --"
                  allowClear
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
              <Form.Item name="priority" label="Mức ưu tiên" rules={[{ required: true }]}>
                <Select options={PRIORITY_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả chi tiết">
            <TextArea rows={3} placeholder="Mô tả yêu cầu và kết quả đầu ra của công việc..." />
          </Form.Item>

          <Form.Item
            name="requiredSkills"
            label="Kỹ năng yêu cầu (Required Skills)"
            extra="Nhập các kỹ năng phân cách bằng dấu phẩy (VD: React, Node.js, MongoDB)"
          >
            <Input placeholder="React, Node.js, SQL" />
          </Form.Item>

          {canManageTasks && (
            <Form.Item
              name="dependencies"
              label="Công việc tiền nhiệm (Dependencies)"
              extra={
                selectedProject
                  ? 'Những công việc phải xong trước. Danh sách đã loại sẵn các lựa chọn tạo thành vòng lặp. Sơ đồ Gantt sẽ vẽ mũi tên và tính đường găng theo quan hệ này.'
                  : 'Chọn dự án trước để xem danh sách công việc có thể làm tiền nhiệm.'
              }
            >
              <Select
                mode="multiple"
                allowClear
                disabled={!selectedProject}
                placeholder="-- Không phụ thuộc công việc nào --"
                options={dependencyOptions}
                notFoundContent="Dự án chưa có công việc nào khác có thể chọn"
                optionFilterProp="label"
              />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="progress" label="Tiến độ hoàn thành (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="estimatedHours" label="Giờ ước tính (h)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actualHours" label="Giờ thực tế (h)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="dateRange" label="Thời gian thực hiện">
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingTask ? 'Lưu thay đổi' : 'Tạo công việc'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
