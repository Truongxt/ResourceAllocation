import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineFolder,
  HiOutlineClipboardList,
  HiOutlineUserGroup,
  HiOutlineLightningBolt,
  HiOutlineTrendingUp,
  HiOutlineExclamation,
  HiOutlineRefresh,
} from 'react-icons/hi';
import analyticsService from '../services/analyticsService';
import './Dashboard.css';

const STATUS_LABELS = {
  todo: 'Cần làm', in_progress: 'Đang làm', review: 'Đánh giá',
  done: 'Hoàn thành', blocked: 'Bị chặn',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getDashboard();
      setData(res.data.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const p = data?.projects || {};
  const t = data?.tasks || {};
  const r = data?.resources || {};

  const stats = [
    {
      id: 'total-projects', label: 'Dự án hoạt động',
      value: loading ? '—' : (p.active || 0),
      change: `${p.total || 0} tổng, ${p.completed || 0} hoàn thành`,
      changeType: 'positive', icon: HiOutlineFolder, color: 'primary',
    },
    {
      id: 'total-tasks', label: 'Công việc đang chạy',
      value: loading ? '—' : ((t.inProgress || 0) + (t.review || 0)),
      change: `${t.done || 0} hoàn thành / ${t.total || 0} tổng`,
      changeType: 'positive', icon: HiOutlineClipboardList, color: 'accent',
    },
    {
      id: 'total-resources', label: 'Nhân sự hoạt động',
      value: loading ? '—' : (r.total || 0),
      change: `${r.avgUtilization || 0}% utilization`,
      changeType: 'positive', icon: HiOutlineUserGroup, color: 'success',
    },
    {
      id: 'overloaded', label: 'Nhân sự quá tải',
      value: loading ? '—' : (r.overloaded || 0),
      change: r.overloaded > 0 ? 'Cần tối ưu hóa' : 'Tốt',
      changeType: r.overloaded > 0 ? 'negative' : 'positive',
      icon: HiOutlineExclamation, color: r.overloaded > 0 ? 'danger' : 'success',
    },
  ];

  return (
    <div className="dashboard animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">Tổng quan hệ thống quản lý nguồn lực và phân bổ nhân sự</p>
        </div>
        <button className="btn btn-secondary" onClick={load} title="Tải lại"><HiOutlineRefresh /></button>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        {stats.map((stat, i) => (
          <div key={stat.id} className={`stat-card stat-card-${stat.color}`} style={{ animationDelay: `${i * 80}ms` }} id={stat.id}>
            <div className="stat-card-header">
              <div className={`stat-icon stat-icon-${stat.color}`}><stat.icon /></div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-change ${stat.changeType}`}>
              {stat.changeType === 'positive' ? <HiOutlineTrendingUp /> : <HiOutlineExclamation />}
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">⚡ Hành động nhanh</h3></div>
          <div className="dashboard-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/projects')} id="btn-new-project">
              <HiOutlineFolder /> Quản lý dự án
            </button>
            <button className="btn btn-accent btn-lg" onClick={() => navigate('/optimization')} id="btn-run-optimization">
              <HiOutlineLightningBolt /> Tối ưu hóa
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/resources')} id="btn-add-resource">
              <HiOutlineUserGroup /> Nhân sự
            </button>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">📋 Hoạt động gần đây</h3></div>
          <div className="dashboard-activity">
            {loading ? (
              <p className="empty-state-text">Đang tải...</p>
            ) : (data?.recentTasks || []).length === 0 ? (
              <p className="empty-state-text">Chưa có hoạt động.</p>
            ) : (
              (data?.recentTasks || []).map((task) => (
                <div className="activity-item" key={task._id}>
                  <div className={`activity-dot ${task.status === 'done' ? 'active' : task.status === 'blocked' ? 'warning' : ''}`} />
                  <div className="activity-content">
                    <span className="activity-text">
                      <strong>{task.title}</strong> — {STATUS_LABELS[task.status] || task.status}
                      {task.project && <em> ({task.project.code || task.project.name})</em>}
                    </span>
                    <span className="activity-time">
                      {task.assignee?.name || ''} • {new Date(task.updatedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Distribution */}
      <div className="dashboard-row">
        <div className="card">
          <div className="card-header"><h3 className="card-title">📊 Phân bổ công việc</h3></div>
          {!loading && t.total > 0 ? (
            <div className="task-distribution">
              {[
                { key: 'todo', label: 'Cần làm', value: t.todo, color: '#94a3b8' },
                { key: 'inProgress', label: 'Đang làm', value: t.inProgress, color: '#6366f1' },
                { key: 'review', label: 'Đánh giá', value: t.review, color: '#f59e0b' },
                { key: 'done', label: 'Hoàn thành', value: t.done, color: '#10b981' },
                { key: 'blocked', label: 'Bị chặn', value: t.blocked, color: '#ef4444' },
              ].map((s) => (
                <div key={s.key} className="task-dist-item">
                  <div className="task-dist-header">
                    <span style={{ color: s.color }}>{s.label}</span>
                    <strong>{s.value}</strong>
                  </div>
                  <div className="task-dist-bar">
                    <div style={{ width: `${(s.value / t.total) * 100}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state-text">{loading ? 'Đang tải...' : 'Chưa có công việc.'}</p>
          )}
        </div>

        {/* Hours */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">⏱️ Giờ công</h3></div>
          {!loading ? (
            <div className="hours-summary">
              <div className="hours-item">
                <span>Ước tính</span>
                <strong>{t.totalEstimatedHours || 0}h</strong>
              </div>
              <div className="hours-item">
                <span>Thực tế</span>
                <strong>{t.totalActualHours || 0}h</strong>
              </div>
              <div className="hours-item">
                <span>Capacity tổng</span>
                <strong>{Math.round(r.totalCapacity || 0)}h</strong>
              </div>
              <div className="hours-item">
                <span>Workload hiện tại</span>
                <strong>{Math.round(r.totalWorkload || 0)}h</strong>
              </div>
            </div>
          ) : (
            <p className="empty-state-text">Đang tải...</p>
          )}
        </div>
      </div>

      {/* Recent Optimizations */}
      {data?.recentOptimizations && data.recentOptimizations.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🧬 Tối ưu hóa gần đây</h3>
            <button className="btn btn-secondary" onClick={() => navigate('/optimization')} style={{ fontSize: 'var(--font-size-xs)' }}>Xem tất cả</button>
          </div>
          <div className="opt-recent-list">
            {data.recentOptimizations.map((opt) => (
              <div key={opt._id} className="opt-recent-item" onClick={() => navigate('/optimization')}>
                <span className="opt-recent-algo">{opt.algorithm === 'genetic' ? '🧬' : opt.algorithm === 'csp' ? '🔗' : '⚡'} {opt.algorithm.toUpperCase()}</span>
                <span>Fitness: <strong>{opt.fitness}</strong></span>
                <span>{opt.taskCount}T / {opt.resourceCount}R</span>
                <span>{new Date(opt.createdAt).toLocaleDateString('vi-VN')}</span>
                {opt.isApplied && <span className="badge badge-success">Đã áp dụng</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
