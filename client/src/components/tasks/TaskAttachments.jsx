import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Popconfirm, Spin, Typography } from 'antd';
import { DeleteOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import attachmentService from '../../services/attachmentService';
import { useAuth } from '../../context/AuthContext';
import {
  MAX_ATTACHMENT_SIZE,
  formatFileSize,
  canWriteAttachments,
  canDeleteAttachment,
} from '../../utils/attachmentRules';

dayjs.extend(relativeTime);

const { Text } = Typography;

// Chỉ để hộp chọn tệp lọc sẵn; server mới là nơi quyết định (attachment.service.js).
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.txt,.csv,.md,.png,.jpg,.jpeg,.gif,.webp,.bmp,.zip,.rar,.7z';

/**
 * Tab "Tệp" của ngăn chi tiết công việc. Quyền giống bình luận: ai xem được việc thì xem và
 * tải về; tải lên cần quyền sửa ở phân hệ Công việc; xóa là người tải lên, admin hoặc quản lý
 * dự án. Dự án lưu trữ thì chỉ xem. Quy tắc nằm ở `utils/attachmentRules.js` (mobile chép nguyên).
 */
export default function TaskAttachments({ task }) {
  const { user, canManageModule } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const taskId = task?._id;
  const archived = Boolean(task?.project?.isArchived);
  const canManageTasks = canManageModule ? canManageModule('tasks') : true;
  const canWrite = canWriteAttachments(task, canManageTasks);
  const canDelete = (att) => canDeleteAttachment(att, task, user, canManageTasks);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      setItems(await attachmentService.list(taskId));
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được danh sách tệp');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // chọn lại đúng tệp đó vẫn kích hoạt onChange
    if (!file) return;
    setError('');
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError('Tệp vượt quá 10 MB');
      return;
    }
    setUploading(true);
    try {
      const created = await attachmentService.upload(taskId, file);
      setItems((prev) => [created, ...prev]);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải tệp lên được');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (att) => {
    setError('');
    try {
      await attachmentService.download(taskId, att);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải tệp về được');
    }
  };

  const handleDelete = async (att) => {
    setError('');
    try {
      await attachmentService.remove(taskId, att._id);
      setItems((prev) => prev.filter((a) => a._id !== att._id));
    } catch (err) {
      setError(err.response?.data?.message || 'Không xóa được tệp');
    }
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Tài liệu, ảnh, tệp nén — tối đa 10 MB mỗi tệp, 20 tệp mỗi công việc.
        </Text>
        {canWrite && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              data-testid="attachment-input"
              style={{ display: 'none' }}
              onChange={handlePick}
            />
            <Button size="small" type="primary" icon={<UploadOutlined />} loading={uploading} onClick={() => inputRef.current?.click()}>
              Tải tệp lên
            </Button>
          </>
        )}
      </div>

      {archived && (
        <Alert type="info" showIcon style={{ marginBottom: 12 }} title="Dự án đã lưu trữ — chỉ xem và tải tệp về." />
      )}
      {error && (
        <Alert type="error" showIcon closable style={{ marginBottom: 12 }} title={error} onClose={() => setError('')} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có tệp đính kèm" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((att) => (
            <div
              key={att._id}
              data-testid="attachment-item"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 4px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}
            >
              <PaperClipOutlined style={{ fontSize: 18, color: '#64748b', marginTop: 4 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'left', wordBreak: 'break-word' }}
                  onClick={() => handleDownload(att)}
                >
                  {att.originalName}
                </Button>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatFileSize(att.size)} · {att.uploadedBy?.name || 'Không rõ'} · {dayjs(att.createdAt).locale('vi').fromNow()}
                  </Text>
                </div>
              </div>
              {canDelete(att) && (
                <Popconfirm
                  title={`Xóa "${att.originalName}"?`}
                  okText="Xóa tệp"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(att)}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`Xóa ${att.originalName}`} />
                </Popconfirm>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
