import { useTranslation } from 'react-i18next';
import { Button, Popconfirm, Space, Tooltip } from 'antd';
import { AppstoreOutlined, DeleteOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import ProjectLifecycleMenu from './ProjectLifecycleMenu';
import { canDuplicateProject, canManageProject } from '../../utils/projectAccess';

/**
 * Cụm nút thao tác của một dự án, dùng chung cho dạng bảng và dạng thẻ ở màn Dự án. Chỉ hiện
 * thao tác thuộc quyền — hiện ra rồi để server trả 403 thì trông như lỗi:
 *
 *   - `canManage` sai (quyền phân hệ "Chỉ xem"): không hiện gì.
 *   - Sửa, xóa, nhóm công việc, lưu trữ: Admin/Owner hoặc PM của chính dự án (`canManageProject`).
 *   - Nhân bản / mẫu: mọi PM. Nên PM ở dự án người khác chỉ còn menu vòng đời; Thành viên không có gì.
 *   - Dự án lưu trữ là chỉ đọc: chỉ còn menu vòng đời (Mở lại, Nhân bản).
 */
export default function ProjectRowActions({
  project,
  user,
  canManage,
  onTaskGroups,
  onQuickEdit,
  onEdit,
  onDelete,
  onDuplicate,
  onChanged,
}) {
  const { t } = useTranslation();
  if (!canManage) return null;

  const manages = canManageProject(user, project);
  const duplicates = canDuplicateProject(user);
  const lifecycle = (manages || duplicates) ? (
    <ProjectLifecycleMenu
      project={project}
      canArchive={manages}
      canDuplicate={duplicates}
      onDuplicate={onDuplicate}
      onChanged={onChanged}
    />
  ) : null;
  if (project.isArchived || !manages) return lifecycle;

  const editLabel = t('common.edit') || 'Chỉnh sửa toàn bộ';
  const deleteLabel = t('common.delete') || 'Xóa';
  return (
    <Space size="small">
      <Tooltip title="Quản lý nhóm công việc">
        <Button
          type="text"
          size="small"
          aria-label="Quản lý nhóm công việc"
          icon={<AppstoreOutlined style={{ color: '#3b82f6' }} />}
          onClick={() => onTaskGroups?.(project)}
        />
      </Tooltip>
      <Tooltip title="Chỉnh sửa nhanh (Base Wework)">
        <Button
          type="text"
          size="small"
          aria-label="Chỉnh sửa nhanh"
          icon={<EditOutlined style={{ color: 'var(--brand-primary, #0284c7)' }} />}
          onClick={() => onQuickEdit?.(project)}
        />
      </Tooltip>
      <Tooltip title={editLabel}>
        <Button type="text" size="small" aria-label={editLabel} icon={<SettingOutlined />} onClick={() => onEdit?.(project)} />
      </Tooltip>
      <Tooltip title={deleteLabel}>
        <Popconfirm
          title={t('projects.deleteConfirm') || 'Xác nhận xóa dự án?'}
          description={t('projects.deleteWarning') || 'Hành động này sẽ xóa toàn bộ công việc liên quan.'}
          onConfirm={() => onDelete?.(project._id)}
          okText={deleteLabel}
          cancelText={t('common.cancel') || 'Hủy'}
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" danger aria-label={deleteLabel} icon={<DeleteOutlined />} />
        </Popconfirm>
      </Tooltip>
      {lifecycle}
    </Space>
  );
}
