import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Row,
  Col,
  Select,
  Input,
  Button,
  Segmented,
  Checkbox,
  Tag,
  Space,
  Typography,
  Tooltip,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  PrinterOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import taskService from '../services/taskService';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import {
  ROLES,
  TASK_STATUSES,
  TASK_STATUS_COLORS as STATUS_COLORS,
  PRIORITY_OPTIONS,
  PRIORITY_COLORS,
} from '../constants';
import { taskStatusLabel, priorityLabel } from '../i18n/enums';
import { currentLocale, formatDayMonth as formatDate } from '../i18n/format';
import { addDays, computeCriticalPath, daysBetween, isMilestone } from '../utils/gantt';
import './GanttChart.css';

const { Title, Text } = Typography;

const ZOOM_LEVELS = [
  { key: 'day', dayWidth: 40 },
  { key: 'week', dayWidth: 20 },
  { key: 'month', dayWidth: 8 },
];

const GROUP_MODES = ['none', 'project', 'resource'];

const UNGROUPED_KEY = '__ungrouped__';

// Phải khớp với chiều cao hàng trong GanttChart.css (.gantt-timeline-row).
const ROW_HEIGHT = 44;

/**
 * Ngày mới sau khi kéo: 'move' dời cả hai đầu, 'resize-start'/'resize-end' chỉ
 * dời một đầu và không cho phép đầu này vượt qua đầu kia.
 */
function shiftedDates(task, mode, deltaDays) {
  const start = new Date(task.startDate);
  const end = new Date(task.endDate);

  if (mode === 'move') {
    return { startDate: addDays(start, deltaDays), endDate: addDays(end, deltaDays) };
  }
  if (mode === 'resize-start') {
    const next = addDays(start, deltaDays);
    return { startDate: next > end ? end : next, endDate: end };
  }
  const next = addDays(end, deltaDays);
  return { startDate: start, endDate: next < start ? start : next };
}

export default function GanttChart() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomKey, setZoomKey] = useState('week');
  const [groupBy, setGroupBy] = useState('none');
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [showDeps, setShowDeps] = useState(true);
  const [showCritical, setShowCritical] = useState(false);
  // Kéo thả đổi lịch: dragRef giữ trạng thái thật (không gây re-render mỗi lần
  // chuột nhích), dragPreview chỉ để vẽ lại thanh đang kéo.
  const dragRef = useRef(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [filters, setFilters] = useState({ project: '', search: '' });

  const zoom = ZOOM_LEVELS.find((z) => z.key === zoomKey) || ZOOM_LEVELS[1];

  // Chỉ Admin/PM sửa được ngày tháng của task — khớp với canModifyTask ở server,
  // nơi người được giao việc chỉ được đổi status/progress/actualHours.
  const canReschedule = user?.role === ROLES.ADMIN || user?.role === ROLES.PM;

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
    const timer = setTimeout(load, filters.search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Compute timeline range
  const { timelineStart, totalDays } = useMemo(() => {
    const valid = tasks.filter((item) => item.startDate && item.endDate);
    if (!valid.length) {
      const now = new Date();
      return { timelineStart: addDays(now, -7), totalDays: 52 };
    }

    const minDate = new Date(Math.min(...valid.map((item) => new Date(item.startDate))));
    const maxDate = new Date(Math.max(...valid.map((item) => new Date(item.endDate))));

    const start = addDays(minDate, -4);
    const end = addDays(maxDate, 10);
    return { timelineStart: start, totalDays: Math.max(daysBetween(start, end), 30) };
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

  // ──────────────────────────────────────────────
  // Row model: danh sách phẳng gồm hàng nhóm và hàng task, dùng chung
  // cho cả sidebar lẫn timeline nên hai bên luôn thẳng hàng nhau.
  // ──────────────────────────────────────────────
  const groups = useMemo(() => {
    if (groupBy === 'none') return null;

    const keyOf = (item) =>
      groupBy === 'project'
        ? item.project?._id || UNGROUPED_KEY
        : item.assignee?._id || UNGROUPED_KEY;
    const labelOf = (item) =>
      groupBy === 'project'
        ? item.project?.name || t('gantt.noProject')
        : item.assignee?.name || t('gantt.noAssignee');

    const map = new Map();
    tasks.forEach((task) => {
      const key = keyOf(task);
      if (!map.has(key)) map.set(key, { key, label: labelOf(task), tasks: [] });
      map.get(key).tasks.push(task);
    });

    const list = [...map.values()];
    list.forEach((g) => {
      g.tasks.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));

      const dated = g.tasks.filter((item) => item.startDate && item.endDate);
      g.span = dated.length
        ? {
            start: new Date(Math.min(...dated.map((item) => new Date(item.startDate)))),
            end: new Date(Math.max(...dated.map((item) => new Date(item.endDate)))),
          }
        : null;
      g.progress = g.tasks.length
        ? Math.round(
            g.tasks.reduce((sum, item) => sum + (item.status === 'done' ? 100 : item.progress || 0), 0) /
              g.tasks.length
          )
        : 0;
    });

    // Nhóm "chưa gán / không thuộc dự án" luôn xếp cuối.
    return list.sort((a, b) => {
      if (a.key === UNGROUPED_KEY) return 1;
      if (b.key === UNGROUPED_KEY) return -1;
      return a.label.localeCompare(b.label, currentLocale());
    });
  }, [tasks, groupBy, t]);

  const rows = useMemo(() => {
    if (!groups) return tasks.map((task) => ({ key: task._id, type: 'task', task }));

    const out = [];
    groups.forEach((g) => {
      out.push({ key: `group:${g.key}`, type: 'group', group: g });
      if (collapsed.has(g.key)) return;
      g.tasks.forEach((task) => out.push({ key: task._id, type: 'task', task, inGroup: true }));
    });
    return out;
  }, [groups, tasks, collapsed]);

  const toggleGroup = (key) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ──────────────────────────────────────────────
  // Định vị trên timeline
  // ──────────────────────────────────────────────
  const offsetOf = useCallback(
    (date) => Math.max(0, daysBetween(timelineStart, date)) * zoom.dayWidth,
    [timelineStart, zoom.dayWidth]
  );

  // Hộp bao ngang của một task trên timeline — dùng chung cho thanh, mốc và mũi tên.
  const barBox = useCallback(
    (task) => {
      const left = offsetOf(task.startDate);
      if (isMilestone(task)) return { left, right: left + 16 };
      const duration = Math.max(1, daysBetween(task.startDate, task.endDate));
      return { left, right: left + Math.max(duration * zoom.dayWidth, 24) };
    },
    [offsetOf, zoom.dayWidth]
  );

  const getTaskBarStyle = (task) => {
    const box = barBox(task);
    return {
      left: `${box.left}px`,
      width: `${box.right - box.left}px`,
      backgroundColor: STATUS_COLORS[task.status] || '#6366f1',
    };
  };

  const { critical, length: criticalLength, cyclic } = useMemo(() => computeCriticalPath(tasks), [tasks]);

  // Mũi tên finish-to-start giữa các task đang hiển thị. Cạnh trỏ tới task bị ẩn
  // (nhóm đang thu gọn, hoặc không nằm trong bộ lọc) được bỏ qua.
  const arrows = useMemo(() => {
    if (!showDeps) return [];

    const rowIndexOf = new Map();
    rows.forEach((row, index) => {
      if (row.type === 'task') rowIndexOf.set(row.task._id, index);
    });

    const centerY = (index) => index * ROW_HEIGHT + ROW_HEIGHT / 2;
    const out = [];

    rows.forEach((row, toIndex) => {
      if (row.type !== 'task') return;
      const to = row.task;
      if (!to.startDate || !to.endDate) return;

      (to.dependencies || []).forEach((dep) => {
        const fromId = dep?._id || dep;
        const fromIndex = rowIndexOf.get(fromId);
        if (fromIndex === undefined) return;

        const from = rows[fromIndex].task;
        if (!from.startDate || !from.endDate) return;

        const x1 = barBox(from).right;
        const x2 = barBox(to).left;
        out.push({
          key: `${fromId}->${to._id}`,
          x1,
          y1: centerY(fromIndex),
          x2,
          y2: centerY(toIndex),
          // Người sau bắt đầu trước khi người trước kết thúc → lịch đang vi phạm ràng buộc.
          violated: x2 < x1,
          onCriticalPath: critical.has(fromId) && critical.has(to._id),
        });
      });
    });

    return out;
  }, [rows, showDeps, barBox, critical]);

  const arrowPath = ({ x1, y1, x2, y2 }) => {
    const bend = Math.max(18, Math.abs(x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
  };

  // ──────────────────────────────────────────────
  // Kéo thả để đổi lịch
  // ──────────────────────────────────────────────
  const commitDrag = useCallback(
    async ({ task, mode, deltaDays }) => {
      const { startDate, endDate } = shiftedDates(task, mode, deltaDays);
      if (+startDate === +new Date(task.startDate) && +endDate === +new Date(task.endDate)) return;

      const payload = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
      setTasks((list) => list.map((item) => (item._id === task._id ? { ...item, ...payload } : item)));

      try {
        await taskService.update(task._id, payload);
        message.success(
          t('gantt.rescheduled', {
            title: task.title,
            from: formatDate(startDate),
            to: formatDate(endDate),
          })
        );
      } catch (error) {
        // Trả lại lịch cũ nếu server từ chối.
        setTasks((list) =>
          list.map((item) =>
            item._id === task._id
              ? { ...item, startDate: task.startDate, endDate: task.endDate }
              : item
          )
        );
        message.error(error.response?.data?.message || t('gantt.rescheduleFailed'));
      }
    },
    [t]
  );

  const beginDrag = (event, task, mode) => {
    if (!canReschedule || !task.startDate || !task.endDate) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { task, mode, startX: event.clientX, deltaDays: 0 };
    setDragPreview({ taskId: task._id, mode, deltaDays: 0 });
  };

  useEffect(() => {
    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaDays = Math.round((event.clientX - drag.startX) / zoom.dayWidth);
      if (deltaDays === drag.deltaDays) return;
      drag.deltaDays = deltaDays;
      setDragPreview({ taskId: drag.task._id, mode: drag.mode, deltaDays });
    };

    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragPreview(null);
      if (drag && drag.deltaDays !== 0) commitDrag(drag);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [zoom.dayWidth, commitDrag]);

  // Task đang kéo được vẽ theo ngày tạm tính, các task khác giữ nguyên.
  const withPreview = (task) => {
    if (!dragPreview || dragPreview.taskId !== task._id || !dragPreview.deltaDays) return task;
    const { startDate, endDate } = shiftedDates(task, dragPreview.mode, dragPreview.deltaDays);
    return { ...task, startDate, endDate };
  };

  const taskTooltip = (task) => (
    <div>
      <strong>{task.title}</strong>
      {isMilestone(task) && <Tag color="gold" style={{ marginLeft: 6 }}>{t('gantt.milestone')}</Tag>}
      {showCritical && critical.has(task._id) && (
        <Tag color="warning" style={{ marginLeft: 6 }}>{t('gantt.criticalPath')}</Tag>
      )}
      <br />
      <span>{t('common.status')}: {taskStatusLabel(task.status)}</span>
      <br />
      <span>{t('common.priority')}: {priorityLabel(task.priority)}</span>
      <br />
      <span>
        {t('gantt.period')}: {formatDate(task.startDate)} → {formatDate(task.endDate)}
      </span>
      <br />
      <span>{t('gantt.progress')}: {task.progress || 0}%</span>
    </div>
  );

  const renderBar = (original) => {
    if (!original.startDate || !original.endDate) return null;

    const task = withPreview(original);
    const onCriticalPath = showCritical && critical.has(task._id);
    const dragging = dragPreview?.taskId === task._id;
    // Trong lúc kéo, tooltip che mất thanh nên tạm ẩn.
    const tooltipProps = dragging ? { open: false } : {};

    if (isMilestone(task)) {
      return (
        <Tooltip title={taskTooltip(task)} {...tooltipProps}>
          <div
            className={`gantt-milestone ${onCriticalPath ? 'is-critical' : ''} ${
              canReschedule ? 'is-draggable' : ''
            }`}
            style={{
              left: `${offsetOf(task.startDate)}px`,
              borderColor: PRIORITY_COLORS[task.priority] || '#6366f1',
              backgroundColor: STATUS_COLORS[task.status] || '#6366f1',
            }}
            onMouseDown={(e) => beginDrag(e, original, 'move')}
          >
            <span className="gantt-milestone-label">
              {dragging ? formatDate(task.startDate) : task.title}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip title={taskTooltip(task)} {...tooltipProps}>
        <div
          className={`gantt-task-bar ${onCriticalPath ? 'is-critical' : ''} ${
            canReschedule ? 'is-draggable' : ''
          } ${dragging ? 'is-dragging' : ''}`}
          style={getTaskBarStyle(task)}
          onMouseDown={(e) => beginDrag(e, original, 'move')}
        >
          <div className="gantt-task-progress" style={{ width: `${task.progress || 0}%` }} />
          {canReschedule && (
            <span
              className="gantt-resize-handle is-start"
              onMouseDown={(e) => beginDrag(e, original, 'resize-start')}
            />
          )}
          <span
            className="gantt-priority-dot"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#94a3b8' }}
          />
          <span className="gantt-task-bar-label">
            {dragging
              ? `${formatDate(task.startDate)} → ${formatDate(task.endDate)}`
              : task.title}
          </span>
          {canReschedule && (
            <span
              className="gantt-resize-handle is-end"
              onMouseDown={(e) => beginDrag(e, original, 'resize-end')}
            />
          )}
        </div>
      </Tooltip>
    );
  };

  const renderGroupBand = (group) => {
    if (!group.span) return null;
    const duration = Math.max(1, daysBetween(group.span.start, group.span.end));
    return (
      <Tooltip
        title={t('gantt.groupSpan', {
          label: group.label,
          count: group.tasks.length,
          from: formatDate(group.span.start),
          to: formatDate(group.span.end),
        })}
      >
        <div
          className="gantt-group-band"
          style={{
            left: `${offsetOf(group.span.start)}px`,
            width: `${Math.max(duration * zoom.dayWidth, 24)}px`,
          }}
        >
          <div className="gantt-group-band-progress" style={{ width: `${group.progress}%` }} />
          <span className="gantt-group-band-label">{group.progress}%</span>
        </div>
      </Tooltip>
    );
  };

  const taskCount = rows.filter((r) => r.type === 'task').length;

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>{t('gantt.title')}</Title>
          <Text type="secondary">{t('gantt.subtitle')}</Text>
        </div>
        <Space>
          <Segmented
            value={zoomKey}
            onChange={setZoomKey}
            options={ZOOM_LEVELS.map((z) => ({ value: z.key, label: t(`gantt.zoom.${z.key}`) }))}
          />
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            {t('gantt.print')}
          </Button>
        </Space>
      </div>

      {/* Toolbar */}
      <div className="saas-card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined style={{ color: '#64748b' }} />}
              placeholder={t('gantt.searchPlaceholder') || 'Tìm kiếm công việc...'}
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              allowClear
            />
          </Col>
          <Col xs={12} md={7}>
            <Select
              style={{ width: '100%' }}
              placeholder={t('gantt.allProjects') || 'Tất cả dự án'}
              value={filters.project || undefined}
              onChange={(val) => setFilters((p) => ({ ...p, project: val || '' }))}
              allowClear
              options={projects.map((p) => ({ value: p._id, label: `${p.code ? p.code + ' - ' : ''}${p.name}` }))}
            />
          </Col>
          <Col xs={12} md={9} style={{ textAlign: 'right' }}>
            <Space>
              <Segmented
                value={groupBy}
                onChange={setGroupBy}
                options={GROUP_MODES.map((value) => ({ value, label: t(`gantt.groupBy.${value}`) }))}
              />
              <Button icon={<ReloadOutlined />} onClick={load} title={t('common.reload') || 'Tải lại'} />
            </Space>
          </Col>
          <Col xs={24}>
            <Space size={16} wrap>
              <Checkbox checked={showDeps} onChange={(e) => setShowDeps(e.target.checked)}>
                {t('gantt.showDeps') || 'Hiện phụ thuộc'}
              </Checkbox>
              <Checkbox checked={showCritical} onChange={(e) => setShowCritical(e.target.checked)}>
                {t('gantt.showCritical') || 'Đường găng (Critical Path)'}
              </Checkbox>
              {canReschedule && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('gantt.dragHint')}
                </Text>
              )}
              {showCritical && !cyclic && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('gantt.criticalSummary', { count: critical.size, days: criticalLength })}
                </Text>
              )}
              {showCritical && cyclic && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {t('gantt.cyclicWarning')}
                </Text>
              )}
              {arrows.some((a) => a.violated) && (
                <Text type="danger" style={{ fontSize: 12 }}>
                  {t('gantt.violatedDeps', { count: arrows.filter((a) => a.violated).length })}
                </Text>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      {/* Gantt View Container */}
      <div className="saas-card" style={{ overflow: 'hidden' }}>
        <Spin spinning={loading}>
          {tasks.length === 0 ? (
            <Empty description={t('gantt.empty')} style={{ padding: 48 }} />
          ) : (
            <div className="gantt-viewport">
              {/* Task Names Sidebar */}
              <div className="gantt-sidebar">
                <div className="gantt-sidebar-header">
                  <Text strong>{t('nav.tasks')} ({taskCount})</Text>
                </div>
                <div className="gantt-sidebar-body">
                  {rows.map((row) =>
                    row.type === 'group' ? (
                      <div
                        key={row.key}
                        className="gantt-sidebar-row is-group"
                        onClick={() => toggleGroup(row.group.key)}
                      >
                        <Space size={6}>
                          {collapsed.has(row.group.key) ? <CaretRightOutlined /> : <CaretDownOutlined />}
                          <Text strong ellipsis style={{ fontSize: 13 }}>
                            {row.group.label}
                          </Text>
                          <Tag style={{ margin: 0, fontSize: 10, padding: '0 5px' }}>{row.group.tasks.length}</Tag>
                        </Space>
                      </div>
                    ) : (
                      <div key={row.key} className={`gantt-sidebar-row ${row.inGroup ? 'is-child' : ''}`}>
                        <Text strong ellipsis style={{ fontSize: 13, display: 'block' }}>
                          {row.task.title}
                        </Text>
                        <Space size={4}>
                          {groupBy !== 'project' && row.task.project && (
                            <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                              {row.task.project.code || row.task.project.name}
                            </Tag>
                          )}
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {row.task.assignee?.name || t('common.unassigned')}
                          </Text>
                        </Space>
                      </div>
                    )
                  )}
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
                        {zoomKey === 'day' && (
                          <span className="day-m">{t('gantt.monthShort', { month: day.month })}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Task Bars Body */}
                  <div className="gantt-timeline-body">
                    {arrows.length > 0 && (
                      <svg
                        className="gantt-arrows"
                        width={chartWidth}
                        height={rows.length * ROW_HEIGHT}
                      >
                        <defs>
                          {[
                            ['gantt-arrow-head', '#94a3b8'],
                            ['gantt-arrow-head-critical', '#facc15'],
                            ['gantt-arrow-head-violated', '#ef4444'],
                          ].map(([id, color]) => (
                            <marker
                              key={id}
                              id={id}
                              markerWidth="7"
                              markerHeight="7"
                              refX="6"
                              refY="3"
                              orient="auto"
                            >
                              <path d="M0,0 L6,3 L0,6 Z" fill={color} />
                            </marker>
                          ))}
                        </defs>
                        {arrows.map((arrow) => {
                          const variant = arrow.violated
                            ? 'violated'
                            : showCritical && arrow.onCriticalPath
                              ? 'critical'
                              : 'normal';
                          return (
                            <path
                              key={arrow.key}
                              d={arrowPath(arrow)}
                              className={`gantt-arrow is-${variant}`}
                              markerEnd={`url(#gantt-arrow-head${
                                variant === 'normal' ? '' : `-${variant}`
                              })`}
                            />
                          );
                        })}
                      </svg>
                    )}
                    {rows.map((row) => (
                      <div
                        key={row.key}
                        className={`gantt-timeline-row ${row.type === 'group' ? 'is-group' : ''}`}
                      >
                        {row.type === 'group' ? renderGroupBand(row.group) : renderBar(row.task)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Spin>
      </div>

      {/* Chú giải */}
      <div className="saas-card" style={{ marginTop: 16, padding: '14px 20px' }}>
        <Space size={[24, 8]} wrap>
          <Space size={8} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('common.status')}:</Text>
            {TASK_STATUSES.map((s) => (
              <Space key={s.key} size={4}>
                <span className="gantt-legend-swatch" style={{ backgroundColor: s.color }} />
                <Text style={{ fontSize: 12 }}>{taskStatusLabel(s.key)}</Text>
              </Space>
            ))}
          </Space>
          <Space size={8} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('common.priority')}:</Text>
            {PRIORITY_OPTIONS.map(({ value }) => (
              <Space key={value} size={4}>
                <span className="gantt-legend-dot" style={{ backgroundColor: PRIORITY_COLORS[value] }} />
                <Text style={{ fontSize: 12 }}>{priorityLabel(value)}</Text>
              </Space>
            ))}
          </Space>
          <Space size={4}>
            <span className="gantt-legend-diamond" />
            <Text style={{ fontSize: 12 }}>{t('gantt.legendMilestone')}</Text>
          </Space>
          <Space size={4}>
            <span className="gantt-legend-critical" />
            <Text style={{ fontSize: 12 }}>{t('gantt.legendCritical')}</Text>
          </Space>
        </Space>
      </div>
    </div>
  );
}
