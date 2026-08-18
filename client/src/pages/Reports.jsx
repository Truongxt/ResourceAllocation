import { useCallback, useEffect, useState } from 'react';
import {
  HiOutlineChartBar,
  HiOutlineDocumentReport,
  HiOutlineDownload,
  HiOutlineExclamation,
  HiOutlineRefresh,
  HiOutlineUserGroup,
} from 'react-icons/hi';
import analyticsService from '../services/analyticsService';
import './Reports.css';

const BURNOUT_LABELS = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
const BURNOUT_COLORS = { high: 'var(--color-danger)', medium: '#f59e0b', low: 'var(--color-success)' };

export default function Reports() {
  const [utilData, setUtilData] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('utilization');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [utilRes, taskRes] = await Promise.all([
        analyticsService.getUtilization(),
        analyticsService.getTaskAnalytics(),
      ]);
      setUtilData(utilRes.data.data);
      setTaskData(taskRes.data.data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportCSV = (type) => {
    let csv = '';
    if (type === 'utilization' && utilData?.resources) {
      csv = 'Tên,Phòng ban,Vị trí,Capacity,Workload,Utilization(%),Burnout Risk,Số task\n';
      for (const r of utilData.resources) {
        csv += `"${r.name}","${r.department}","${r.position}",${r.capacity},${r.workload},${r.utilization},${BURNOUT_LABELS[r.burnoutRisk]},${r.taskCount}\n`;
      }
    } else if (type === 'tasks' && taskData?.byProject) {
      csv = 'Dự án,Tổng tasks,Hoàn thành,Tổng giờ,% Completion\n';
      for (const p of taskData.byProject) {
        csv += `"${p.projectName}",${p.count},${p.done},${p.totalHours},${Math.round(p.completion)}%\n`;
      }
    }

    if (!csv) return;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in reports-page">
      <div className="page-header reports-header">
        <div>
          <h1 className="page-title">Báo cáo & Thống kê</h1>
          <p className="page-description">Resource Histogram, Burnout Risk, Team Analytics</p>
        </div>
        <div className="reports-actions">
          <button className="btn btn-secondary" onClick={() => exportCSV(activeTab)} title="Xuất CSV"><HiOutlineDownload /> CSV</button>
          <button className="btn btn-secondary" onClick={exportPrint} title="In"><HiOutlineDocumentReport /> In</button>
          <button className="btn btn-secondary" onClick={load}><HiOutlineRefresh /></button>
        </div>
      </div>

      {/* Summary Cards */}
      {utilData?.summary && (
        <div className="reports-summary">
          <div className="report-stat">
            <span>Tổng nhân sự</span>
            <strong>{utilData.summary.totalResources}</strong>
          </div>
          <div className="report-stat">
            <span>Utilization TB</span>
            <strong style={{ color: utilData.summary.avgUtilization > 100 ? 'var(--color-danger)' : 'var(--color-primary-400)' }}>
              {utilData.summary.avgUtilization}%
            </strong>
          </div>
          <div className="report-stat">
            <span>Quá tải</span>
            <strong style={{ color: utilData.summary.overloaded > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {utilData.summary.overloaded}
            </strong>
          </div>
          <div className="report-stat">
            <span>Burnout Risk Cao</span>
            <strong style={{ color: utilData.summary.highBurnout > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {utilData.summary.highBurnout}
            </strong>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="reports-tabs">
        <button className={activeTab === 'utilization' ? 'active' : ''} onClick={() => setActiveTab('utilization')}>
          <HiOutlineChartBar /> Resource Histogram
        </button>
        <button className={activeTab === 'department' ? 'active' : ''} onClick={() => setActiveTab('department')}>
          <HiOutlineUserGroup /> Team Analytics
        </button>
        <button className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')}>
          <HiOutlineDocumentReport /> Báo cáo Dự án
        </button>
      </div>

      {loading ? (
        <div className="card"><p className="empty-state-text">Đang tải...</p></div>
      ) : (
        <>
          {/* Utilization Tab */}
          {activeTab === 'utilization' && utilData?.resources && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
                📊 Resource Histogram — Utilization & Burnout Risk
              </h3>

              {/* Overallocation Alerts */}
              {utilData.resources.filter((r) => r.isOverloaded).length > 0 && (
                <div className="report-alert alert-danger">
                  <HiOutlineExclamation />
                  <span>
                    <strong>{utilData.resources.filter((r) => r.isOverloaded).length} nhân sự</strong> đang bị quá tải!
                    {' '}Cân nhắc chạy <em>Tối ưu hóa</em> để cân bằng lại workload.
                  </span>
                </div>
              )}

              {/* Histogram */}
              <div className="report-histogram">
                {utilData.resources.map((r) => (
                  <div key={r._id} className={`histogram-row ${r.isOverloaded ? 'overloaded' : ''}`}>
                    <div className="histogram-name">
                      <span>{r.name}</span>
                      <em>{r.department}</em>
                    </div>
                    <div className="histogram-bar-wrap">
                      <div
                        className="histogram-bar"
                        style={{
                          width: `${Math.min(r.utilization, 150)}%`,
                          maxWidth: '100%',
                          background: r.isOverloaded ? 'var(--color-danger)' : r.utilization > 80 ? '#f59e0b' : 'var(--color-success)',
                        }}
                      />
                      {/* 100% line */}
                      <div className="histogram-limit" />
                    </div>
                    <span className={`histogram-pct ${r.isOverloaded ? 'text-danger' : ''}`}>{r.utilization}%</span>
                    <span className="histogram-detail">{r.workload}/{r.capacity}h</span>
                    <span className="histogram-tasks">{r.taskCount} tasks</span>
                    <span className="histogram-burnout" style={{ color: BURNOUT_COLORS[r.burnoutRisk] }}>
                      {r.burnoutRisk === 'high' ? '🔴' : r.burnoutRisk === 'medium' ? '🟡' : '🟢'} {BURNOUT_LABELS[r.burnoutRisk]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Department Tab */}
          {activeTab === 'department' && utilData?.departments && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
                👥 Team Analytics — Thống kê theo phòng ban
              </h3>
              <div className="department-grid">
                {utilData.departments.map((dept) => (
                  <div key={dept.name} className="department-card">
                    <h4>{dept.name}</h4>
                    <div className="department-stats">
                      <div><span>Nhân sự</span><strong>{dept.count}</strong></div>
                      <div><span>Capacity</span><strong>{Math.round(dept.totalCapacity)}h</strong></div>
                      <div><span>Workload</span><strong>{Math.round(dept.totalWorkload)}h</strong></div>
                      <div><span>Utilization</span><strong style={{ color: dept.utilization > 100 ? 'var(--color-danger)' : 'var(--color-primary-400)' }}>{dept.utilization}%</strong></div>
                    </div>
                    <div className="department-bar">
                      <div style={{
                        width: `${Math.min(dept.utilization, 100)}%`,
                        background: dept.utilization > 100 ? 'var(--color-danger)' : dept.utilization > 80 ? '#f59e0b' : 'var(--color-success)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && taskData && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
                📋 Báo cáo Dự án
              </h3>

              {/* Hours efficiency */}
              <div className="report-hours-row">
                <div className="report-hours-item">
                  <span>Giờ ước tính</span>
                  <strong>{taskData.hours?.estimated || 0}h</strong>
                </div>
                <div className="report-hours-item">
                  <span>Giờ thực tế</span>
                  <strong>{taskData.hours?.actual || 0}h</strong>
                </div>
                <div className="report-hours-item">
                  <span>Hiệu suất</span>
                  <strong style={{ color: (taskData.hours?.efficiency || 0) > 100 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {taskData.hours?.efficiency || 0}%
                  </strong>
                </div>
              </div>

              {/* By Project Table */}
              {taskData.byProject && taskData.byProject.length > 0 && (
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Dự án</th>
                        <th>Tổng tasks</th>
                        <th>Hoàn thành</th>
                        <th>Tổng giờ</th>
                        <th>Tiến độ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskData.byProject.map((p) => (
                        <tr key={p._id || 'none'}>
                          <td><strong>{p.projectCode ? `${p.projectCode} — ` : ''}{p.projectName}</strong></td>
                          <td>{p.count}</td>
                          <td>{p.done}</td>
                          <td>{p.totalHours || 0}h</td>
                          <td>
                            <div className="report-progress-wrap">
                              <div className="report-progress-bar">
                                <div style={{ width: `${Math.round(p.completion)}%`, background: p.completion >= 100 ? 'var(--color-success)' : 'var(--color-primary-500)' }} />
                              </div>
                              <span>{Math.round(p.completion)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* By Status / Priority charts */}
              <div className="report-charts-row">
                <div className="report-chart-card">
                  <h4>Theo trạng thái</h4>
                  {(taskData.byStatus || []).map((s) => {
                    const colors = { todo: '#94a3b8', in_progress: '#6366f1', review: '#f59e0b', done: '#10b981', blocked: '#ef4444' };
                    const labels = { todo: 'Cần làm', in_progress: 'Đang làm', review: 'Đánh giá', done: 'Hoàn thành', blocked: 'Bị chặn' };
                    return (
                      <div key={s._id} className="mini-bar-row">
                        <span style={{ color: colors[s._id] }}>{labels[s._id] || s._id}</span>
                        <div className="mini-bar"><div style={{ width: `${s.count * 10}%`, maxWidth: '100%', background: colors[s._id] }} /></div>
                        <strong>{s.count}</strong>
                      </div>
                    );
                  })}
                </div>
                <div className="report-chart-card">
                  <h4>Theo ưu tiên</h4>
                  {(taskData.byPriority || []).map((p) => {
                    const colors = { low: '#10b981', medium: '#6366f1', high: '#f59e0b', critical: '#ef4444' };
                    const labels = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', critical: 'Nghiêm trọng' };
                    return (
                      <div key={p._id} className="mini-bar-row">
                        <span style={{ color: colors[p._id] }}>{labels[p._id] || p._id}</span>
                        <div className="mini-bar"><div style={{ width: `${p.count * 10}%`, maxWidth: '100%', background: colors[p._id] }} /></div>
                        <strong>{p.count}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
