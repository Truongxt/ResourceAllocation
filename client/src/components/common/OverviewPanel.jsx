import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Skeleton } from 'antd';
import { BarChartOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { PROJECT_STATUSES, TASK_STATUSES, PRIORITY_OPTIONS } from '../../constants';
import './OverviewPanel.css';

const colors = ['#64748b', '#3b82f6', '#d97706', '#059669', '#dc2626', '#0284c7'];
const number = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

function statusGroups(items, definitions, field = 'status') {
  const groups = definitions.map((definition) => ({ ...definition, value: 0 }));
  for (const item of items) {
    const group = groups.find((entry) => entry.key === item[field]);
    if (group) group.value += 1;
    else {
      let other = groups.find((entry) => entry.key === 'other');
      if (!other) { other = { key: 'other', label: 'overview.other', color: '#64748b', value: 0 }; groups.push(other); }
      other.value += 1;
    }
  }
  return groups;
}

function OverviewPanel({ title, description, loading, error, children }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const id = useId();
  return (
    <section className="overview-panel" aria-label={t(title)}>
      <header className="overview-heading">
        <div><h2><BarChartOutlined aria-hidden="true" /> {t(title)}</h2><p>{description || t('overview.scope')}</p></div>
        <Button type="text" size="small" aria-expanded={expanded} aria-controls={id}
          onClick={() => setExpanded(!expanded)} icon={expanded ? <UpOutlined aria-hidden="true" /> : <DownOutlined aria-hidden="true" />}>
          {t(expanded ? 'overview.collapse' : 'overview.expand')}
        </Button>
      </header>
      {expanded && <div id={id} className="overview-content" aria-busy={loading || false}>
        {loading ? <Skeleton active paragraph={{ rows: 3 }} /> : error
          ? <Alert type="warning" showIcon title={t('overview.error')} /> : children}
      </div>}
    </section>
  );
}

function Distribution({ title, groups, unit }) {
  const { t } = useTranslation();
  const total = groups.reduce((sum, group) => sum + number(group.value), 0);
  let offset = 0;
  return (
    <article className="overview-chart">
      <h3>{t(title)}</h3>
      {!total ? <p className="overview-empty">{t('overview.empty')}</p> : <div className="overview-distribution">
        <div className="overview-ring" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--border-subtle)" strokeWidth="12" />
            {groups.filter((group) => group.value > 0).map((group) => {
              const size = group.value / total * 100;
              const start = offset;
              offset += size;
              return <circle key={group.key} cx="60" cy="60" r="48" fill="none" stroke={group.color}
                strokeWidth="12" pathLength="100" strokeDasharray={`${size} ${100 - size}`}
                strokeDashoffset={-start} transform="rotate(-90 60 60)" />;
            })}
          </svg>
          <div><strong>{total}</strong><span>{t(unit)}</span></div>
        </div>
        <ul className="overview-legend">
          {groups.map((group) => <li key={group.key}>
            <span className="overview-dot" style={{ background: group.color }} aria-hidden="true" />
            <span>{t(group.label)}</span><strong>{group.value}</strong>
            <small>{Math.round(group.value / total * 100)}%</small>
          </li>)}
        </ul>
      </div>}
    </article>
  );
}

function Bars({ title, rows, percent = false, onSelect }) {
  const { t } = useTranslation();
  const max = percent ? 100 : Math.max(1, ...rows.map((row) => number(row.value)));
  return <article className="overview-chart"><h3>{t(title)}</h3>
    {!rows.length ? <p className="overview-empty">{t('overview.empty')}</p> : <ul className="overview-bars">
      {rows.map((row) => <li key={row.key}>
        <div>{onSelect ? <button type="button" onClick={() => onSelect(row.key)}>{row.label}</button> : <span>{row.label}</span>}
          <strong>{number(row.value)}{percent ? '%' : ''}</strong></div>
        <div className="overview-track" aria-hidden="true"><span style={{ width: `${Math.min(100, number(row.value) / max * 100)}%`, background: row.color || '#3b82f6' }} /></div>
      </li>)}
    </ul>}
  </article>;
}

export function ProjectsOverview({ projects = [], total, loading, error, onProject }) {
  const { t } = useTranslation();
  const groups = statusGroups(projects, PROJECT_STATUSES.map((status, index) => ({ key: status.value, label: `enums.projectStatus.${status.value}`, color: colors[index] })));
  const active = projects.filter((project) => !['completed', 'cancelled'].includes(project.status))
    .sort((a, b) => number(a.progress) - number(b.progress)).slice(0, 5);
  return <OverviewPanel title="overview.projects" loading={loading} error={error}
    description={total > projects.length ? t('overview.partialScope', { loaded: projects.length, total }) : undefined}>
    <div className="overview-grid">
      <Distribution title="overview.projectStatus" groups={groups} unit="overview.projectUnit" />
      <Bars title="overview.projectProgress" percent onSelect={onProject}
        rows={active.map((project) => ({ key: project._id, label: project.name, value: Math.min(100, number(project.progress)) }))} />
    </div>
    <p className="overview-note">{t('overview.projectNote')}</p>
  </OverviewPanel>;
}

export function TasksOverview({ tasks = [], total, loading, error }) {
  const { t } = useTranslation();
  const groups = statusGroups(tasks, TASK_STATUSES.map((status) => ({ ...status, label: `enums.taskStatus.${status.key}` })));
  const priorities = statusGroups(tasks, PRIORITY_OPTIONS.map((priority) => ({ key: priority.value, label: `enums.priority.${priority.value}`, color: priority.hex })), 'priority');
  return <OverviewPanel title="overview.tasks" loading={loading} error={error}
    description={total > tasks.length ? t('overview.partialScope', { loaded: tasks.length, total }) : undefined}>
    <div className="overview-grid">
      <Distribution title="overview.taskStatus" groups={groups} unit="overview.taskUnit" />
      <Bars title="overview.priorities" rows={tasks.length ? priorities.map((group) => ({ ...group, label: t(group.label) })) : []} />
    </div>
  </OverviewPanel>;
}

export function ResourcesOverview({ resources = [], loading, error }) {
  const { t } = useTranslation();
  const people = resources.map((person) => {
    const rate = number(person.utilizationRate);
    return { ...person, loadGroup: rate > 100 ? 'overloaded' : rate > 85 ? 'near' : rate >= 60 ? 'balanced' : 'remaining' };
  });
  const loads = statusGroups(people, [
    { key: 'remaining', label: 'overview.remaining', color: '#64748b' },
    { key: 'balanced', label: 'overview.balanced', color: '#059669' },
    { key: 'near', label: 'overview.near', color: '#d97706' },
    { key: 'overloaded', label: 'overview.overloaded', color: '#dc2626' },
  ], 'loadGroup');
  const skills = statusGroups(resources.flatMap((person) => person.skills || []), [
    { key: 'self_assessed', label: 'overview.pending', color: '#d97706' },
    { key: 'approved', label: 'overview.approved', color: '#059669' },
    { key: 'draft', label: 'overview.draft', color: '#64748b' },
  ], 'evaluationStatus');
  return <OverviewPanel title="overview.resources" loading={loading} error={error}>
    <div className="overview-grid">
      <Distribution title="overview.load" groups={loads} unit="overview.peopleUnit" />
      <Distribution title="overview.skills" groups={skills} unit="overview.skillUnit" />
    </div>
    <p className="overview-note">{t('overview.resourceNote')}</p>
  </OverviewPanel>;
}

export function OptimizationOverview({ readiness, loading, error, projectName }) {
  const { t } = useTranslation();
  const total = number(readiness?.totalTasks);
  const unassigned = Math.min(total, number(readiness?.unassignedTasks));
  const groups = [
    { key: 'assigned', label: 'overview.assigned', color: '#3b82f6', value: total - unassigned },
    { key: 'unassigned', label: 'overview.unassigned', color: '#d97706', value: unassigned },
  ];
  return <OverviewPanel title="overview.optimization" description={t('overview.optimizationScope', { name: projectName || t('overview.allProjects') })}
    loading={loading} error={error || !readiness}>
    <div className="overview-grid">
      <Distribution title="overview.assignment" groups={groups} unit="overview.taskUnit" />
      <article className="overview-chart"><h3>{t('overview.inputs')}</h3>
        <dl className="overview-inputs">
          <div><dt>{t('overview.resourcesInput')}</dt><dd>{number(readiness?.totalResources)}</dd></div>
          <div><dt>{t('overview.skillsInput')}</dt><dd>{number(readiness?.skillsCount)}</dd></div>
          <div><dt>{t('overview.hoursInput')}</dt><dd>{Math.round(number(readiness?.totalEstimatedHours) * 10) / 10} h</dd></div>
        </dl>
        <p className="overview-note">{t('overview.hoursNote')}</p>
      </article>
    </div>
  </OverviewPanel>;
}
