import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamation,
  HiOutlineFilter,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineViewBoards,
  HiOutlineViewList,
  HiOutlineX,
} from 'react-icons/hi';
import taskService from '../services/taskService';
import projectService from '../services/projectService';
import './Tasks.css';

const STATUS_COLS = [
  { key: 'todo', label: 'Cần làm', color: 'var(--text-tertiary)', icon: '📋' },
  { key: 'in_progress', label: 'Đang làm', color: 'var(--color-primary-400)', icon: '🔄' },
  { key: 'review', label: 'Đánh giá', color: '#f59e0b', icon: '👀' },
  { key: 'done', label: 'Hoàn thành', color: 'var(--color-success)', icon: '✅' },
  { key: 'blocked', label: 'Bị chặn', color: 'var(--color-danger)', icon: '🚫' },
];

const PRIORITY_LABELS = { low: 'Thấp', medium: 'TB', high: 'Cao', critical: 'Khẩn' };

const initialForm = {
  title: '',
  description: '',
  project: '',
  status: 'todo',
  priority: 'medium',
  startDate: '',
  endDate: '',
  estimatedHours: '',
  actualHours: '',
  assignee: '',
};

function getErrorMessage(err) {
  return err.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

const formatDate = (d) => (d ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(d)) : '');

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState('kanban');
  const [filters, setFilters] = useState({ search: '', project: '', priority: '' });
  const [modal, setModal] = useState(null); // { type: 'form', task?: object }
  const [form, setForm] = useState(initialForm);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // --- Load Data ---
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await taskService.getAll(params);
      setTasks(res.data.data.tasks || []);
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectService.getAll({ limit: 100 });
      setProjects(res.data.data.projects || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const timer = setTimeout(loadTasks, filters.search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [loadTasks]);

  // --- Kanban grouped ---
  const kanbanCols = useMemo(() => {
    const grouped = {};
    STATUS_COLS.forEach((col) => { grouped[col.key] = []; });
    tasks.forEach((t) => {
      if (grouped[t.status]) grouped[t.status].push(t);
    });
    return grouped;
  }, [tasks]);

  // --- Handlers ---
  const openCreate = () => {
    setForm(initialForm);
    setModal({ type: 'form', task: null });
  };

  const openEdit = (task) => {
    setForm({
      title: task.title || '',
      description: task.description || '',
      project: task.project?._id || task.project || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      startDate: task.startDate ? task.startDate.slice(0, 10) : '',
      endDate: task.endDate ? task.endDate.slice(0, 10) : '',
      estimatedHours: task.estimatedHours || '',
      actualHours: task.actualHours || '',
      assignee: task.assignee?._id || task.assignee || '',
    });
    setModal({ type: 'form', task });
  };

  const closeModal = () => { if (!submitting) setModal(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = { ...form };
    if (!payload.assignee) delete payload.assignee;
    if (!payload.estimatedHours) delete payload.estimatedHours;
    else payload.estimatedHours = Number(payload.estimatedHours);
    if (!payload.actualHours) delete payload.actualHours;
    else payload.actualHours = Number(payload.actualHours);

    try {
      if (modal.task) {
        await taskService.update(modal.task._id, payload);
        setNotice({ type: 'success', text: 'Cập nhật công việc thành công.' });
      } else {
        await taskService.create(payload);
        setNotice({ type: 'success', text: 'Tạo công việc thành công.' });
      }
      setModal(null);
      await loadTasks();
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Bạn có chắc muốn xóa công việc "${task.title}"?`)) return;
    try {
      await taskService.remove(task._id);
      setNotice({ type: 'success', text: 'Xóa công việc thành công.' });
      await loadTasks();
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
    }
  };

  // --- Drag & Drop ---
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t._id === draggedTaskId);
    if (!task || task.status === newStatus) { setDraggedTaskId(null); return; }

    // Optimistic update
    setTasks((prev) => prev.map((t) => t._id === draggedTaskId ? { ...t, status: newStatus } : t));
    setDraggedTaskId(null);

    try {
      await taskService.updateStatus(draggedTaskId, newStatus);
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
      await loadTasks(); // Revert
    }
  };

  // --- Task Stats ---
  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'done').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
  }), [tasks]);

  return (
    <div className="animate-fade-in">
      <div className="page-header tasks-header">
        <div>
          <h1 className="page-title">Quản lý Công việc</h1>
          <p className="page-description">Tạo, theo dõi và quản lý các công việc trong dự án.</p>
        </div>
        <div className="tasks-header-actions">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`}
              onClick={() => setView('kanban')}
              title="Kanban Board"
            ><HiOutlineViewBoards /></button>
            <button
              className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="Danh sách"
            ><HiOutlineViewList /></button>
          </div>
          <button className="btn btn-primary" onClick={openCreate} id="btn-create-task">
            <HiOutlinePlus /> Tạo công việc
          </button>
        </div>
      </div>

      {notice && (
        <div className={`alert alert-${notice.type} tasks-alert`}>
          {notice.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />}
          <span>{notice.text}</span>
          <button aria-label="Đóng" onClick={() => setNotice(null)}><HiOutlineX /></button>
        </div>
      )}

      {/* Stats */}
      <div className="task-stats">
        <div className="task-stat"><span>Tổng</span><strong>{stats.total}</strong></div>
        <div className="task-stat"><span>Đang làm</span><strong>{stats.inProgress}</strong></div>
        <div className="task-stat"><span>Hoàn thành</span><strong>{stats.done}</strong></div>
        <div className="task-stat"><span>Bị chặn</span><strong className="text-danger">{stats.blocked}</strong></div>
      </div>

      {/* Filters */}
      <div className="tasks-toolbar card">
        <label className="tasks-search">
          <HiOutlineSearch />
          <input
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Tìm theo tiêu đề..."
          />
        </label>
        <HiOutlineFilter className="filter-icon" />
        <select value={filters.project} onChange={(e) => setFilters((p) => ({ ...p, project: e.target.value }))}>
          <option value="">Tất cả dự án</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.code ? `${p.code} - ` : ''}{p.name}</option>)}
        </select>
        <select value={filters.priority} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}>
          <option value="">Tất cả ưu tiên</option>
          <option value="low">Thấp</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao</option>
          <option value="critical">Khẩn cấp</option>
        </select>
        <button className="btn btn-secondary" onClick={loadTasks} title="Tải lại"><HiOutlineRefresh /></button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="empty-state"><p className="empty-state-text">Đang tải...</p></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><HiOutlineClock /></div>
          <h3 className="empty-state-title">Chưa có công việc nào</h3>
          <p className="empty-state-text">Tạo công việc đầu tiên để bắt đầu theo dõi tiến độ.</p>
          <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Tạo công việc</button>
        </div>
      ) : view === 'kanban' ? (
        /* Kanban View */
        <div className="kanban-board">
          {STATUS_COLS.map((col) => (
            <div
              key={col.key}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="kanban-column-header" style={{ '--col-color': col.color }}>
                <span className="kanban-column-icon">{col.icon}</span>
                <span className="kanban-column-title">{col.label}</span>
                <span className="kanban-column-count">{kanbanCols[col.key]?.length || 0}</span>
              </div>
              <div className="kanban-column-body">
                {(kanbanCols[col.key] || []).map((task) => (
                  <div
                    key={task._id}
                    className={`kanban-card priority-${task.priority}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task._id)}
                  >
                    <div className="kanban-card-top">
                      <span className={`badge priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                      <div className="kanban-card-actions">
                        <button onClick={() => openEdit(task)} title="Sửa"><HiOutlinePencil /></button>
                        <button className="danger-action" onClick={() => handleDelete(task)} title="Xóa"><HiOutlineTrash /></button>
                      </div>
                    </div>
                    <h4 className="kanban-card-title">{task.title}</h4>
                    {task.project && (
                      <span className="kanban-card-project">{task.project.code || task.project.name}</span>
                    )}
                    <div className="kanban-card-meta">
                      {task.assignee && <span className="kanban-card-assignee">{task.assignee.name}</span>}
                      {task.endDate && <span className="kanban-card-date">{formatDate(task.endDate)}</span>}
                    </div>
                    {task.estimatedHours > 0 && (
                      <div className="kanban-card-hours">
                        <HiOutlineClock /> {task.actualHours || 0}/{task.estimatedHours}h
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="task-table-wrapper card">
          <table className="task-table">
            <thead>
              <tr>
                <th>Công việc</th>
                <th>Dự án</th>
                <th>Trạng thái</th>
                <th>Ưu tiên</th>
                <th>Phân công</th>
                <th>Ngày</th>
                <th>Giờ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task._id}>
                  <td className="task-title-cell">{task.title}</td>
                  <td><span className="badge">{task.project?.code || task.project?.name || '—'}</span></td>
                  <td><span className={`badge status-${task.status}`}>{STATUS_COLS.find((c) => c.key === task.status)?.label}</span></td>
                  <td><span className={`badge priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span></td>
                  <td>{task.assignee?.name || '—'}</td>
                  <td className="task-dates">{formatDate(task.startDate)} — {formatDate(task.endDate)}</td>
                  <td>{task.actualHours || 0}/{task.estimatedHours || 0}h</td>
                  <td className="task-actions-cell">
                    <button onClick={() => openEdit(task)} title="Sửa"><HiOutlinePencil /></button>
                    <button className="danger-action" onClick={() => handleDelete(task)} title="Xóa"><HiOutlineTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal?.type === 'form' && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section className="task-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>{modal.task ? 'Cập nhật Công việc' : 'Tạo Công việc mới'}</h2>
                <p>Điền thông tin chi tiết cho công việc.</p>
              </div>
              <button className="modal-close" onClick={closeModal} aria-label="Đóng"><HiOutlineX /></button>
            </header>
            <form onSubmit={handleSubmit}>
              <div className="task-form-grid">
                <label className="form-group form-full">
                  <span>Tiêu đề <em>*</em></span>
                  <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="VD: Thiết kế giao diện Dashboard" />
                </label>
                <label className="form-group">
                  <span>Dự án <em>*</em></span>
                  <select required value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} disabled={!!modal.task}>
                    <option value="">-- Chọn dự án --</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.code ? `${p.code} - ` : ''}{p.name}</option>)}
                  </select>
                </label>
                <label className="form-group">
                  <span>Trạng thái</span>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUS_COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </label>
                <label className="form-group">
                  <span>Ưu tiên</span>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                    <option value="critical">Khẩn cấp</option>
                  </select>
                </label>
                <label className="form-group">
                  <span>Ngày bắt đầu</span>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </label>
                <label className="form-group">
                  <span>Ngày kết thúc</span>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </label>
                <label className="form-group">
                  <span>Giờ ước tính</span>
                  <input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} placeholder="0" />
                </label>
                {modal.task && (
                  <label className="form-group">
                    <span>Giờ thực tế</span>
                    <input type="number" min="0" step="0.5" value={form.actualHours} onChange={(e) => setForm({ ...form, actualHours: e.target.value })} placeholder="0" />
                  </label>
                )}
                <label className="form-group form-full">
                  <span>Mô tả</span>
                  <textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả chi tiết công việc..." />
                </label>
              </div>
              <footer>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : modal.task ? 'Lưu thay đổi' : 'Tạo công việc'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
