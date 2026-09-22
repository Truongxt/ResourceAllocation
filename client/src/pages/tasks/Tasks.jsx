import { useSearchParams } from 'react-router-dom';
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
import { Typography, Space, Segmented, Button, Form, Tabs, Tag, Modal, Input, message } from 'antd';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  FileExcelOutlined,
  SyncOutlined,
  UserOutlined,
  SendOutlined,
  EyeOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import taskService from '../../services/taskService';
import projectService from '../../services/projectService';
import resourceService from '../../services/resourceService';
import taskGroupService from '../../services/taskGroupService';
import { TASK_STATUSES as STATUS_COLS, ROLES } from '../../constants';
import { depId, invalidPredecessors } from '../../utils/gantt';
import { getTaskPermissions } from '../../utils/taskPermissions';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import TaskKpiChips from './components/TaskKpiChips';
import TaskFilterBar from './components/TaskFilterBar';
import TaskKanbanView from './components/TaskKanbanView';
import TaskTableView from './components/TaskTableView';
import TaskFormModal from './components/TaskFormModal';
import TaskGroupManagerModal from '../../components/tasks/TaskGroupManagerModal';
import TaskDetailDrawer from '../../components/tasks/TaskDetailDrawer';
import TaskExcelImportModal from '../../components/tasks/TaskExcelImportModal';
import RecurringTaskModal from '../../components/tasks/RecurringTaskModal';
import RemindersDrawer from '../../components/tasks/RemindersDrawer';
import PendingReviewDrawer from '../../components/tasks/PendingReviewDrawer';
import './Tasks.css';

const { Title, Text } = Typography;

export default function Tasks() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const attentionStatus = searchParams.get('status') === 'blocked' ? 'blocked' : '';
  const unassignedOnly = searchParams.get('unassigned') === 'true';
  const { user } = useAuth();
  const { isDark } = useTheme();

  // --- TRẠNG THÁI DỮ LIỆU ---
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState('list');
  const [filters, setFilters] = useState({ search: '', project: '', priority: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  // { taskId, reason } khi đang hỏi lý do thất bại từ thao tác kéo thả.
  const [failPrompt, setFailPrompt] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);

  // Base Wework: Drawer chi tiết công việc & Nhóm công việc
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [taskGroups, setTaskGroups] = useState([]);
  const [taskGroupModalOpen, setTaskGroupModalOpen] = useState(false);
  const [manageGroupProjectId, setManageGroupProjectId] = useState(null);
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId) { setSelectedDetailTaskId(taskId); setDetailDrawerOpen(true); }
  }, [searchParams]);

  // Base Wework: Không gian "Công việc của tôi" (Scope) & Lọc nhanh thời gian (Time Filter)
  const [scope, setScope] = useState('all'); // 'all' | 'my_tasks' | 'assigned_by_me' | 'following' | 'subordinates'
  const [timeFilter, setTimeFilter] = useState(searchParams.get('timeFilter') === 'overdue' ? 'overdue' : 'all'); // 'all' | 'today' | 'this_week' | 'overdue' | 'done'
  useEffect(() => {
    setTimeFilter(searchParams.get('timeFilter') === 'overdue' ? 'overdue' : 'all');
  }, [searchParams]);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [reviewQueueOpen, setReviewQueueOpen] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  const [form] = Form.useForm();
  const selectedProject = Form.useWatch('project', form);

  // Phân quyền: Admin và PM có toàn quyền; Creator và Assignee sửa task của mình
  const canManageTasks = user?.role === ROLES.ADMIN || user?.role === ROLES.PM || Boolean(user?.isOwner);
  const isAssignedToMe = (task) => {
    const assigneeId = task?.assignee?._id || task?.assignee;
    return !!assigneeId && !!user?._id && assigneeId.toString() === user._id.toString();
  };
  const isCreatedByMe = (task) => {
    const creatorId = task?.createdBy?._id || task?.createdBy;
    return !!creatorId && !!user?._id && creatorId.toString() === user._id.toString();
  };
  const canEditTask = (task) => {
    if (!task) return false;
    if (canManageTasks) return true;
    const taskProj =
      (projects || []).find((p) => (p._id || p.id) === (task.project?._id || task.project)) || task.project;
    const perms = getTaskPermissions(task, taskProj, user);
    return perms.canEditDetails || perms.canEditDeadline || perms.canChangeAssignee || perms.canUpdateStatus;
  };
  const canCreateAnyTask = canManageTasks || (Array.isArray(projects) && projects.length > 0);

  /**
   * Tải danh sách công việc theo bộ lọc
   */
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      if (attentionStatus) params.status = attentionStatus;
      if (unassignedOnly) params.unassigned = 'true';
      if (attentionStatus || unassignedOnly || timeFilter === 'overdue') params.includeSubtasks = 'true';
      if (scope !== 'all') params.scope = scope;
      if (timeFilter !== 'all') params.timeFilter = timeFilter;
      const res = await taskService.getAll(params);
      setTasks(res.data.data.tasks || []);
    } catch {
      message.error(t('tasks.loadFailed') || 'Không thể tải danh sách công việc');
    } finally {
      setLoading(false);
    }
  }, [filters, scope, timeFilter, attentionStatus, unassignedOnly, t]);

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

  // Base Wework: Tải danh sách nhóm công việc (Task Groups) thuộc dự án
  useEffect(() => {
    if (!selectedProject) {
      setTaskGroups([]);
      return;
    }
    taskGroupService
      .getByProject(selectedProject)
      .then((res) => setTaskGroups(res.data.data.groups || []))
      .catch(() => setTaskGroups([]));
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

    // Thất bại bắt buộc có lý do, nên không thể chuyển bằng một cú thả chuột. Hỏi
    // ngay tại đây thay vì để server trả 400 rồi thẻ nhảy ngược về chỗ cũ.
    if (targetStatus === 'failed') {
      setDraggedTaskId(null);
      setFailPrompt({ taskId, reason: '' });
      return;
    }

    // Cập nhật UI lạc quan (Optimistic update)
    setTasks((prev) =>
      prev.map((tItem) => (tItem._id === taskId ? { ...tItem, status: targetStatus } : tItem))
    );

    try {
      await taskService.updateStatus(taskId, targetStatus);
      message.success(t('tasks.statusUpdated') || 'Đã cập nhật trạng thái công việc');
    } catch (err) {
      // Hiện nguyên câu của server. Các lệnh chuyển trạng thái nay có thể bị từ chối
      // vì lý do cụ thể (chưa bật tính năng, thiếu lý do, phải qua bước đánh giá) —
      // nuốt hết thành "Lỗi cập nhật trạng thái" thì người dùng không biết làm gì tiếp.
      message.error(err.response?.data?.message || t('tasks.statusUpdateFailed') || 'Lỗi cập nhật trạng thái');
      loadTasks();
    } finally {
      setDraggedTaskId(null);
    }
  };

  // Nút hàng đợi đánh giá chỉ hiện khi thật sự có việc chờ mình: dự án không bật
  // đánh giá thì đây là một nút vĩnh viễn rỗng, và một nút rỗng dạy người dùng bỏ qua nó.
  const loadPendingReviewCount = useCallback(async () => {
    try {
      const res = await taskService.getPendingReviews();
      setPendingReviewCount(res.data?.data?.total || 0);
    } catch {
      setPendingReviewCount(0);
    }
  }, []);

  useEffect(() => {
    loadPendingReviewCount();
  }, [loadPendingReviewCount]);

  const handleConfirmFail = async () => {
    if (!failPrompt?.reason.trim()) {
      message.warning('Cần nhập lý do thất bại');
      return;
    }
    try {
      await taskService.updateStatus(failPrompt.taskId, 'failed', {
        failureReason: failPrompt.reason.trim(),
      });
      message.success('Đã đánh dấu công việc Thất bại');
      setFailPrompt(null);
      loadTasks();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể đánh dấu thất bại');
    }
  };

  /**
   * Mở Drawer chi tiết công việc (Base Wework)
   */
  const handleOpenDetail = (task) => {
    setSelectedDetailTaskId(task._id);
    setDetailDrawerOpen(true);
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
      taskGroup: undefined,
      followers: [],
      parentTask: undefined,
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
      taskGroup: undefined,
      followers: [],
      parentTask: undefined,
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
      // Giữ nguyên loại quan hệ đã lưu; bản ghi cũ chưa migrate không có `type`
      // nên rơi về finish_to_start — đúng ngữ nghĩa chúng vẫn đang chạy.
      dependencies: (task.dependencies || []).map((d) => ({
        task: depId(d),
        type: d?.type || 'finish_to_start',
      })),
      taskGroup: task.taskGroup?._id || task.taskGroup,
      followers: (task.followers || []).map((f) => f._id || f),
      parentTask: task.parentTask?._id || task.parentTask,
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
   * Nhân bản công việc (Base Wework)
   */
  const handleDuplicateTask = async (task) => {
    try {
      await taskService.duplicate(task._id);
      message.success(t('tasks.duplicated') || 'Đã nhân bản công việc thành công');
      loadTasks();
    } catch {
      message.error(t('tasks.duplicateFailed') || 'Không thể nhân bản công việc');
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
        if (!canManageTasks) {
          const taskProj =
            (projects || []).find((p) => (p._id || p.id) === (editingTask.project?._id || editingTask.project)) ||
            editingTask.project;
          const perms = getTaskPermissions(editingTask, taskProj, user);

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

        <Space size="middle" wrap>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'kanban', icon: <AppstoreOutlined />, label: 'Kanban' },
              { value: 'list', icon: <UnorderedListOutlined />, label: t('tasks.listView') || 'Danh sách' },
            ]}
          />

          {/* Base Wework: Nút Nhập từ Excel */}
          <Button
            icon={<FileExcelOutlined style={{ color: '#10b981' }} />}
            onClick={() => setExcelModalOpen(true)}
          >
            Nhập Excel
          </Button>

          {/* Base Wework: Nút Việc lặp lại */}
          <Button
            icon={<SyncOutlined style={{ color: 'var(--brand-primary)' }} />}
            onClick={() => setRecurringModalOpen(true)}
          >
            Việc lặp lại
          </Button>

          {/* Base Wework: Hàng đợi đánh giá kết quả */}
          {pendingReviewCount > 0 && (
            <Button
              icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
              onClick={() => setReviewQueueOpen(true)}
            >
              Chờ tôi duyệt
              <Tag color="warning" style={{ marginLeft: 6 }}>{pendingReviewCount}</Tag>
            </Button>
          )}

          {/* Base Wework: Nút Nhắc việc (Reminders) */}
          <Button
            icon={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
            onClick={() => setRemindersOpen(true)}
          >
            Nhắc việc
          </Button>

          {canCreateAnyTask && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              size="middle"
            >
              {t('tasks.create') || 'Tạo công việc'}
            </Button>
          )}
        </Space>
      </div>

      {/* Base Wework: Không gian "Công việc của tôi" - Tabs phân loại vai trò */}
      <div className="saas-card" style={{ padding: '0 16px', marginBottom: 16 }}>
        <Tabs
          activeKey={scope}
          onChange={setScope}
          items={[
            {
              key: 'all',
              label: (
                <span style={{ fontWeight: 600 }}>
                  <AppstoreOutlined style={{ marginRight: 6 }} />
                  Tất cả công việc
                </span>
              ),
            },
            {
              key: 'my_tasks',
              label: (
                <span style={{ fontWeight: 600 }}>
                  <UserOutlined style={{ marginRight: 6, color: '#3b82f6' }} />
                  Việc tôi làm
                </span>
              ),
            },
            {
              key: 'assigned_by_me',
              label: (
                <span style={{ fontWeight: 600 }}>
                  <SendOutlined style={{ marginRight: 6, color: '#f59e0b' }} />
                  Việc tôi giao
                </span>
              ),
            },
            {
              key: 'following',
              label: (
                <span style={{ fontWeight: 600 }}>
                  <EyeOutlined style={{ marginRight: 6, color: '#8b5cf6' }} />
                  Việc tôi theo dõi
                </span>
              ),
            },
            ...(user?.role !== 'member'
              ? [
                  {
                    key: 'subordinates',
                    label: (
                      <span style={{ fontWeight: 600 }}>
                        <TeamOutlined style={{ marginRight: 6, color: '#10b981' }} />
                        Nhân viên trực tiếp
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>

      {/* Base Wework: Thanh lọc thời gian nhanh (Time filter tags) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Text type="secondary" style={{ fontSize: 13, fontWeight: 600 }}>
          Thời hạn:
        </Text>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'today', label: 'Hôm nay' },
          { key: 'this_week', label: 'Tuần này' },
          { key: 'overdue', label: 'Quá hạn' },
          { key: 'done', label: 'Đã hoàn thành' },
        ].map((item) => (
          <Tag.CheckableTag
            key={item.key}
            checked={timeFilter === item.key}
            onChange={() => setTimeFilter(item.key)}
            style={{
              borderRadius: 4,
              padding: '2px 12px',
              fontSize: 12,
              fontWeight: timeFilter === item.key ? 700 : 500,
              cursor: 'pointer',
              border: `1px solid ${timeFilter === item.key ? 'var(--brand-primary)' : (isDark ? '#334155' : '#e2e8f0')}`,
              background: timeFilter === item.key ? (item.key === 'overdue' ? '#ef4444' : 'var(--brand-primary)') : undefined,
              color: timeFilter === item.key ? '#ffffff' : undefined,
            }}
          >
            {item.label}
          </Tag.CheckableTag>
        ))}
      </div>

      {(attentionStatus || unassignedOnly) && <div className="task-active-filter"><span>{t(attentionStatus ? 'workspace.blocked' : 'workspace.unassigned')}</span><Button size="small" onClick={() => setSearchParams({})}>{t('workspace.clearFilter')}</Button></div>}
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
        onManageGroups={(projId) => {
          setManageGroupProjectId(projId);
          setTaskGroupModalOpen(true);
        }}
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
          onOpenDetail={handleOpenDetail}
          onDelete={handleDelete}
          onDuplicate={handleDuplicateTask}
          onOpenDeadline={handleOpenDetail}
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
          onOpenDetail={handleOpenDetail}
          onDuplicate={handleDuplicateTask}
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
        currentUser={user}
        projects={projects}
        resources={resources}
        knownSkillOptions={knownSkillOptions}
        dependencyOptions={dependencyOptions}
        selectedProject={selectedProject}
        taskGroups={taskGroups}
        onManageTaskGroups={(projId) => {
          setManageGroupProjectId(projId);
          setTaskGroupModalOpen(true);
        }}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        t={t}
      />

      {/* 5. Drawer chi tiết công việc (Base Wework) */}
      <TaskDetailDrawer
        open={detailDrawerOpen}
        taskId={selectedDetailTaskId}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedDetailTaskId(null);
        }}
        currentUser={user}
        onTaskUpdated={loadTasks}
        onOpenEdit={handleOpenEdit}
        knownSkillOptions={knownSkillOptions}
        companyUsers={resources.map((r) => ({
          _id: r.user?._id || r.userId || r._id,
          name: r.user?.name || r.userName || r.position,
          email: r.user?.email || r.email,
          avatar: r.user?.avatar || r.avatar,
          position: r.position,
        }))}
      />

      {/* 6. Modal Nhập công việc từ Excel (Base Wework 3.3) */}
      <TaskExcelImportModal
        open={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        projects={projects}
        onImportSuccess={loadTasks}
      />

      {/* 7. Modal Quản lý công việc lặp lại (Base Wework 3.4) */}
      <RecurringTaskModal
        open={recurringModalOpen}
        onClose={() => setRecurringModalOpen(false)}
        projects={projects}
        resources={resources}
        onTaskGenerated={loadTasks}
      />

      {/* 9. Hàng đợi công việc chờ tôi đánh giá */}
      <PendingReviewDrawer
        open={reviewQueueOpen}
        onClose={() => setReviewQueueOpen(false)}
        onSelectTask={(id) => {
          setSelectedDetailTaskId(id);
          setDetailDrawerOpen(true);
        }}
        onReviewed={() => {
          loadTasks();
          loadPendingReviewCount();
        }}
      />

      {/* 10. Hỏi lý do khi kéo công việc sang cột Thất bại */}
      <Modal
        title="Đánh dấu công việc Thất bại"
        open={Boolean(failPrompt)}
        onCancel={() => setFailPrompt(null)}
        onOk={handleConfirmFail}
        okText="Đánh dấu thất bại"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        <p style={{ color: 'var(--text-secondary, #64748b)', marginTop: 0 }}>
          Công việc sẽ đóng lại và được đếm riêng trong báo cáo, không còn bị tính là quá hạn.
        </p>
        <Input.TextArea
          rows={4}
          value={failPrompt?.reason || ''}
          onChange={(e) => setFailPrompt((prev) => ({ ...prev, reason: e.target.value }))}
          placeholder="Vì sao công việc này không hoàn thành được?"
          maxLength={1000}
          showCount
        />
      </Modal>

      {/* 8. Drawer Nhắc nhở công việc cần hoàn thành (Base Wework Reminders) */}
      <RemindersDrawer
        open={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        onSelectTask={(id) => {
          setSelectedDetailTaskId(id);
          setDetailDrawerOpen(true);
        }}
        onTaskUpdated={loadTasks}
      />

      {/* 9. Modal Quản lý Nhóm công việc */}
      <TaskGroupManagerModal
        open={taskGroupModalOpen}
        onClose={() => {
          setTaskGroupModalOpen(false);
          setManageGroupProjectId(null);
        }}
        projectId={manageGroupProjectId || filters.project || selectedProject}
        projectName={
          projects.find((p) => (p._id || p.id) === (manageGroupProjectId || filters.project || selectedProject))?.name || ''
        }
        onGroupsUpdated={(newGroups) => {
          const currentTargetId = manageGroupProjectId || filters.project || selectedProject;
          if (currentTargetId && currentTargetId === selectedProject) {
            setTaskGroups(newGroups);
          }
          loadTasks();
        }}
      />
    </div>
  );
}
