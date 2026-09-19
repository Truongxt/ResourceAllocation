import React from 'react';
import { Link } from 'react-router-dom';
import { Empty, Tag, Tooltip, Avatar } from 'antd';
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  StopOutlined,
  UserAddOutlined,
  FireOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  HistoryOutlined,
  FolderOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { taskStatusLabel, priorityLabel } from '../../../i18n/enums';
import { formatTimeAgo } from '../../../i18n/format';

const STATUS_TAG_MAP = {
  todo: { color: 'default', bg: '#f1f5f9', text: '#475569' },
  in_progress: { color: 'processing', bg: '#eff6ff', text: '#2563eb' },
  review: { color: 'warning', bg: '#fffbeb', text: '#d97706' },
  done: { color: 'success', bg: '#ecfdf5', text: '#059669' },
  blocked: { color: 'error', bg: '#fef2f2', text: '#dc2626' },
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  if (!name) return '#94a3b8';
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function DashboardQuickAndRecent({
  task = {},
  res = {},
  recentTasks = [],
  user,
  t,
}) {
  const triageItems = [
    {
      key: 'overdue',
      title: t('workspace.overdue'),
      hint: t('workspace.overdueHint'),
      count: task.overdue || 0,
      to: '/tasks?timeFilter=overdue',
      icon: <ClockCircleOutlined />,
      danger: true,
      accentColor: '#ef4444',
      bgActive: 'rgba(239, 68, 68, 0.06)',
    },
    {
      key: 'blocked',
      title: t('workspace.blocked'),
      hint: t('workspace.blockedHint'),
      count: task.blocked || 0,
      to: '/tasks?status=blocked',
      icon: <StopOutlined />,
      danger: (task.blocked || 0) > 0,
      accentColor: '#f59e0b',
      bgActive: 'rgba(245, 158, 11, 0.06)',
    },
    {
      key: 'unassigned',
      title: t('workspace.unassigned'),
      hint: t('workspace.unassignedHint'),
      count: task.unassigned || 0,
      to: '/tasks?unassigned=true',
      icon: <UserAddOutlined />,
      danger: false,
      accentColor: '#3b82f6',
      bgActive: 'rgba(59, 130, 246, 0.06)',
    },
    ...(user?.role !== 'member'
      ? [
          {
            key: 'overloaded',
            title: t('workspace.overloaded'),
            hint: t('workspace.overloadedHint'),
            count: res.overloaded || 0,
            to: '/resources?workload=overloaded',
            icon: <FireOutlined />,
            danger: (res.overloaded || 0) > 0,
            accentColor: '#ef4444',
            bgActive: 'rgba(239, 68, 68, 0.06)',
          },
        ]
      : []),
  ];

  const totalUrgent = triageItems.reduce((acc, item) => acc + (item.count || 0), 0);

  return (
    <div className="dashboard-work-grid">
      {/* CỘT TRÁI: TRUNG TÂM XỬ LÝ & ĐIỂM NGHẼN */}
      <section className="dashboard-card attention-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-header-left">
            <div
              className={`dashboard-header-icon ${
                totalUrgent > 0 ? 'icon-alert-active' : 'icon-alert-clean'
              }`}
            >
              <AlertOutlined />
            </div>
            <div>
              <h2 className="dashboard-card-title">{t('workspace.attention')}</h2>
              <p className="dashboard-card-subtitle">{t('workspace.attentionHint')}</p>
            </div>
          </div>
          <div className="dashboard-card-header-right">
            {totalUrgent > 0 ? (
              <span className="attention-summary-badge danger">
                {totalUrgent} điểm cần lưu ý
              </span>
            ) : (
              <span className="attention-summary-badge clean">
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                Tất cả ổn định
              </span>
            )}
          </div>
        </div>

        <div className="attention-list">
          {triageItems.map((item) => {
            const hasIssue = item.count > 0;
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`attention-row ${hasIssue ? 'has-issue' : 'is-clean'}`}
                style={{
                  '--accent-color': item.accentColor,
                  '--active-bg': item.bgActive,
                }}
              >
                <div className="attention-icon-wrapper">
                  {item.icon}
                </div>
                <div className="attention-copy">
                  <strong className="attention-row-title">{item.title}</strong>
                  <span className="attention-row-desc">{item.hint}</span>
                </div>
                <div className="attention-action-side">
                  {hasIssue ? (
                    <span className="attention-count-badge danger">
                      {item.count}
                    </span>
                  ) : (
                    <span className="attention-count-badge zero">
                      0
                    </span>
                  )}
                  <ArrowRightOutlined className="attention-arrow" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CỘT PHẢI: HOẠT ĐỘNG CÔNG VIỆC MỚI CẬP NHẬT */}
      <section className="dashboard-card recent-card">
        <div className="dashboard-card-header">
          <div className="dashboard-card-header-left">
            <div className="dashboard-header-icon icon-recent">
              <HistoryOutlined />
            </div>
            <div>
              <h2 className="dashboard-card-title">{t('workspace.recentTasks')}</h2>
              <p className="dashboard-card-subtitle">Cập nhật trạng thái và chỉnh sửa gần nhất</p>
            </div>
          </div>
          <Link to="/tasks" className="dashboard-view-all-link">
            {t('common.viewAll')} <ArrowRightOutlined />
          </Link>
        </div>

        {recentTasks.length > 0 ? (
          <div className="recent-tasks-container">
            {recentTasks.slice(0, 5).map((taskItem) => {
              const assigneeName = taskItem.assignee?.name;
              const projectName = taskItem.project?.name;
              const projectCode = taskItem.project?.code;
              const statusCfg = STATUS_TAG_MAP[taskItem.status] || STATUS_TAG_MAP.todo;

              return (
                <div key={taskItem._id} className="recent-task-row">
                  <Avatar
                    size={32}
                    style={{
                      backgroundColor: getAvatarColor(assigneeName),
                      flexShrink: 0,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {assigneeName ? getInitials(assigneeName) : <UserOutlined />}
                  </Avatar>

                  <div className="recent-task-main">
                    <Link
                      to={`/tasks?taskId=${taskItem._id}`}
                      className="recent-task-title"
                      title={taskItem.title}
                    >
                      {taskItem.title}
                    </Link>
                    <div className="recent-task-meta">
                      {projectName && (
                        <span className="project-chip">
                          <FolderOutlined style={{ marginRight: 3, fontSize: 10 }} />
                          {projectCode ? `[${projectCode}] ` : ''}{projectName}
                        </span>
                      )}
                      <span className="assignee-chip">
                        {assigneeName ? (
                          <>
                            <UserOutlined style={{ marginRight: 3, fontSize: 10 }} />
                            {assigneeName}
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            {t('workspace.unassigned')}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="recent-task-state">
                    <Tag
                      color={statusCfg.color}
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: 11,
                        padding: '1px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {taskStatusLabel(taskItem.status)}
                    </Tag>
                    <span className="recent-task-time">
                      <ClockCircleOutlined style={{ marginRight: 3, fontSize: 10 }} />
                      {formatTimeAgo(taskItem.updatedAt, t)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('dashboard.noActivity')}
            style={{ margin: '40px 0' }}
          />
        )}
      </section>
    </div>
  );
}
