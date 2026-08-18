import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Input,
  Button,
  Segmented,
  Tag,
  Space,
  Typography,
  Tooltip,
  Empty,
  Spin,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  BarChartOutlined,
  CalendarOutlined,
  UserOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import taskService from '../services/taskService';
import projectService from '../services/projectService';
import { TASK_STATUS_COLORS as STATUS_COLORS, TASK_STATUS_LABELS as STATUS_LABELS } from '../constants';
import './GanttChart.css';

const { Title, Text } = Typography;

const ZOOM_LEVELS = [
  { key: 'day', label: 'Ngày', dayWidth: 40, format: 'dd' },
  { key: 'week', label: 'Tuần', dayWidth: 20, format: 'Wk' },
  { key: 'month', label: 'Tháng', dayWidth: 8, format: 'MMM' },
];

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(d1, d2) {
  return Math.ceil((new Date(d2) - new Date(d1)) / 86400000);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(date));
}

export default function GanttChart() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomKey, setZoomKey] = useState('week');
  const [filters, setFilters] = useState({ project: '', search: '' });

  const zoom = ZOOM_LEVELS.find((z) => z.key === zoomKey) || ZOOM_LEVELS[1];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.project) params.project = filters.project;
      if (filters.search) params.search = filters.search;

      const [taskRes, projRes] = await Promise.all([
        taskService.getAll({ ...params, limit: 100 }),
        projectService.getAll({ limit: 100 }),
      ]);
      setTasks(taskRes.data.data.tasks || []);
      setProjects(projRes.data.data.projects || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, filters.search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load]);

  // Compute timeline range
  const { timelineStart, timelineEnd, totalDays, validTasks } = useMemo(() => {
    const valid = tasks.filter((t) => t.startDate && t.endDate);
    if (!valid.length) {
      const now = new Date();
      return {
        timelineStart: addDays(now, -7),
        timelineEnd: addDays(now, 45),
        totalDays: 52,
        validTasks: [],
      };
    }

    const minDate = new Date(Math.min(...valid.map((t) => new Date(t.startDate))));
    const maxDate = new Date(Math.max(...valid.map((t) => new Date(t.endDate))));

    const start = addDays(minDate, -4);
    const end = addDays(maxDate, 10);
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: Math.max(daysBetween(start, end), 30),
      validTasks: valid,
    };
  }, [tasks]);

  // Days array for header
  const daysArray = useMemo(() => {
    const arr = [];
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(timelineStart, i);
      arr.push({
        date: d,
        dayNum: d.getDate(),
        month: d.getMonth() + 1,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: d.toDateString() === new Date().toDateString(),
      });
    }
    return arr;
  }, [timelineStart, totalDays]);

  const chartWidth = totalDays * zoom.dayWidth;

  const getTaskBarStyle = (task) => {
    const startOffset = Math.max(0, daysBetween(timelineStart, task.startDate));
    const duration = Math.max(1, daysBetween(task.startDate, task.endDate));
    return {
      left: `${startOffset * zoom.dayWidth}px`,
      width: `${Math.max(duration * zoom.dayWidth, 24)}px`,
      backgroundColor: STATUS_COLORS[task.status] || '#6366f1',
    };
  };

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Sơ đồ Gantt (Gantt Chart)</Title>
          <Text type="secondary">Theo dõi trực quan timeline, tiến độ và phân bổ công việc theo thời gian thực</Text>
        </div>
        <Space>
          <Segmented
            value={zoomKey}
            onChange={setZoomKey}
            options={[
              { value: 'day', label: 'Ngày' },
              { value: 'week', label: 'Tuần' },
              { value: 'month', label: 'Tháng' },
            ]}
          />
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            In báo cáo
          </Button>
        </Space>
      </div>

      {/* Toolbar */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm kiếm công việc trên Gantt..."
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={12} md={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Tất cả dự án"
              value={filters.project || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, project: val || '' }))}
              allowClear
              options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
            />
          </Col>
          <Col xs={12} md={6} style={{ textAlign: 'right' }}>
            <Space>
              <Tag color="blue">Đang làm</Tag>
              <Tag color="green">Hoàn thành</Tag>
              <Tag color="orange">Đánh giá</Tag>
              <Button icon={<ReloadOutlined />} onClick={load} title="Tải lại" />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Gantt View Container */}
      <Card styles={{ body: { padding: 0 } }}>
        <Spin spinning={loading}>
          {tasks.length === 0 ? (
            <Empty description="Chưa có công việc nào có lịch trình." style={{ padding: 48 }} />
          ) : (
            <div className="gantt-viewport">
              {/* Task Names Sidebar */}
              <div className="gantt-sidebar">
                <div className="gantt-sidebar-header">
                  <Text strong>Công việc ({tasks.length})</Text>
                </div>
                <div className="gantt-sidebar-body">
                  {tasks.map((task) => (
                    <div key={task._id} className="gantt-sidebar-row">
                      <Text strong ellipsis style={{ fontSize: 13, display: 'block' }}>
                        {task.title}
                      </Text>
                      <Space size={4}>
                        {task.project && (
                          <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                            {task.project.code || task.project.name}
                          </Tag>
                        )}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {task.assignee?.name || 'Chưa gán'}
                        </Text>
                      </Space>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Grid */}
              <div className="gantt-timeline-wrap">
                <div className="gantt-timeline-canvas" style={{ width: chartWidth }}>
                  {/* Timeline Header Days */}
                  <div className="gantt-timeline-header">
                    {daysArray.map((day, idx) => (
                      <div
                        key={idx}
                        className={`gantt-header-cell ${day.isWeekend ? 'weekend' : ''} ${day.isToday ? 'today' : ''}`}
                        style={{ width: zoom.dayWidth }}
                      >
                        <span className="day-num">{day.dayNum}</span>
                        {zoomKey === 'day' && <span className="day-m">T{day.month}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Task Bars Body */}
                  <div className="gantt-timeline-body">
                    {tasks.map((task) => {
                      const hasDates = task.startDate && task.endDate;
                      return (
                        <div key={task._id} className="gantt-timeline-row">
                          {hasDates && (
                            <Tooltip
                              title={
                                <div>
                                  <strong>{task.title}</strong>
                                  <br />
                                  <span>Trạng thái: {STATUS_LABELS[task.status] || task.status}</span>
                                  <br />
                                  <span>Thời gian: {formatDate(task.startDate)} → {formatDate(task.endDate)}</span>
                                  <br />
                                  <span>Tiến độ: {task.progress || 0}%</span>
                                </div>
                              }
                            >
                              <div className="gantt-task-bar" style={getTaskBarStyle(task)}>
                                <div className="gantt-task-progress" style={{ width: `${task.progress || 0}%` }} />
                                <span className="gantt-task-bar-label">{task.title}</span>
                              </div>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
}
