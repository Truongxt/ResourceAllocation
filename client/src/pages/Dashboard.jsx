import {
  HiOutlineFolder,
  HiOutlineClipboardList,
  HiOutlineUserGroup,
  HiOutlineLightningBolt,
  HiOutlineTrendingUp,
  HiOutlineExclamation,
} from 'react-icons/hi';
import './Dashboard.css';

export default function Dashboard() {
  // Demo data - will be replaced with API calls
  const stats = [
    {
      id: 'total-projects',
      label: 'Dự án đang hoạt động',
      value: '12',
      change: '+2 tuần này',
      changeType: 'positive',
      icon: HiOutlineFolder,
      color: 'primary',
    },
    {
      id: 'total-tasks',
      label: 'Công việc đang chạy',
      value: '48',
      change: '8 hoàn thành hôm nay',
      changeType: 'positive',
      icon: HiOutlineClipboardList,
      color: 'accent',
    },
    {
      id: 'total-resources',
      label: 'Nhân sự hoạt động',
      value: '36',
      change: '85% utilization',
      changeType: 'positive',
      icon: HiOutlineUserGroup,
      color: 'success',
    },
    {
      id: 'overloaded',
      label: 'Nhân sự quá tải',
      value: '5',
      change: 'Cần tối ưu hóa',
      changeType: 'negative',
      icon: HiOutlineExclamation,
      color: 'danger',
    },
  ];

  return (
    <div className="dashboard animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Tổng quan hệ thống quản lý nguồn lực và phân bổ nhân sự
        </p>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-stats">
        {stats.map((stat, index) => (
          <div
            key={stat.id}
            className={`stat-card stat-card-${stat.color}`}
            style={{ animationDelay: `${index * 80}ms` }}
            id={stat.id}
          >
            <div className="stat-card-header">
              <div className={`stat-icon stat-icon-${stat.color}`}>
                <stat.icon />
              </div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-change ${stat.changeType}`}>
              {stat.changeType === 'positive' ? (
                <HiOutlineTrendingUp />
              ) : (
                <HiOutlineExclamation />
              )}
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚡ Hành động nhanh</h3>
          </div>
          <div className="dashboard-actions">
            <button className="btn btn-primary btn-lg" id="btn-new-project">
              <HiOutlineFolder /> Tạo dự án mới
            </button>
            <button className="btn btn-accent btn-lg" id="btn-run-optimization">
              <HiOutlineLightningBolt /> Chạy tối ưu hóa
            </button>
            <button className="btn btn-secondary btn-lg" id="btn-add-resource">
              <HiOutlineUserGroup /> Thêm nhân sự
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 Hoạt động gần đây</h3>
          </div>
          <div className="dashboard-activity">
            <div className="activity-item">
              <div className="activity-dot active"></div>
              <div className="activity-content">
                <span className="activity-text">Dự án <strong>Website Redesign</strong> được tạo</span>
                <span className="activity-time">2 phút trước</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <div className="activity-content">
                <span className="activity-text">Phân bổ tối ưu cho <strong>Sprint 12</strong> hoàn tất</span>
                <span className="activity-time">15 phút trước</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <div className="activity-content">
                <span className="activity-text"><strong>Nguyễn Văn A</strong> hoàn thành task API Integration</span>
                <span className="activity-time">1 giờ trước</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot warning"></div>
              <div className="activity-content">
                <span className="activity-text">Cảnh báo: <strong>3 nhân sự</strong> đang bị quá tải</span>
                <span className="activity-time">2 giờ trước</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Utilization Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📊 Tổng quan Utilization</h3>
          <span className="badge badge-primary">Tuần này</span>
        </div>
        <div className="utilization-bars">
          {[
            { name: 'Frontend Team', value: 82, status: 'good' },
            { name: 'Backend Team', value: 95, status: 'danger' },
            { name: 'DevOps Team', value: 67, status: 'good' },
            { name: 'QA Team', value: 45, status: 'low' },
            { name: 'Design Team', value: 88, status: 'warning' },
          ].map((team) => (
            <div key={team.name} className="utilization-item">
              <div className="utilization-info">
                <span className="utilization-name">{team.name}</span>
                <span className={`utilization-value utilization-${team.status}`}>
                  {team.value}%
                </span>
              </div>
              <div className="utilization-bar">
                <div
                  className={`utilization-fill utilization-fill-${team.status}`}
                  style={{ width: `${team.value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
