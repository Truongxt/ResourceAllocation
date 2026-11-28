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
                        transition: 'border-color 160ms var(--ease-out), background-color 160ms var(--ease-out)',
                      }}
                    >
                      {/* Huy hiệu dự án, Nhóm công việc & Độ ưu tiên */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          {task.project && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'var(--surface-sunken)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {task.project.code || task.project.name}
                            </span>
                          )}
                          {task.taskGroup && (
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 500,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'var(--surface-sunken)',
                                color: 'var(--text-tertiary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              <FolderOutlined style={{ marginRight: 3, fontSize: 9 }} />
                              {task.taskGroup.name}
                            </span>
                          )}
                          {(task.priority === 'high' || task.priority === 'critical') ? (
                            <Tag
                              color={priorityOpt?.color || 'default'}
                              style={{ borderRadius: 4, margin: 0, fontSize: 10 }}
                            >
                              {priorityLabel(task.priority)}
                            </Tag>
                          ) : (
                            <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                              · {priorityLabel(task.priority)}
                            </span>
                          )}
                        </div>

                        <Space size={2}>
                          {canEditTask(task) && (
                            <Tooltip title="Nhân bản">
                              <Button
                                type="text"
                                size="small"
                                icon={<CopyOutlined style={{ fontSize: 12, color: 'var(--text-tertiary)' }} />}
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
                              icon={<EditOutlined style={{ fontSize: 12, color: 'var(--text-tertiary)' }} />}
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
                            fontSize: 13.5,
                            color: 'var(--text-primary)',
                            lineHeight: 1.4,
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
                            strokeColor={task.progress === 100 ? 'var(--status-success)' : 'var(--brand-primary)'}
                            railColor="var(--surface-sunken)"
                          />
                        </div>
                      )}

                      {/* Base Wework metadata indicators (Checklist, Bình luận, Người theo dõi, Subtasks) */}
                      {hasWeworkMeta && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap', color: 'var(--text-tertiary)', fontSize: 11 }}>
                          {checklistTotal > 0 && (
                            <span
                              style={{
                                fontWeight: 600,
                                color: checklistDone === checklistTotal ? 'var(--status-success)' : 'var(--text-tertiary)',
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
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <MessageOutlined style={{ fontSize: 10 }} />
                              {commentsCount}
                            </span>
                          )}

                          {subtasksCount > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <ApartmentOutlined style={{ fontSize: 10 }} />
                              {subtasksCount}
                            </span>
                          )}

                          {followersCount > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <EyeOutlined style={{ fontSize: 10 }} />
                              {followersCount}
                            </span>
                          )}

                          {hasResult && (
                            <span style={{ color: 'var(--status-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <FileDoneOutlined style={{ fontSize: 10 }} />
                              Kết quả
                            </span>
                          )}

                          {task.recurringTaskId && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <SyncOutlined style={{ fontSize: 9 }} />
                              Định kỳ
                            </span>
                          )}
                        </div>
                      )}

                      {/* Huy hiệu kỹ năng yêu cầu */}
                      {(task.requiredSkills || []).length > 0 && (
                        <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {task.requiredSkills.slice(0, 2).map((s, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: 10,
                                fontWeight: 500,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'var(--surface-sunken)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              {s.name}
                            </span>
                          ))}
                          {task.requiredSkills.length > 2 && (
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
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
                            color: isOverdue ? 'var(--status-danger)' : 'var(--text-tertiary)',
                            fontWeight: isOverdue ? 600 : 400,
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CalendarOutlined style={{ fontSize: 11 }} />
                            {dayjs(task.endDate).format('DD/MM/YYYY HH:mm')}
                          </span>
                          {isOverdue && (
                            <span
                              style={{
                                fontSize: 9.5,
                                padding: '0 5px',
                                borderRadius: 3,
                                background: 'var(--status-danger-bg)',
                                color: 'var(--status-danger)',
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
                          borderTop: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Avatar
                            size={20}
                            icon={<UserOutlined />}
                            style={{
                              backgroundColor: 'var(--surface-sunken)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: 11,
                            }}
                          />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {task.assignee?.name || t('common.unassigned') || 'Chưa gán'}
                          </Text>
                        </div>
                        <span className="tabular-nums" style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
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
