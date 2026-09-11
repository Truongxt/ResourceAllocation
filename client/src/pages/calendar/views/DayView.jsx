import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Typography, Tag, Progress, Avatar, Row, Col, Space, Tooltip, Empty } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  StopOutlined,
  ProjectOutlined,
  UserOutlined,
  CalendarOutlined,
  FireOutlined,
  ApartmentOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';

const { Title, Text, Paragraph } = Typography;

const STATUS_CONFIG = {
  done: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '#10b981',
    text: '#10b981',
    label: 'Hoàn thành',
    icon: <CheckCircleOutlined />,
  },
  in_progress: {
    bg: 'rgba(6, 182, 212, 0.12)',
    border: '#06b6d4',
    text: '#06b6d4',
    label: 'Đang làm',
    icon: <SyncOutlined spin />,
  },
  review: {
    bg: 'rgba(139, 92, 246, 0.12)',
    border: '#8b5cf6',
    text: '#8b5cf6',
    label: 'Chờ duyệt',
    icon: <ClockCircleOutlined />,
  },
  blocked: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: '#ef4444',
    text: '#ef4444',
    label: 'Bị nghẽn',
    icon: <StopOutlined />,
  },
  todo: {
    bg: 'rgba(100, 116, 139, 0.12)',
    border: '#64748b',
    text: '#94a3b8',
    label: 'Cần làm',
    icon: <ClockCircleOutlined />,
  },
};

const PRIORITY_CONFIG = {
  critical: { color: 'error', label: 'Khẩn cấp' },
  high: { color: 'warning', label: 'Cao' },
  medium: { color: 'processing', label: 'Trung bình' },
  low: { color: 'default', label: 'Thấp' },
};

export default function DayView({ currentDate, tasks = [], onTaskClick }) {
  const { isDark } = useTheme();
  const dayStr = currentDate.format('YYYY-MM-DD');

  // Lọc các task thuộc ngày currentDate
  const dayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.startDate || !t.endDate) return false;
      const startStr = dayjs(t.startDate).format('YYYY-MM-DD');
      const endStr = dayjs(t.endDate).format('YYYY-MM-DD');
      return dayStr >= startStr && dayStr <= endStr;
    });
  }, [dayStr, tasks]);

  // Thống kê nhanh trong ngày
  const stats = useMemo(() => {
    const total = dayTasks.length;
    const done = dayTasks.filter((t) => t.status === 'done').length;
    const inProgress = dayTasks.filter((t) => t.status === 'in_progress').length;
    const totalHours = dayTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    return { total, done, inProgress, totalHours };
  }, [dayTasks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Thẻ thống kê tổng quan ngày */}
      <div
        className="saas-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: isDark
            ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 20,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
            }}
          >
            <CalendarOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
              {currentDate.format('dddd, [ngày] DD [tháng] MM, YYYY')}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Chi tiết các công việc và tiến độ triển khai trong ngày
            </Text>
          </div>
        </div>

        <Space size="large" wrap>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tổng công việc
            </Text>
            <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {stats.total}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Đang làm
            </Text>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#06b6d4' }}>
              {stats.inProgress}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Đã xong
            </Text>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>
              {stats.done}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tổng giờ ước tính
            </Text>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
              {stats.totalHours}h
            </div>
          </div>
        </Space>
      </div>

      {/* Danh sách Task trong ngày */}
      {dayTasks.length === 0 ? (
        <div
          className="saas-card"
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#64748b' : '#94a3b8',
              fontSize: 24,
              marginBottom: 12,
            }}
          >
            <CalendarOutlined />
          </div>
          <Title level={5} style={{ margin: 0, color: isDark ? '#cbd5e1' : '#475569' }}>
            Không có công việc nào trong ngày này
          </Title>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4 }}>
            Hãy chọn ngày khác hoặc tạo công việc mới để bắt đầu lên kế hoạch
          </Text>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dayTasks.map((t) => {
            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.todo;
            const priority = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;

            return (
              <div
                key={t._id}
                onClick={() => onTaskClick && onTaskClick(t)}
                className="saas-card"
                style={{
                  padding: '16px 20px',
                  borderLeft: `5px solid ${cfg.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 8px 24px rgba(0,0,0,0.45)'
                    : '0 6px 18px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Row gutter={[16, 12]} align="middle">
                  {/* Cột 1: Thông tin cơ bản task */}
                  <Col xs={24} md={12}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Tag
                        icon={cfg.icon}
                        style={{
                          background: cfg.bg,
                          color: cfg.text,
                          border: `1px solid ${cfg.border}`,
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {cfg.label}
                      </Tag>
                      <Tag color={priority.color} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
                        {priority.label}
                      </Tag>
                      {t.project && (
                        <span style={{ fontSize: 12, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ProjectOutlined /> {t.project.name}
                        </span>
                      )}
                    </div>
                    <Title level={5} style={{ margin: 0, fontWeight: 700 }}>
                      {t.title}
                    </Title>
                    {t.description && (
                      <Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2 }}
                        style={{ margin: '6px 0 0', fontSize: 13 }}
                      >
                        {t.description}
                      </Paragraph>
                    )}
                  </Col>

                  {/* Cột 2: Tiến độ & Thời gian */}
                  <Col xs={24} sm={12} md={6}>
                    <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <Text type="secondary">Tiến độ công việc</Text>
                      <Text strong>{t.progress || 0}%</Text>
                    </div>
                    <Progress
                      percent={t.progress || 0}
                      size="small"
                      strokeColor={t.progress === 100 ? '#10b981' : '#6366f1'}
                      railColor={isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                      <ClockCircleOutlined style={{ marginRight: 6 }} />
                      Ước tính: <Text strong>{t.estimatedHours || 0}h</Text>
                      {t.actualHours > 0 && <span> • Thực tế: <Text strong>{t.actualHours}h</Text></span>}
                    </div>
                  </Col>

                  {/* Cột 3: Người được giao việc */}
                  <Col xs={24} sm={12} md={6} style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                      <Avatar
                        size={36}
                        icon={<UserOutlined />}
                        style={{
                          backgroundColor: t.assignee ? '#6366f1' : '#64748b',
                          fontWeight: 700,
                        }}
                      >
                        {t.assignee?.name ? t.assignee.name[0].toUpperCase() : 'U'}
                      </Avatar>
                      <div>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>
                          {t.assignee?.name || 'Chưa gán người'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {t.assignee?.department || t.assignee?.email || 'Thành viên'}
                        </Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

