import { useEffect, useState } from 'react';
import { Modal, Button, Space, Tag, Spin } from 'antd';
import { PrinterOutlined, CloseOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../context/AuthContext';
import optimizationService from '../../services/optimizationService';
import './ExecutiveReport.css';

export default function ExecutiveReportModal({ open, onClose, utilData, taskData }) {
  const { user } = useAuth();
  const [optimizations, setOptimizations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      optimizationService
        .getHistory()
        .then((res) => {
          const results = res.data?.data?.results || [];
          setOptimizations(results.slice(0, 4));
        })
        .catch(() => {
          setOptimizations([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open]);

  const handlePrint = () => {
    window.print();
  };

  const reportDate = dayjs().format('DD/MM/YYYY HH:mm');
  const reportCode = `RAO-REP-${dayjs().format('YYYYMMDD-HHmm')}`;

  const resources = utilData?.resources || [];
  const projects = taskData?.byProject || [];
  const hours = taskData?.hours || { estimated: 0, actual: 0, efficiency: 0 };
  const summary = utilData?.summary || { totalResources: 0, overloaded: 0, highBurnout: 0, avgUtilization: 0 };

  const totalTasks = (taskData?.byStatus || []).reduce((sum, s) => sum + (s.count || 0), 0);
  const doneTasks = (taskData?.byStatus || []).find((s) => s._id === 'done')?.count || 0;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={980}
      footer={null}
      destroyOnClose
      styles={{ body: { padding: 0 } }}
    >
      {/* Action Bar (Not visible in print) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
        }}
      >
        <Space>
          <FilePdfOutlined style={{ color: '#4f46e5', fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            Báo Cáo Tổng Hợp Dự Án & Phân Bổ Nguồn Lực
          </span>
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              fontWeight: 600,
            }}
          >
            In / Lưu file PDF (A4)
          </Button>
          <Button icon={<CloseOutlined />} onClick={onClose}>
            Đóng
          </Button>
        </Space>
      </div>

      {/* Printable Document Container */}
      <div className="executive-report-wrapper">
        <Spin spinning={loading}>
          <div className="executive-report-document">
            {/* Header */}
            <div className="rep-header">
              <div className="rep-brand">
                <div>
                  <div className="rep-logo-text">RAO STUDIO</div>
                  <div className="rep-subbrand">Resource Allocation & Optimization System</div>
                </div>
                <div className="rep-meta-right">
                  <div><strong>Mã báo cáo:</strong> {reportCode}</div>
                  <div><strong>Thời gian lập:</strong> {reportDate}</div>
                  <div><strong>Người lập:</strong> {user?.name || 'Administrator'} ({user?.role || 'User'})</div>
                </div>
              </div>

              <h1 className="rep-title">BÁO CÁO TỔNG HỢP DỰ ÁN & PHÂN BỔ NGUỒN LỰC</h1>
              <div className="rep-subtitle">
                Đề tài: Ứng dụng Giải thuật Di truyền (GA) và Thỏa mãn Ràng buộc (CSP) trong Tối ưu hóa Phân bổ Nhân sự
              </div>
            </div>

            {/* Section 1: KPIs */}
            <div className="rep-section">
              <div className="rep-section-title">1. Tổng Quan Chỉ Số Hoạt Động (Executive KPIs)</div>
              <div className="rep-kpi-grid">
                <div className="rep-kpi-card">
                  <div className="rep-kpi-label">Tổng nhân sự</div>
                  <div className="rep-kpi-val">{summary.totalResources}</div>
                </div>
                <div className="rep-kpi-card">
                  <div className="rep-kpi-label">Tỷ lệ sử dụng trung bình</div>
                  <div className="rep-kpi-val" style={{ color: summary.avgUtilization > 90 ? '#ef4444' : '#10b981' }}>
                    {summary.avgUtilization}%
                  </div>
                </div>
                <div className="rep-kpi-card">
                  <div className="rep-kpi-label">Tiến độ công việc</div>
                  <div className="rep-kpi-val">
                    {doneTasks}/{totalTasks} ({completionRate}%)
                  </div>
                </div>
                <div className="rep-kpi-card">
                  <div className="rep-kpi-label">Tổng giờ ước tính</div>
                  <div className="rep-kpi-val">{hours.estimated}h</div>
                </div>
              </div>
            </div>

            {/* Section 2: Resource Allocation Matrix */}
            <div className="rep-section">
              <div className="rep-section-title">2. Ma Trận Phân Bổ Tải & Năng Suất Nhân Sự</div>
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Nhân sự</th>
                    <th>Vị trí</th>
                    <th>Phòng ban</th>
                    <th>Định mức (Capacity)</th>
                    <th>Tải thực tế (Workload)</th>
                    <th>Tỷ lệ tải (%)</th>
                    <th>Đánh giá rủi ro</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((r) => (
                    <tr key={r._id}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.position || '—'}</td>
                      <td>{r.department || '—'}</td>
                      <td>{r.capacity}h/tuần</td>
                      <td>{r.workload}h</td>
                      <td>
                        <strong>{r.utilization}%</strong>
                      </td>
                      <td>
                        {r.burnoutRisk === 'high' ? (
                          <Tag color="error">Quá tải (Cao)</Tag>
                        ) : r.burnoutRisk === 'medium' ? (
                          <Tag color="warning">Cảnh báo (Vừa)</Tag>
                        ) : (
                          <Tag color="success">An toàn</Tag>
                        )}
                      </td>
                    </tr>
                  ))}
                  {resources.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>
                        Chưa có dữ liệu nhân sự
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 3: Project Progress */}
            <div className="rep-section">
              <div className="rep-section-title">3. Tiến Độ & Tình Trạng Các Dự Án</div>
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Tên dự án</th>
                    <th>Mã</th>
                    <th>Tổng công việc</th>
                    <th>Đã xong</th>
                    <th>Tổng giờ</th>
                    <th>Tiến độ hoàn thành</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, idx) => (
                    <tr key={idx}>
                      <td><strong>{p.projectName}</strong></td>
                      <td><code>{p.projectCode || '—'}</code></td>
                      <td>{p.count}</td>
                      <td>{p.done}</td>
                      <td>{p.totalHours}h</td>
                      <td>
                        <strong>{Math.round(p.completion || 0)}%</strong>
                      </td>
                    </tr>
                  ))}
                  {projects.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>
                        Chưa có dự án nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 4: Optimization Evaluation */}
            <div className="rep-section">
              <div className="rep-section-title">4. Đánh Giá Thuật Toán Tối Ưu Hóa Phân Bổ (AI Optimization)</div>
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Thuật toán</th>
                    <th>Điểm thích nghi (Fitness)</th>
                    <th>Thời gian giải</th>
                    <th>Số công việc</th>
                    <th>Trạng thái áp dụng</th>
                  </tr>
                </thead>
                <tbody>
                  {optimizations.map((opt) => (
                    <tr key={opt._id}>
                      <td>{dayjs(opt.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                      <td>
                        <strong>{opt.algorithm?.toUpperCase()}</strong>
                      </td>
                      <td>
                        <strong>{(opt.fitness || 0).toFixed(4)}</strong>
                      </td>
                      <td>{opt.executionTime} ms</td>
                      <td>{opt.taskCount} tasks</td>
                      <td>
                        {opt.isApplied ? (
                          <Tag color="cyan">Đã áp dụng</Tag>
                        ) : (
                          <Tag color="default">Chưa áp dụng</Tag>
                        )}
                      </td>
                    </tr>
                  ))}
                  {optimizations.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>
                        Chưa có lịch sử chạy tối ưu hóa
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 5: AI System Assessment */}
            <div className="rep-section">
              <div className="rep-section-title">5. Nhận Xét & Khuyến Nghị Từ Hệ Thống (AI Assessment)</div>
              <div className="rep-assessment-box">
                {summary.overloaded > 0 ? (
                  <p>
                    ⚠️ <strong>Cảnh báo tải trọng:</strong> Phát hiện{' '}
                    <strong>{summary.overloaded} nhân sự</strong> đang trong tình trạng vượt quá định mức
                    cho phép. Khuyến nghị chạy phương án phân bổ cân bằng tải (GA / Hybrid) để dàn đều
                    khối lượng công việc, phòng tránh rủi ro kiệt sức.
                  </p>
                ) : (
                  <p>
                    ✅ <strong>Đánh giá tải trọng tốt:</strong> Không có nhân sự nào bị quá tải nghiêm trọng.
                    Mức độ sử dụng nguồn lực trung bình đạt <strong>{summary.avgUtilization}%</strong>, nằm trong
                    khoảng tối ưu (70% - 85%).
                  </p>
                )}
                <p style={{ marginTop: 8, marginBottom: 0 }}>
                  💡 <strong>Khuyến nghị kế hoạch:</strong> Đối với các công việc thuộc đường găng dự án (CPM Critical Path),
                  cần ưu tiên nhân sự có Level kỹ năng từ Advanced trở lên để đảm bảo tiến độ không bị trì hoãn.
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="rep-signatures">
              <div className="rep-sign-box">
                <div className="rep-sign-title">Người Lập Báo Cáo</div>
                <div className="rep-sign-subtitle">(Ký và ghi rõ họ tên)</div>
                <div className="rep-sign-name">{user?.name || 'Trần Xuân Trường'}</div>
              </div>

              <div className="rep-sign-box">
                <div className="rep-sign-title">Quản Lý Dự Án / GV Hướng Dẫn</div>
                <div className="rep-sign-subtitle">(Ký và xác nhận duyệt)</div>
                <div className="rep-sign-name">Xác nhận duyệt đề tài</div>
              </div>
            </div>
          </div>
        </Spin>
      </div>
    </Modal>
  );
}
