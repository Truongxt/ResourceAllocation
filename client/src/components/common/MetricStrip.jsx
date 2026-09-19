/** Compact context above a working view. Color is reserved for exceptions. */
export default function MetricStrip({ items, label }) {
  return (
    <dl className="metric-strip" aria-label={label}>
      {items.map(({ label: title, value, danger, detail }) => (
        <div className="metric-strip-item" key={title}>
          <dt>{title}</dt>
          <dd className={danger ? 'metric-danger' : undefined}>{value}</dd>
          {detail && <span className="metric-detail">{detail}</span>}
        </div>
      ))}
    </dl>
  );
}
