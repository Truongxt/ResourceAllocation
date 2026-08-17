import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineFolder,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineX,
} from 'react-icons/hi';
import projectService from '../services/projectService';
import './Projects.css';

const initialForm = {
  name: '',
  code: '',
  description: '',
  status: 'planning',
  priority: 'medium',
  startDate: '',
  endDate: '',
  budget: 0,
  tags: '',
};

const STATUS_LABELS = {
  planning: 'Lập kế hoạch',
  in_progress: 'Đang thực hiện',
  on_hold: 'Tạm dừng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const PRIORITY_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Khẩn cấp',
};

const formatDate = (date) => (date ? new Intl.DateTimeFormat('vi-VN').format(new Date(date)) : '—');
const formatMoney = (value) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

function getErrorMessage(error) {
  return error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
      const response = await projectService.getAll(params);
      setProjects(response.data.data.projects || []);
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadProjects, filters.search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [filters]);

  const projectStats = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter((project) => project.status === 'in_progress').length,
      completed: projects.filter((project) => project.status === 'completed').length,
    }),
    [projects]
  );

  const openCreate = () => {
    setForm(initialForm);
    setModal({ type: 'form', project: null });
  };

  const openEdit = (project) => {
    setForm({
      name: project.name || '',
      code: project.code || '',
      description: project.description || '',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      startDate: project.startDate ? project.startDate.slice(0, 10) : '',
      endDate: project.endDate ? project.endDate.slice(0, 10) : '',
      budget: project.budget || 0,
      tags: (project.tags || []).join(', '),
    });
    setModal({ type: 'form', project });
  };

  const closeModal = () => {
    if (!submitting) setModal(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setNotice({ type: 'error', text: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.' });
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      budget: Number(form.budget) || 0,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    if (!payload.code) {
      delete payload.code;
    }

    try {
      if (modal.project) {
        await projectService.update(modal.project._id, payload);
        setNotice({ type: 'success', text: 'Cập nhật dự án thành công.' });
      } else {
        await projectService.create(payload);
        setNotice({ type: 'success', text: 'Tạo dự án thành công.' });
      }
      setModal(null);
      await loadProjects();
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Bạn có chắc muốn xóa dự án "${project.name}"? Các công việc liên quan cũng sẽ bị xóa.`)) return;

    try {
      await projectService.remove(project._id, true);
      setNotice({ type: 'success', text: 'Xóa dự án thành công.' });
      await loadProjects();
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error) });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header projects-header">
        <div>
          <h1 className="page-title">Quản lý Dự án</h1>
          <p className="page-description">Theo dõi tiến độ, ngân sách và trạng thái các dự án của tổ chức.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="btn-create-project">
          <HiOutlinePlus /> Tạo dự án
        </button>
      </div>

      {notice && (
        <div className={`alert alert-${notice.type} projects-alert`}>
          {notice.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />}
          <span>{notice.text}</span>
          <button aria-label="Đóng thông báo" onClick={() => setNotice(null)}><HiOutlineX /></button>
        </div>
      )}

      <div className="project-stats">
        <div className="project-stat"><span>Tổng dự án</span><strong>{projectStats.total}</strong></div>
        <div className="project-stat"><span>Đang thực hiện</span><strong>{projectStats.active}</strong></div>
        <div className="project-stat"><span>Hoàn thành</span><strong>{projectStats.completed}</strong></div>
      </div>

      <div className="projects-toolbar card">
        <label className="projects-search">
          <HiOutlineSearch />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Tìm theo tên, mã hoặc mô tả..."
          />
        </label>
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
          <option value="">Tất cả ưu tiên</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={loadProjects} title="Tải lại"><HiOutlineRefresh /></button>
      </div>

      {loading ? (
        <div className="empty-state"><p className="empty-state-text">Đang tải danh sách dự án...</p></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><HiOutlineFolder /></div>
          <h3 className="empty-state-title">Chưa có dự án nào</h3>
          <p className="empty-state-text">Bắt đầu bằng việc tạo dự án đầu tiên để theo dõi tiến độ công việc và nguồn lực.</p>
          <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Tạo dự án đầu tiên</button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => {
            const taskStats = project.taskStats || {};
            return (
              <article className="project-card card" key={project._id}>
                <div className="project-card-top">
                  <div>
                    <span className="project-code">{project.code || 'NO-CODE'}</span>
                    <h3>{project.name}</h3>
                  </div>
                  <div className="project-actions">
                    <button title="Chỉnh sửa" onClick={() => openEdit(project)}><HiOutlinePencil /></button>
                    <button className="danger-action" title="Xóa" onClick={() => handleDelete(project)}><HiOutlineTrash /></button>
                  </div>
                </div>
                <p className="project-description">{project.description || 'Chưa có mô tả cho dự án này.'}</p>
                <div className="project-badges">
                  <span className={`badge status-${project.status}`}>{STATUS_LABELS[project.status]}</span>
                  <span className={`badge priority-${project.priority}`}>{PRIORITY_LABELS[project.priority]}</span>
                </div>
                <div className="progress-heading"><span>Tiến độ</span><strong>{project.progress || 0}%</strong></div>
                <div className="project-progress"><span style={{ width: `${project.progress || 0}%` }} /></div>
                <div className="project-meta">
                  <span>{formatDate(project.startDate)} — {formatDate(project.endDate)}</span>
                  <span>{taskStats.completedTasks || 0}/{taskStats.totalTasks || 0} công việc</span>
                </div>
                <div className="project-footer">
                  <span>Quản lý: {project.manager?.name || 'Chưa phân công'}</span>
                  <strong>{formatMoney(project.budget)}</strong>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal?.type === 'form' && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section className="project-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>{modal.project ? 'Cập nhật dự án' : 'Tạo dự án mới'}</h2>
                <p>Điền thông tin cơ bản để quản lý dự án.</p>
              </div>
              <button className="modal-close" onClick={closeModal} aria-label="Đóng"><HiOutlineX /></button>
            </header>
            <form onSubmit={handleSubmit}>
              <div className="project-form-grid">
                <label className="form-group form-full"><span>Tên dự án <em>*</em></span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="VD: Nâng cấp hệ thống ERP" /></label>
                <label className="form-group"><span>Mã dự án</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="VD: ERP-2026" /></label>
                <label className="form-group"><span>Ngân sách (VND)</span><input type="number" min="0" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} /></label>
                <label className="form-group"><span>Trạng thái</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="form-group"><span>Độ ưu tiên</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="form-group"><span>Ngày bắt đầu <em>*</em></span><input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
                <label className="form-group"><span>Ngày kết thúc <em>*</em></span><input required type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
                <label className="form-group form-full"><span>Tags (ngăn cách bởi dấu phẩy)</span><input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="web, nội bộ, ưu tiên" /></label>
                <label className="form-group form-full"><span>Mô tả</span><textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Mục tiêu, phạm vi và ghi chú của dự án..." /></label>
              </div>
              <footer>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : modal.project ? 'Lưu thay đổi' : 'Tạo dự án'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}