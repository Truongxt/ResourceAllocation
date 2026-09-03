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
import { UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
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
  onDelete,
  t,
}) {
  const tableColumns = [
    {
      title: t('tasks.titleColumn') || 'Tiêu đề công việc',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{title}</Text>
          {record.project && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                📁 {record.project.name}
              </Text>
            </div>
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
        <Tag color={STATUS_COLORS[status]} style={{ borderRadius: 10 }}>
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
        <Tag
          color={PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || 'default'}
          style={{ borderRadius: 10 }}
        >
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
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('common.unassigned') || 'Chưa phân công'}
          </Text>
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
