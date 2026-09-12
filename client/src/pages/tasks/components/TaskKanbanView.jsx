/**
 * ============================================================================
 * GIAO DIỆN BẢNG KANBAN CÔNG VIỆC (Task Kanban View Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Hiển thị công việc theo 5 cột trạng thái:
 *     1. Cần làm (Todo)
 *     2. Đang thực hiện (In Progress)
 *     3. Đang duyệt (Review)
 *     4. Hoàn thành (Done)
 *     5. Đã hủy / Tạm dừng (Cancelled)
 *   - Hỗ trợ kéo thả trực quan (HTML5 Drag & Drop) để chuyển đổi trạng thái công việc
 *     ngay lập tức và tự động đồng bộ lại tải làm việc nhân sự ở backend.
 */

import { Typography, Tooltip, Button, Tag, Space, Progress, Avatar, Badge } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckSquareOutlined,
  MessageOutlined,
  ApartmentOutlined,
  EyeOutlined,
  FolderOutlined,
  CopyOutlined,
  CalendarOutlined,
  FileDoneOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { taskStatusLabel, priorityLabel } from '../../../i18n/enums';
import { PRIORITY_OPTIONS } from '../../../constants';

const { Text } = Typography;

export default function TaskKanbanView({
  kanbanCols = {},
  statusCols = [],
  canManageTasks = false,
  canEditTask,
  onDragStart,
  onDragOver,
  onDrop,
  onOpenCreateInColumn,
  onOpenEdit,
  onOpenDetail,
  onDuplicate,
  isDark = false,
  t,
}) {
  return (
    <div className="kanban-board-antd">
      {statusCols.map((col) => {
        const colTasks = kanbanCols[col.key] || [];

        return (
          <div
            key={col.key}
            className="kanban-column-antd"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.key)}
          >
            {/* Header cột Kanban */}
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
                    onClick={() => onOpenCreateInColumn(col.key)}
                  />
                </Tooltip>
              )}
            </div>

            {/* Thân cột Kanban chứa danh sách các thẻ công việc */}
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
                  const checklistDone = (task.checklist || []).filter((c) => c.completed).length;
                  const checklistTotal = (task.checklist || []).length;
                  const commentsCount = (task.comments || []).length;
                  const followersCount = (task.followers || []).length;
                  const subtasksCount = (task.subtasks || []).length;
                  const hasResult = !!(task.resultReport?.summary || (task.resultReport?.deliverableLinks && task.resultReport.deliverableLinks.length > 0));
                  const hasWeworkMeta = checklistTotal > 0 || commentsCount > 0 || followersCount > 0 || subtasksCount > 0 || hasResult || !!task.recurringTaskId;
                  const isOverdue = task.status !== 'completed' && task.status !== 'done' && task.endDate && new Date(task.endDate) < new Date();

                  return (
                    <div
                      key={task._id}
                      className="kanban-task-card"
                      draggable={canEditTask(task)}
                      onDragStart={(e) => onDragStart(e, task._id)}
                      onClick={() => onOpenDetail && onOpenDetail(task)}
                      style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {/* Huy hiệu dự án, Nhóm công việc & Độ ưu tiên */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 8,
                        }}
                      >
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
                          {task.taskGroup && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                                color: task.taskGroup.color || '#3b82f6',
                                border: `1px solid ${task.taskGroup.color ? task.taskGroup.color + '40' : 'rgba(59, 130, 246, 0.25)'}`,
                              }}
                            >
                              <FolderOutlined style={{ marginRight: 3, fontSize: 9 }} />
                              {task.taskGroup.name}
                            </span>
                          )}
                          <Tag
                            color={priorityOpt?.color || 'default'}
                            style={{ borderRadius: 6, margin: 0, fontSize: 10 }}
                          >
                            {priorityLabel(task.priority)}
                          </Tag>
                        </div>

                        <Space size={2}>
                          {canEditTask(task) && (
                            <Tooltip title="Nhân bản">
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined style={{ fontSize: 12, color: '#6366f1' }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicate && onDuplicate(task);
                                }}
                              />
                            </Tooltip>
                          )}
                          {canEditTask(task) && (
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined style={{ fontSize: 12 }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenEdit(task);
                              }}
                            />
                          )}
                        </Space>
                      </div>

                      {/* Tiêu đề công việc */}
                      <div style={{ marginBottom: 8 }}>
                        <Text
                          strong
                          style={{
                            fontSize: 13,
                            color: isDark ? '#f8fafc' : '#0f172a',
                            lineHeight: 1.35,
                            display: 'block',
                          }}
                        >
                          {task.title}
                        </Text>
                      </div>

                      {/* Thanh tiến độ nếu có */}
                      {(task.progress || 0) > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Progress
                            percent={task.progress || 0}
                            size="small"
                            strokeColor="#6366f1"
                            trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9'}
                          />
                        </div>
                      )}

                      {/* Base Wework metadata indicators (Checklist, Bình luận, Người theo dõi, Subtasks) */}
                      {hasWeworkMeta && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          {checklistTotal > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: checklistDone === checklistTotal
                                  ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5')
                                  : (isDark ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc'),
                                color: checklistDone === checklistTotal ? '#10b981' : (isDark ? '#94a3b8' : '#64748b'),
                                border: `1px solid ${checklistDone === checklistTotal ? 'rgba(16, 185, 129, 0.3)' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0')}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <CheckSquareOutlined style={{ fontSize: 10 }} />
                              {checklistDone}/{checklistTotal}
                            </span>
                          )}

                          {commentsCount > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <MessageOutlined style={{ fontSize: 10 }} />
                              {commentsCount}
                            </span>
                          )}

                          {subtasksCount > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: isDark ? 'rgba(168, 85, 247, 0.15)' : '#f5f3ff',
                                color: '#a855f7',
                                border: '1px solid rgba(168, 85, 247, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <ApartmentOutlined style={{ fontSize: 10 }} />
                              {subtasksCount}
                            </span>
                          )}

                          {followersCount > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: isDark ? 'rgba(234, 179, 8, 0.15)' : '#fefce8',
                                color: '#ca8a04',
                                border: '1px solid rgba(234, 179, 8, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <EyeOutlined style={{ fontSize: 10 }} />
                              {followersCount}
                            </span>
                          )}

                          {hasResult && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <FileDoneOutlined style={{ fontSize: 10 }} />
                              Kết quả
                            </span>
                          )}

                          {task.recurringTaskId && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: isDark ? 'rgba(168, 85, 247, 0.15)' : '#f5f3ff',
                                color: '#8b5cf6',
                                border: '1px solid rgba(168, 85, 247, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <SyncOutlined style={{ fontSize: 9 }} />
                              Định kỳ
                            </span>
                          )}
                        </div>
                      )}

                      {/* Huy hiệu kỹ năng yêu cầu */}
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

                      {/* Hạn chót công việc */}
                      {task.endDate && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            marginBottom: 8,
                            color: isOverdue ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b'),
                            fontWeight: isOverdue ? 600 : 400,
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CalendarOutlined style={{ fontSize: 11 }} />
                            {dayjs(task.endDate).format('DD/MM/YYYY')}
                          </span>
                          {isOverdue && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: '0 5px',
                                borderRadius: 3,
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                fontWeight: 700,
                              }}
                            >
                              QUÁ HẠN
                            </span>
                          )}
                        </div>
                      )}

                      {/* Chân thẻ: Người thực hiện & Giờ công */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: 8,
                          borderTop: isDark
                            ? '1px solid rgba(255, 255, 255, 0.06)'
                            : '1px solid #f1f5f9',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {task.assignee?.name || t('common.unassigned') || 'Chưa gán'}
                          </Text>
                        </div>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          <ClockCircleOutlined style={{ marginRight: 3 }} />
                          {task.estimatedHours || 0}h
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
  );
}
