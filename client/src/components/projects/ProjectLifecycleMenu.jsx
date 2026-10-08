import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Modal, message } from 'antd';
import {
  CopyOutlined,
  EllipsisOutlined,
  FileAddOutlined,
  InboxOutlined,
  RollbackOutlined,
  SnippetsOutlined,
} from '@ant-design/icons';
import projectService from '../../services/projectService';

/**
 * Thao tác vòng đời trên một dự án. Mục hiện ra tùy dự án đang ở đâu:
 *   - đang chạy:  Nhân bản, Lưu thành mẫu, Lưu trữ
 *   - lưu trữ:    Mở lại, Nhân bản
 *   - mẫu:        Tạo dự án từ mẫu
 *
 * Lưu trữ bị server từ chối (409) khi còn việc mở hoặc việc lặp lại đang bật; câu trả
 * lời đã nói rõ còn bao nhiêu, nên chỉ cần hiện nguyên văn.
 */
export default function ProjectLifecycleMenu({ project, onDuplicate, onChanged }) {
  const { t } = useTranslation();

  const archive = () =>
    Modal.confirm({
      title: t('projects.lifecycle.archiveConfirm', { name: project.name }),
      content: t('projects.lifecycle.archiveHint'),
      okText: t('projects.lifecycle.archive'),
      onOk: async () => {
        try {
          await projectService.archive(project._id);
          message.success(t('projects.lifecycle.archived'));
          onChanged?.();
        } catch (error) {
          message.error(error.response?.data?.message || t('projects.lifecycle.archiveFailed'));
        }
      },
    });

  const unarchive = async () => {
    try {
      await projectService.unarchive(project._id);
      message.success(t('projects.lifecycle.unarchived'));
      onChanged?.();
    } catch (error) {
      message.error(error.response?.data?.message || t('projects.lifecycle.archiveFailed'));
    }
  };

  let items;
  if (project.isTemplate) {
    items = [{ key: 'fromTemplate', icon: <FileAddOutlined />, label: t('projects.lifecycle.createFromTemplate') }];
  } else if (project.isArchived) {
    items = [
      { key: 'unarchive', icon: <RollbackOutlined />, label: t('projects.lifecycle.unarchive') },
      { key: 'duplicate', icon: <CopyOutlined />, label: t('projects.lifecycle.duplicate') },
    ];
  } else {
    items = [
      { key: 'duplicate', icon: <CopyOutlined />, label: t('projects.lifecycle.duplicate') },
      { key: 'saveTemplate', icon: <SnippetsOutlined />, label: t('projects.lifecycle.saveAsTemplate') },
      { type: 'divider' },
      { key: 'archive', icon: <InboxOutlined />, label: t('projects.lifecycle.archive') },
    ];
  }

  const onClick = ({ key }) => {
    if (key === 'archive') archive();
    else if (key === 'unarchive') unarchive();
    else onDuplicate?.(key, project);
  };

  return (
    <Dropdown menu={{ items, onClick }} trigger={['click']}>
      <Button type="text" size="small" icon={<EllipsisOutlined />} aria-label={t('projects.lifecycle.more')} />
    </Dropdown>
  );
}
