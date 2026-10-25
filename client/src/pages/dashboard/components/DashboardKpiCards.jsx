import React from 'react';
import { Progress } from 'antd';
import {
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
      title: t('dashboard.activeProjects') || 'Dự án đang thực hiện',
      value: activeProjects,
      suffix: '',
      badge: (
        <span className="kpi-chip kpi-chip-neutral">
          {totalProjects} {t('workspace.projectTotal', { count: totalProjects }).replace(/[0-9]/g, '').trim() || 'dự án'}
        </span>
      ),
      subtext: (
        <div className="kpi-subrow">
          <span className="kpi-subtext-muted">Tiến độ trung bình <strong>{avgProgress}%</strong></span>
          <Progress
            percent={avgProgress}
            showInfo={false}
            size="small"
            strokeColor="var(--brand-primary)"
            railColor="var(--border-subtle)"
            className="kpi-mini-bar"
          />
        </div>
      ),
    },
    {
      id: 'tasks',
      title: t('dashboard.runningTasks') || 'Công việc đang xử lý',
      value: runningTasks,
      suffix: '',
      badge: (
        <span className="kpi-chip kpi-chip-neutral">
          {doneTasks} {t('workspace.taskDone', { count: doneTasks }).replace(/[0-9]/g, '').trim() || 'hoàn tất'}
        </span>
      ),
      subtext: (
        <div className="kpi-subrow">
          <span className="kpi-subtext-muted">Tỷ lệ xong <strong>{taskCompletionRate}%</strong></span>
          <Progress
            percent={taskCompletionRate}
            showInfo={false}
            size="small"
            strokeColor="var(--status-success)"
            railColor="var(--border-subtle)"
            className="kpi-mini-bar"
          />
        </div>
      ),
    },
    {
      id: 'resources',
      title: t('reports.stats.totalResources') || 'Nguồn lực nhân sự',
      value: totalResources,
      suffix: '',
      badge: overloadedCount > 0 ? (
        <span className="kpi-chip kpi-chip-danger">
          <ExclamationCircleOutlined style={{ marginRight: 4 }} />
          {overloadedCount} quá tải
        </span>
      ) : (
        <span className="kpi-chip kpi-chip-success">
          <CheckCircleOutlined style={{ marginRight: 4 }} />
          Tải ổn định
        </span>
      ),
      subtext: (
        <div className="kpi-subrow">
          <span className="kpi-subtext-muted">
            Sẵn sàng <strong>{availableResources}/{totalResources}</strong> nhân sự
          </span>
          <Progress
            percent={totalResources > 0 ? Math.round((availableResources / totalResources) * 100) : 0}
            showInfo={false}
            size="small"
            strokeColor="var(--status-success)"
            railColor="var(--border-subtle)"
            className="kpi-mini-bar"
          />
        </div>
      ),
    },
    {
      id: 'utilization',
      title: t('workspace.capacityUsed') || 'Công suất điều phối',
      value: avgUtilization,
      suffix: '%',
      badge: avgUtilization > 100 ? (
        <span className="kpi-chip kpi-chip-danger">Quá tải</span>
      ) : avgUtilization >= 75 ? (
        <span className="kpi-chip kpi-chip-warning">Tải cao</span>
      ) : (
        <span className="kpi-chip kpi-chip-neutral">Cân bằng</span>
      ),
      subtext: (
        <div className="kpi-subrow">
          <span className="kpi-subtext-muted">
            Đã giao <strong>{totalWorkload}</strong> / {totalCapacity}h
          </span>
          <Progress
            percent={Math.min(avgUtilization, 100)}
            showInfo={false}
            size="small"
            strokeColor={avgUtilization > 100 ? 'var(--status-danger)' : avgUtilization >= 75 ? 'var(--status-warning)' : 'var(--brand-primary)'}
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
            {card.badge}
          </div>
          <div className="kpi-card-body">
            <div className="kpi-value-row">
              <span className="kpi-number">
                {card.value}
                {card.suffix && <span className="kpi-suffix">{card.suffix}</span>}
              </span>
            </div>
            {card.subtext}
          </div>
        </div>
      ))}
    </div>
  );
}
