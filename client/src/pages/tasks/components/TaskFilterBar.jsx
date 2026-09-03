/**
 * ============================================================================
 * THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC CÔNG VIỆC (Task Filter Bar Component)
 * ============================================================================
 *
 * Mục đích:
 *   - Cung cấp ô tìm kiếm theo tên/mã công việc.
 *   - Lọc theo dự án, mức độ ưu tiên (Low, Medium, High, Urgent).
 *   - Chuyển đổi giữa chế độ xem Bảng Kanban và Danh sách Bảng (Table).
 *   - Nút tạo mới công việc và nút làm mới dữ liệu.
 */

import { Space, Input, Select, Segmented, Button } from 'antd';
import {
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

export default function TaskFilterBar({
  filters,
  setFilters,
  projects = [],
  priorityOptions = [],
  view,
  setView,
  canManageTasks = false,
  onOpenCreateModal,
  onReload,
  t,
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <Space wrap size="middle">
        {/* Tìm kiếm */}
        <Input
          prefix={<SearchOutlined style={{ color: '#64748b' }} />}
          placeholder={t('tasks.searchPlaceholder') || 'Tìm kiếm công việc...'}
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          style={{ width: 220, borderRadius: 8 }}
          allowClear
        />

        {/* Lọc theo dự án */}
        <Select
          placeholder={t('tasks.filterProject') || 'Tất cả dự án'}
          value={filters.project || undefined}
          onChange={(val) => setFilters((f) => ({ ...f, project: val || '' }))}
          allowClear
          style={{ width: 200 }}
          options={projects.map((p) => ({
            value: p._id,
            label: `${p.code ? p.code + ' - ' : ''}${p.name}`,
          }))}
        />

        {/* Lọc theo mức độ ưu tiên */}
        <Select
          placeholder={t('tasks.filterPriority') || 'Độ ưu tiên'}
          value={filters.priority || undefined}
          onChange={(val) => setFilters((f) => ({ ...f, priority: val || '' }))}
          allowClear
          style={{ width: 150 }}
          options={priorityOptions}
        />

        {/* Chuyển đổi chế độ xem: Kanban / Table */}
        <Segmented
          value={view}
          onChange={setView}
          options={[
            {
              value: 'kanban',
              icon: <AppstoreOutlined />,
              label: t('tasks.views.kanban') || 'Kanban',
            },
            {
              value: 'table',
              icon: <UnorderedListOutlined />,
              label: t('tasks.views.table') || 'Danh sách',
            },
          ]}
        />
      </Space>

      <Space>
        {/* Nút tạo công việc (Chỉ dành cho Admin / PM) */}
        {canManageTasks && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onOpenCreateModal}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            {t('tasks.add') || 'Thêm công việc'}
          </Button>
        )}
        <Button icon={<ReloadOutlined />} onClick={onReload} style={{ borderRadius: 8 }} />
      </Space>
    </div>
  );
}
