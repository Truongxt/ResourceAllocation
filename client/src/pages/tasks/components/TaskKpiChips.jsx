import MetricStrip from '../../../components/common/MetricStrip';
export default function TaskKpiChips({ stats, t }) {
  return <div className="metric-strip-compact"><MetricStrip items={[
    { label: t('nav.tasks'), value: stats.total || 0 },
    { label: t('enums.taskStatus.in_progress'), value: stats.inProgress || 0 },
    { label: t('enums.taskStatus.done'), value: stats.done || 0 },
    { label: t('enums.taskStatus.blocked'), value: stats.blocked || 0, danger: stats.blocked > 0 },
  ]} /></div>;
}
