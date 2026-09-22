import React from 'react';
import { Card, Progress, Tag, Tooltip } from 'antd';
import {
  ProjectOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  DashboardOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

export default function DashboardKpiCards({ proj = {}, task = {}, res = {}, t }) {
  const activeProjects = proj.active || 0;
  const totalProjects = proj.total || 0;
  const avgProgress = Math.round(proj.avgProgress || 0);

  const runningTasks = (task.inProgress || 0) + (task.review || 0);
  const doneTasks = task.done || 0;
  const totalTasks = task.total || 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const totalResources = res.total || 0;
  const availableResources = res.available || 0;
  const overloadedCount = res.overloaded || 0;

  const avgUtilization = Math.round(res.avgUtilization || 0);
  const totalWorkload = Math.round(res.totalWorkload || 0);
  const totalCapacity = Math.round(res.totalCapacity || 0);

  const cards = [
    {
      id: 'projects',
      title: t('dashboard.activeProjects'),
      value: activeProjects,
      suffix: '',
      icon: <ProjectOutlined />,
      colorClass: 'kpi-icon-blue',
      badge: (
        <span className="kpi-chip kpi-chip-neutral">
          {totalProjects} {t('workspace.projectTotal', { count: totalProjects }).replace(/[0-9]/g, '').trim() || 'dự án'}
        </span>
      ),
      subtext: (
        <div className="kpi-subrow">
          <span className="kpi-subtext-muted">Tiến độ TB: <strong>{avgProgress}%</strong></span>
          <Progress
            percent={avgProgress}
            showInfo={false}
            size="small"
            strokeColor="#3b82f6"
            railColor="var(--border-subtle)"
            className="kpi-mini-bar"
          />
        </div>
      ),
    },
    {
      id: 'tasks',
      title: t('dashboard.runningTasks'),
      value: runningTasks,
      suffix: '',
      icon: <ThunderboltOutlined />,
      colorClass: 'kpi-icon-indigo',
      badge: (
        <span className="kpi-chip kpi-chip-success">
          <CheckCircleOutlined style={{ marginRight: 3 }} />
          {doneTasks} {t('workspace.taskDone', { count: doneTasks }).replace(/[0-9]/g, '').trim() || 'hoàn thành'}
        </span>
      ),
      subtext: (
        <div className="kpi-subrow">
          <span className="kpi-subtext-muted">Tỷ lệ xong: <strong>{taskCompletionRate}%</strong></span>
          <Progress
            percent={taskCompletionRate}
            showInfo={false}
            size="small"
            strokeColor="#10b981"
            railColor="var(--border-subtle)"
            className="kpi-mini-bar"
          />
        </div>
      ),
    },
    {
      id: 'resources',
      title: t('reports.stats.totalResources'),
      value: totalResources,
      suffix: '',
      icon: <TeamOutlined />,
      colorClass: 'kpi-icon-emerald',
      badge: overloadedCount > 0 ? (
        <span className="kpi-chip kpi-chip-danger">
          <ExclamationCircleOutlined style={{ marginRight: 3 }} />
          {overloadedCount} quá tải
        </span>
      ) : (
        <span className="kpi-chip kpi-chip-success">
          <CheckCircleOutlined style={{ marginRight: 3 }} />
          Tải ổn định
        </span>
      ),
      subtext: (
        <div className="kpi-subrow">
          <span className="kpi-subtext-muted">
            Sẵn sàng: <strong>{availableResources}/{totalResources}</strong> nhân sự
          </span>
          <Progress
            percent={totalResources > 0 ? Math.round((availableResources / totalResources) * 100) : 0}
            showInfo={false}
            size="small"
            strokeColor="#10b981"
            railColor="var(--border-subtle)"
            className="kpi-mini-bar"
          />
        </div>
      ),
    },
    {
      id: 'utilization',
      title: t('workspace.capacityUsed'),
      value: avgUtilization,
      suffix: '%',
      icon: <DashboardOutlined />,
      colorClass: avgUtilization > 100 ? 'kpi-icon-rose' : avgUtilization >= 75 ? 'kpi-icon-amber' : 'kpi-icon-sky',
      badge: avgUtilization > 100 ? (
        <span className="kpi-chip kpi-chip-danger">Quá tải</span>
      ) : avgUtilization >= 75 ? (
        <span className="kpi-chip kpi-chip-warning">Tải cao</span>
      ) : (
        <span className="kpi-chip kpi-chip-info">Khả dụng</span>
      ),
      subtext: (
        <div className="kpi-subrow">
          <span className="kpi-subtext-muted">
            Đã gán: <strong>{totalWorkload}</strong> / {totalCapacity}h
          </span>
          <Progress
            percent={Math.min(avgUtilization, 100)}
            showInfo={false}
            size="small"
            strokeColor={avgUtilization > 100 ? '#ef4444' : avgUtilization >= 75 ? '#f59e0b' : '#0ea5e9'}
            railColor="var(--border-subtle)"
            className="kpi-mini-bar"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard-kpi-grid">
      {cards.map((card) => (
        <div key={card.id} className="dashboard-kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-title">{card.title}</span>
            <div className={`kpi-card-icon-box ${card.colorClass}`}>
              {card.icon}
            </div>
          </div>
          <div className="kpi-card-body">
            <div className="kpi-value-row">
              <span className="kpi-number">
                {card.value}
                {card.suffix && <span className="kpi-suffix">{card.suffix}</span>}
              </span>
              {card.badge}
            </div>
            {card.subtext}
          </div>
        </div>
      ))}
    </div>
  );
}
