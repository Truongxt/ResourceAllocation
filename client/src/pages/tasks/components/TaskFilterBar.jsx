import { Input, Select, Segmented, Button } from 'antd';
import { SearchOutlined, AppstoreOutlined, UnorderedListOutlined, ReloadOutlined } from '@ant-design/icons';
import { sortedFields } from '../../../utils/customFields';

export default function TaskFilterBar({
  filters, setFilters, projects = [], priorityOptions = [], view, setView,
  onReload, onManageGroups, loading = false, t,
}) {
  const hasFilters = Boolean(filters.search || filters.project || filters.priority || Object.values(filters.custom || {}).some(Boolean));
  return (
    <section className="task-filter-panel" aria-label="Tìm kiếm và lọc công việc">
      <div className="task-filter-fields">
        <Input
          className="task-filter-search"
          prefix={<SearchOutlined />}
          aria-label={t('tasks.searchPlaceholder') || 'Tìm kiếm công việc'}
          placeholder={t('tasks.searchPlaceholder') || 'Tìm kiếm công việc...'}
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          allowClear
        />
        <Select
          aria-label={t('tasks.filterProject') || 'Lọc theo dự án'}
          placeholder={t('tasks.filterProject') || 'Tất cả dự án'}
          value={filters.project || undefined}
          onChange={(val) => setFilters((f) => ({ ...f, project: val || '', custom: {} }))}
          allowClear
          options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
        />
        <Select
          aria-label={t('tasks.filterPriority') || 'Độ ưu tiên'}
          placeholder={t('tasks.filterPriority') || 'Độ ưu tiên'}
          value={filters.priority || undefined}
          onChange={(val) => setFilters((f) => ({ ...f, priority: val || '' }))}
          allowClear
          options={priorityOptions}
        />
        {sortedFields(projects.find((p) => p._id === filters.project))
          .filter((field) => field.type === 'select')
          .map((field) => (
            <Select
              key={field.key}
              data-testid={`custom-filter-${field.key}`}
              aria-label={field.name}
              placeholder={field.name}
              value={filters.custom?.[field.key] || undefined}
              onChange={(val) => setFilters((f) => ({ ...f, custom: { ...(f.custom || {}), [field.key]: val || '' } }))}
              allowClear
              options={field.options.map((o) => ({ value: o, label: `${field.name}: ${o}` }))}
            />
          ))}
      </div>
      <div className="task-filter-footer">
        <Segmented
          aria-label="Chế độ xem công việc"
          value={view}
          onChange={setView}
          options={[
            { value: 'kanban', icon: <AppstoreOutlined />, label: t('tasks.views.kanban') || 'Kanban' },
            { value: 'list', icon: <UnorderedListOutlined />, label: t('tasks.views.table') || 'Danh sách' },
          ]}
        />
        <div className="task-filter-actions">
          {hasFilters && <Button type="text" onClick={() => setFilters({ search: '', project: '', priority: '', custom: {} })}>Xóa bộ lọc</Button>}
          {filters.project && onManageGroups && <Button icon={<AppstoreOutlined />} onClick={() => onManageGroups(filters.project)}>Nhóm công việc</Button>}
          <Button icon={<ReloadOutlined />} onClick={onReload} loading={loading} aria-label="Tải lại công việc">Tải lại</Button>
        </div>
      </div>
    </section>
  );
}
