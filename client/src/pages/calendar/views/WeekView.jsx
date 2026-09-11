import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Typography, Tag, Progress, Avatar, Tooltip, Empty } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  StopOutlined,
  ProjectOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';

const { Text } = Typography;

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const STATUS_CONFIG = {
  done: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '#10b981',
    text: '#10b981',
    label: 'Hoàn thành',
    icon: <CheckCircleOutlined style={{ fontSize: 11 }} />,
  },
  in_progress: {
    bg: 'rgba(6, 182, 212, 0.12)',
    border: '#06b6d4',
    text: '#06b6d4',
    label: 'Đang làm',
    icon: <SyncOutlined spin style={{ fontSize: 11 }} />,
  },
  review: {
    bg: 'rgba(139, 92, 246, 0.12)',
    border: '#8b5cf6',
    text: '#8b5cf6',
    label: 'Chờ duyệt',
    icon: <ClockCircleOutlined style={{ fontSize: 11 }} />,
  },
  blocked: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: '#ef4444',
    text: '#ef4444',
    label: 'Bị nghẽn',
    icon: <StopOutlined style={{ fontSize: 11 }} />,
  },
  todo: {
    bg: 'rgba(100, 116, 139, 0.12)',
    border: '#64748b',
    text: '#94a3b8',
    label: 'Cần làm',
    icon: <ClockCircleOutlined style={{ fontSize: 11 }} />,
  },
};

const PRIORITY_COLOR = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#64748b',
};

export default function WeekView({ currentDate, tasks = [], onTaskClick }) {
  const { isDark } = useTheme();
  const todayStr = dayjs().format('YYYY-MM-DD');

  // 1. Tính toán 7 ngày trong tuần của currentDate (bắt đầu từ Thứ Hai)
  const weekDays = useMemo(() => {
    const dayOfWeek = currentDate.day(); // 0 (CN) -> 6 (T7)
    const offset = (dayOfWeek + 6) % 7;
    const weekStart = currentDate.startOf('day').subtract(offset, 'day');

    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.add(i, 'day'));
    }
    return days;
  }, [currentDate]);

  // 2. Gom nhóm tasks theo ngày trong tuần
  const tasksByDay = useMemo(() => {
    const map = {};
    weekDays.forEach((day) => {
      const dayStr = day.format('YYYY-MM-DD');
      map[dayStr] = tasks.filter((t) => {
        if (!t.startDate || !t.endDate) return false;
        const startStr = dayjs(t.startDate).format('YYYY-MM-DD');
        const endStr = dayjs(t.endDate).format('YYYY-MM-DD');
        return dayStr >= startStr && dayStr <= endStr;
      });
    });
    return map;
  }, [weekDays, tasks]);

  return (
    <div
      className="saas-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        borderRadius: 12,
      }}
    >
      {/* Header 7 ngày trong tuần */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        }}
      >
        {weekDays.map((day, idx) => {
          const dayStr = day.format('YYYY-MM-DD');
          const isToday = dayStr === todayStr;
          const count = (tasksByDay[dayStr] || []).length;

          return (
            <div
              key={dayStr}
              style={{
                padding: '14px 8px',
                textAlign: 'center',
                borderRight: idx < 6 ? (isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid #f1f5f9') : 'none',
                background: isToday ? (isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)') : 'transparent',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: idx >= 5 ? '#f59e0b' : (isDark ? '#94a3b8' : '#64748b'),
                }}
              >
                {WEEKDAYS[idx]}
              </div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    fontSize: 14,
                    fontWeight: isToday ? 800 : 600,
                    background: isToday ? '#6366f1' : 'transparent',
                    color: isToday ? '#ffffff' : (isDark ? '#f8fafc' : '#0f172a'),
                    boxShadow: isToday ? '0 0 12px rgba(99, 102, 241, 0.45)' : 'none',
                  }}
                >
                  {day.date()}
                </span>
                {count > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                      color: isDark ? '#cbd5e1' : '#475569',
                    }}
                  >
                    {count}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lưới 7 làn công việc tương ứng */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          minHeight: 520,
          background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#e2e8f0',
          gap: '1px',
        }}
      >
        {weekDays.map((day) => {
          const dayStr = day.format('YYYY-MM-DD');
          const dayTasks = tasksByDay[dayStr] || [];

          return (
            <div
              key={dayStr}
              style={{
                background: isDark ? '#0c121e' : '#ffffff',
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {dayTasks.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#475569' : '#94a3b8',
                    fontSize: 12,
                    padding: '30px 4px',
                    textAlign: 'center',
                  }}
                >
                  <ClockCircleOutlined style={{ fontSize: 18, marginBottom: 6, opacity: 0.4 }} />
                  <span>Trống lịch</span>
                </div>
              ) : (
                dayTasks.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.todo;
                  const priorityColor = PRIORITY_COLOR[t.priority] || '#64748b';

                  return (
                    <div
                      key={t._id}
                      onClick={() => onTaskClick && onTaskClick(t)}
                      style={{
                        padding: '10px 10px 8px',
                        borderRadius: 8,
                        background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid #e2e8f0',
                        borderLeft: `4px solid ${cfg.border}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = isDark
                          ? '0 6px 16px rgba(0,0,0,0.4)'
                          : '0 4px 12px rgba(0,0,0,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Tiêu đề task */}
                      <Text
                        strong
                        style={{
                          fontSize: 12,
                          color: isDark ? '#f8fafc' : '#0f172a',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {t.title}
                      </Text>

                      {/* Tên dự án */}
                      {t.project && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6366f1' }}>
                          <ProjectOutlined style={{ fontSize: 10 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.project.name}
                          </span>
                        </div>
                      )}

                      {/* Tiến độ (nếu có) */}
                      {typeof t.progress === 'number' && (
                        <div style={{ marginTop: 2 }}>
                          <Progress
                            percent={t.progress}
                            size="small"
                            showInfo={false}
                            strokeColor={t.progress === 100 ? '#10b981' : '#6366f1'}
                            railColor={isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}
                          />
                        </div>
                      )}

                      {/* Footer card: Priority + Assignee */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 4,
                          paddingTop: 4,
                          borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: priorityColor,
                            textTransform: 'uppercase',
                          }}
                        >
                          {t.priority}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {t.estimatedHours > 0 && (
                            <span style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b' }}>
                              {t.estimatedHours}h
                            </span>
                          )}
                          <Tooltip title={t.assignee?.name || 'Chưa gán'}>
                            <Avatar
                              size={18}
                              icon={<UserOutlined />}
                              style={{
                                backgroundColor: t.assignee ? '#6366f1' : '#64748b',
                                fontSize: 10,
                              }}
                            >
                              {t.assignee?.name ? t.assignee.name[0].toUpperCase() : 'U'}
                            </Avatar>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
