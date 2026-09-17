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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
              fontSize: 18,
            }}
          >
            <ProjectOutlined />
          </div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Chi tiết công việc
            </span>
          </div>
        </div>
      }
    >
      <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header Task Title & Project */}
        <div>
          <Title level={4} style={{ margin: '0 0 8px 0', fontWeight: 800, fontFamily: 'Plus Jakarta Sans, sans-serif', letterSpacing: '-0.015em' }}>
            {task.title}
          </Title>
          <Space size="small" wrap>
            {task.project && (
              <Tag color="indigo" style={{ borderRadius: 6, fontWeight: 600, padding: '2px 8px' }}>
                <ApartmentOutlined style={{ marginRight: 4 }} />
                {task.project.name}
              </Tag>
            )}
            <Tag color={priority.color} style={{ borderRadius: 6, fontWeight: 600, padding: '2px 8px' }}>
              Ưu tiên: {priority.label}
            </Tag>
          </Space>
        </div>

        {/* Nhanh: Đổi trạng thái & Tiến độ Bento-card */}
        <div
          className="bento-card"
          style={{
            padding: '16px 18px',
            background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.06) 0%, var(--surface-card) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              Trạng thái thực hiện:
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
              <Text strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                Tiến độ: <span className="tabular-nums" style={{ color: '#818cf8', fontWeight: 700 }}>{currentProgress}%</span>
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
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="middle" style={{ borderRadius: 10, overflow: 'hidden' }}>
          <Descriptions.Item label="Thời gian thực hiện">
            <CalendarOutlined style={{ marginRight: 6, color: '#6366f1' }} />
            <span className="tabular-nums">{start} — {end}</span>
          </Descriptions.Item>

          <Descriptions.Item label="Giờ ước tính / Thực tế">
            <ClockCircleOutlined style={{ marginRight: 6, color: '#f59e0b' }} />
            <span className="tabular-nums">{task.estimatedHours || 0}h / {task.actualHours || 0}h</span>
          </Descriptions.Item>

          <Descriptions.Item label="Người thực hiện" span={2}>
            {task.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar
                  size="default"
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#6366f1', fontWeight: 700 }}
                >
                  {task.assignee.name ? task.assignee.name[0].toUpperCase() : 'U'}
                </Avatar>
                <div>
                  <Text strong style={{ color: 'var(--text-primary)' }}>{task.assignee.name}</Text>
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
              <Space size={[0, 6]} wrap>
                {task.requiredSkills.map((sk, idx) => (
                  <Tag key={idx} color="purple" style={{ borderRadius: 6, fontWeight: 500 }}>
                    {sk.name} (Lv.{sk.level})
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}

          {task.description && (
            <Descriptions.Item label="Mô tả công việc" span={2}>
              <Paragraph style={{ margin: 0, whiteSpace: 'pre-line', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                {task.description}
              </Paragraph>
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>
    </Modal>
  );
}

