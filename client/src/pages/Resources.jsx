import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineUpload,
  HiOutlineUser,
  HiOutlineX,
} from 'react-icons/hi';
import resourceService from '../services/resourceService';
import authService from '../services/authService';
import './Resources.css';

const SKILL_LEVELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert' };
const AVAILABILITY_LABELS = {
  available: 'Sẵn sàng',
  partially_available: 'Bận một phần',
  unavailable: 'Không khả dụng',
};

const initialForm = {
  user: '',
  employeeId: '',
  position: '',
  department: '',
  maxCapacity: 40,
  fte: 1,
  hourlyRate: 0,
};

function getErrorMessage(err) {
  return err.response?.data?.message || 'Đã xảy ra lỗi.';
}

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [filters, setFilters] = useState({ search: '', department: '', availability: '' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [skillForm, setSkillForm] = useState({ resourceId: '', skills: [] });
  const [csvContent, setCsvContent] = useState('');

  // Load
  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await resourceService.getAll(params);
      setResources(res.data.data.resources || []);
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await authService.getUsers();
      setUsers(res.data.users || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    const t = setTimeout(loadResources, filters.search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadResources, filters.department, filters.availability]);

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set(resources.map((r) => r.department).filter(Boolean));
    return Array.from(set);
  }, [resources]);

  // Stats
  const stats = useMemo(() => {
    const total = resources.length;
    const available = resources.filter((r) => r.availability === 'available').length;
    const overloaded = resources.filter((r) => r.isOverloaded).length;
    const avgUtil = total > 0
      ? Math.round(resources.reduce((s, r) => s + (r.utilizationRate || 0), 0) / total)
      : 0;
    return { total, available, overloaded, avgUtil };
  }, [resources]);

  // Handlers
  const openCreate = () => {
    setForm(initialForm);
    setModal({ type: 'form', resource: null });
  };

  const openEdit = (resource) => {
    setForm({
      user: resource.user?._id || '',
      employeeId: resource.employeeId || '',
      position: resource.position || '',
      department: resource.department || '',
      maxCapacity: resource.maxCapacity || 40,
      fte: resource.fte || 1,
      hourlyRate: resource.hourlyRate || 0,
    });
    setModal({ type: 'form', resource });
  };

  const openSkills = (resource) => {
    setSkillForm({
      resourceId: resource._id,
      skills: (resource.skills || []).map((s) => ({
        name: s.name,
        level: s.level,
        yearsOfExperience: s.yearsOfExperience || 0,
      })),
    });
    setModal({ type: 'skills', resource });
  };

  const closeModal = () => setModal(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        maxCapacity: Number(form.maxCapacity),
        fte: Number(form.fte),
        hourlyRate: Number(form.hourlyRate),
      };
      if (!payload.employeeId) delete payload.employeeId;

      if (modal.resource) {
        await resourceService.update(modal.resource._id, payload);
        setNotice({ type: 'success', text: 'Cập nhật nhân sự thành công.' });
      } else {
        await resourceService.create(payload);
        setNotice({ type: 'success', text: 'Thêm nhân sự thành công.' });
      }
      setModal(null);
      await loadResources();
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkillsSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resourceService.updateSkills(skillForm.resourceId, skillForm.skills);
      setNotice({ type: 'success', text: 'Cập nhật kỹ năng thành công.' });
      setModal(null);
      await loadResources();
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = () => {
    setSkillForm((p) => ({ ...p, skills: [...p.skills, { name: '', level: 2, yearsOfExperience: 0 }] }));
  };

  const removeSkill = (idx) => {
    setSkillForm((p) => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }));
  };

  const updateSkill = (idx, field, value) => {
    setSkillForm((p) => ({
      ...p,
      skills: p.skills.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  const handleDelete = async (resource) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhân sự "${resource.user?.name || resource.position}"?`)) return;
    try {
      await resourceService.remove(resource._id);
      setNotice({ type: 'success', text: 'Xóa nhân sự thành công.' });
      await loadResources();
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err) });
    }
  };

  const handleImportCSV = async (e) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    setSubmitting(true);
    let successCount = 0;
    const lines = csvContent.trim().split('\n');

    // Available users without resource record
    const linkedUserIds = new Set(resources.map((r) => r.user?._id));
    const availableUsers = users.filter((u) => !linkedUserIds.has(u._id));
    let userIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || (i === 0 && line.toLowerCase().includes('vị trí'))) continue;

      const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (!parts[0]) continue;

      const targetUser = availableUsers[userIdx] || users[0];
      if (!targetUser) break;

      try {
        await resourceService.create({
          user: targetUser._id,
          position: parts[0],
          department: parts[1] || 'General',
          fte: Number(parts[2]) || 1,
          maxCapacity: Number(parts[3]) || 40,
          hourlyRate: Number(parts[4]) || 0,
        });
        successCount++;
        userIdx++;
      } catch {
        /* skip error line */
      }
    }

    setNotice({ type: 'success', text: `Đã nhập thành công ${successCount} nhân sự từ CSV.` });
    setSubmitting(false);
    setModal(null);
    setCsvContent('');
    await loadResources();
  };

  const getUtilColor = (rate) => {
    if (rate > 100) return 'var(--color-danger)';
    if (rate > 80) return '#f59e0b';
    return 'var(--color-success)';
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header resources-header">
        <div>
          <h1 className="page-title">Quản lý Nhân sự</h1>
          <p className="page-description">Quản lý nhân sự, kỹ năng và tải công việc.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={() => setModal({ type: 'import' })}>
            <HiOutlineUpload /> Nhập CSV
          </button>
          <button className="btn btn-primary" onClick={openCreate} id="btn-create-resource">
            <HiOutlinePlus /> Thêm nhân sự
          </button>
        </div>
      </div>

      {notice && (
        <div className={`alert alert-${notice.type} resources-alert`}>
          {notice.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />}
          <span>{notice.text}</span>
          <button aria-label="Đóng" onClick={() => setNotice(null)}><HiOutlineX /></button>
        </div>
      )}

      {/* Stats */}
      <div className="resource-stats">
        <div className="resource-stat"><span>Tổng nhân sự</span><strong>{stats.total}</strong></div>
        <div className="resource-stat"><span>Utilization TB</span><strong>{stats.avgUtil}%</strong></div>
        <div className="resource-stat"><span>Quá tải</span><strong className="text-danger">{stats.overloaded}</strong></div>
      </div>

      {/* Filters */}
      <div className="resources-toolbar card">
        <label className="resources-search">
          <HiOutlineSearch />
          <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Tìm theo tên, vị trí..." />
        </label>
        <select value={filters.department} onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}>
          <option value="">Tất cả phòng ban</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.availability} onChange={(e) => setFilters((p) => ({ ...p, availability: e.target.value }))}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(AVAILABILITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={loadResources} title="Tải lại"><HiOutlineRefresh /></button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="empty-state"><p className="empty-state-text">Đang tải...</p></div>
      ) : resources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><HiOutlineUser /></div>
          <h3 className="empty-state-title">Chưa có nhân sự</h3>
          <p className="empty-state-text">Thêm nhân sự đầu tiên để bắt đầu quản lý nguồn lực.</p>
          <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> Thêm nhân sự</button>
        </div>
      ) : (
        <div className="resources-grid">
          {resources.map((r) => {
            const util = r.utilizationRate || 0;
            const skills = r.skills || [];

            return (
              <article key={r._id} className="resource-card card">
                <div className="resource-card-top">
                  <div className="resource-avatar">
                    {(r.user?.name || r.position || 'U')[0].toUpperCase()}
                  </div>
                  <div className="resource-info">
                    <h3>{r.user?.name || 'Chưa gán tài khoản'}</h3>
                    <span className="resource-position">{r.position}</span>
                    <span className="resource-dept">{r.department || '—'}</span>
                  </div>
                  <div className="resource-card-actions">
                    <button title="Chỉnh sửa thông tin" onClick={() => openEdit(r)}><HiOutlinePencil /></button>
                    <button title="Xóa" className="danger-action" onClick={() => handleDelete(r)}><HiOutlineTrash /></button>
                  </div>
                </div>

                {/* Utilization */}
                <div className="resource-utilization">
                  <div className="resource-util-header">
                    <span>Workload: {r.currentWorkload || 0}h / {r.capacity || (r.maxCapacity * r.fte)}h</span>
                    <strong style={{ color: getUtilColor(util) }}>{util}%</strong>
                  </div>
                  <div className="resource-util-bar">
                    <div
                      className="resource-util-fill"
                      style={{ width: `${Math.min(util, 100)}%`, background: getUtilColor(util) }}
                    />
                  </div>
                </div>

                {/* Skills Preview */}
                <div className="resource-skills">
                  {skills.slice(0, 3).map((s, i) => (
                    <span key={i} className="resource-skill-tag">
                      {s.name} <em>({s.level})</em>
                    </span>
                  ))}
                  {skills.length > 3 && (
                    <span className="resource-skill-more">+{skills.length - 3}</span>
                  )}
                  <button className="btn btn-secondary" style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px' }} onClick={() => openSkills(r)}>
                    Skill Matrix ({skills.length})
                  </button>
                </div>

                {/* Meta */}
                <div className="resource-meta">
                  <span className={`badge avail-${r.availability}`}>
                    {AVAILABILITY_LABELS[r.availability] || r.availability}
                  </span>
                  <span>FTE: {r.fte}</span>
                  {r.hourlyRate > 0 && (
                    <span>{r.hourlyRate.toLocaleString('vi-VN')} đ/h</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Resource Form Modal */}
      {modal?.type === 'form' && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section className="resource-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>{modal.resource ? 'Cập nhật nhân sự' : 'Thêm nhân sự mới'}</h2>
                <p>Thông tin cơ bản, vị trí và năng lực.</p>
              </div>
              <button className="modal-close" onClick={closeModal}><HiOutlineX /></button>
            </header>
            <form onSubmit={handleSubmit}>
              <div className="resource-form-grid">
                {!modal.resource && (
                  <label className="form-group form-full">
                    <span>Tài khoản liên kết <em>*</em></span>
                    <select required value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })}>
                      <option value="">-- Chọn tài khoản --</option>
                      {users.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                    </select>
                  </label>
                )}
                <label className="form-group"><span>Mã nhân viên</span><input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="VD: NV001" /></label>
                <label className="form-group"><span>Vị trí <em>*</em></span><input required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="VD: Senior Developer" /></label>
                <label className="form-group"><span>Phòng ban</span><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="VD: Engineering" /></label>
                <label className="form-group"><span>Max Capacity (h/tuần)</span><input type="number" min="0" value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })} /></label>
                <label className="form-group"><span>FTE (0-1)</span><input type="number" min="0" max="1" step="0.1" value={form.fte} onChange={(e) => setForm({ ...form, fte: e.target.value })} /></label>
                <label className="form-group"><span>Hourly Rate (VND)</span><input type="number" min="0" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} /></label>
              </div>
              <footer>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : modal.resource ? 'Lưu' : 'Thêm nhân sự'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Skills Modal */}
      {modal?.type === 'skills' && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section className="resource-modal skills-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>Skill Matrix — {modal.resource.user?.name}</h2>
                <p>Quản lý kỹ năng và trình độ.</p>
              </div>
              <button className="modal-close" onClick={closeModal}><HiOutlineX /></button>
            </header>
            <form onSubmit={handleSkillsSubmit}>
              <div className="skills-list">
                {skillForm.skills.map((s, i) => (
                  <div key={i} className="skill-row">
                    <input value={s.name} onChange={(e) => updateSkill(i, 'name', e.target.value)} placeholder="Tên kỹ năng" required />
                    <select value={s.level} onChange={(e) => updateSkill(i, 'level', Number(e.target.value))}>
                      {Object.entries(SKILL_LEVELS).map(([k, v]) => <option key={k} value={k}>{v} (Lv.{k})</option>)}
                    </select>
                    <input type="number" min="0" value={s.yearsOfExperience || 0} onChange={(e) => updateSkill(i, 'yearsOfExperience', Number(e.target.value))} placeholder="Năm KN" style={{ width: 80 }} />
                    <button type="button" className="btn-icon danger-action" onClick={() => removeSkill(i)}><HiOutlineTrash /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-secondary add-skill-btn" onClick={addSkill}><HiOutlinePlus /> Thêm kỹ năng</button>
              <footer>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu kỹ năng'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* CSV Import Modal */}
      {modal?.type === 'import' && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <section className="resource-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <div>
                <h2>Nhập nhân sự từ CSV</h2>
                <p>Định dạng: Vị trí, Phòng ban, FTE, Max Capacity, Lương theo giờ</p>
              </div>
              <button className="modal-close" onClick={closeModal} aria-label="Đóng"><HiOutlineX /></button>
            </header>
            <form onSubmit={handleImportCSV}>
              <div style={{ padding: '0 var(--space-6) var(--space-4)' }}>
                <textarea
                  rows="8"
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder={`Vị trí, Phòng ban, FTE, Max Capacity, Lương theo giờ\nSenior React Dev, Frontend, 1, 40, 250000\nBackend Lead, Backend, 1, 40, 300000\nQA Engineer, Quality, 1, 40, 180000`}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}
                  required
                />
              </div>
              <footer>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang nhập...' : 'Bắt đầu nhập'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
