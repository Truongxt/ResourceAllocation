import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Typography, Tag, Tooltip } from 'antd';
import { CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useTheme } from '../../../context/ThemeContext';

const { Text } = Typography;

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

// Bảng màu & icon ngữ nghĩa chuẩn UI/UX Pro Max cho từng trạng thái Task
const STATUS_CONFIG = {
    done: {
        bg: 'rgba(16, 185, 129, 0.12)',
        border: '#10b981',
        text: '#10b981',
        icon: <CheckCircleOutlined style={{ fontSize: 11 }} />,
    },
    in_progress: {
        bg: 'rgba(6, 182, 212, 0.12)',
        border: '#06b6d4',
        text: '#06b6d4',
        icon: <SyncOutlined spin style={{ fontSize: 11 }} />,
    },
    review: {
        bg: 'rgba(139, 92, 246, 0.12)',
        border: '#8b5cf6',
        text: '#8b5cf6',
        icon: <ClockCircleOutlined style={{ fontSize: 11 }} />,
    },
    blocked: {
        bg: 'rgba(239, 68, 68, 0.12)',
        border: '#ef4444',
        text: '#ef4444',
        icon: <StopOutlined style={{ fontSize: 11 }} />,
    },
    todo: {
        bg: 'rgba(100, 116, 139, 0.12)',
        border: '#64748b',
        text: '#94a3b8',
        icon: <ClockCircleOutlined style={{ fontSize: 11 }} />,
    },
};

export default function MonthView({ currentDate, tasks = [], onTaskClick }) {
    const { isDark } = useTheme();

    // 1. Sinh danh sách 42 ngày cho lưới lịch tháng
    const calendarGrid = useMemo(() => {
        const startOfMonth = currentDate.startOf('month');
        // offset để lùi về Thứ Hai đầu tiên
        const dayOfWeek = startOfMonth.day(); // 0 (CN) -> 6 (T7)
        const offset = (dayOfWeek + 6) % 7;
        const startDate = startOfMonth.subtract(offset, 'day');

        const days = [];
        for (let i = 0; i < 42; i++) {
            days.push(startDate.add(i, 'day'));
        }
        return days;
    }, [currentDate]);

    // 2. Gom nhóm task theo từng ngày để tối ưu hiệu năng (tránh filter lặp lại trong mỗi cell)
    const tasksByDay = useMemo(() => {
        const map = {};
        calendarGrid.forEach((day) => {
            const dayStr = day.format('YYYY-MM-DD');
            map[dayStr] = tasks.filter((t) => {
                if (!t.startDate || !t.endDate) return false;
                const startStr = dayjs(t.startDate).format('YYYY-MM-DD');
                const endStr = dayjs(t.endDate).format('YYYY-MM-DD');
                return dayStr >= startStr && dayStr <= endStr;
            });
        });
        return map;
    }, [calendarGrid, tasks]);

    const todayStr = dayjs().format('YYYY-MM-DD');

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
            {/* Hàng Tiêu đề 7 Thứ trong tuần */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                    borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                }}
            >
                {WEEKDAYS.map((name, idx) => (
                    <div
                        key={name}
                        style={{
                            padding: '12px 8px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: 12,
                            color: idx >= 5 ? '#f59e0b' : (isDark ? '#94a3b8' : '#64748b'),
                            borderRight: idx < 6 ? (isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid #f1f5f9') : 'none',
                            letterSpacing: '0.04em',
                        }}
                    >
                        {name}
                    </div>
                ))}
            </div>

            {/* Lưới 42 ô ngày (7 cột x 6 hàng) */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gridAutoRows: 'minmax(115px, auto)',
                    background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#e2e8f0',
                    gap: '1px', // Tạo đường viền giữa các ô bằng CSS Grid gap
                }}
            >
                {calendarGrid.map((day) => {
                    const dayStr = day.format('YYYY-MM-DD');
                    const isCurrentMonth = day.month() === currentDate.month();
                    const isToday = dayStr === todayStr;
                    const dayTasks = tasksByDay[dayStr] || [];
                    const visibleTasks = dayTasks.slice(0, 3);
                    const hiddenCount = dayTasks.length - visibleTasks.length;

                    return (
                        <div
                            key={dayStr}
                            style={{
                                background: isDark ? '#0c121e' : '#ffffff',
                                padding: '8px 6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                opacity: isCurrentMonth ? 1 : 0.4, // Làm mờ các ngày thuộc tháng khác
                                transition: 'background 0.15s ease',
                            }}
                        >
                            {/* Số ngày ở góc trên */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 2px' }}>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        fontSize: 12,
                                        fontWeight: isToday ? 800 : 600,
                                        background: isToday ? '#6366f1' : 'transparent',
                                        color: isToday ? '#ffffff' : (isDark ? '#f1f5f9' : '#1e293b'),
                                        boxShadow: isToday ? '0 0 10px rgba(99, 102, 241, 0.5)' : 'none',
                                    }}
                                >
                                    {day.date()}
                                </span>
                                {dayTasks.length > 0 && (
                                    <Text type="secondary" style={{ fontSize: 10, fontWeight: 600 }}>
                                        {dayTasks.length} việc
                                    </Text>
                                )}
                            </div>

                            {/* Danh sách Task Pills trong ngày */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                                {visibleTasks.map((t) => {
                                    const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.todo;
                                    return (
                                        <Tooltip
                                            key={t._id}
                                            title={`${t.title} (${t.project?.name || 'Dự án'}) • Gán cho: ${t.assignee?.name || 'Chưa gán'}`}
                                        >
                                            <div
                                                onClick={() => onTaskClick && onTaskClick(t)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '3px 6px',
                                                    borderRadius: 6,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    background: cfg.bg,
                                                    borderLeft: `3px solid ${cfg.border}`,
                                                    color: isDark ? '#f8fafc' : '#0f172a',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    transition: 'transform 0.1s ease, filter 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                    e.currentTarget.style.filter = 'brightness(1.15)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.filter = 'none';
                                                }}
                                            >
                                                <span style={{ color: cfg.text, display: 'flex', alignItems: 'center' }}>
                                                    {cfg.icon}
                                                </span>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {t.title}
                                                </span>
                                            </div>
                                        </Tooltip>
                                    );
                                })}

                                {/* Badge thông báo nếu còn task chưa hiển thị hết */}
                                {hiddenCount > 0 && (
                                    <div
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: '#818cf8',
                                            padding: '1px 6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        + {hiddenCount} công việc khác...
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
