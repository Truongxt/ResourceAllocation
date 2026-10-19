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
import { sortedFields } from '../../../utils/customFields';

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
  onManageGroups,
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
          // Đổi dự án thì bỏ lọc trường tùy chỉnh: `key` của chúng thuộc dự án cũ.
          onChange={(val) => setFilters((f) => ({ ...f, project: val || '', custom: {} }))}
          allowClear
          style={{ width: 200 }}
          options={projects.map((p) => ({
            value: p._id,
            label: `${p.code ? p.code + ' - ' : ''}${p.name}`,
          }))}
        />

        {/* Lọc theo trường tùy chỉnh kiểu chọn một — chỉ khi đang xem một dự án */}
        {sortedFields(projects.find((p) => p._id === filters.project))
          .filter((field) => field.type === 'select')
          .map((field) => (
            <Select
              key={field.key}
              data-testid={`custom-filter-${field.key}`}
              placeholder={field.name}
              value={filters.custom?.[field.key] || undefined}
              onChange={(val) => setFilters((f) => ({ ...f, custom: { ...(f.custom || {}), [field.key]: val || '' } }))}
              allowClear
              style={{ width: 160 }}
              options={field.options.map((o) => ({ value: o, label: `${field.name}: ${o}` }))}
            />
          ))}

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
              value: 'list',
              icon: <UnorderedListOutlined />,
              label: t('tasks.views.table') || 'Danh sách',
            },
          ]}
        />
      </Space>

      <Space>
        {filters.project && (
          <Button
            icon={<AppstoreOutlined />}
            onClick={() => onManageGroups && onManageGroups(filters.project)}
            size="middle"
          >
            Nhóm công việc
          </Button>
        )}
        {/* Nút tạo công việc (Chỉ dành cho Admin / PM) */}
        {canManageTasks && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onOpenCreateModal}
            size="middle"
          >
            {t('tasks.add') || 'Thêm công việc'}
          </Button>
        )}
        <Button icon={<ReloadOutlined />} onClick={onReload} size="middle" />
      </Space>
    </div>
  );
}
