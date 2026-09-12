/**
 * ============================================================================
 * BASE WEWORK — Task Detail Drawer
 * Drawer chi tiết công việc kiểu Base Wework với các tab:
 * - Thông tin chung
 * - Checklist
 * - Bình luận
 * - Công việc con (Subtasks)
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer, Tabs, Tag, Space, Avatar, Button, Input, Checkbox, Progress,
  Typography, Tooltip, Popconfirm, Divider, Select, message, Badge, Empty,
  Skeleton, InputNumber, DatePicker, Modal, Card, List,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, UserOutlined, MessageOutlined,
  CheckSquareOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  SendOutlined, UnorderedListOutlined,
  TeamOutlined, CalendarOutlined, FlagOutlined, ApartmentOutlined,
  CloseOutlined, EyeOutlined, CopyOutlined, HistoryOutlined, FileDoneOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import taskService from '../../services/taskService';
import SubtaskFormModal from './SubtaskFormModal';
import TaskResultModal from './TaskResultModal';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_MAP = {
  todo: { label: 'Cần làm', color: '#64748b', bg: '#f1f5f9' },
  in_progress: { label: 'Đang làm', color: '#3b82f6', bg: '#eff6ff' },
  review: { label: 'Đánh giá', color: '#f59e0b', bg: '#fffbeb' },
  done: { label: 'Hoàn thành', color: '#10b981', bg: '#ecfdf5' },
  blocked: { label: 'Bị chặn', color: '#ef4444', bg: '#fef2f2' },
};

const PRIORITY_MAP = {
  low: { label: 'Thấp', color: '#64748b', icon: '○' },
  medium: { label: 'Trung bình', color: '#3b82f6', icon: '◐' },
  high: { label: 'Cao', color: '#f59e0b', icon: '●' },
  critical: { label: 'Khẩn cấp', color: '#ef4444', icon: '🔴' },
};

export default function TaskDetailDrawer({
  open,
  taskId,
  onClose,
  currentUser,
  onTaskUpdated,
  companyUsers = [],
  knownSkillOptions = [],
  onOpenEdit,
}) {
  const { isDark } = useTheme();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Checklist
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // Comments
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Subtasks (Full Modal just like parent task)
  const [subtasks, setSubtasks] = useState([]);
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [subtaskSubmitting, setSubtaskSubmitting] = useState(false);

  // Followers
  const [followerSelectVisible, setFollowerSelectVisible] = useState(false);

  // Base Wework: Báo cáo kết quả & Gia hạn deadline
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [newDeadlineDate, setNewDeadlineDate] = useState(null);
  const [deadlineReason, setDeadlineReason] = useState('');
  const [updatingDeadline, setUpdatingDeadline] = useState(false);

  // Nhân bản công việc
  const handleDuplicateTask = async () => {
    if (!task) return;
    try {
      await taskService.duplicate(task._id);
      message.success('Đã nhân bản công việc thành công!');
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi nhân bản công việc');
    }
  };

  // Cập nhật gia hạn deadline
  const handleUpdateDeadline = async () => {
    if (!task || !newDeadlineDate) {
      message.warning('Vui lòng chọn thời hạn mới');
      return;
    }
    setUpdatingDeadline(true);
    try {
      await taskService.updateDeadline(task._id, {
        newEndDate: newDeadlineDate.toISOString(),
        reason: deadlineReason || 'Gia hạn theo yêu cầu tiến độ',
      });
      message.success('Đã gia hạn thời hạn thành công!');
      setDeadlineModalOpen(false);
      setNewDeadlineDate(null);
      setDeadlineReason('');
      loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi gia hạn thời hạn');
    } finally {
      setUpdatingDeadline(false);
    }
  };

  useEffect(() => {
    if (open && taskId) {
      loadTask();
      loadSubtasks();
    }
    // eslint-disable-next-line
  }, [open, taskId]);

  const loadTask = async () => {
    setLoading(true);
    try {
      const res = await taskService.getById(taskId);
      setTask(res.data?.data?.task || res.data?.task || res.data?.data || null);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải chi tiết công việc');
    } finally {
      setLoading(false);
    }
  };

  const loadSubtasks = async () => {
    try {
      const res = await taskService.getSubtasks(taskId);
      setSubtasks(res.data?.data?.subtasks || []);
    } catch {
      /* ignore */
    }
  };

  // === CHECKLIST HANDLERS ===
  const handleAddChecklist = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      await taskService.addChecklistItem(taskId, newChecklistTitle.trim());
      setNewChecklistTitle('');
      await loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi thêm mục checklist');
    }
  };

  const handleToggleChecklist = async (itemId) => {
    try {
      await taskService.toggleChecklistItem(taskId, itemId);
      await loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi cập nhật checklist');
    }
  };

  const handleRemoveChecklist = async (itemId) => {
    try {
      await taskService.removeChecklistItem(taskId, itemId);
      await loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi xóa mục checklist');
    }
  };

  // === COMMENT HANDLERS ===
  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await taskService.addComment(taskId, commentText.trim());
      setCommentText('');
      await loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi thêm bình luận');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await taskService.deleteComment(taskId, commentId);
      await loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi xóa bình luận');
    }
  };

  // === SUBTASKS HANDLERS (Full modal like parent task) ===
  const handleOpenCreateSubtask = () => {
    setEditingSubtask(null);
    setSubtaskModalOpen(true);
  };

  const handleOpenEditSubtask = (sub) => {
    setEditingSubtask(sub);
    setSubtaskModalOpen(true);
  };

  const handleSubtaskModalSubmit = async (payload, editing) => {
    setSubtaskSubmitting(true);
    try {
      if (editing) {
        await taskService.update(editing._id, payload);
        message.success('Đã cập nhật công việc con');
      } else {
        await taskService.createSubtask(taskId, payload);
        message.success('Đã tạo công việc con thành công');
      }
      setSubtaskModalOpen(false);
      await loadSubtasks();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Lỗi khi lưu công việc con');
    } finally {
      setSubtaskSubmitting(false);
    }
  };

  const handleToggleSubtask = async (subId, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      await taskService.updateStatus(subId, nextStatus);
      await loadSubtasks();
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi cập nhật trạng thái việc con');
    }
  };

  const handleDeleteSubtask = async (subId) => {
    try {
      await taskService.remove(subId);
      await loadSubtasks();
      message.success('Đã xóa công việc con');
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi xóa công việc con');
    }
  };

  // === FOLLOWER HANDLERS ===
  const handleAddFollower = async (userId) => {
    try {
      await taskService.addFollower(taskId, userId);
      setFollowerSelectVisible(false);
      await loadTask();
      message.success('Đã thêm người theo dõi');
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi thêm người theo dõi');
    }
  };

  const handleRemoveFollower = async (userId) => {
    try {
      await taskService.removeFollower(taskId, userId);
      await loadTask();
      message.success('Đã xóa người theo dõi');
      if (onTaskUpdated) onTaskUpdated();
    } catch {
      message.error('Lỗi khi xóa người theo dõi');
    }
  };

  // === COMPUTED ===
  const checklistProgress = useMemo(() => {
    if (!task?.checklist?.length) return { total: 0, completed: 0, percent: 0 };
    const total = task.checklist.length;
    const completed = task.checklist.filter((c) => c.isCompleted).length;
    return { total, completed, percent: Math.round((completed / total) * 100) };
  }, [task?.checklist]);

  const statusInfo = STATUS_MAP[task?.status] || STATUS_MAP.todo;
  const priorityInfo = PRIORITY_MAP[task?.priority] || PRIORITY_MAP.medium;

  // Theme colors
  const cardBg = isDark ? 'rgba(30, 41, 59, 0.6)' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const subtleBg = isDark ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc';

  // === TAB 1: THÔNG TIN (JSX Element) ===
  const infoTabContent = !task ? null : (
    <div style={{ padding: '4px 0' }}>
      {/* Status & Priority */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tag
          style={{
            background: statusInfo.bg, color: statusInfo.color,
            border: `1px solid ${statusInfo.color}30`, fontWeight: 600,
            borderRadius: 8, padding: '4px 12px', fontSize: 13,
          }}
        >
          {statusInfo.label}
        </Tag>
        <Tag
          style={{
            color: priorityInfo.color, fontWeight: 600,
            borderRadius: 8, padding: '4px 10px', fontSize: 13,
            border: `1px solid ${priorityInfo.color}30`,
          }}
        >
          <FlagOutlined /> {priorityInfo.label}
        </Tag>
        {(task.progress || 0) > 0 && (
          <Tag color="processing" style={{ borderRadius: 8, fontWeight: 600 }}>
            {task.progress}% hoàn thành
          </Tag>
        )}
      </div>

      {/* Mô tả */}
      <div style={{
        background: subtleBg, borderRadius: 10, padding: '14px 16px',
        border: `1px solid ${borderColor}`, marginBottom: 16,
      }}>
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
          Mô tả
        </Text>
        <Paragraph style={{ marginTop: 6, marginBottom: 0, fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {task.description || 'Chưa có mô tả'}
        </Paragraph>
      </div>

      {/* Grid thông tin */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <InfoCard icon={<UserOutlined />} label="Người thực hiện" isDark={isDark}>
          {task.assignee ? (
            <Space size={6}>
              <Avatar size={22} src={task.assignee.avatar} icon={<UserOutlined />}
                style={{ backgroundColor: '#3b82f6' }}>{task.assignee.name?.[0]}</Avatar>
              <Text style={{ fontSize: 13 }}>{task.assignee.name}</Text>
            </Space>
          ) : <Text type="secondary" style={{ fontSize: 13 }}>Chưa gán</Text>}
        </InfoCard>

        <InfoCard icon={<CalendarOutlined />} label="Thời hạn" isDark={isDark}>
          <Text style={{ fontSize: 13 }}>
            {task.startDate ? dayjs(task.startDate).format('DD/MM/YYYY') : '—'}
            {' → '}
            {task.endDate ? dayjs(task.endDate).format('DD/MM/YYYY') : '—'}
          </Text>
        </InfoCard>

        <InfoCard icon={<ClockCircleOutlined />} label="Ước lượng / Thực tế" isDark={isDark}>
          <Text style={{ fontSize: 13 }}>
            {task.estimatedHours || 0}h / {task.actualHours || 0}h
          </Text>
        </InfoCard>

        <InfoCard icon={<ApartmentOutlined />} label="Nhóm công việc" isDark={isDark}>
          {task.taskGroup ? (
            <Tag color={task.taskGroup.color} style={{ borderRadius: 6 }}>{task.taskGroup.name}</Tag>
          ) : <Text type="secondary" style={{ fontSize: 13 }}>Chưa phân nhóm</Text>}
        </InfoCard>
      </div>

      {/* Progress */}
      <div style={{
        background: subtleBg, borderRadius: 10, padding: '14px 16px',
        border: `1px solid ${borderColor}`,
      }}>
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
          Tiến độ công việc
        </Text>
        <Progress
          percent={task.progress || 0}
          strokeColor={{
            '0%': '#3b82f6',
            '100%': '#10b981',
          }}
          style={{ marginTop: 8 }}
          strokeWidth={10}
        />
      </div>
    </div>
  );

  // === TAB 2: CHECKLIST (JSX Element) ===
  const checklistTabContent = !task ? null : (
    <div style={{ padding: '4px 0' }}>
      {/* Progress bar */}
      {(task.checklist || []).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>
              <CheckSquareOutlined style={{ marginRight: 6 }} />
              Tiến độ: {checklistProgress.completed}/{checklistProgress.total}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{checklistProgress.percent}%</Text>
          </div>
          <Progress
            percent={checklistProgress.percent}
            showInfo={false}
            strokeColor={checklistProgress.percent === 100 ? '#10b981' : '#3b82f6'}
            strokeWidth={6}
          />
        </div>
      )}

      {/* Checklist items */}
      {(task.checklist || []).map((item) => (
        <div
          key={item._id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: item.isCompleted ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5') : subtleBg,
            border: `1px solid ${item.isCompleted ? '#10b98130' : borderColor}`,
            marginBottom: 8,
            transition: 'all 0.2s ease',
          }}
        >
          <Checkbox
            checked={item.isCompleted}
            onChange={() => handleToggleChecklist(item._id)}
            style={{ transform: 'scale(1.1)' }}
          />
          <Text
            style={{
              flex: 1, fontSize: 13.5,
              textDecoration: item.isCompleted ? 'line-through' : 'none',
              opacity: item.isCompleted ? 0.6 : 1,
            }}
          >
            {item.title}
          </Text>
          <Tooltip title="Xóa">
            <Button
              type="text" size="small" danger
              icon={<DeleteOutlined style={{ fontSize: 12 }} />}
              onClick={() => handleRemoveChecklist(item._id)}
            />
          </Tooltip>
        </div>
      ))}

      {/* Add new */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Input
          placeholder="Thêm mục checklist mới (Enter để thêm)..."
          value={newChecklistTitle}
          onChange={e => setNewChecklistTitle(e.target.value)}
          onPressEnter={handleAddChecklist}
          style={{
            borderRadius: 8, flex: 1,
            background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#fff',
          }}
        />
        <Button
          type="primary" icon={<PlusOutlined />}
          onClick={handleAddChecklist}
          disabled={!newChecklistTitle.trim()}
          style={{ borderRadius: 8 }}
        >
          Thêm
        </Button>
      </div>

      {!(task.checklist || []).length && !newChecklistTitle && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có mục checklist nào"
          style={{ margin: '24px 0' }}
        />
      )}
    </div>
  );

  // === TAB 3: BÌNH LUẬN (JSX Element) ===
  const commentsTabContent = !task ? null : (
    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Comment list */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
        {(task.comments || []).length > 0 ? (
          (task.comments || []).slice().reverse().map((comment) => {
            const isOwn = comment.user?._id === currentUser?._id || comment.user === currentUser?._id;
            return (
              <div
                key={comment._id}
                style={{
                  display: 'flex', gap: 10, marginBottom: 14,
                  padding: '12px 14px', borderRadius: 10,
                  background: isOwn ? (isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff') : subtleBg,
                  border: `1px solid ${isOwn ? '#3b82f630' : borderColor}`,
                }}
              >
                <Avatar
                  size={32}
                  src={comment.user?.avatar}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: isOwn ? '#3b82f6' : '#64748b', flexShrink: 0 }}
                >
                  {comment.user?.name?.[0]?.toUpperCase()}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 13 }}>{comment.user?.name || 'User'}</Text>
                    <Space size={4}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(comment.createdAt).fromNow()}
                      </Text>
                      {isOwn && (
                        <Popconfirm title="Xóa bình luận này?" onConfirm={() => handleDeleteComment(comment._id)}>
                          <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />} />
                        </Popconfirm>
                      )}
                    </Space>
                  </div>
                  <Paragraph style={{ marginBottom: 0, marginTop: 4, fontSize: 13.5, whiteSpace: 'pre-wrap' }}>
                    {comment.content}
                  </Paragraph>
                </div>
              </div>
            );
          })
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bình luận" style={{ margin: '24px 0' }} />
        )}
      </div>

      {/* Comment input */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-end',
        padding: '12px 0', borderTop: `1px solid ${borderColor}`,
      }}>
        <Avatar size={32} src={currentUser?.avatar} icon={<UserOutlined />}
          style={{ backgroundColor: '#3b82f6', flexShrink: 0 }}>
          {currentUser?.name?.[0]?.toUpperCase()}
        </Avatar>
        <TextArea
          placeholder="Viết bình luận (Enter để gửi, Shift + Enter để xuống dòng)..."
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={e => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleAddComment();
            }
          }}
          style={{
            borderRadius: 10, flex: 1,
            background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#fff',
          }}
        />
        <Button
          type="primary" shape="circle" icon={<SendOutlined />}
          onClick={handleAddComment}
          loading={commentLoading}
          disabled={!commentText.trim()}
          style={{ background: '#3b82f6' }}
        />
      </div>
    </div>
  );

  // === TAB 4: CÔNG VIỆC CON (JSX Element) ===
  const subtasksCompletedCount = subtasks.filter(s => s.status === 'done').length;
  const subtasksProgressPercent = subtasks.length > 0 ? Math.round((subtasksCompletedCount / subtasks.length) * 100) : 0;

  const subtasksTabContent = !task ? null : (
    <div style={{ padding: '4px 0' }}>
      {/* Action Header: Nút tạo công việc con đầy đủ thông tin */}
      <div style={{
        padding: '16px', borderRadius: 12, marginBottom: 16,
        background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
        border: `1px solid ${borderColor}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ApartmentOutlined style={{ color: '#6366f1', fontSize: 18 }} />
              <Text strong style={{ fontSize: 14 }}>
                Công việc con ({subtasks.length})
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
              Tạo và quản lý các công việc con với đầy đủ thông số như công việc chính
            </Text>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateSubtask}
            style={{
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
            }}
          >
            Tạo công việc con mới
          </Button>
        </div>

        {subtasks.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tiến độ hoàn thành: <strong style={{ color: subtasksProgressPercent === 100 ? '#10b981' : '#6366f1' }}>{subtasksCompletedCount}/{subtasks.length}</strong> ({subtasksProgressPercent}%)
              </Text>
            </div>
            <Progress
              percent={subtasksProgressPercent}
              size="small"
              strokeColor={{
                '0%': '#6366f1',
                '100%': '#10b981',
              }}
            />
          </div>
        )}
      </div>

      {/* Danh sách công việc con */}
      {subtasks.length > 0 ? (
        subtasks.map(sub => {
          const isDone = sub.status === 'done';
          const subStatus = STATUS_MAP[sub.status] || STATUS_MAP.todo;
          const subPriority = PRIORITY_MAP[sub.priority] || PRIORITY_MAP.medium;
          const hasDates = sub.startDate && sub.endDate;

          return (
            <div
              key={sub._id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                background: isDone ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#ecfdf5') : cardBg,
                border: `1px solid ${isDone ? '#10b98130' : borderColor}`,
                marginBottom: 10,
                transition: 'all 0.2s ease',
              }}
            >
              <Checkbox
                checked={isDone}
                onChange={() => handleToggleSubtask(sub._id, sub.status)}
                style={{ marginTop: 2, transform: 'scale(1.1)' }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text
                    strong
                    onClick={() => handleOpenEditSubtask(sub)}
                    style={{
                      fontSize: 14,
                      cursor: 'pointer',
                      color: isDone ? '#94a3b8' : (isDark ? '#f8fafc' : '#1e293b'),
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}
                  >
                    {sub.title}
                  </Text>
                  <Space size={4}>
                    <Tooltip title="Chỉnh sửa chi tiết">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined style={{ fontSize: 13, color: '#6366f1' }} />}
                        onClick={() => handleOpenEditSubtask(sub)}
                      />
                    </Tooltip>
                    <Tooltip title="Xóa công việc con">
                      <Popconfirm
                        title="Xóa công việc con này?"
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeleteSubtask(sub._id)}
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 13 }} />} />
                      </Popconfirm>
                    </Tooltip>
                  </Space>
                </div>

                {/* Subtask description preview */}
                {sub.description && (
                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    type="secondary"
                    style={{ fontSize: 12, margin: '4px 0 6px 0', lineHeight: 1.4 }}
                  >
                    {sub.description}
                  </Paragraph>
                )}

                {/* Subtask metadata badges */}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Tag style={{ borderRadius: 6, fontSize: 10, margin: 0, color: subStatus.color, background: subStatus.bg, border: `1px solid ${subStatus.color}30` }}>
                    {subStatus.label}
                  </Tag>

                  <Tag color={subPriority.color} style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>
                    {subPriority.icon} {subPriority.label}
                  </Tag>

                  {sub.assignee ? (
                    <Space size={4} style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: '1px 8px', borderRadius: 6 }}>
                      <Avatar size={16} src={sub.assignee.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#3b82f6' }} />
                      <Text style={{ fontSize: 11 }}>{sub.assignee.name || sub.assignee.email}</Text>
                    </Space>
                  ) : (
                    <Tag style={{ borderRadius: 6, fontSize: 10, margin: 0 }}>Chưa gán</Tag>
                  )}

                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <ClockCircleOutlined style={{ fontSize: 11 }} />
                    {sub.actualHours > 0 ? `${sub.actualHours}/${sub.estimatedHours || 0}h` : `${sub.estimatedHours || 0}h`}
                  </span>

                  {hasDates && (
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <CalendarOutlined style={{ fontSize: 11 }} />
                      {dayjs(sub.startDate).format('DD/MM')} - {dayjs(sub.endDate).format('DD/MM')}
                    </span>
                  )}

                  {(sub.progress || 0) > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: sub.progress === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                      color: sub.progress === 100 ? '#10b981' : '#6366f1',
                    }}>
                      {sub.progress}%
                    </span>
                  )}

                  {sub.followers && sub.followers.length > 0 && (
                    <Tooltip title={`${sub.followers.length} người theo dõi`}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        <EyeOutlined style={{ fontSize: 11 }} />
                        {sub.followers.length}
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div style={{
          textAlign: 'center', padding: '32px 16px', borderRadius: 12,
          border: `1px dashed ${borderColor}`, background: subtleBg, marginTop: 8,
        }}>
          <ApartmentOutlined style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 12 }} />
          <Text style={{ display: 'block', fontWeight: 600, fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}>
            Chưa có công việc con nào
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, marginBottom: 16 }}>
            Chia nhỏ công việc cha thành các nhiệm vụ con cụ thể để phân công và theo dõi tiến độ tốt hơn
          </Text>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreateSubtask}
            style={{
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              fontWeight: 600,
            }}
          >
            Tạo công việc con đầu tiên
          </Button>
        </div>
      )}
    </div>
  );

  // Base Wework: Tab Kết quả công việc
  const resultTabContent = (
    <div style={{ padding: '8px 0' }}>
      {task?.resultReport?.summary ? (
        <Card
          size="small"
          style={{
            background: isDark ? 'rgba(16, 185, 129, 0.05)' : '#f0fdf4',
            borderColor: isDark ? '#10b98130' : '#86efac',
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <Space>
              <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} />
              <strong style={{ fontSize: 14 }}>Báo cáo kết quả hoàn thành</strong>
            </Space>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => setResultModalOpen(true)}
            >
              Chỉnh sửa
            </Button>
          </div>

          <Paragraph style={{ whiteSpace: 'pre-line', fontSize: 13, color: isDark ? '#e2e8f0' : '#1e293b' }}>
            {task.resultReport.summary}
          </Paragraph>

          <Divider style={{ margin: '10px 0' }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12 }}>
            <Tag color="blue">
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {task.resultReport.actualHours || task.actualHours || 0}h thực tế
            </Tag>
            {task.resultReport.submittedBy && (
              <Text type="secondary">
                Nộp bởi: <strong>{task.resultReport.submittedBy.name}</strong>
              </Text>
            )}
            {task.resultReport.submittedAt && (
              <Text type="secondary">
                Thời gian: {dayjs(task.resultReport.submittedAt).format('DD/MM/YYYY HH:mm')}
              </Text>
            )}
          </div>

          {task.resultReport.deliverableLinks && task.resultReport.deliverableLinks.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Liên kết minh chứng đầu ra:
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {task.resultReport.deliverableLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: '#3b82f6',
                      textDecoration: 'underline',
                    }}
                  >
                    <LinkOutlined />
                    <span>{link.title || link.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 16px',
            borderRadius: 12,
            border: `1px dashed ${borderColor}`,
            background: subtleBg,
          }}
        >
          <FileDoneOutlined style={{ fontSize: 40, color: '#94a3b8', marginBottom: 12 }} />
          <Text style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>
            Chưa có báo cáo kết quả công việc
          </Text>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, marginBottom: 16 }}>
            Khi hoàn thành, hãy cập nhật tóm tắt sản phẩm đầu ra và đính kèm link minh chứng.
          </Text>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => setResultModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderColor: '#10b981',
              fontWeight: 600,
            }}
          >
            Báo cáo kết quả & Hoàn thành
          </Button>
        </div>
      )}
    </div>
  );

  // Base Wework: Tab Lịch sử thời hạn (Deadline)
  const historyTabContent = (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 13 }}>
          Thời hạn hiện tại: {task?.endDate ? dayjs(task.endDate).format('DD/MM/YYYY') : 'Chưa có'}
        </Text>
        <Button
          size="small"
          type="primary"
          icon={<ClockCircleOutlined />}
          onClick={() => {
            setNewDeadlineDate(task?.endDate ? dayjs(task.endDate).add(3, 'day') : dayjs().add(3, 'day'));
            setDeadlineReason('');
            setDeadlineModalOpen(true);
          }}
        >
          Gia hạn thời hạn
        </Button>
      </div>

      {(task?.deadlineHistory && task.deadlineHistory.length > 0) ? (
        <List
          size="small"
          dataSource={[...task.deadlineHistory].reverse()}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '10px 12px',
                background: cardBg,
                borderRadius: 8,
                marginBottom: 8,
                border: `1px solid ${borderColor}`,
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Space>
                  <Tag color="orange">
                    {item.oldEndDate ? dayjs(item.oldEndDate).format('DD/MM/YYYY') : '---'}
                  </Tag>
                  <span>→</span>
                  <Tag color="green">
                    {item.newEndDate ? dayjs(item.newEndDate).format('DD/MM/YYYY') : '---'}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(item.changedAt).format('DD/MM/YYYY HH:mm')}
                </Text>
              </div>
              <div style={{ fontSize: 12 }}>
                <Text type="secondary">Lý do: </Text>
                <span>{item.reason || 'Gia hạn theo yêu cầu'}</span>
              </div>
              {item.changedBy && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  Người duyệt/sửa: {item.changedBy.name || item.changedBy.email}
                </div>
              )}
            </List.Item>
          )}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
          Chưa có lịch sử điều chỉnh hạn chót
        </div>
      )}
    </div>
  );

  const tabItems = [
    {
      key: 'info',
      label: <span><UnorderedListOutlined style={{ marginRight: 4 }} /> Thông tin</span>,
      children: infoTabContent,
    },
    {
      key: 'checklist',
      label: (
        <span>
          <CheckSquareOutlined style={{ marginRight: 4 }} />
          Checklist
          {(task?.checklist || []).length > 0 && (
            <Badge
              count={`${checklistProgress.completed}/${checklistProgress.total}`}
              style={{ backgroundColor: checklistProgress.percent === 100 ? '#10b981' : '#3b82f6', marginLeft: 6, fontSize: 10 }}
            />
          )}
        </span>
      ),
      children: checklistTabContent,
    },
    {
      key: 'comments',
      label: (
        <span>
          <MessageOutlined style={{ marginRight: 4 }} />
          Bình luận
          {(task?.comments || []).length > 0 && (
            <Badge count={(task?.comments || []).length} style={{ backgroundColor: '#64748b', marginLeft: 6, fontSize: 10 }} />
          )}
        </span>
      ),
      children: commentsTabContent,
    },
    {
      key: 'subtasks',
      label: (
        <span>
          <ApartmentOutlined style={{ marginRight: 4 }} />
          Công việc con
          {subtasks.length > 0 && (
            <Badge count={subtasks.length} style={{ backgroundColor: '#8b5cf6', marginLeft: 6, fontSize: 10 }} />
          )}
        </span>
      ),
      children: subtasksTabContent,
    },
    {
      key: 'result',
      label: (
        <span>
          <FileDoneOutlined style={{ marginRight: 4 }} />
          Kết quả
          {task?.resultReport?.summary && (
            <Badge dot style={{ backgroundColor: '#10b981', marginLeft: 6 }} />
          )}
        </span>
      ),
      children: resultTabContent,
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined style={{ marginRight: 4 }} />
          Lịch sử hạn
          {(task?.deadlineHistory || []).length > 0 && (
            <Badge count={(task?.deadlineHistory || []).length} style={{ backgroundColor: '#f59e0b', marginLeft: 6, fontSize: 10 }} />
          )}
        </span>
      ),
      children: historyTabContent,
    },
  ];

  return (
    <>
      <Drawer
        open={open}
        onClose={() => {
          setTask(null);
          onClose();
        }}
        width={680}
        destroyOnClose
        styles={{
          header: {
            background: isDark ? '#0f172a' : '#ffffff',
            borderBottom: `1px solid ${borderColor}`,
            padding: '16px 20px',
          },
          body: {
            background: isDark ? '#0f172a' : '#f8fafc',
            padding: '0 20px 20px',
          },
        }}
        closeIcon={<CloseOutlined style={{ fontSize: 16 }} />}
        title={
          task ? (
            <div>
              <Text style={{ fontSize: 16, fontWeight: 700, display: 'block', lineHeight: 1.4 }}>
                {task.title}
              </Text>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <Tag style={{ borderRadius: 6, fontSize: 11, color: statusInfo.color, background: statusInfo.bg, border: `1px solid ${statusInfo.color}30` }}>
                  {statusInfo.label}
                </Tag>
                {task.project?.name && (
                  <Tag color="blue" style={{ borderRadius: 6, fontSize: 11 }}>{task.project.name}</Tag>
                )}
              </div>
            </div>
          ) : (loading ? 'Đang tải thông tin...' : 'Chi tiết công việc')
        }
        extra={
          task ? (
            <Space size={8}>
              {/* Báo cáo kết quả */}
              <Tooltip title="Báo cáo kết quả / Hoàn thành">
                <Button
                  type={task.status === 'done' ? 'default' : 'primary'}
                  size="small"
                  icon={<CheckCircleOutlined style={{ color: task.status === 'done' ? '#10b981' : '#fff' }} />}
                  onClick={() => setResultModalOpen(true)}
                  style={{
                    borderRadius: 8,
                    fontSize: 12,
                    background: task.status === 'done' ? undefined : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderColor: '#10b981',
                  }}
                >
                  {task.status === 'done' ? 'Kết quả' : 'Nộp kết quả'}
                </Button>
              </Tooltip>

              {/* Nhân bản công việc */}
              <Tooltip title="Nhân bản công việc">
                <Popconfirm
                  title="Nhân bản công việc này?"
                  description="Sao chép toàn bộ checklist và công việc con sang bản mới."
                  onConfirm={handleDuplicateTask}
                  okText="Nhân bản"
                  cancelText="Hủy"
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    style={{ borderRadius: 8 }}
                  />
                </Popconfirm>
              </Tooltip>

              {/* Edit button */}
              {onOpenEdit && (
                <Tooltip title="Chỉnh sửa công việc">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      onClose();
                      onOpenEdit(task);
                    }}
                    style={{ borderRadius: 8 }}
                  />
                </Tooltip>
              )}

              {/* Followers section */}
              <Tooltip title="Người theo dõi">
                <Button
                  type={(task.followers || []).length > 0 ? 'default' : 'text'}
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => setFollowerSelectVisible(!followerSelectVisible)}
                  style={{ borderRadius: 8, fontSize: 12 }}
                >
                  {(task.followers || []).length}
                </Button>
              </Tooltip>
            </Space>
          ) : null
        }
      >
        {loading || !task ? (
          <div style={{ padding: '28px 8px' }}>
            <Skeleton active avatar paragraph={{ rows: 8 }} />
          </div>
        ) : (
          <>
            {/* Followers select dropdown */}
            {followerSelectVisible && (
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 12, marginTop: 8,
                background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff',
                border: `1px solid ${borderColor}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13 }}>
                  <TeamOutlined style={{ marginRight: 6 }} /> Người theo dõi ({(task.followers || []).length})
                </Text>
                <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setFollowerSelectVisible(false)} />
              </div>

              {/* Current followers */}
              {(task.followers || []).map(f => (
                <div key={f._id || f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Avatar size={24} src={f.avatar} icon={<UserOutlined />} style={{ backgroundColor: '#3b82f6' }}>
                    {f.name?.[0]}
                  </Avatar>
                  <Text style={{ flex: 1, fontSize: 13 }}>{f.name || f.email || f}</Text>
                  <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                    onClick={() => handleRemoveFollower(f._id || f)} />
                </div>
              ))}

              {/* Add follower */}
              <Select
                placeholder="Thêm người theo dõi..."
                showSearch
                optionFilterProp="label"
                style={{ width: '100%', marginTop: 8 }}
                onChange={handleAddFollower}
                value={null}
                options={companyUsers
                  .filter(u => !(task.followers || []).some(f => (f._id || f) === u._id))
                  .map(u => ({ value: u._id, label: u.name || u.email }))}
              />
            </div>
          )}

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ marginTop: 4 }}
            size="small"
          />
        </>
      )}
    </Drawer>

    {/* Subtask Modal với hình thức tạo y chang công việc cha */}
    <SubtaskFormModal
      open={subtaskModalOpen}
      onClose={() => setSubtaskModalOpen(false)}
      parentTask={task}
      editingSubtask={editingSubtask}
      companyUsers={companyUsers}
      knownSkillOptions={knownSkillOptions}
      onSubmit={handleSubtaskModalSubmit}
      submitting={subtaskSubmitting}
    />

    {/* Modal Báo cáo kết quả công việc */}
    <TaskResultModal
      open={resultModalOpen}
      onClose={() => setResultModalOpen(false)}
      task={task}
      onSuccess={() => {
        loadTask();
        if (onTaskUpdated) onTaskUpdated();
      }}
    />

    {/* Modal Gia hạn Deadline */}
    <Modal
      open={deadlineModalOpen}
      onCancel={() => setDeadlineModalOpen(false)}
      title={
        <Space>
          <ClockCircleOutlined style={{ color: '#f59e0b' }} />
          <span>Gia hạn thời hạn hoàn thành (Deadline)</span>
        </Space>
      }
      onOk={handleUpdateDeadline}
      confirmLoading={updatingDeadline}
      okText="Lưu gia hạn"
      cancelText="Hủy"
    >
      <div style={{ padding: '12px 0' }}>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
            Thời hạn hiện tại: {task?.endDate ? dayjs(task.endDate).format('DD/MM/YYYY') : 'Chưa có'}
          </Text>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>
            Thời hạn mới (*):
          </Text>
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            value={newDeadlineDate}
            onChange={setNewDeadlineDate}
          />
        </div>
        <div>
          <Text strong style={{ display: 'block', marginBottom: 6 }}>
            Lý do điều chỉnh thời hạn:
          </Text>
          <TextArea
            rows={3}
            placeholder="Nhập lý do thay đổi hoặc ghi chú phê duyệt gia hạn..."
            value={deadlineReason}
            onChange={(e) => setDeadlineReason(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  </>
  );
}

// Helper: Info card component
function InfoCard({ icon, label, children, isDark }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#ffffff',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {React.cloneElement(icon, { style: { fontSize: 12, color: '#64748b' } })}
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
          {label}
        </Text>
      </div>
      {children}
    </div>
  );
}
