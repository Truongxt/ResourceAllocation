/**
 * ============================================================================
 * GIAO DIỆN BẢNG DANH SÁCH CÔNG VIỆC (Task Table View Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Hiển thị danh sách công việc dạng bảng dữ liệu đầy đủ thông tin:
 *     1. Tiêu đề công việc & Dự án
 *     2. Trạng thái (Status badge)
 *     3. Mức độ ưu tiên (Priority)
 *     4. Người thực hiện (Assignee)
 *     5. Giờ ước tính / Thực tế
 *     6. Tiến độ thực hiện (%)
 *     7. Thao tác Sửa / Xóa
 */

import { Table, Tag, Space, Avatar, Typography, Progress, Tooltip, Button, Popconfirm } from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckSquareOutlined,
  MessageOutlined,
  ApartmentOutlined,
  EyeOutlined,
  FolderOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { taskStatusLabel, priorityLabel } from '../../../i18n/enums';
import {
  TASK_STATUS_BADGE_COLORS as STATUS_COLORS,
  PRIORITY_OPTIONS,
} from '../../../constants';

const { Text } = Typography;

export default function TaskTableView({
  tasks = [],
  loading = false,
  canEditTask,
  canManageTasks = false,
  onOpenEdit,
  onOpenDetail,
  onDelete,
  onDuplicate,
  t,
}) {
  const tableColumns = [
    {
      title: t('tasks.titleColumn') || 'Tiêu đề công việc',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => {
        const checklistDone = (record.checklist || []).filter((c) => c.completed).length;
        const checklistTotal = (record.checklist || []).length;
        const commentsCount = (record.comments || []).length;
        const followersCount = (record.followers || []).length;
        const subtasksCount = (record.subtasks || []).length;
        const hasResult = !!(record.resultReport?.summary || (record.resultReport?.deliverableLinks && record.resultReport.deliverableLinks.length > 0));

        return (
          <div style={{ cursor: 'pointer' }} onClick={() => onOpenDetail && onOpenDetail(record)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: 13, color: '#4f46e5' }} className="task-title-link">
                {title}
              </Text>
              {record.taskGroup && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: '#eff6ff',
                    color: record.taskGroup.color || '#3b82f6',
                    border: `1px solid ${record.taskGroup.color ? record.taskGroup.color + '40' : 'rgba(59, 130, 246, 0.25)'}`,
                  }}
                >
                  <FolderOutlined style={{ marginRight: 3, fontSize: 9 }} />
                  {record.taskGroup.name}
                </span>
              )}

              {hasResult && (
                <Tag
                  color="success"
                  style={{
                    fontSize: 10,
                    borderRadius: 4,
                    margin: 0,
                    padding: '0 5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <FileDoneOutlined style={{ fontSize: 10 }} />
                  Có kết quả
                </Tag>
              )}

              {record.recurringTaskId && (
                <Tag
                  color="purple"
                  style={{
                    fontSize: 10,
                    borderRadius: 4,
                    margin: 0,
                    padding: '0 5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <SyncOutlined style={{ fontSize: 9 }} />
                  Lặp lại
                </Tag>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {record.project && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  📁 {record.project.name}
                </Text>
              )}

              {checklistTotal > 0 && (
                <span style={{ fontSize: 10, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <CheckSquareOutlined style={{ fontSize: 10 }} />
                  {checklistDone}/{checklistTotal}
                </span>
              )}

              {commentsCount > 0 && (
                <span style={{ fontSize: 10, color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <MessageOutlined style={{ fontSize: 10 }} />
                  {commentsCount}
                </span>
              )}

              {subtasksCount > 0 && (
                <span style={{ fontSize: 10, color: '#a855f7', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <ApartmentOutlined style={{ fontSize: 10 }} />
                  {subtasksCount}
                </span>
              )}

              {followersCount > 0 && (
                <span style={{ fontSize: 10, color: '#ca8a04', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <EyeOutlined style={{ fontSize: 10 }} />
                  {followersCount}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: t('common.status') || 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => (
        <Tag color={STATUS_COLORS[status]} style={{ borderRadius: 10 }}>
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
        <Tag
          color={PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || 'default'}
          style={{ borderRadius: 10 }}
        >
          {priorityLabel(priority)}
        </Tag>
      ),
    },
    {
      title: 'Hạn chót',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 130,
      render: (endDate, record) => {
        if (!endDate) return <Text type="secondary" style={{ fontSize: 12 }}>-</Text>;
        const isOverdue =
          record.status !== 'completed' &&
          record.status !== 'done' &&
          new Date(endDate) < new Date();
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <ClockCircleOutlined style={{ color: isOverdue ? '#ef4444' : '#64748b', fontSize: 11 }} />
            <Text style={{ fontSize: 12, color: isOverdue ? '#ef4444' : undefined, fontWeight: isOverdue ? 600 : 400 }}>
              {dayjs(endDate).format('DD/MM/YYYY')}
            </Text>
            {isOverdue && (
              <Tag color="error" style={{ fontSize: 9, margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                Trễ
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: t('projectDetail.assignee') || 'Người thực hiện',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 170,
      render: (assignee) =>
        assignee ? (
          <Space size={8}>
            <Avatar size={24} icon={<UserOutlined />} style={{ backgroundColor: '#6366f1' }} />
            <Text style={{ fontSize: 13, fontWeight: 500 }}>{assignee.name}</Text>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('common.unassigned') || 'Chưa phân công'}
          </Text>
        ),
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
      render: (progress = 0) => (
        <Progress percent={progress} size="small" strokeColor="#6366f1" />
      ),
    },
    {
      title: t('common.actions') || 'Thao tác',
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          {canEditTask(record) && (
            <Tooltip title="Nhân bản công việc">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined style={{ color: '#6366f1' }} />}
                onClick={() => onDuplicate && onDuplicate(record)}
              />
            </Tooltip>
          )}
          {canEditTask(record) && (
            <Tooltip title={t('common.edit') || 'Sửa'}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onOpenEdit(record)}
              />
            </Tooltip>
          )}
          {canManageTasks && (
            <Tooltip title={t('common.delete') || 'Xóa'}>
              <Popconfirm
                title={t('tasks.deleteConfirm') || 'Xác nhận xóa công việc?'}
                onConfirm={() => onDelete(record._id)}
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
    <div className="saas-card" style={{ overflow: 'hidden' }}>
      <Table
        columns={tableColumns}
        dataSource={tasks}
        rowKey="_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (count) =>
            t('tasks.totalCount', { count }) || `Tổng số: ${count} công việc`,
        }}
      />
    </div>
  );
}
