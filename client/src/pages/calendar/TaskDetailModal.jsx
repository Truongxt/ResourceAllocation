import React, { useState } from 'react';
import { Modal, Descriptions, Tag, Select, Slider, Button, Typography, Space, Avatar, message, Divider } from 'antd';
import {
  ProjectOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  StopOutlined,
  LinkOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import taskService from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';

const { Title, Text, Paragraph } = Typography;

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Cần làm (To do)', color: 'default' },
  { value: 'in_progress', label: 'Đang làm (In Progress)', color: 'cyan' },
  { value: 'review', label: 'Chờ duyệt (In Review)', color: 'purple' },
  { value: 'done', label: 'Hoàn thành (Done)', color: 'success' },
  { value: 'blocked', label: 'Bị nghẽn (Blocked)', color: 'error' },
];

const PRIORITY_TAGS = {
  critical: { color: 'error', label: 'Khẩn cấp' },
  high: { color: 'warning', label: 'Cao' },
  medium: { color: 'processing', label: 'Trung bình' },
  low: { color: 'default', label: 'Thấp' },
};

export default function TaskDetailModal({ open, task, onClose, onUpdated }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [progressVal, setProgressVal] = useState(null);

  if (!task) return null;

  const currentProgress = progressVal !== null ? progressVal : (task.progress || 0);

  // Cập nhật trạng thái Task
  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await taskService.updateStatus(task._id, newStatus);
      message.success('Đã cập nhật trạng thái công việc');
      if (onUpdated) onUpdated();
    } catch {
      message.error('Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  // Cập nhật tiến độ %
  const handleProgressCommit = async (val) => {
    setUpdating(true);
    try {
      await taskService.update(task._id, { progress: val });
      message.success(`Đã cập nhật tiến độ ${val}%`);
      if (onUpdated) onUpdated();
    } catch {
      message.error('Không thể cập nhật tiến độ');
    } finally {
      setUpdating(false);
    }
  };

  const priority = PRIORITY_TAGS[task.priority] || PRIORITY_TAGS.medium;
  const start = task.startDate ? dayjs(task.startDate).format('DD/MM/YYYY') : '—';
  const end = task.endDate ? dayjs(task.endDate).format('DD/MM/YYYY') : '—';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        task.project?._id && (
          <Button
            key="project"
            icon={<LinkOutlined />}
            onClick={() => {
              onClose();
              navigate(`/projects/${task.project._id}`);
            }}
          >
            Xem Dự án
          </Button>
        ),
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={680}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 24 }}>
          <ProjectOutlined style={{ color: '#6366f1', fontSize: 18 }} />
          <span style={{ fontSize: 16, fontWeight: 700 }}>Chi tiết công việc</span>
        </div>
      }
    >
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header Task Title & Project */}
        <div>
          <Title level={4} style={{ margin: '0 0 6px 0', fontWeight: 800 }}>
            {task.title}
          </Title>
          <Space size="middle" wrap>
            {task.project && (
              <Tag color="indigo" style={{ borderRadius: 6, fontWeight: 600 }}>
                {task.project.name}
              </Tag>
            )}
            <Tag color={priority.color} style={{ borderRadius: 6, fontWeight: 600 }}>
              Ưu tiên: {priority.label}
            </Tag>
          </Space>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Nhanh: Đổi trạng thái & Tiến độ */}
        <div
          className="saas-card"
          style={{
            padding: '14px 16px',
            background: 'rgba(99, 102, 241, 0.04)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <Text strong style={{ fontSize: 13 }}>
              Trạng thái:
            </Text>
            <Select
              value={task.status}
              onChange={handleStatusChange}
              loading={updating}
              style={{ width: 220 }}
              options={STATUS_OPTIONS}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text strong style={{ fontSize: 13 }}>
                Tiến độ: {currentProgress}%
              </Text>
            </div>
            <Slider
              min={0}
              max={100}
              value={currentProgress}
              onChange={(val) => setProgressVal(val)}
              onAfterChange={handleProgressCommit}
              disabled={updating}
              marks={{
                0: '0%',
                25: '25%',
                50: '50%',
                75: '75%',
                100: '100%',
              }}
            />
          </div>
        </div>

        {/* Thông tin chi tiết */}
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Thời gian thực hiện">
            <CalendarOutlined style={{ marginRight: 6, color: '#6366f1' }} />
            {start} — {end}
          </Descriptions.Item>

          <Descriptions.Item label="Giờ ước tính / Thực tế">
            <ClockCircleOutlined style={{ marginRight: 6, color: '#f59e0b' }} />
            {task.estimatedHours || 0}h / {task.actualHours || 0}h
          </Descriptions.Item>

          <Descriptions.Item label="Người thực hiện" span={2}>
            {task.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#6366f1' }}
                >
                  {task.assignee.name ? task.assignee.name[0].toUpperCase() : 'U'}
                </Avatar>
                <div>
                  <Text strong>{task.assignee.name}</Text>
                  {task.assignee.email && (
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      ({task.assignee.email})
                    </Text>
                  )}
                </div>
              </div>
            ) : (
              <Text type="secondary">Chưa giao cho nhân viên nào</Text>
            )}
          </Descriptions.Item>

          {task.requiredSkills && task.requiredSkills.length > 0 && (
            <Descriptions.Item label="Kỹ năng yêu cầu" span={2}>
              <Space size={[0, 4]} wrap>
                {task.requiredSkills.map((sk, idx) => (
                  <Tag key={idx} color="purple">
                    {sk.name} (Lv.{sk.level})
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}

          {task.description && (
            <Descriptions.Item label="Mô tả công việc" span={2}>
              <Paragraph style={{ margin: 0, whiteSpace: 'pre-line' }}>
                {task.description}
              </Paragraph>
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>
    </Modal>
  );
}

