import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Drawer,
  Empty,
  Input,
  Modal,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import taskService from '../../services/taskService';

const { Text, Title } = Typography;

/**
 * Hàng đợi công việc chờ người dùng hiện tại đánh giá.
 *
 * Server đã lọc sẵn theo quyền duyệt, nên danh sách này luôn là "việc của tôi" —
 * không có ô lọc theo người, vì một hàng đợi hiện cả việc mình không duyệt được thì
 * không còn là hàng đợi.
 *
 * Việc quá hạn SLA nổi lên đầu và được đánh dấu đỏ: đó là con số duy nhất ở đây mà
 * người xem phải làm gì đó ngay.
 */
export default function PendingReviewDrawer({ open, onClose, onSelectTask, onReviewed }) {
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [overdue, setOverdue] = useState(0);
  const [rejecting, setRejecting] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskService.getPendingReviews();
      const list = res.data?.data?.tasks || [];
      // Quá hạn trước, rồi tới việc chờ lâu nhất.
      setTasks(
        [...list].sort((a, b) => {
          if (a.isOverdueReview !== b.isOverdueReview) return a.isOverdueReview ? -1 : 1;
          return (b.waitingHours || 0) - (a.waitingHours || 0);
        })
      );
      setOverdue(res.data?.data?.overdue || 0);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không tải được danh sách chờ đánh giá');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const afterChange = () => {
    load();
    if (onReviewed) onReviewed();
  };

  const handleApprove = async (task) => {
    setBusy(true);
    try {
      await taskService.review(task._id, 'approve');
      message.success(`Đã duyệt "${task.title}"`);
      afterChange();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không duyệt được công việc');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      message.warning('Cần nhập lý do khi trả lại công việc');
      return;
    }
    setBusy(true);
    try {
      await taskService.review(rejecting._id, 'reject', comment.trim());
      message.success(`Đã trả lại "${rejecting.title}"`);
      setRejecting(null);
      setComment('');
      afterChange();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không trả lại được công việc');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={560}
        title={(
          <Space>
            <CheckCircleOutlined style={{ color: '#f59e0b' }} />
            <span>Việc chờ tôi đánh giá</span>
            {tasks.length > 0 && <Tag color="warning">{tasks.length}</Tag>}
          </Space>
        )}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : tasks.length === 0 ? (
          <Empty description="Không có công việc nào đang chờ bạn đánh giá" style={{ marginTop: 48 }} />
        ) : (
          <>
            {overdue > 0 && (
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                style={{ marginBottom: 16, borderRadius: 10 }}
                message={`${overdue} công việc đã quá thời hạn đánh giá`}
                description="Người thực hiện đã xong phần của họ và đang chờ kết luận."
              />
            )}

            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {tasks.map((task) => (
                <div
                  key={task._id}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    border: `1px solid ${task.isOverdueReview ? '#ef4444' : 'var(--border-color, #e2e8f0)'}`,
                    background: task.isOverdueReview ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Title
                        level={5}
                        style={{ margin: 0, cursor: onSelectTask ? 'pointer' : 'default' }}
                        onClick={() => onSelectTask && onSelectTask(task._id)}
                      >
                        {task.title}
                      </Title>
                      <Space size={10} wrap style={{ marginTop: 6 }}>
                        {task.project?.name && <Tag>{task.project.name}</Tag>}
                        <Space size={4}>
                          <Avatar size={20} src={task.assignee?.avatar} icon={<UserOutlined />} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {task.assignee?.name || 'Chưa phân công'}
                          </Text>
                        </Space>
                        <Tooltip title={`Thời hạn đánh giá ${task.slaHours} giờ`}>
                          <Text
                            type={task.isOverdueReview ? 'danger' : 'secondary'}
                            style={{ fontSize: 12 }}
                          >
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            {task.reviewRequestedAt
                              ? `chờ từ ${dayjs(task.reviewRequestedAt).format('DD/MM HH:mm')}`
                              : 'chưa rõ thời điểm'}
                          </Text>
                        </Tooltip>
                      </Space>
                    </div>
                  </div>

                  {task.resultReport?.summary && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'var(--bg-secondary, #f8fafc)',
                        fontSize: 13,
                      }}
                    >
                      {task.resultReport.summary}
                    </div>
                  )}

                  <Space style={{ marginTop: 12 }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircleOutlined />}
                      loading={busy}
                      onClick={() => handleApprove(task)}
                      style={{ background: '#10b981', borderColor: '#10b981' }}
                    >
                      Duyệt
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => setRejecting(task)}
                    >
                      Trả lại
                    </Button>
                  </Space>
                </div>
              ))}
            </Space>
          </>
        )}
      </Drawer>

      <Modal
        title={rejecting ? `Trả lại "${rejecting.title}"` : 'Trả lại công việc'}
        open={Boolean(rejecting)}
        onCancel={() => setRejecting(null)}
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
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Cần sửa gì trước khi nộp lại?"
          maxLength={2000}
          showCount
        />
      </Modal>
    </>
  );
}
