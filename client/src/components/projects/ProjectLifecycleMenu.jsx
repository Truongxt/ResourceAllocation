import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Modal, DatePicker, Typography, Space, message } from 'antd';
import {
  CopyOutlined,
  EllipsisOutlined,
  FileAddOutlined,
  InboxOutlined,
  RollbackOutlined,
  SnippetsOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import projectService from '../../services/projectService';

const { Text } = Typography;

/**
 * Thao tác vòng đời trên một dự án. Mục hiện ra tùy dự án đang ở đâu:
 *   - đang chạy:  Chuyển loại, Nhân bản, Lưu thành mẫu, Lưu trữ
 *   - lưu trữ:    Mở lại, Nhân bản
 *   - mẫu:        Tạo dự án từ mẫu
 *
 * Lưu trữ bị server từ chối (409) khi còn việc mở hoặc việc lặp lại đang bật; câu trả
 * lời đã nói rõ còn bao nhiêu, nên chỉ cần hiện nguyên văn.
 *
 * `canArchive` (lưu trữ / mở lại) và `canDuplicate` (nhân bản / mẫu) bỏ những mục không thuộc
 * quyền; không còn mục nào thì không hiện nút "…".
 */
export default function ProjectLifecycleMenu({ project, canArchive = true, canDuplicate = true, onDuplicate, onChanged }) {
  const { t } = useTranslation();
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [converting, setConverting] = useState(false);

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

  const handleConvertKind = () => {
    if (project.kind === 'team') {
      // Chuyển Phòng ban => Dự án: cần nhập thời hạn
      setDateRange(null);
      setConvertModalOpen(true);
    } else {
      // Chuyển Dự án => Phòng ban
      Modal.confirm({
        title: `Chuyển dự án "${project.name}" thành Phòng ban?`,
        content: 'Theo chuẩn Base Wework (Bài 63), khi chuyển thành Phòng ban, hệ thống sẽ gỡ ngày kết thúc và theo dõi công việc thường nhật vô thời hạn.',
        okText: 'Chuyển thành Phòng ban',
        cancelText: 'Hủy',
        onOk: async () => {
          try {
            await projectService.convertKind(project._id, { targetKind: 'team' });
            message.success('Đã chuyển thành Phòng ban thành công');
            onChanged?.();
          } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi chuyển loại');
          }
        },
      });
    }
  };

  const submitTeamToProject = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('Vui lòng chọn ngày bắt đầu và ngày kết thúc cho dự án');
      return;
    }
    setConverting(true);
    try {
      await projectService.convertKind(project._id, {
        targetKind: 'project',
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
      });
      message.success('Đã chuyển thành Dự án có thời hạn thành công (Base Wework Bài 63)');
      setConvertModalOpen(false);
      onChanged?.();
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi chuyển loại');
    } finally {
      setConverting(false);
    }
  };

  const duplicateItems = canDuplicate ? [
    { key: 'duplicate', icon: <CopyOutlined />, label: t('projects.lifecycle.duplicate') },
  ] : [];
  let items;
  if (project.isTemplate) {
    items = canDuplicate
      ? [{ key: 'fromTemplate', icon: <FileAddOutlined />, label: t('projects.lifecycle.createFromTemplate') }]
      : [];
  } else if (project.isArchived) {
    items = [
      ...(canArchive ? [{ key: 'unarchive', icon: <RollbackOutlined />, label: t('projects.lifecycle.unarchive') }] : []),
      ...duplicateItems,
    ];
  } else {
    const copyItems = canDuplicate
      ? [...duplicateItems, { key: 'saveTemplate', icon: <SnippetsOutlined />, label: t('projects.lifecycle.saveAsTemplate') }]
      : [];
    const convertItem = {
      key: 'convertKind',
      icon: <SwapOutlined />,
      label: project.kind === 'team' ? 'Chuyển thành Dự án có thời hạn' : 'Chuyển thành Phòng ban',
    };
    const archiveItems = canArchive ? [{ key: 'archive', icon: <InboxOutlined />, label: t('projects.lifecycle.archive') }] : [];
    items = [convertItem, ...(copyItems.length ? copyItems : []), ...(archiveItems.length ? [{ type: 'divider' }, ...archiveItems] : [])];
  }
  if (!items.length) return null;

  const onClick = ({ key }) => {
    if (key === 'archive') archive();
    else if (key === 'unarchive') unarchive();
    else if (key === 'convertKind') handleConvertKind();
    else onDuplicate?.(key, project);
  };

  return (
    <>
      <Dropdown menu={{ items, onClick }} trigger={['click']}>
        <Button type="text" size="small" icon={<EllipsisOutlined />} aria-label={t('projects.lifecycle.more')} />
      </Dropdown>

      <Modal
        open={convertModalOpen}
        onCancel={() => setConvertModalOpen(false)}
        title={
          <Space>
            <SwapOutlined style={{ color: '#2563eb' }} />
            <span>Chuyển thành Dự án có thời hạn (Base Wework Bài 63)</span>
          </Space>
        }
        okText="Xác nhận chuyển loại"
        cancelText="Hủy"
        onOk={submitTeamToProject}
        confirmLoading={converting}
      >
        <div style={{ marginTop: 12 }}>
          <Text style={{ display: 'block', marginBottom: 12, color: 'var(--text-secondary)' }}>
            Theo quy tắc Base Wework, Dự án cần có ngày bắt đầu và kết thúc cụ thể để đo lường tiến độ và cảnh báo chậm hạn. Vui lòng thiết lập thời hạn cho dự án <strong>"{project.name}"</strong>:
          </Text>
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </Modal>
    </>
  );
}
