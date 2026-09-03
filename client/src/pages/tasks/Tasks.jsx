/**
 * ============================================================================
 * TRANG QUẢN LÝ CÔNG VIỆC (Task Management Page)
 * ============================================================================
 *
 * Mục đích:
 *   - Quản lý danh sách công việc toàn diện theo 2 chế độ: Bảng Kanban & Bảng dữ liệu (Table).
 *   - Cung cấp tính năng kéo thả thay đổi trạng thái và tự động đồng bộ giờ làm việc.
 *   - Hỗ trợ gán kỹ năng phục vụ cho thuật toán tối ưu hóa nguồn lực AI (GA/CSP).
 *
 * Cấu trúc các module con:
 *   - TaskKpiChips: 4 thẻ thống kê nhanh (Tổng, Đang làm, Hoàn thành, Bị chặn)
 *   - TaskFilterBar: Tìm kiếm và bộ lọc theo dự án, mức độ ưu tiên
 *   - TaskKanbanView: Bảng Kanban kéo thả thời gian thực
 *   - TaskTableView: Danh sách bảng chi tiết
 *   - TaskFormModal: Modal tạo mới / cập nhật công việc
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography, Space, Segmented, Button, Form, message } from 'antd';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import taskService from '../../services/taskService';
import projectService from '../../services/projectService';
import resourceService from '../../services/resourceService';
import { TASK_STATUSES as STATUS_COLS, ROLES } from '../../constants';
import { invalidPredecessors } from '../../utils/gantt';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import TaskKpiChips from './components/TaskKpiChips';
import TaskFilterBar from './components/TaskFilterBar';
import TaskKanbanView from './components/TaskKanbanView';
import TaskTableView from './components/TaskTableView';
import TaskFormModal from './components/TaskFormModal';
import './Tasks.css';

const { Title, Text } = Typography;

export default function Tasks() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // --- TRẠNG THÁI DỮ LIỆU ---
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

  // Phân quyền: Admin và PM có toàn quyền; Member chỉ sửa task của chính mình
  const canManageTasks = user?.role === ROLES.ADMIN || user?.role === ROLES.PM;
  const isAssignedToMe = (task) => {
    const assigneeId = task?.assignee?._id || task?.assignee;
    return !!assigneeId && !!user?._id && assigneeId === user._id;
  };
  const canEditTask = (task) => canManageTasks || isAssignedToMe(task);

  /**
   * Tải danh sách công việc theo bộ lọc
   */
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

  /**
   * Tải danh sách dự án
   */
  const loadProjects = useCallback(async () => {
    try {
      const res = await projectService.getAll();
      setProjects(res.data.data.projects || []);
    } catch {
      // Bỏ qua lỗi kết nối ban đầu
    }
  }, []);

  /**
   * Tải danh sách nhân sự
   */
  const loadResources = useCallback(async () => {
    try {
      const res = await resourceService.getAll();
      setResources(res.data.data.resources || []);
    } catch {
      // Bỏ qua lỗi kết nối ban đầu
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadProjects();
    loadResources();
  }, [loadProjects, loadResources]);

  // Tải danh sách tasks thuộc dự án được chọn để thiết lập tiền nhiệm (Dependencies)
  useEffect(() => {
    if (!selectedProject) {
      setProjectTasks([]);
      return;
    }
    taskService
      .getAll({ project: selectedProject })
      .then((res) => setProjectTasks(res.data.data.tasks || []))
      .catch(() => setProjectTasks([]));
  }, [selectedProject]);

  // Gom nhóm các kỹ năng hiện có trong hệ thống để gợi ý AutoComplete
  const knownSkillOptions = useMemo(() => {
    const set = new Set();
    resources.forEach((r) => (r.skills || []).forEach((s) => s?.name && set.add(s.name.trim())));
    tasks.forEach((tItem) =>
      (tItem.requiredSkills || []).forEach((s) => s?.name && set.add(s.name.trim()))
    );
    return Array.from(set).sort().map((v) => ({ value: v }));
  }, [resources, tasks]);

  // Kiểm tra chống chu trình phụ thuộc (Cycle Dependency)
  const dependencyOptions = useMemo(() => {
    const invalid = editingTask ? invalidPredecessors(projectTasks, editingTask._id) : new Set();
    return projectTasks
      .filter((tItem) => !editingTask || tItem._id !== editingTask._id)
      .map((tItem) => ({
        value: tItem._id,
        label: `${tItem.title} (${tItem.status})`,
        disabled: invalid.has(tItem._id),
      }));
  }, [projectTasks, editingTask]);

  // Gom nhóm tasks theo các cột trạng thái Kanban
  const kanbanCols = useMemo(() => {
    const map = {};
    STATUS_COLS.forEach((c) => {
      map[c.key] = [];
    });
    tasks.forEach((task) => {
      if (map[task.status]) {
        map[task.status].push(task);
      } else {
        map.todo = map.todo || [];
        map.todo.push(task);
      }
    });
    return map;
  }, [tasks]);

  // Thống kê nhanh cho KPI chips
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((tItem) => tItem.status === 'in_progress').length;
    const done = tasks.filter((tItem) => tItem.status === 'done').length;
    const blocked = tasks.filter((tItem) => tItem.status === 'cancelled').length;
    return { total, inProgress, done, blocked };
  }, [tasks]);

  /**
   * Kéo thả công việc giữa các cột Kanban
   */
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((tItem) => tItem._id === taskId);
    if (!task || task.status === targetStatus) return;

    if (!canEditTask(task)) {
      message.warning(t('tasks.permissionDenied') || 'Bạn không có quyền chuyển trạng thái công việc này');
      return;
    }

    // Cập nhật UI lạc quan (Optimistic update)
    setTasks((prev) =>
      prev.map((tItem) => (tItem._id === taskId ? { ...tItem, status: targetStatus } : tItem))
    );

    try {
      await taskService.updateStatus(taskId, targetStatus);
      message.success(t('tasks.statusUpdated') || 'Đã cập nhật trạng thái công việc');
    } catch {
      message.error(t('tasks.statusUpdateFailed') || 'Lỗi cập nhật trạng thái');
      loadTasks();
    } finally {
      setDraggedTaskId(null);
    }
  };

  /**
   * Mở modal tạo mới công việc
   */
  const handleOpenCreate = () => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({
      priority: 'medium',
      status: 'todo',
      estimatedHours: 8,
      progress: 0,
      project: filters.project || undefined,
    });
    setModalOpen(true);
  };

  const handleOpenCreateInColumn = (statusKey) => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({
      status: statusKey,
      priority: 'medium',
      estimatedHours: 8,
      progress: 0,
      project: filters.project || undefined,
    });
    setModalOpen(true);
  };

  /**
   * Mở modal chỉnh sửa công việc
   */
  const handleOpenEdit = (task) => {
    setEditingTask(task);
    form.resetFields();
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      project: task.project?._id || task.project,
      assignee: task.assignee?._id || task.assignee,
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      progress: task.progress || 0,
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      requiredSkills: task.requiredSkills || [],
      dependencies: (task.dependencies || []).map((d) => d._id || d),
      dateRange:
        task.startDate && task.endDate
          ? [dayjs(task.startDate), dayjs(task.endDate)]
          : undefined,
    });
    setModalOpen(true);
  };

  /**
   * Xóa công việc
   */
  const handleDelete = async (id) => {
    try {
      await taskService.remove(id);
      message.success(t('tasks.deleted') || 'Đã xóa công việc');
      loadTasks();
    } catch {
      message.error(t('tasks.deleteFailed') || 'Lỗi khi xóa công việc');
    }
  };

  /**
   * Gửi biểu mẫu lưu công việc
   */
  const handleFormSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        startDate: values.dateRange?.[0] ? values.dateRange[0].toISOString() : undefined,
        endDate: values.dateRange?.[1] ? values.dateRange[1].toISOString() : undefined,
      };
      delete payload.dateRange;

      if (editingTask) {
        await taskService.update(editingTask._id, payload);
        message.success(t('tasks.updated') || 'Đã cập nhật công việc');
      } else {
        await taskService.create(payload);
        message.success(t('tasks.created') || 'Đã tạo công việc mới');
      }
      setModalOpen(false);
      loadTasks();
    } catch (err) {
      message.error(err.response?.data?.message || t('tasks.saveFailed') || 'Lỗi lưu công việc');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto' }}>
      {/* Tiêu đề trang */}
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
              onClick={handleOpenCreate}
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

      {/* 1. Khối KPI Chips */}
      <TaskKpiChips stats={stats} isDark={isDark} t={t} />

      {/* 2. Thanh lọc & tìm kiếm */}
      <TaskFilterBar
        filters={filters}
        setFilters={setFilters}
        projects={projects}
        view={view}
        setView={setView}
        canManageTasks={canManageTasks}
        onOpenCreateModal={handleOpenCreate}
        onReload={loadTasks}
        t={t}
      />

      {/* 3. Nội dung xem: Danh sách bảng hoặc Bảng Kanban */}
      {view === 'list' ? (
        <TaskTableView
          tasks={tasks}
          loading={loading}
          canEditTask={canEditTask}
          canManageTasks={canManageTasks}
          onOpenEdit={handleOpenEdit}
          onDelete={handleDelete}
          t={t}
        />
      ) : (
        <TaskKanbanView
          kanbanCols={kanbanCols}
          statusCols={STATUS_COLS}
          canManageTasks={canManageTasks}
          canEditTask={canEditTask}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onOpenCreateInColumn={handleOpenCreateInColumn}
          onOpenEdit={handleOpenEdit}
          isDark={isDark}
          t={t}
        />
      )}

      {/* 4. Modal tạo / sửa công việc */}
      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingTask={editingTask}
        form={form}
        canManageTasks={canManageTasks}
        projects={projects}
        resources={resources}
        knownSkillOptions={knownSkillOptions}
        dependencyOptions={dependencyOptions}
        selectedProject={selectedProject}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        t={t}
      />
    </div>
  );
}
