import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import taskService from '../../services/taskService';
import resourceService from '../../services/resourceService';
import CalendarHeader from './CalendarHeader';
import MonthView from './views/MonthView';
import WeekView from './views/WeekView';
import DayView from './views/DayView';
import TaskDetailModal from './TaskDetailModal';
import { message, Spin } from 'antd';

export default function CalendarPage() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
    // Dùng để lọc nhân viên được chọn trên header (nếu là PM/Admin thì hiện dropdown, user thường thì ẩn)
    const [selectedAssignee, setSelectedAssignee] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    // Hàm tính dải ngày [from, to] dựa vào viewMode và currentDate:
    const getDateRange = useCallback(() => {
        if (viewMode === 'month') {
            return {
                from: currentDate.startOf('month').startOf('week').format('YYYY-MM-DD'),
                to: currentDate.endOf('month').endOf('week').format('YYYY-MM-DD'),
            };
        }
        if (viewMode === 'week') {
            return {
                from: currentDate.startOf('week').format('YYYY-MM-DD'),
                to: currentDate.endOf('week').format('YYYY-MM-DD'),
            };
        }
        // viewMode === 'day'
        return {
            from: currentDate.startOf('day').format('YYYY-MM-DD'),
            to: currentDate.endOf('day').format('YYYY-MM-DD'),
        };
    }, [currentDate, viewMode]);
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const { from, to } = getDateRange();
            const params = { from, to, limit: 200 }; // Lấy đủ task hiển thị trên lịch
            if (selectedAssignee) {
                params.assignee = selectedAssignee;
            }
            const res = await taskService.getCalendarTasks(params);
            setTasks(res.data?.data?.tasks || []);
        } catch {
            message.error('Không thể tải công việc trên lịch');
        } finally {
            setLoading(false);
        }
    }, [getDateRange, selectedAssignee]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Nếu là PM/Admin thì nạp thêm danh sách nhân sự để lọc
    useEffect(() => {
        if (user?.role !== 'member') {
            resourceService.getAll().then((res) => {
                setResources(res.data?.data?.resources || []);
            }).catch(() => { });
        }
    }, [user]);
    const handlePrev = () => setCurrentDate((prev) => prev.subtract(1, viewMode));
    const handleNext = () => setCurrentDate((prev) => prev.add(1, viewMode));
    const handleToday = () => setCurrentDate(dayjs());
    const handleTaskClick = (task) => {
        setSelectedTask(task);
        setModalOpen(true);
    };
    return (
        <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <CalendarHeader
                currentDate={currentDate}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                selectedAssignee={selectedAssignee}
                onAssigneeChange={setSelectedAssignee}
                resources={resources}
                userRole={user?.role}
            />

            <Spin spinning={loading}>
                {viewMode === 'month' && <MonthView currentDate={currentDate} tasks={tasks} onTaskClick={handleTaskClick} />}
                {viewMode === 'week' && <WeekView currentDate={currentDate} tasks={tasks} onTaskClick={handleTaskClick} />}
                {viewMode === 'day' && <DayView currentDate={currentDate} tasks={tasks} onTaskClick={handleTaskClick} />}
            </Spin>

            <TaskDetailModal
                open={modalOpen}
                task={selectedTask}
                onClose={() => setModalOpen(false)}
                onUpdated={fetchTasks}
            />
        </div>
    );
}
