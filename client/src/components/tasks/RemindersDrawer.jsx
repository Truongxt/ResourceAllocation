/**
 * ============================================================================
 * BASE WEWORK — Reminders Drawer (Nhắc nhở công việc cần hoàn thành)
 * ============================================================================
 *
 * Chuẩn đặc tả Base Wework:
 *   - Chỉ hiển thị công việc chưa hoàn thành (status !== 'done')
 *   - Được giao cho chính người dùng đang đăng nhập (assignee)
 *   - Bắt buộc phải có thời hạn hoàn thành (deadline / endDate)
 *
 * 4 Chế độ xem (Tabs):
 *   1. "Quan trọng": Các việc có deadline trong khoảng ±7 ngày so với hôm nay
 *   2. "Hôm nay": Các việc có deadline trong ngày hôm nay
 *   3. "Muộn": Các việc đã quá hạn hoàn thành nhưng chưa xong
 *   4. "Lịch biểu": Xem tổng thể timeline với bộ lọc "Tất cả" & "Chỉ mục Quan trọng"
 *
 * Thao tác nhanh:
 *   - Checkbox hoàn thành tức thì
 *   - Dời hạn hoàn thành (Snooze deadline kèm lý do)
 *   - Báo cáo kết quả & hoàn thành
 *   - Mở xem chi tiết công việc trong TaskDetailDrawer
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Drawer,
  Tabs,
  Badge,
  Button,
  Space,
  Typography,
  Tag,
  Checkbox,
  Empty,
  Spin,
  Input,
  Modal,
  DatePicker,
  Form,
  Segmented,
  Tooltip,
  Card,
  message,
  Divider,
} from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  SearchOutlined,
  FieldTimeOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FireOutlined,
  ScheduleOutlined,
  WarningOutlined,
  CheckOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import taskService from '../../services/taskService';
import TaskResultModal from './TaskResultModal';

dayjs.locale('vi');

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

// Map mức độ ưu tiên
const PRIORITY_CONFIG = {
  critical: { label: 'Khẩn cấp', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  high: { label: 'Cao', color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d' },
  medium: { label: 'Trung bình', color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
  low: { label: 'Thấp', color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
};

export default function RemindersDrawer({
  open,
  onClose,
  onSelectTask,
  onTaskUpdated,
}) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    important: [],
    today: [],
    overdue: [],
    schedule: [],
    counts: { important: 0, today: 0, overdue: 0, total: 0, badgeCount: 0 },
  });

  const [activeTab, setActiveTab] = useState('important');
  const [searchText, setSearchText] = useState('');
  const [scheduleMode, setScheduleMode] = useState('all'); // 'all' | 'important_only'

  // Modal dời hạn (Snooze deadline)
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [snoozeTask, setSnoozeTask] = useState(null);
  const [snoozeSubmitting, setSnoozeSubmitting] = useState(false);
  const [snoozeForm] = Form.useForm();

  // Modal báo cáo kết quả
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedTaskForResult, setSelectedTaskForResult] = useState(null);

  /**
   * Tải danh sách công việc nhắc nhở từ server
   */
  const loadReminders = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await taskService.getReminders();
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải Reminders:', err);
      message.error('Không thể tải danh sách nhắc việc');
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      loadReminders();
    }
  }, [open, loadReminders]);

  /**
   * Thao tác đánh dấu hoàn thành nhanh
   */
  const handleQuickComplete = async (task, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await taskService.updateStatus(task._id, 'done');
      message.success(`Đã hoàn thành công việc "${task.title}"!`);
      // Bắn event để cập nhật badge ở Header & các trang khác
      window.dispatchEvent(new CustomEvent('reminders:updated'));
      loadReminders();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  /**
   * Mở modal dời hạn
   */
  const handleOpenSnooze = (task, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSnoozeTask(task);
    const currentEnd = task.endDate ? dayjs(task.endDate) : dayjs();
    snoozeForm.setFieldsValue({
      newEndDate: currentEnd.isBefore(dayjs()) ? dayjs().add(1, 'day').hour(18).minute(0) : currentEnd.add(1, 'day'),
      reason: '',
    });
    setSnoozeModalOpen(true);
  };

  /**
   * Gửi yêu cầu dời hạn
   */
  const handleSnoozeSubmit = async (values) => {
    if (!snoozeTask) return;
    setSnoozeSubmitting(true);
    try {
      await taskService.updateDeadline(snoozeTask._id, {
        newEndDate: values.newEndDate.toDate(),
        reason: values.reason?.trim() || 'Gia hạn theo yêu cầu công việc',
      });
      message.success(`Đã dời hạn công việc đến ${values.newEndDate.format('DD/MM/YYYY HH:mm')}`);
      setSnoozeModalOpen(false);
      window.dispatchEvent(new CustomEvent('reminders:updated'));
      loadReminders();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể dời hạn công việc');
    } finally {
      setSnoozeSubmitting(false);
    }
  };

  /**
   * Mở modal báo cáo kết quả
   */
  const handleOpenResultReport = (task, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSelectedTaskForResult(task);
    setResultModalOpen(true);
  };

  /**
   * Tính toán thời hạn và nhãn hiển thị cho task
   */
  const getDeadlineBadge = (endDateStr) => {
    if (!endDateStr) return null;
    const now = dayjs();
    const end = dayjs(endDateStr);
    const diffDays = end.startOf('day').diff(now.startOf('day'), 'day');

    if (diffDays < 0) {
      return (
        <Tag
          color="error"
          icon={<WarningOutlined />}
          style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}
        >
          Quá hạn {Math.abs(diffDays)} ngày ({end.format('DD/MM')})
        </Tag>
      );
    } else if (diffDays === 0) {
      return (
        <Tag
          color="warning"
          icon={<ClockCircleOutlined />}
          style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}
        >
          Hôm nay ({end.format('HH:mm')})
        </Tag>
      );
    } else if (diffDays === 1) {
      return (
        <Tag
          color="processing"
          icon={<CalendarOutlined />}
          style={{ fontWeight: 600, borderRadius: 6, margin: 0 }}
        >
          Ngày mai ({end.format('DD/MM')})
        </Tag>
      );
    } else {
      return (
        <Tag
          color={diffDays <= 7 ? 'purple' : 'default'}
          icon={<CalendarOutlined />}
          style={{ fontWeight: 500, borderRadius: 6, margin: 0 }}
        >
          Còn {diffDays} ngày ({end.format('DD/MM')})
        </Tag>
      );
    }
  };

  /**
   * Lọc công việc theo ô tìm kiếm và chế độ tab
   */
  const filteredTasks = useMemo(() => {
    let sourceList = [];
    if (activeTab === 'important') {
      sourceList = data.important || [];
    } else if (activeTab === 'today') {
      sourceList = data.today || [];
    } else if (activeTab === 'overdue') {
      sourceList = data.overdue || [];
    } else if (activeTab === 'schedule') {
      if (scheduleMode === 'important_only') {
        sourceList = data.important || [];
      } else {
        sourceList = data.schedule || [];
      }
    }

    if (!searchText.trim()) return sourceList;

    const term = searchText.toLowerCase().trim();
    return sourceList.filter((t) => {
      const titleMatch = t.title?.toLowerCase().includes(term);
      const projMatch = t.project?.name?.toLowerCase().includes(term);
      const codeMatch = t.project?.code?.toLowerCase().includes(term);
      return titleMatch || projMatch || codeMatch;
    });
  }, [activeTab, data, scheduleMode, searchText]);

  /**
   * Gom nhóm cho tab Lịch biểu theo thời gian
   */
  const scheduleGroups = useMemo(() => {
    if (activeTab !== 'schedule') return null;

    const groups = {
      overdue: { title: 'Đã quá hạn', tasks: [], color: '#ef4444' },
      today: { title: 'Hôm nay', tasks: [], color: '#f59e0b' },
      tomorrow: { title: 'Ngày mai', tasks: [], color: '#3b82f6' },
      thisWeek: { title: 'Tuần này', tasks: [], color: '#8b5cf6' },
      nextWeek: { title: 'Tuần tới', tasks: [], color: '#06b6d4' },
      later: { title: 'Xa hơn', tasks: [], color: '#64748b' },
    };

    const now = dayjs();
    const todayEnd = now.endOf('day');
    const tomorrowEnd = now.add(1, 'day').endOf('day');
    const thisWeekEnd = now.endOf('week');
    const nextWeekEnd = now.add(1, 'week').endOf('week');

    filteredTasks.forEach((t) => {
      const end = dayjs(t.endDate);
      if (end.isBefore(now.startOf('day'))) {
        groups.overdue.tasks.push(t);
      } else if (end.isBefore(todayEnd)) {
        groups.today.tasks.push(t);
      } else if (end.isBefore(tomorrowEnd)) {
        groups.tomorrow.tasks.push(t);
      } else if (end.isBefore(thisWeekEnd)) {
        groups.thisWeek.tasks.push(t);
      } else if (end.isBefore(nextWeekEnd)) {
        groups.nextWeek.tasks.push(t);
      } else {
        groups.later.tasks.push(t);
      }
    });

    return Object.entries(groups).filter(([, val]) => val.tasks.length > 0);
  }, [activeTab, filteredTasks]);

  /**
   * Render từng Card công việc
   */
  const renderTaskCard = (task) => {
    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
    const isOverdue = dayjs(task.endDate).isBefore(dayjs().startOf('day'));

    return (
      <div
        key={task._id}
        onClick={() => {
          if (onSelectTask) onSelectTask(task._id);
        }}
        style={{
          background: isDark ? 'rgba(30, 41, 59, 0.7)' : '#ffffff',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 10,
          border: isDark
            ? `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`
            : `1px solid ${isOverdue ? '#fca5a5' : '#e2e8f0'}`,
          boxShadow: isDark
            ? '0 2px 8px rgba(0, 0, 0, 0.2)'
            : '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          position: 'relative',
        }}
        className="reminder-task-card"
      >
        {/* Top: Checkbox, Title & Priority */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Tooltip title="Đánh dấu hoàn thành ngay">
            <Checkbox
              checked={false}
              onChange={(e) => handleQuickComplete(task, e)}
              style={{ marginTop: 2 }}
            />
          </Tooltip>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text
                strong
                style={{
                  fontSize: 14,
                  color: isDark ? '#f8fafc' : '#0f172a',
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}
              >
                {task.title}
              </Text>
            </div>

            {/* Sub-info: Project & TaskGroup */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {task.project && (
                <Tag
                  style={{
                    fontSize: 11,
                    borderRadius: 4,
                    padding: '0 6px',
                    margin: 0,
                    background: isDark ? 'rgba(99, 102, 241, 0.15)' : '#e0e7ff',
                    color: '#6366f1',
                    border: 'none',
                  }}
                >
                  {task.project.code || task.project.name}
                </Tag>
              )}

              {task.taskGroup && (
                <Tag
                  style={{
                    fontSize: 11,
                    borderRadius: 4,
                    padding: '0 6px',
                    margin: 0,
                    background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                    color: '#059669',
                    border: 'none',
                  }}
                >
                  {task.taskGroup.name}
                </Tag>
              )}

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 4,
                  color: priority.color,
                  background: isDark ? 'rgba(255, 255, 255, 0.05)' : priority.bg,
                  border: `1px solid ${isDark ? 'transparent' : priority.border}`,
                }}
              >
                {priority.label}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Deadline Tag & Quick Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 6,
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f1f5f9',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <div>{getDeadlineBadge(task.endDate)}</div>

          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Dời hạn hoàn thành">
              <Button
                size="small"
                icon={<FieldTimeOutlined />}
                onClick={(e) => handleOpenSnooze(task, e)}
                style={{
                  fontSize: 12,
                  borderRadius: 6,
                  color: '#f59e0b',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
                  background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                }}
              >
                Dời hạn
              </Button>
            </Tooltip>

            <Tooltip title="Báo cáo kết quả">
              <Button
                size="small"
                icon={<FileDoneOutlined />}
                onClick={(e) => handleOpenResultReport(task, e)}
                style={{
                  fontSize: 12,
                  borderRadius: 6,
                  color: '#10b981',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0',
                  background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5',
                }}
              >
                Báo cáo
              </Button>
            </Tooltip>

            <Tooltip title="Xem chi tiết">
              <Button
                size="small"
                type="text"
                icon={<EyeOutlined />}
                onClick={() => {
                  if (onSelectTask) onSelectTask(task._id);
                }}
                style={{ borderRadius: 6, color: '#6366f1' }}
              />
            </Tooltip>
          </Space>
        </div>
      </div>
    );
  };

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}>
            <Space align="center">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                }}
              >
                <ClockCircleOutlined style={{ fontSize: 16 }} />
              </div>
              <div>
                <Text strong style={{ fontSize: 16, display: 'block', lineHeight: 1.2 }}>
                  Nhắc việc (Reminders)
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Chuẩn Base Wework • Chỉ công việc có deadline
                </Text>
              </div>
            </Space>

            <Tooltip title="Làm mới danh sách">
              <Button
                type="text"
                shape="circle"
                icon={<SyncOutlined spin={loading} />}
                onClick={loadReminders}
                style={{ color: '#64748b' }}
              />
            </Tooltip>
          </div>
        }
        placement="right"
        size={Math.min(540, typeof window !== 'undefined' ? window.innerWidth - 16 : 540)}
        open={open}
        onClose={onClose}
        styles={{
          body: {
            padding: '12px 16px',
            background: isDark ? '#090d16' : '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
        }}
      >
        {/* Thanh tìm kiếm nhanh */}
        <div style={{ marginBottom: 12 }}>
          <Input
            placeholder="Tìm theo tên công việc, dự án..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              borderRadius: 8,
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            }}
          />
        </div>

        {/* Tabs 4 mục chuẩn Base Wework */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ marginBottom: 8 }}
          items={[
            {
              key: 'important',
              label: (
                <Space size={6}>
                  <FireOutlined style={{ color: '#f43f5e' }} />
                  <span>Quan trọng</span>
                  <Badge
                    count={data.counts.important}
                    overflowCount={99}
                    style={{
                      backgroundColor: '#f43f5e',
                      boxShadow: 'none',
                      fontSize: 11,
                      height: 18,
                      lineHeight: '18px',
                      minWidth: 18,
                    }}
                  />
                </Space>
              ),
            },
            {
              key: 'today',
              label: (
                <Space size={6}>
                  <ClockCircleOutlined style={{ color: '#f59e0b' }} />
                  <span>Hôm nay</span>
                  <Badge
                    count={data.counts.today}
                    overflowCount={99}
                    style={{
                      backgroundColor: '#f59e0b',
                      boxShadow: 'none',
                      fontSize: 11,
                      height: 18,
                      lineHeight: '18px',
                      minWidth: 18,
                    }}
                  />
                </Space>
              ),
            },
            {
              key: 'overdue',
              label: (
                <Space size={6}>
                  <ExclamationCircleOutlined style={{ color: '#ef4444' }} />
                  <span>Muộn</span>
                  <Badge
                    count={data.counts.overdue}
                    overflowCount={99}
                    style={{
                      backgroundColor: '#ef4444',
                      boxShadow: 'none',
                      fontSize: 11,
                      height: 18,
                      lineHeight: '18px',
                      minWidth: 18,
                    }}
                  />
                </Space>
              ),
            },
            {
              key: 'schedule',
              label: (
                <Space size={6}>
                  <ScheduleOutlined style={{ color: '#6366f1' }} />
                  <span>Lịch biểu</span>
                  <Badge
                    count={data.counts.total}
                    overflowCount={99}
                    style={{
                      backgroundColor: '#6366f1',
                      boxShadow: 'none',
                      fontSize: 11,
                      height: 18,
                      lineHeight: '18px',
                      minWidth: 18,
                    }}
                  />
                </Space>
              ),
            },
          ]}
        />

        {/* Chế độ lọc trong tab Lịch biểu */}
        {activeTab === 'schedule' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff',
              padding: '6px 12px',
              borderRadius: 8,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              Bộ lọc Lịch biểu:
            </Text>
            <Segmented
              size="small"
              value={scheduleMode}
              onChange={setScheduleMode}
              options={[
                { value: 'all', label: `Tất cả (${data.counts.total})` },
                { value: 'important_only', label: `Chỉ mục Quan trọng (${data.counts.important})` },
              ]}
            />
          </div>
        )}

        {/* Nội dung danh sách task */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
              <Spin tip="Đang tải danh sách nhắc nhở..." />
            </div>
          ) : filteredTasks.length === 0 ? (
            <Empty
              description={
                <div style={{ padding: '24px 0' }}>
                  <Text strong style={{ fontSize: 14, display: 'block', color: isDark ? '#cbd5e1' : '#475569' }}>
                    Không có công việc nào trong mục này
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Tất cả công việc đúng hạn hoặc bạn đã hoàn thành xuất sắc nhiệm vụ!
                  </Text>
                </div>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: 40 }}
            />
          ) : activeTab === 'schedule' && scheduleGroups ? (
            // Tab Lịch biểu: Gom nhóm theo thời gian
            scheduleGroups.map(([groupKey, group]) => (
              <div key={groupKey} style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                    padding: '4px 0',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: group.color,
                    }}
                  />
                  <Text strong style={{ fontSize: 13, color: isDark ? '#f8fafc' : '#1e293b' }}>
                    {group.title} ({group.tasks.length})
                  </Text>
                </div>
                {group.tasks.map((task) => renderTaskCard(task))}
              </div>
            ))
          ) : (
            // Các tab Quan trọng, Hôm nay, Muộn
            filteredTasks.map((task) => renderTaskCard(task))
          )}
        </div>

        {/* Footer ghi chú chuẩn Base */}
        <div
          style={{
            paddingTop: 10,
            marginTop: 8,
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <Text type="secondary" style={{ fontSize: 11 }}>
            Số trên huy hiệu ứng dụng = Số công việc mục <strong>Quan trọng (±7 ngày)</strong>
          </Text>
        </div>
      </Drawer>

      {/* Modal Dời hạn hoàn thành (Snooze) */}
      <Modal
        title={
          <Space>
            <FieldTimeOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
            <span>Dời hạn hoàn thành công việc</span>
          </Space>
        }
        open={snoozeModalOpen}
        onCancel={() => setSnoozeModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={snoozeForm} layout="vertical" onFinish={handleSnoozeSubmit} style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 14 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Công việc:</Text>
            <Text strong style={{ display: 'block', fontSize: 14 }}>{snoozeTask?.title}</Text>
            {snoozeTask?.endDate && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Hạn hiện tại: {dayjs(snoozeTask.endDate).format('DD/MM/YYYY HH:mm')}
              </Text>
            )}
          </div>

          <Form.Item
            name="newEndDate"
            label="Thời hạn hoàn thành mới (Deadline)"
            rules={[{ required: true, message: 'Vui lòng chọn thời hạn mới' }]}
          >
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              placeholder="Chọn ngày và giờ hoàn thành mới"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do điều chỉnh hạn"
            rules={[{ required: true, message: 'Vui lòng nhập lý do điều chỉnh hạn' }]}
          >
            <TextArea
              rows={3}
              placeholder="Nhập lý do dời hạn (vd: Đợi phản hồi khách hàng, phát sinh thêm yêu cầu...)"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setSnoozeModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={snoozeSubmitting}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderColor: '#d97706',
              }}
            >
              Lưu thay đổi hạn
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Báo cáo kết quả công việc */}
      {selectedTaskForResult && (
        <TaskResultModal
          open={resultModalOpen}
          task={selectedTaskForResult}
          onClose={() => {
            setResultModalOpen(false);
            setSelectedTaskForResult(null);
          }}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent('reminders:updated'));
            loadReminders();
            if (onTaskUpdated) onTaskUpdated();
          }}
        />
      )}
    </>
  );
}
