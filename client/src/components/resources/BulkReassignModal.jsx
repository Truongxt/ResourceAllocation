import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Descriptions,
  Empty,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import taskService from '../../services/taskService';
import projectService from '../../services/projectService';
import { taskStatusLabel } from '../../i18n/enums';

const { Text } = Typography;

/**
 * Bàn giao công việc của một người sang người khác.
 *
 * Hai bước, cố ý không gộp: xem trước rồi mới đổi. Một lệnh bàn giao sai phạm vi có
 * thể cuốn theo hàng chục công việc ở dự án không liên quan, và không có bước xem
 * trước thì người bấm nút chỉ biết điều đó sau khi đã xong.
 *
 * Danh sách chỉ gồm việc đang mở — việc đã Hoàn thành hoặc Thất bại không bao giờ
 * đổi chủ, vì đổi là viết lại lịch sử ai đã thực sự làm nó.
 */
export default function BulkReassignModal({ open, onClose, fromResource, resources = [], onDone }) {
  const [projects, setProjects] = useState([]);
  const [toUserId, setToUserId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fromUserId = fromResource?.user?._id || fromResource?.user;
  const fromName = fromResource?.user?.name || fromResource?.position || '';

  const loadPreview = useCallback(async () => {
    if (!fromUserId) return;
    setLoading(true);
    try {
      const res = await taskService.reassignPreview({
        fromUserId,
        ...(projectId ? { projectId } : {}),
      });
      const data = res.data?.data;
      setPreview(data);
      setSelectedIds((data?.tasks || []).map((t) => t._id));
    } catch (err) {
      message.error(err.response?.data?.message || 'Không xem trước được danh sách bàn giao');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [fromUserId, projectId]);

  useEffect(() => {
    if (open) {
      setToUserId(null);
      setReason('');
      loadPreview();
      projectService
        .getAll({ limit: 100 })
        .then((res) => setProjects(res.data?.data?.projects || []))
        .catch(() => setProjects([]));
    }
  }, [open, loadPreview]);

  const handleSubmit = async () => {
    if (!toUserId) {
      message.warning('Chọn người nhận bàn giao');
      return;
    }
    if (!selectedIds.length) {
      message.warning('Không có công việc nào được chọn');
      return;
    }

    setSubmitting(true);
    try {
      const res = await taskService.bulkReassign({
        fromUserId,
        toUserId,
        ...(projectId ? { projectId } : {}),
        taskIds: selectedIds,
        reason: reason.trim(),
      });
      message.success(`Đã bàn giao ${res.data?.data?.movedCount || selectedIds.length} công việc`);
      if (onDone) onDone();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.message || 'Bàn giao không thành công');
    } finally {
      setSubmitting(false);
    }
  };

  const recipients = resources
    .filter((r) => String(r.user?._id || r.user) !== String(fromUserId))
    .map((r) => ({
      value: r.user?._id || r.user,
      label: `${r.user?.name || r.position}${r.position ? ` — ${r.position}` : ''}`,
    }))
    .filter((o) => o.value);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      width={780}
      okText="Bàn giao"
      cancelText="Hủy"
      okButtonProps={{ loading: submitting, disabled: !toUserId || !selectedIds.length }}
      title={(
        <Space>
          <SwapOutlined style={{ color: '#3b82f6' }} />
          <span>Bàn giao công việc của {fromName}</span>
        </Space>
      )}
    >
      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Người bàn giao">{fromName}</Descriptions.Item>
          <Descriptions.Item label="Người nhận">
            <Select
              showSearch
              allowClear
              style={{ width: '100%' }}
              placeholder="Chọn người nhận..."
              value={toUserId}
              onChange={setToUserId}
              options={recipients}
              optionFilterProp="label"
            />
          </Descriptions.Item>
          <Descriptions.Item label="Giới hạn dự án" span={2}>
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="Tất cả dự án"
              value={projectId}
              onChange={setProjectId}
              options={projects.map((p) => ({ value: p._id, label: p.name }))}
              optionFilterProp="label"
              showSearch
            />
          </Descriptions.Item>
        </Descriptions>

        <Input.TextArea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do bàn giao — ví dụ: nhân sự nghỉ việc, điều chuyển phòng ban"
          maxLength={500}
        />

        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : !preview || !preview.tasks?.length ? (
          <Empty description="Không có công việc đang mở nào để bàn giao" />
        ) : (
          <>
            <Alert
              type="info"
              showIcon
              message={`${preview.total} công việc đang mở · ${preview.totalEstimatedHours} giờ ước tính`}
              description={preview.excludedNote}
            />
            <Table
              size="small"
              rowKey="_id"
              dataSource={preview.tasks}
              pagination={false}
              scroll={{ y: 260 }}
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: setSelectedIds,
              }}
              columns={[
                { title: 'Công việc', dataIndex: 'title', ellipsis: true },
                {
                  title: 'Dự án',
                  dataIndex: ['project', 'name'],
                  width: 160,
                  ellipsis: true,
                },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  width: 110,
                  render: (status) => <Tag>{taskStatusLabel(status)}</Tag>,
                },
                {
                  title: 'Giờ',
                  dataIndex: 'estimatedHours',
                  width: 70,
                  align: 'right',
                },
              ]}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Sau khi bàn giao, nên kiểm tra tải của người nhận ở trang Tối ưu hóa — dồn
              việc sang một người đang đầy chỉ là chuyển chỗ tắc nghẽn.
            </Text>
          </>
        )}
      </Space>
    </Modal>
  );
}
