import { useCallback, useEffect, useState } from 'react';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamation,
  HiOutlineLightningBolt,
  HiOutlinePlay,
  HiOutlineRefresh,
  HiOutlineX,
} from 'react-icons/hi';
import optimizationService from '../services/optimizationService';
import projectService from '../services/projectService';
import './Optimization.css';

const ALGO_OPTIONS = [
  { key: 'genetic', label: 'Genetic Algorithm', icon: '🧬', desc: 'Multi-objective optimization, tìm giải pháp tối ưu nhất' },
  { key: 'csp', label: 'CSP Solver', icon: '🔗', desc: 'Backtracking + AC-3, đảm bảo thoả mãn ràng buộc cứng' },
  { key: 'hybrid', label: 'Hybrid (CSP → GA)', icon: '⚡', desc: 'Kết hợp CSP lọc feasible + GA tối ưu hóa' },
];

const STATUS_LABELS = { running: 'Đang chạy', completed: 'Hoàn thành', failed: 'Thất bại' };

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function Optimization() {
  const [algorithm, setAlgorithm] = useState('genetic');
  const [projects, setProjects] = useState([]);
  const [params, setParams] = useState({
    projectId: '',
    populationSize: 100,
    maxGenerations: 500,
    crossoverRate: 0.8,
    mutationRate: 0.1,
    workloadWeight: 0.30,
    skillWeight: 0.35,
    costWeight: 0.15,
    overallocationWeight: 0.20,
  });
  const [running, setRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState(null);
  const [viewTab, setViewTab] = useState('result'); // 'result' | 'history'

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectService.getAll({ limit: 100 });
      setProjects(res.data.data.projects || []);
    } catch { /* ignore */ }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await optimizationService.getHistory();
      setHistory(res.data.data.results || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadProjects(); loadHistory(); }, [loadProjects, loadHistory]);

  const handleRun = async () => {
    setRunning(true);
    setNotice(null);
    setCurrentResult(null);

    try {
      let res;
      if (algorithm === 'genetic') {
        res = await optimizationService.runGenetic(params);
      } else if (algorithm === 'csp') {
        res = await optimizationService.runCSP({ projectId: params.projectId });
      } else {
        res = await optimizationService.runHybrid(params);
      }

      const result = res.data.data.result;
      setCurrentResult(result);
      setViewTab('result');

      if (result.status === 'completed') {
        setNotice({ type: 'success', text: `Tối ưu hóa hoàn thành trong ${formatTime(result.executionTime)}!` });
      } else {
        setNotice({ type: 'error', text: result.errorMessage || 'Không tìm thấy giải pháp.' });
      }

      await loadHistory();
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Lỗi khi chạy tối ưu hóa.' });
    } finally {
      setRunning(false);
    }
  };

  const handleApply = async (resultId) => {
    try {
      const res = await optimizationService.applyResult(resultId);
      setNotice({ type: 'success', text: res.data.message });
      await loadHistory();
      if (currentResult?._id === resultId) {
        setCurrentResult((prev) => ({ ...prev, isApplied: true }));
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Lỗi khi áp dụng.' });
    }
  };

  const viewResult = async (id) => {
    try {
      const res = await optimizationService.getById(id);
      setCurrentResult(res.data.data.result);
      setViewTab('result');
    } catch { /* ignore */ }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Tối ưu hóa Phân bổ Nhân sự</h1>
        <p className="page-description">Sử dụng thuật toán GA và CSP để tự động tìm phương án phân bổ tối ưu.</p>
      </div>

      {notice && (
        <div className={`alert alert-${notice.type}`} style={{ marginBottom: 'var(--space-4)' }}>
          {notice.type === 'success' ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />}
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><HiOutlineX /></button>
        </div>
      )}

      <div className="opt-layout">
        {/* Left: Config Panel */}
        <div className="opt-config card">
          <h3 className="card-title">Cấu hình thuật toán</h3>

          {/* Algorithm selection */}
          <div className="opt-algo-select">
            {ALGO_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`opt-algo-btn ${algorithm === opt.key ? 'active' : ''}`}
                onClick={() => setAlgorithm(opt.key)}
              >
                <span className="opt-algo-icon">{opt.icon}</span>
                <span className="opt-algo-label">{opt.label}</span>
                <span className="opt-algo-desc">{opt.desc}</span>
              </button>
            ))}
          </div>

          {/* Project filter */}
          <label className="form-group" style={{ marginTop: 'var(--space-4)' }}>
            <span>Lọc theo dự án (tuỳ chọn)</span>
            <select value={params.projectId} onChange={(e) => setParams((p) => ({ ...p, projectId: e.target.value }))}>
              <option value="">Tất cả dự án</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.code ? `${p.code} - ` : ''}{p.name}</option>)}
            </select>
          </label>

          {/* GA Parameters */}
          {algorithm !== 'csp' && (
            <div className="opt-params">
              <h4>Tham số GA</h4>
              <div className="opt-params-grid">
                <label><span>Population Size</span><input type="number" min="10" max="500" value={params.populationSize} onChange={(e) => setParams((p) => ({ ...p, populationSize: Number(e.target.value) }))} /></label>
                <label><span>Max Generations</span><input type="number" min="50" max="2000" value={params.maxGenerations} onChange={(e) => setParams((p) => ({ ...p, maxGenerations: Number(e.target.value) }))} /></label>
                <label><span>Crossover Rate</span><input type="number" min="0.1" max="1" step="0.05" value={params.crossoverRate} onChange={(e) => setParams((p) => ({ ...p, crossoverRate: Number(e.target.value) }))} /></label>
                <label><span>Mutation Rate</span><input type="number" min="0.01" max="0.5" step="0.01" value={params.mutationRate} onChange={(e) => setParams((p) => ({ ...p, mutationRate: Number(e.target.value) }))} /></label>
              </div>

              <h4>Trọng số Fitness</h4>
              <div className="opt-weights">
                <label><span>Cân bằng workload</span><input type="range" min="0" max="1" step="0.05" value={params.workloadWeight} onChange={(e) => setParams((p) => ({ ...p, workloadWeight: Number(e.target.value) }))} /><em>{params.workloadWeight}</em></label>
                <label><span>Skill match</span><input type="range" min="0" max="1" step="0.05" value={params.skillWeight} onChange={(e) => setParams((p) => ({ ...p, skillWeight: Number(e.target.value) }))} /><em>{params.skillWeight}</em></label>
                <label><span>Chi phí</span><input type="range" min="0" max="1" step="0.05" value={params.costWeight} onChange={(e) => setParams((p) => ({ ...p, costWeight: Number(e.target.value) }))} /><em>{params.costWeight}</em></label>
                <label><span>Tránh quá tải</span><input type="range" min="0" max="1" step="0.05" value={params.overallocationWeight} onChange={(e) => setParams((p) => ({ ...p, overallocationWeight: Number(e.target.value) }))} /><em>{params.overallocationWeight}</em></label>
              </div>
            </div>
          )}

          <button
            className="btn btn-accent opt-run-btn"
            onClick={handleRun}
            disabled={running}
            id="btn-run-optimizer"
          >
            {running ? (
              <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Đang tối ưu hóa...</>
            ) : (
              <><HiOutlinePlay /> Chạy {ALGO_OPTIONS.find((o) => o.key === algorithm)?.label}</>
            )}
          </button>
        </div>

        {/* Right: Results */}
        <div className="opt-results">
          <div className="opt-tabs">
            <button className={`opt-tab ${viewTab === 'result' ? 'active' : ''}`} onClick={() => setViewTab('result')}>
              <HiOutlineLightningBolt /> Kết quả
            </button>
            <button className={`opt-tab ${viewTab === 'history' ? 'active' : ''}`} onClick={() => setViewTab('history')}>
              <HiOutlineClock /> Lịch sử ({history.length})
            </button>
          </div>

          {viewTab === 'result' ? (
            currentResult ? (
              <div className="opt-result-detail card">
                {/* Metrics */}
                <div className="opt-metrics-row">
                  <div className="opt-metric">
                    <span>Fitness</span>
                    <strong style={{ color: 'var(--color-primary-400)' }}>{currentResult.fitness || '—'}</strong>
                  </div>
                  <div className="opt-metric">
                    <span>Thời gian</span>
                    <strong>{formatTime(currentResult.executionTime || 0)}</strong>
                  </div>
                  <div className="opt-metric">
                    <span>Generations</span>
                    <strong>{currentResult.generations || currentResult.iterations || '—'}</strong>
                  </div>
                  <div className="opt-metric">
                    <span>Tasks</span>
                    <strong>{currentResult.taskCount}</strong>
                  </div>
                  <div className="opt-metric">
                    <span>Resources</span>
                    <strong>{currentResult.resourceCount}</strong>
                  </div>
                </div>

                {/* GA Metrics */}
                {currentResult.metrics && (
                  <div className="opt-ga-metrics">
                    <div className="opt-ga-metric">
                      <span>Skill Match TB</span>
                      <strong>{currentResult.metrics.averageSkillMatch}%</strong>
                    </div>
                    <div className="opt-ga-metric">
                      <span>Workload Variance</span>
                      <strong>{currentResult.metrics.workloadVariance}</strong>
                    </div>
                    <div className="opt-ga-metric">
                      <span>Quá tải</span>
                      <strong className={currentResult.metrics.overallocatedResources > 0 ? 'text-danger' : ''}>
                        {currentResult.metrics.overallocatedResources}
                      </strong>
                    </div>
                    <div className="opt-ga-metric">
                      <span>Tổng chi phí</span>
                      <strong>{(currentResult.metrics.totalCost || 0).toLocaleString('vi-VN')} VND</strong>
                    </div>
                  </div>
                )}

                {/* Convergence Chart (simple text-based) */}
                {currentResult.convergenceHistory && currentResult.convergenceHistory.length > 1 && (
                  <div className="opt-convergence">
                    <h4>Convergence (Fitness qua Generations)</h4>
                    <div className="opt-convergence-chart">
                      {currentResult.convergenceHistory.map((point, i) => (
                        <div key={i} className="opt-conv-bar-wrap">
                          <div
                            className="opt-conv-bar"
                            style={{ height: `${Math.max(point.fitness * 100, 2)}%` }}
                            title={`Gen ${point.generation}: ${point.fitness}`}
                          />
                          <span className="opt-conv-label">{point.generation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignments table */}
                {currentResult.assignments && currentResult.assignments.length > 0 && (
                  <div className="opt-assignments">
                    <h4>Kết quả phân bổ ({currentResult.assignments.length} công việc)</h4>
                    <div className="opt-assign-table-wrap">
                      <table className="opt-assign-table">
                        <thead>
                          <tr>
                            <th>Công việc</th>
                            <th>Nhân sự</th>
                            <th>Skill Match</th>
                            <th>Giờ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentResult.assignments.map((a, i) => (
                            <tr key={i}>
                              <td>{a.taskTitle}</td>
                              <td>{a.resourceName}</td>
                              <td>
                                <span className={`badge ${(a.skillMatch || 0) >= 80 ? 'badge-success' : (a.skillMatch || 0) >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                                  {a.skillMatch || '—'}%
                                </span>
                              </td>
                              <td>{a.estimatedHours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Resource utilization */}
                {currentResult.metrics?.resourceUtilization && (
                  <div className="opt-utilization">
                    <h4>Phân bổ nhân sự</h4>
                    {currentResult.metrics.resourceUtilization.map((r, i) => (
                      <div key={i} className="opt-util-row">
                        <span className="opt-util-name">{r.name}</span>
                        <div className="opt-util-bar-wrap">
                          <div
                            className="opt-util-bar"
                            style={{
                              width: `${Math.min(r.utilization, 100)}%`,
                              background: r.isOverloaded ? 'var(--color-danger)' : r.utilization > 80 ? '#f59e0b' : 'var(--color-success)',
                            }}
                          />
                        </div>
                        <span className={`opt-util-pct ${r.isOverloaded ? 'text-danger' : ''}`}>{r.utilization}%</span>
                        <span className="opt-util-detail">{r.workload}/{r.capacity}h</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Apply button */}
                {currentResult.status === 'completed' && !currentResult.isApplied && (
                  <button className="btn btn-primary opt-apply-btn" onClick={() => handleApply(currentResult._id)}>
                    <HiOutlineCheckCircle /> Áp dụng kết quả phân bổ
                  </button>
                )}
                {currentResult.isApplied && (
                  <div className="opt-applied-badge">✅ Đã áp dụng</div>
                )}
              </div>
            ) : (
              <div className="empty-state card">
                <div className="empty-state-icon"><HiOutlineLightningBolt /></div>
                <h3 className="empty-state-title">Sẵn sàng tối ưu hóa</h3>
                <p className="empty-state-text">Chọn thuật toán, điều chỉnh tham số rồi nhấn "Chạy" để bắt đầu.</p>
              </div>
            )
          ) : (
            /* History Tab */
            <div className="opt-history card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h4>Lịch sử tối ưu hóa</h4>
                <button className="btn btn-secondary" onClick={loadHistory}><HiOutlineRefresh /></button>
              </div>
              {history.length === 0 ? (
                <p className="empty-state-text">Chưa có lần chạy nào.</p>
              ) : (
                <div className="opt-history-list">
                  {history.map((h) => (
                    <button key={h._id} className="opt-history-item" onClick={() => viewResult(h._id)}>
                      <div className="opt-history-algo">
                        {h.algorithm === 'genetic' ? '🧬' : h.algorithm === 'csp' ? '🔗' : '⚡'} {h.algorithm.toUpperCase()}
                      </div>
                      <div className="opt-history-info">
                        <span>Fitness: {h.fitness || '—'}</span>
                        <span>{h.taskCount} tasks / {h.resourceCount} resources</span>
                        <span>{formatTime(h.executionTime || 0)}</span>
                      </div>
                      <div className={`opt-history-status status-${h.status}`}>
                        {STATUS_LABELS[h.status]}
                      </div>
                      <div className="opt-history-date">
                        {new Date(h.createdAt).toLocaleString('vi-VN')}
                      </div>
                      {h.isApplied && <span className="opt-history-applied">✅</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
