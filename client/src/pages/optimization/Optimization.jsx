/**
 * ============================================================================
 * TRANG TỐI ƯU HÓA PHÂN BỔ NGUỒN LỰC (Resource Allocation & Optimization Page)
 * ============================================================================
 *
 * Mục đích:
 *   - Trung tâm điều hành tối ưu hóa nguồn lực dự án bằng các giải thuật AI/OR:
 *     1. Genetic Algorithm (GA) - Giải thuật Di truyền đa mục tiêu
 *     2. Constraint Satisfaction Problem (CSP) - Bài toán Thỏa mãn Ràng buộc
 *     3. Hybrid (CSP + GA) - Kết hợp CSP thu hẹp không gian nghiệm và GA tìm lời giải tối ưu
 *
 * Cấu trúc các module con:
 *   - OptimizationConfigCard: Panel cấu hình tham số giải thuật bên trái
 *   - OptimizationResultView: Hiển thị kết quả chi tiết, biểu đồ hội tụ, Áp dụng / Hoàn tác
 *   - OptimizationHistoryTable: Bảng lịch sử các đợt chạy và chọn đa phương án
 *   - OptimizationCompareView: Bảng so sánh đối sánh (Benchmark Studio) giữa các thuật toán
 *   - OptimizationConstants: Hằng số và hàm format dùng chung
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col, Tabs, Typography, message, Button } from 'antd';
import {
  ThunderboltOutlined,
  HistoryOutlined,
  ExperimentOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import optimizationService from '../../services/optimizationService';
import projectService from '../../services/projectService';
import OptimizationConfigCard from '../../components/optimization/OptimizationConfigCard';
import OptimizationResultView from '../../components/optimization/OptimizationResultView';
import OptimizationHistoryTable from '../../components/optimization/OptimizationHistoryTable';
import OptimizationCompareView from '../../components/optimization/OptimizationCompareView';
import './Optimization.css';

const { Title, Text } = Typography;

export default function Optimization() {
  const { t } = useTranslation();
  const { user, hasAppAccess } = useAuth();
  const canAccess = Boolean(hasAppAccess ? hasAppAccess('optimize') : (user?.isOwner || user?.role === 'admin' || user?.appAdmins?.includes('optimize')));

  // --- TRẠNG THÁI CẤU HÌNH THUẬT TOÁN ---
  const [algorithm, setAlgorithm] = useState('genetic');
  const [projects, setProjects] = useState([]);
  const [params, setParams] = useState({
    projectId: '',
    populationSize: 100,
    maxGenerations: 500,
    crossoverRate: 0.8,
    mutationRate: 0.1,
    workloadWeight: 0.3,
    skillWeight: 0.35,
    costWeight: 0.15,
    overallocationWeight: 0.2,
  });

  // --- TRẠNG THÁI THỰC THI & KẾT QUẢ ---
  const [running, setRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('result');

  // --- TRẠNG THÁI SO SÁNH ĐỐI SÁNH (BENCHMARK) ---
  const [selectedIds, setSelectedIds] = useState([]);
  const [benchmark, setBenchmark] = useState(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  // --- TRẠNG THÁI TIỀN KIỂM TRA (READINESS / PREFLIGHT) ---
  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  /**
   * Tải danh sách dự án cho bộ lọc
   */
  const loadProjects = useCallback(async () => {
    try {
      const res = await projectService.getAll({ limit: 100 });
      setProjects(res.data.data.projects || []);
    } catch {
      // Bỏ qua lỗi kết nối ban đầu
    }
  }, []);

  /**
   * Tải danh sách lịch sử các đợt chạy tối ưu
   */
  const loadHistory = useCallback(async () => {
    try {
      const res = await optimizationService.getHistory();
      setHistory(res.data.data.results || []);
    } catch {
      // Bỏ qua lỗi kết nối ban đầu
    }
  }, []);

  /**
   * Tải dữ liệu trạng thái sẵn sàng (Pre-flight readiness)
   */
  const loadReadiness = useCallback(async () => {
    setReadinessLoading(true);
    try {
      const res = await optimizationService.getReadiness(params.projectId || undefined);
      setReadiness(res.data?.data || null);
    } catch {
      // Bỏ qua lỗi kết nối
    } finally {
      setReadinessLoading(false);
    }
  }, [params.projectId]);

  useEffect(() => {
    loadProjects();
    loadHistory();
  }, [loadProjects, loadHistory]);

  useEffect(() => {
    loadReadiness();
  }, [loadReadiness]);

  /**
   * Xem lại chi tiết một kết quả từ lịch sử
   */
  const handleViewResult = async (id) => {
    try {
      const res = await optimizationService.getById(id);
      const opt = res.data?.data?.optimization || res.data?.data;
      setCurrentResult(opt);
      setActiveTab('result');
    } catch {
      message.error(t('optimization.loadError') || 'Không thể tải chi tiết kết quả');
    }
  };

  /**
   * Kích hoạt chạy thuật toán tối ưu hóa
   */
  const handleRun = async () => {
    setRunning(true);
    try {
      const payload = {
        algorithm,
        projectId: params.projectId || undefined,
        config: {
          populationSize: params.populationSize,
          generations: params.maxGenerations,
          crossoverRate: params.crossoverRate,
          mutationRate: params.mutationRate,
          weights: {
            workloadBalance: params.workloadWeight,
            skillMatch: params.skillWeight,
            cost: params.costWeight,
            overallocation: params.overallocationWeight,
          },
        },
      };

      const res = await optimizationService.run(payload);
      const resultData = res.data?.data?.result || res.data?.data?.optimization || res.data?.data;
      setCurrentResult(resultData);
      setActiveTab('result');
      message.success(t('optimization.runSuccess') || 'Chạy thuật toán tối ưu hóa thành công!');
      loadHistory();
      loadReadiness();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || t('optimization.runFailed') || 'Chạy thuật toán thất bại';
      message.error(errorMsg);
    } finally {
      setRunning(false);
    }
  };

  /**
   * Áp dụng phương án phân bổ vào hệ thống thực
   */
  const handleApply = async (id) => {
    try {
      await optimizationService.apply(id);
      message.success(t('optimization.applySuccess') || 'Đã áp dụng kết quả phân bổ vào hệ thống');
      loadHistory();
      loadReadiness();
      if (currentResult && currentResult._id === id) {
        setCurrentResult((prev) => ({ ...prev, isApplied: true, isRolledBack: false }));
      }
    } catch {
      message.error(t('optimization.applyFailed') || 'Lỗi khi áp dụng kết quả phân bổ');
    }
  };

  /**
   * Hoàn tác phân bổ (Rollback Allocation)
   */
  const handleRollback = async (id) => {
    try {
      const res = await optimizationService.rollbackResult(id);
      message.success(res.data?.message || 'Đã hoàn tác phân bổ thành công');
      loadHistory();
      loadReadiness();
      if (currentResult && currentResult._id === id) {
        setCurrentResult((prev) => ({ ...prev, isApplied: false, isRolledBack: true }));
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi hoàn tác phân bổ');
    }
  };

  /**
   * Kích hoạt so sánh đối sánh giữa các phương án đã chọn
   */
  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      message.warning(t('optimization.selectAtLeastTwo') || 'Vui lòng chọn ít nhất 2 phương án để so sánh');
      return;
    }
    setBenchmarkLoading(true);
    try {
      const res = await optimizationService.compare(selectedIds);
      setBenchmark(res.data.data);
      setActiveTab('benchmark');
    } catch (err) {
      message.error(err.response?.data?.message || t('optimization.compareFailed') || 'Lỗi khi so sánh đối sánh');
    } finally {
      setBenchmarkLoading(false);
    }
  };

  if (!canAccess) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card-bg, #1e293b)', borderRadius: 12, margin: '40px auto', maxWidth: 640 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16 }}>
          <LockOutlined />
        </div>
        <Title level={3} style={{ marginBottom: 8, color: 'var(--text-primary)' }}>
          Chưa được cấp quyền Base Optimize+
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
          Tài khoản của bạn chưa được cấp quyền Quản trị ứng dụng (App Admin) cho phân hệ <strong>Base Optimize+</strong>. Vui lòng liên hệ Quản trị viên cấp cao (Owner) để được cấp quyền sử dụng.
        </Text>
        <Button type="primary" size="large" onClick={() => { window.location.href = '/dashboard'; }} style={{ background: '#2563eb' }}>
          Quay lại Tổng quan Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Tiêu đề trang */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          {t('optimization.title') || 'Tối Ưu Hóa Nguồn Lực'}
        </Title>
        <Text type="secondary">
          {t('optimization.subtitle') || 'Tự động phân công công việc thông minh dựa trên GA, CSP và Hybrid'}
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Cột trái: Panel cấu hình tham số */}
        <Col xs={24} lg={8}>
          <OptimizationConfigCard
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            params={params}
            setParams={setParams}
            projects={projects}
            running={running}
            onRun={handleRun}
            t={t}
          />
        </Col>

        {/* Cột phải: Các tab kết quả, lịch sử và so sánh */}
        <Col xs={24} lg={16}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            items={[
              {
                key: 'result',
                label: (
                  <span>
                    <ThunderboltOutlined /> {t('optimization.tabs.result') || 'Kết quả hiện tại'}
                  </span>
                ),
                children: (
                  <OptimizationResultView
                    currentResult={currentResult}
                    onApply={handleApply}
                    onRollback={handleRollback}
                    readiness={readiness}
                    readinessLoading={readinessLoading}
                    onRun={handleRun}
                    running={running}
                    algorithm={algorithm}
                    projectName={projects.find((p) => p._id === params.projectId)?.name || ''}
                    t={t}
                  />
                ),
              },
              {
                key: 'history',
                label: (
                  <span>
                    <HistoryOutlined /> {t('optimization.tabs.history') || 'Lịch sử chạy'}
                  </span>
                ),
                children: (
                  <OptimizationHistoryTable
                    history={history}
                    selectedIds={selectedIds}
                    setSelectedIds={setSelectedIds}
                    onViewResult={handleViewResult}
                    onApply={handleApply}
                    onRollback={handleRollback}
                    onCompare={handleCompare}
                    benchmarkLoading={benchmarkLoading}
                    onReload={loadHistory}
                    t={t}
                  />
                ),
              },
              {
                key: 'benchmark',
                label: (
                  <span>
                    <ExperimentOutlined /> {t('optimization.tabs.benchmark') || 'So sánh đối sánh'}
                    {benchmark ? ` (${benchmark.results?.length || 0})` : ''}
                  </span>
                ),
                children: (
                  <OptimizationCompareView
                    benchmark={benchmark}
                    loading={benchmarkLoading}
                    t={t}
                  />
                ),
              },
            ]}
          />
        </Col>
      </Row>
    </div>
  );
}
