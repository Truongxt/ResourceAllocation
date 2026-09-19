/** Shared brand mark; colors follow the active application theme. */
export default function AppLogo({ size = 'md', showText = true, subtitle = 'Resource Allocation', style, className = '' }) {
  const pixelSize = typeof size === 'number' ? size : size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  return <div className={'app-brand-logo ' + className} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, ...style }}>
    <div style={{ width: pixelSize, height: pixelSize, minWidth: pixelSize, borderRadius: 6, background: 'var(--brand-primary)', display: 'grid', placeItems: 'center' }}>
      <svg width={Math.round(pixelSize * .58)} height={Math.round(pixelSize * .58)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4L19 8V16L12 20L5 16V8L12 4Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.5" fill="white" />
        <path d="M12 4V9.5M19 8L14.2 10.8M19 16L14.2 13.2M12 20V14.5M5 16L9.8 13.2M5 8L9.8 10.8" stroke="white" strokeWidth="1.25" />
      </svg>
    </div>
    {showText && <div style={{ minWidth: 0, lineHeight: 1.3 }}>
      <span style={{ fontSize: pixelSize >= 36 ? 16 : 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.02em' }}>RAO Studio</span>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>}
    </div>}
  </div>;
}
