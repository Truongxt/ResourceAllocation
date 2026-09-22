import React from 'react';
import { Link } from 'react-router-dom';
import { Empty, Progress, Tag, Tooltip } from 'antd';
import {
  PieChartOutlined,
  FieldTimeOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';

const STATUS_COLOR_MAP = {
  todo: { color: '#64748b', bg: '#f1f5f9', label: 'Cần làm' },
  in_progress: { color: '#3b82f6', bg: '#eff6ff', label: 'Đang làm' },
  review: { color: '#f59e0b', bg: '#fffbeb', label: 'Đánh giá' },
  done: { color: '#10b981', bg: '#ecfdf5', label: 'Hoàn thành' },
  blocked: { color: '#ef4444', bg: '#fef2f2', label: 'Bị chặn' },
};

export default function DashboardTaskAndHours({
  task = {},
  res = {},
  taskDistribution = [],
  recentOptimizations = [],
  t,
}) {
  const totalTasks = task.total || 0;
  const totalCapacity = Math.round(res.totalCapacity || 0);
  const totalWorkload = Math.round(res.totalWorkload || 0);
  const estimatedHours = Math.round(task.totalEstimatedHours || 0);
  const actualHours = Math.round(task.totalActualHours || 0);
  const avgUtilization = Math.round(res.avgUtilization || 0);

  // Tính phần trăm phân bổ cho multi-segment bar
  const segments = taskDistribution.map((item) => {
    const percent = totalTasks > 0 ? (item.value / totalTasks) * 100 : 0;
    const cfg = STATUS_COLOR_MAP[item.key] || { color: '#94a3b8', label: item.label };
    return {
      key: item.key,
      label: item.label,
      value: item.value,
      percent,
      color: cfg.color,
    };
  });

  const latestOpt = recentOptimizations && recentOptimizations.length > 0 ? recentOptimizations[0] : null;

  return (
    <div className="dashboard-detail-grid">
      {/* KHỐI 1: PHÂN BỔ TRẠNG THÁI CÔNG VIỆC */}
      <section className="dashboard-card distribution-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-header-left">
            <div className="dashboard-header-icon icon-distribution">
              <PieChartOutlined />
            </div>
            <div>
              <h2 className="dashboard-card-title">{t('dashboard.taskDistribution')}</h2>
              <p className="dashboard-card-subtitle">
                Tỷ trọng công việc theo từng giai đoạn xử lý
              </p>
            </div>
          </div>
          <span className="distribution-total-badge">
            {totalTasks} công việc
          </span>
        </div>

        {totalTasks > 0 ? (
          <div className="distribution-content">
            {/* Multi-segment combined progress bar */}
            <div className="distribution-multi-bar" title="Tổng hợp phân bổ trạng thái">
              {segments.map((seg) => {
                if (seg.percent <= 0) return null;
                return (
                  <Tooltip
                    key={seg.key}
                    title={`${seg.label}: ${seg.value} việc (${Math.round(seg.percent)}%)`}
                  >
                    <div
                      className="multi-bar-segment"
                      style={{
                        width: `${seg.percent}%`,
                        backgroundColor: seg.color,
                      }}
                    />
                  </Tooltip>
                );
              })}
            </div>

            {/* Chi tiết từng trạng thái */}
            <div className="distribution-rows-list">
              {segments.map((seg) => {
                const percentInt = Math.round(seg.percent);
                return (
                  <Link
                    key={seg.key}
                    to={`/tasks?status=${seg.key}`}
                    className="distribution-item-row"
                  >
                    <div className="dist-label-side">
                      <span
                        className="dist-color-dot"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="dist-label-text">{seg.label}</span>
                    </div>

                    <div className="dist-progress-side">
                      <Progress
                        percent={percentInt}
                        showInfo={false}
                        strokeColor={seg.color}
                        railColor="var(--border-subtle)"
                        size="small"
                      />
                    </div>

                    <div className="dist-metrics-side">
                      <span className="dist-count">{seg.value}</span>
                      <span className="dist-percent">({percentInt}%)</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('dashboard.noTasks')}
            style={{ margin: '36px 0' }}
          />
        )}
      </section>

      {/* KHỐI 2: CÂN ĐỐI GIỜ CÔNG & NĂNG LỰC */}
      <section className="dashboard-card hours-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-header-left">
            <div className="dashboard-header-icon icon-hours">
              <FieldTimeOutlined />
            </div>
            <div>
              <h2 className="dashboard-card-title">{t('dashboard.workHours')}</h2>
              <p className="dashboard-card-subtitle">
                So sánh khối lượng công việc thực tế và công suất đội ngũ
              </p>
            </div>
          </div>
          <span
            className={`hours-utilization-badge ${
              avgUtilization > 100
                ? 'danger'
                : avgUtilization >= 75
                ? 'warning'
                : 'normal'
            }`}
          >
            {avgUtilization}% công suất
          </span>
        </div>

        <div className="hours-content">
          {/* Thanh công suất tổng */}
          <div className="hours-capacity-bar-box">
            <div className="capacity-bar-header">
              <span className="capacity-bar-label">Mức độ sử dụng tải đội ngũ</span>
              <span className="capacity-bar-value">
                {totalWorkload} / {totalCapacity} giờ
              </span>
            </div>
            <Progress
              percent={Math.min(avgUtilization, 100)}
              showInfo={false}
              strokeColor={
                avgUtilization > 100
                  ? '#ef4444'
                  : avgUtilization >= 75
                  ? '#f59e0b'
                  : '#10b981'
              }
              railColor="var(--border-subtle)"
            />
          </div>

          {/* Lưới 4 chỉ số giờ công */}
          <div className="hours-metrics-grid">
            <div className="hours-metric-tile">
              <span className="tile-label">{t('dashboard.estimated')}</span>
              <span className="tile-number">{estimatedHours}h</span>
              <span className="tile-hint">Dự kiến hoàn thành</span>
            </div>

            <div className="hours-metric-tile">
              <span className="tile-label">{t('dashboard.actual')}</span>
              <span className="tile-number">{actualHours}h</span>
              <span className="tile-hint">Đã ghi nhận</span>
            </div>

            <div className="hours-metric-tile">
              <span className="tile-label">{t('dashboard.totalCapacity')}</span>
              <span className="tile-number">{totalCapacity}h</span>
              <span className="tile-hint">Khả năng đáp ứng</span>
            </div>

            <div className="hours-metric-tile">
              <span className="tile-label">{t('dashboard.currentWorkload')}</span>
              <span className="tile-number">{totalWorkload}h</span>
              <span className="tile-hint">Đang phân công</span>
            </div>
          </div>

          {/* Nhận định sức khỏe tải đội ngũ */}
          <div
            className={`hours-health-callout ${
              avgUtilization > 100
                ? 'danger'
                : avgUtilization < 50
                ? 'idle'
                : 'healthy'
            }`}
          >
            {avgUtilization > 100 ? (
              <>
                <InfoCircleOutlined className="health-icon" />
                <span>
                  <strong>Cảnh báo quá tải ({avgUtilization}%):</strong> Đội ngũ đang
                  gánh vượt công suất cho phép. Hãy cân nhắc phân bổ lại hoặc giảm tải.
                </span>
              </>
            ) : avgUtilization < 50 ? (
              <>
                <CheckCircleOutlined className="health-icon" />
                <span>
                  <strong>Nhiều dung lượng khả dụng ({100 - avgUtilization}% trống):</strong> Đội ngũ
                  đang sẵn sàng để nhận thêm dự án và nhiệm vụ mới.
                </span>
              </>
            ) : (
              <>
                <CheckCircleOutlined className="health-icon" />
                <span>
                  <strong>Mức tải cân bằng tối ưu ({avgUtilization}%):</strong> Tỷ lệ
                  phân bổ đạt hiệu quả cao mà không gây kiệt sức nhân sự.
                </span>
              </>
            )}
          </div>

          {/* Nếu có lịch sử tối ưu hóa AI gần đây */}
          {latestOpt && (
            <div className="recent-opt-strip">
              <div className="recent-opt-left">
                <ThunderboltOutlined style={{ color: '#8b5cf6', fontSize: 14 }} />
                <span className="recent-opt-text">
                  Tối ưu AI gần nhất: <strong>{latestOpt.algorithm || 'Di truyền (GA)'}</strong>
                  {latestOpt.fitness != null && ` · Độ tối ưu ${Math.round(latestOpt.fitness * 100)}%`}
                </span>
              </div>
              <Link to="/optimization" className="recent-opt-link">
                Xem kế hoạch <ArrowRightOutlined />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
