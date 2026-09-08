import React from 'react';

/**
 * AppLogo - Biểu tượng thương hiệu Vector chính thức của RAO Studio
 * Thay thế hoàn toàn emoji '⚡' thô sơ bằng Vector SVG hình đa giác kết nối nguồn lực (Resource Allocation Nodes).
 *
 * Props:
 * - size: 'sm' (28px) | 'md' (36px) | 'lg' (44px) | number
 * - showText: boolean (hiển thị chữ "RAO Studio PRO" hay chỉ logo mark)
 * - isDark: boolean (chủ đề màu)
 * - subtitle: string (dòng chữ phụ bên dưới, vd: "Resource Allocation AI")
 */
export default function AppLogo({
  size = 'md',
  showText = true,
  isDark = true,
  subtitle = 'Resource Allocation AI',
  style,
  className = '',
}) {
  const pixelSize = typeof size === 'number' ? size : size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const iconSize = Math.round(pixelSize * 0.58);

  return (
    <div
      className={`app-brand-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: pixelSize >= 36 ? 12 : 8,
        textDecoration: 'none',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Biểu tượng Vector Mark */}
      <div
        style={{
          width: pixelSize,
          height: pixelSize,
          minWidth: pixelSize,
          borderRadius: pixelSize >= 40 ? 12 : pixelSize >= 32 ? 10 : 8,
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDark
            ? '0 0 20px -2px rgba(99, 102, 241, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.35)'
            : '0 4px 14px rgba(99, 102, 241, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Subtle highlight gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Vector SVG Emblem: Interconnected Allocation Network / Dynamic Hexagon */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Connecting energy lines */}
          <path
            d="M12 4L19 8V16L12 20L5 16V8L12 4Z"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.9"
          />
          {/* Inner allocation nodes */}
          <circle cx="12" cy="12" r="2.5" fill="white" />
          <path
            d="M12 4V9.5M19 8L14.2 10.8M19 16L14.2 13.2M12 20V14.5M5 16L9.8 13.2M5 8L9.8 10.8"
            stroke="white"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeOpacity="0.8"
          />
        </svg>
      </div>

      {/* Tên thương hiệu & Badge */}
      {showText && (
        <div style={{ overflow: 'hidden', lineHeight: 1.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: pixelSize >= 40 ? 18 : pixelSize >= 36 ? 16 : 14,
                color: isDark ? '#f8fafc' : '#0f172a',
                letterSpacing: '-0.025em',
              }}
            >
              RAO Studio
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                background: isDark ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff',
                color: isDark ? '#818cf8' : '#4f46e5',
                border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #c7d2fe',
                letterSpacing: '0.04em',
              }}
            >
              PRO
            </span>
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: pixelSize >= 40 ? 12 : 11,
                color: isDark ? '#94a3b8' : '#64748b',
                whiteSpace: 'nowrap',
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
