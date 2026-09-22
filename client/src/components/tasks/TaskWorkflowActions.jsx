import { useState } from 'react';
import { Button, Input, Modal, Popconfirm, Space, Tooltip, message } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import taskService from '../../services/taskService';

/**
 * Ba thao tác đóng một công việc, gom vào một chỗ:
 *
 *   Báo hoàn thành   — người thực hiện. Dự án bật đánh giá thì việc dừng ở Chờ đánh
 *                      giá; tắt thì sang thẳng Hoàn thành (hành vi cũ).
 *   Duyệt / Trả lại  — chỉ hiện khi việc đang Chờ đánh giá và người xem được duyệt.
 *   Đánh dấu Thất bại — chỉ hiện khi dự án bật, và không bao giờ hiện lúc đang chờ
 *                      đánh giá: lúc đó kết quả thuộc về người đánh giá.
 *
 * Các nút cố ý hiện theo cấu hình dự án chứ không hiện hết rồi báo lỗi khi bấm —
 * một nút bấm vào chỉ để nhận thông báo từ chối là một nút sai.
 */
export default function TaskWorkflowActions({ task, perms = {}, onChanged }) {
  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [busy, setBusy] = useState(false);

  if (!task) return null;

  const project = task.project || {};
  const reviewEnabled = Boolean(project.reviewConfig?.enabled);
  const failureEnabled = Boolean(project.failureConfig?.enabled);
  const isClosed = task.status === 'done' || task.status === 'failed';
  const isPendingReview = task.status === 'review';

  const run = async (fn, successMessage) => {
    setBusy(true);
    try {
      await fn();
      message.success(successMessage);
      if (onChanged) onChanged();
      return true;
    } catch (err) {
      message.error(err.response?.data?.message || 'Thao tác không thành công');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = () =>
    run(
      () => taskService.complete(task._id),
      reviewEnabled ? 'Đã gửi công việc sang bước đánh giá' : 'Đã hoàn thành công việc'
    );

  const handleApprove = () =>
    run(() => taskService.review(task._id, 'approve'), 'Đã duyệt công việc');

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      message.warning('Cần nhập lý do khi trả lại công việc');
      return;
    }
    const done = await run(
      () => taskService.review(task._id, 'reject', rejectComment.trim()),
      'Đã trả lại công việc cho người thực hiện'
    );
    if (done) {
      setRejectOpen(false);
      setRejectComment('');
    }
  };

  const handleFail = async () => {
    if (!failReason.trim()) {
      message.warning('Cần nhập lý do thất bại');
      return;
    }
    const done = await run(
      () => taskService.updateStatus(task._id, 'failed', { failureReason: failReason.trim() }),
      'Đã đánh dấu công việc Thất bại'
    );
    if (done) {
      setFailOpen(false);
      setFailReason('');
    }
  };

  return (
    <>
      <Space size={8}>
        {perms.canReportResult && !isClosed && !isPendingReview && (
          <Tooltip title={reviewEnabled ? 'Gửi công việc sang bước đánh giá' : 'Đánh dấu hoàn thành'}>
            <Button
              type="primary"
              size="small"
              icon={reviewEnabled ? <SendOutlined /> : <CheckCircleOutlined />}
              loading={busy}
              onClick={handleComplete}
              style={{ borderRadius: 8, fontSize: 12 }}
            >
              Báo hoàn thành
            </Button>
          </Tooltip>
        )}

        {isPendingReview && perms.canReview && (
          <>
            <Popconfirm
              title="Duyệt công việc này?"
              description="Công việc sẽ chuyển sang Hoàn thành."
              onConfirm={handleApprove}
              okText="Duyệt"
              cancelText="Hủy"
            >
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                loading={busy}
                style={{ borderRadius: 8, fontSize: 12, background: '#10b981', borderColor: '#10b981' }}
              >
                Duyệt
              </Button>
            </Popconfirm>
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => setRejectOpen(true)}
              style={{ borderRadius: 8, fontSize: 12 }}
            >
              Trả lại
            </Button>
          </>
        )}

        {failureEnabled && !isClosed && !isPendingReview && perms.canMarkFailed && (
          <Tooltip title="Đóng công việc vì không hoàn thành được">
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => setFailOpen(true)}
              style={{ borderRadius: 8, fontSize: 12 }}
            >
              Thất bại
            </Button>
          </Tooltip>
        )}
      </Space>

      <Modal
        title="Đánh dấu công việc Thất bại"
        open={failOpen}
        onCancel={() => setFailOpen(false)}
        onOk={handleFail}
        okText="Đánh dấu thất bại"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: busy }}
      >
        <p style={{ color: 'var(--text-secondary, #64748b)', marginTop: 0 }}>
          Công việc sẽ đóng lại và được đếm riêng trong báo cáo. Lý do là bắt buộc — một
          công việc đóng mà không ai biết vì sao thì báo cáo cuối kỳ không trả lời được gì.
        </p>
        <Input.TextArea
          rows={4}
          value={failReason}
          onChange={(e) => setFailReason(e.target.value)}
          placeholder="Vì sao công việc này không hoàn thành được?"
          maxLength={1000}
          showCount
        />
      </Modal>

      <Modal
        title="Trả lại công việc"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={handleReject}
        okText="Trả lại"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: busy }}
      >
        <p style={{ color: 'var(--text-secondary, #64748b)', marginTop: 0 }}>
          Công việc quay về Đang làm. Nói rõ cần sửa gì, nếu không vòng sau rất dễ hỏng
          lại đúng chỗ cũ.
        </p>
        <Input.TextArea
          rows={4}
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="Cần sửa gì trước khi nộp lại?"
          maxLength={2000}
          showCount
        />
      </Modal>
    </>
  );
}
