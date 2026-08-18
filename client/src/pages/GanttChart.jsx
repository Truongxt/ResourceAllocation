import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HiOutlineChartBar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineDownload,
  HiOutlineExclamation,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineUser,
  HiOutlineX,
  HiOutlineZoomIn,
  HiOutlineZoomOut,
} from 'react-icons/hi';
import taskService from '../services/taskService';
import projectService from '../services/projectService';
import './GanttChart.css';

const ZOOM_LEVELS = [
  { key: 'day', label: 'Ngày', dayWidth: 40, format: 'dd' },
  { key: 'week', label: 'Tuần', dayWidth: 18, format: 'Wk' },
  { key: 'month', label: 'Tháng', dayWidth: 6, format: 'MMM' },
];

const STATUS_COLORS = {
  todo: '#94a3b8',
  in_progress: '#6366f1',
  review: '#f59e0b',
  done: '#10b981',
  blocked: '#ef4444',
};

const STATUS_LABELS = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  review: 'Đánh giá',
  done: 'Hoàn thành',
  blocked: 'Bị chặn',
};

const PRIORITY_COLORS = {
  low: '#10b981',
  medium: '#6366f1',
  high: '#f59e0b',
  critical: '#ef4444',
};

// ── Helpers ──
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(d1, d2) {
  return Math.ceil((new Date(d2) - new Date(d1)) / (86400000));
}

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(date));
}

function getMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
  dt.setDate(diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function startOfMonth(d) {
  const dt = new Date(d);
  dt.setDate(1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export default function GanttChart() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoomIdx, setZoomIdx] = useState(1); // default: week
  const [filters, setFilters] = useState({ project: '', search: '' });
  const [viewMode, setViewMode] = useState('task'); // 'task' | 'resource'
  const [scrollDate, setScrollDate] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const ganttRef = useRef(null);
  const timelineRef = useRef(null);

  const zoom = ZOOM_LEVELS[zoomIdx];

  // ── Load Data ──
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

  // ── Compute timeline range ──
  const { timelineStart, timelineEnd, totalDays, validTasks } = useMemo(() => {
    const valid = tasks.filter((t) => t.startDate && t.endDate);
    if (!valid.length) {
      const now = new Date();
      return {
        timelineStart: addDays(now, -14),
        timelineEnd: addDays(now, 60),
        totalDays: 74,
        validTasks: [],
      };
    }

    let minDate = new Date(valid[0].startDate);
    let maxDate = new Date(valid[0].endDate);
    for (const t of valid) {
      const s = new Date(t.startDate);
      const e = new Date(t.endDate);
      if (s < minDate) minDate = s;
      if (e > maxDate) maxDate = e;
    }

    // Add padding
    const start = addDays(minDate, -7);
    const end = addDays(maxDate, 14);
    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: daysBetween(start, end),
      validTasks: valid,
    };
  }, [tasks]);

  // ── Generate header cells ──
  const headerCells = useMemo(() => {
    const cells = [];
    if (zoom.key === 'day') {
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(timelineStart, i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        cells.push({
          label: d.getDate().toString(),
          sublabel: d.getDay() === 1 ? formatDate(d) : '',
          width: zoom.dayWidth,
          isWeekend,
          date: d,
        });
      }
    } else if (zoom.key === 'week') {
      let current = getMonday(timelineStart);
      while (current < timelineEnd) {
        const weekEnd = addDays(current, 6);
        cells.push({
          label: `${formatDate(current)}`,
          sublabel: '',
          width: zoom.dayWidth * 7,
          isWeekend: false,
          date: new Date(current),
        });
        current = addDays(current, 7);
      }
    } else {
      // month
      let current = startOfMonth(timelineStart);
      while (current < timelineEnd) {
        const monthName = current.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' });
        const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        cells.push({
          label: monthName,
          sublabel: '',
          width: zoom.dayWidth * daysInMonth,
          isWeekend: false,
          date: new Date(current),
        });
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    }
    return cells;
  }, [totalDays, timelineStart, timelineEnd, zoom]);

  const totalWidth = headerCells.reduce((s, c) => s + c.width, 0);

  // ── Rows (task mode or resource mode) ──
  const rows = useMemo(() => {
    if (viewMode === 'resource') {
      // Group by assignee
      const byResource = {};
      for (const t of validTasks) {
        const key = t.assignee?._id || '_unassigned';
        const name = t.assignee?.name || 'Chưa phân công';
        if (!byResource[key]) byResource[key] = { name, tasks: [] };
        byResource[key].tasks.push(t);
      }
      return Object.entries(byResource).map(([key, val]) => ({
        type: 'resource',
        id: key,
        label: val.name,
        tasks: val.tasks,
      }));
    }

    // Group by project
    const byProject = {};
    for (const t of validTasks) {
      const key = t.project?._id || '_none';
      const name = t.project?.code || t.project?.name || 'Không có dự án';
      if (!byProject[key]) byProject[key] = { name, tasks: [] };
      byProject[key].tasks.push(t);
    }

    const result = [];
    for (const [key, val] of Object.entries(byProject)) {
      result.push({ type: 'project-header', id: key, label: val.name, tasks: [] });
      for (const task of val.tasks) {
        result.push({ type: 'task', id: task._id, label: task.title, task, tasks: [] });
      }
    }
    return result;
  }, [validTasks, viewMode]);

  // ── Compute bar position ──
  const getBarStyle = (task) => {
    const start = daysBetween(timelineStart, task.startDate);
    const duration = Math.max(daysBetween(task.startDate, task.endDate), 1);
    return {
      left: start * zoom.dayWidth,
      width: duration * zoom.dayWidth,
    };
  };

  // ── Today line ──
  const todayOffset = daysBetween(timelineStart, new Date()) * zoom.dayWidth;

  // ── Dependencies ──
  const depLines = useMemo(() => {
    const lines = [];
    const taskPosMap = {};

    // Build position map
    let rowIdx = 0;
    for (const row of rows) {
      if (row.type === 'task' && row.task) {
        const bar = getBarStyle(row.task);
        taskPosMap[row.task._id] = {
          rowIdx,
          left: bar.left,
          right: bar.left + bar.width,
          midY: rowIdx * 40 + 20,
        };
      }
      rowIdx++;
    }

    // Draw lines
    for (const row of rows) {
      if (row.type !== 'task' || !row.task) continue;
      const deps = row.task.dependencies || [];
      for (const dep of deps) {
        const depId = typeof dep === 'string' ? dep : dep._id;
        const from = taskPosMap[depId];
        const to = taskPosMap[row.task._id];
        if (from && to) {
          lines.push({ from, to, id: `${depId}-${row.task._id}` });
        }
      }
    }
    return lines;
  }, [rows, zoom.dayWidth, timelineStart]);

  // ── Critical Path (simplified: tasks on longest dependency chain) ──
  const criticalTasks = useMemo(() => {
    if (!validTasks.length) return new Set();
    const critical = new Set();

    // Find tasks with no successor (end tasks)
    const hasSuccessor = new Set();
    for (const t of validTasks) {
      for (const dep of (t.dependencies || [])) {
        const depId = typeof dep === 'string' ? dep : dep._id;
        hasSuccessor.add(depId);
      }
    }

    // Mark tasks ending latest as critical
    let latestEnd = null;
    for (const t of validTasks) {
      if (!latestEnd || new Date(t.endDate) > latestEnd) {
        latestEnd = new Date(t.endDate);
      }
    }

    for (const t of validTasks) {
      const endDiff = Math.abs(daysBetween(t.endDate, latestEnd));
      if (endDiff <= 3 && !hasSuccessor.has(t._id)) {
        critical.add(t._id);
        // Trace back dependencies
        const traceDeps = (taskId) => {
          const task = validTasks.find((vt) => vt._id === taskId);
          if (!task) return;
          for (const dep of (task.dependencies || [])) {
            const depId = typeof dep === 'string' ? dep : dep._id;
            critical.add(depId);
            traceDeps(depId);
          }
        };
        traceDeps(t._id);
      }
    }
    return critical;
  }, [validTasks]);

  // ── Navigation ──
  const scrollToToday = () => {
    if (timelineRef.current) {
      const offset = todayOffset - timelineRef.current.clientWidth / 2;
      timelineRef.current.scrollLeft = Math.max(0, offset);
    }
  };

  const scrollTimeline = (direction) => {
    if (timelineRef.current) {
      const step = zoom.dayWidth * 14;
      timelineRef.current.scrollLeft += direction * step;
    }
  };

  // ── Export ──
  const handleExport = () => {
    if (!ganttRef.current) return;
    // Simple: print the gantt area
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Gantt Chart Export</title>
      <style>body{margin:0;padding:20px;font-family:sans-serif;background:#fff;color:#333}
      table{border-collapse:collapse;font-size:12px}th,td{padding:4px 8px;border:1px solid #ddd;text-align:left}
      h2{margin-bottom:10px}</style></head><body>
      <h2>Gantt Chart — ${new Date().toLocaleDateString('vi-VN')}</h2>
      <table><thead><tr><th>#</th><th>Công việc</th><th>Dự án</th><th>Trạng thái</th><th>Bắt đầu</th><th>Kết thúc</th><th>Phân công</th></tr></thead><tbody>
      ${validTasks.map((t, i) => `<tr>
        <td>${i + 1}</td>
        <td>${t.title}</td>
        <td>${t.project?.code || t.project?.name || '—'}</td>
        <td>${STATUS_LABELS[t.status] || t.status}</td>
        <td>${formatDate(t.startDate)}</td>
        <td>${formatDate(t.endDate)}</td>
        <td>${t.assignee?.name || '—'}</td>
      </tr>`).join('')}
      </tbody></table></body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ── Tooltip ──
  const showTooltip = (e, task) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      task,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  return (
    <div className="animate-fade-in gantt-page" ref={ganttRef}>
      <div className="page-header gantt-header">
        <div>
          <h1 className="page-title">Gantt Chart</h1>
          <p className="page-description">Biểu đồ timeline trực quan cho dự án và công việc.</p>
        </div>
        <div className="gantt-header-actions">
          <button className="btn btn-secondary" onClick={handleExport} title="Xuất">
            <HiOutlineDownload /> Xuất
          </button>
          <button className="btn btn-secondary" onClick={load} title="Tải lại">
            <HiOutlineRefresh />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="gantt-toolbar card">
        <label className="gantt-search">
          <HiOutlineSearch />
          <input
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Tìm công việc..."
          />
        </label>
        <select value={filters.project} onChange={(e) => setFilters((p) => ({ ...p, project: e.target.value }))}>
          <option value="">Tất cả dự án</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.code ? `${p.code} - ` : ''}{p.name}</option>
          ))}
        </select>

        <div className="gantt-toolbar-divider" />

        {/* View mode */}
        <div className="gantt-view-toggle">
          <button className={viewMode === 'task' ? 'active' : ''} onClick={() => setViewMode('task')}>
            <HiOutlineChartBar /> Theo dự án
          </button>
          <button className={viewMode === 'resource' ? 'active' : ''} onClick={() => setViewMode('resource')}>
            <HiOutlineUser /> Theo nhân sự
          </button>
        </div>

        <div className="gantt-toolbar-divider" />

        {/* Zoom */}
        <div className="gantt-zoom">
          <button onClick={() => setZoomIdx((i) => Math.max(0, i - 1))} disabled={zoomIdx === 0} title="Phóng to">
            <HiOutlineZoomIn />
          </button>
          <span className="gantt-zoom-label">{zoom.label}</span>
          <button onClick={() => setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))} disabled={zoomIdx === ZOOM_LEVELS.length - 1} title="Thu nhỏ">
            <HiOutlineZoomOut />
          </button>
        </div>

        {/* Navigation */}
        <div className="gantt-nav">
          <button onClick={() => scrollTimeline(-1)} title="Lùi"><HiOutlineChevronLeft /></button>
          <button onClick={scrollToToday} className="gantt-today-btn">Hôm nay</button>
          <button onClick={() => scrollTimeline(1)} title="Tiến"><HiOutlineChevronRight /></button>
        </div>
      </div>

      {/* Legend */}
      <div className="gantt-legend">
        {Object.entries(STATUS_COLORS).map(([key, color]) => (
          <span key={key} className="gantt-legend-item">
            <span className="gantt-legend-dot" style={{ background: color }} />
            {STATUS_LABELS[key]}
          </span>
        ))}
        <span className="gantt-legend-item">
          <span className="gantt-legend-dot gantt-legend-today" />
          Hôm nay
        </span>
        <span className="gantt-legend-item">
          <span className="gantt-legend-dot gantt-legend-critical" />
          Critical Path
        </span>
      </div>

      {/* Main Gantt */}
      {loading ? (
        <div className="empty-state"><p className="empty-state-text">Đang tải...</p></div>
      ) : validTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><HiOutlineChartBar /></div>
          <h3 className="empty-state-title">Chưa có dữ liệu Gantt</h3>
          <p className="empty-state-text">Tạo công việc có ngày bắt đầu/kết thúc để xem biểu đồ.</p>
        </div>
      ) : (
        <div className="gantt-container card">
          <div className="gantt-body">
            {/* Left panel: row labels */}
            <div className="gantt-left">
              <div className="gantt-left-header">
                <span>Công việc</span>
              </div>
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`gantt-left-row ${row.type === 'project-header' ? 'gantt-group-row' : ''} ${row.type === 'resource' ? 'gantt-resource-row' : ''}`}
                >
                  {row.type === 'project-header' && <span className="gantt-group-icon">📁</span>}
                  {row.type === 'resource' && <span className="gantt-group-icon">👤</span>}
                  <span className="gantt-row-label" title={row.label}>{row.label}</span>
                  {row.type === 'task' && row.task && (
                    <span className="gantt-row-assignee">{row.task.assignee?.name || ''}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Right panel: timeline */}
            <div className="gantt-right" ref={timelineRef}>
              {/* Header */}
              <div className="gantt-timeline-header" style={{ width: totalWidth }}>
                {headerCells.map((cell, i) => (
                  <div
                    key={i}
                    className={`gantt-header-cell ${cell.isWeekend ? 'weekend' : ''}`}
                    style={{ width: cell.width }}
                  >
                    <span>{cell.label}</span>
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="gantt-timeline-body" style={{ width: totalWidth }}>
                {/* Grid lines */}
                <div className="gantt-grid" style={{ width: totalWidth }}>
                  {headerCells.map((cell, i) => (
                    <div
                      key={i}
                      className={`gantt-grid-cell ${cell.isWeekend ? 'weekend' : ''}`}
                      style={{ width: cell.width }}
                    />
                  ))}
                </div>

                {/* Today line */}
                {todayOffset >= 0 && todayOffset <= totalWidth && (
                  <div className="gantt-today-line" style={{ left: todayOffset }} />
                )}

                {/* Dependency arrows (SVG) */}
                {depLines.length > 0 && (
                  <svg className="gantt-dep-svg" width={totalWidth} height={rows.length * 40}>
                    {depLines.map((line) => {
                      const x1 = line.from.right;
                      const y1 = line.from.midY;
                      const x2 = line.to.left;
                      const y2 = line.to.midY;
                      const midX = x1 + (x2 - x1) / 2;
                      return (
                        <g key={line.id}>
                          <path
                            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                            fill="none"
                            stroke="var(--text-tertiary)"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                            opacity="0.6"
                          />
                          <polygon
                            points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`}
                            fill="var(--text-tertiary)"
                            opacity="0.6"
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Task bars */}
                {rows.map((row, rIdx) => {
                  if (row.type === 'project-header') {
                    return <div key={row.id} className="gantt-bar-row gantt-bar-group" style={{ top: rIdx * 40 }} />;
                  }

                  const renderTasks = row.type === 'resource' ? row.tasks : (row.task ? [row.task] : []);

                  return (
                    <div key={row.id} className="gantt-bar-row" style={{ top: rIdx * 40 }}>
                      {renderTasks.map((task) => {
                        const bar = getBarStyle(task);
                        const isCritical = criticalTasks.has(task._id);
                        return (
                          <div
                            key={task._id}
                            className={`gantt-bar ${isCritical ? 'critical' : ''}`}
                            style={{
                              left: bar.left,
                              width: Math.max(bar.width, 8),
                              background: STATUS_COLORS[task.status] || '#6366f1',
                            }}
                            onMouseEnter={(e) => showTooltip(e, task)}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {/* Progress fill */}
                            {(task.progress || 0) > 0 && (
                              <div
                                className="gantt-bar-progress"
                                style={{ width: `${task.progress}%` }}
                              />
                            )}
                            {/* Label (only if bar is wide enough) */}
                            {bar.width > 60 && (
                              <span className="gantt-bar-label">{task.title}</span>
                            )}
                            {/* Priority dot */}
                            <span
                              className="gantt-bar-priority"
                              style={{ background: PRIORITY_COLORS[task.priority] }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="gantt-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <strong>{tooltip.task.title}</strong>
          <div className="gantt-tooltip-row">
            <span>{STATUS_LABELS[tooltip.task.status]}</span>
            <span>{formatDate(tooltip.task.startDate)} — {formatDate(tooltip.task.endDate)}</span>
          </div>
          <div className="gantt-tooltip-row">
            <span>Tiến độ: {tooltip.task.progress || 0}%</span>
            {tooltip.task.assignee && <span>👤 {tooltip.task.assignee.name}</span>}
          </div>
          {tooltip.task.estimatedHours > 0 && (
            <div className="gantt-tooltip-row">
              <span>Giờ: {tooltip.task.actualHours || 0}/{tooltip.task.estimatedHours}h</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
