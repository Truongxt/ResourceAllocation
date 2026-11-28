import { theme } from 'antd';

/**
 * Ant Design v6 Theme Configuration
 * Disciplined Slate + Cobalt Enterprise System
 */
export const getAntdTheme = (isDark = false) => {
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? '#3b82f6' : '#1d4ed8',
      colorInfo: isDark ? '#3b82f6' : '#1d4ed8',
      colorSuccess: isDark ? '#10b981' : '#059669',
      colorWarning: isDark ? '#f59e0b' : '#d97706',
      colorError: isDark ? '#ef4444' : '#dc2626',

      colorBgBase: isDark ? '#090d16' : '#ffffff',
      colorBgLayout: isDark ? '#090d16' : '#f1f5f9',
      colorBgContainer: isDark ? '#111827' : '#ffffff',
      colorBgElevated: isDark ? '#172033' : '#ffffff',
      colorBgSpotlight: isDark ? '#1e293b' : '#0f172a',

      colorText: isDark ? '#f8fafc' : '#0f172a',
      colorTextSecondary: isDark ? '#cbd5e1' : '#334155',
      colorTextTertiary: isDark ? '#94a3b8' : '#64748b',
      colorTextQuaternary: isDark ? '#64748b' : '#94a3b8',

      colorBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#dbe3ef',
      colorBorderSecondary: isDark ? 'rgba(255, 255, 255, 0.07)' : '#e2e8f0',

      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      fontSize: 13.5,
      borderRadius: 8,
      borderRadiusLG: 10,
      borderRadiusSM: 6,
      wireframe: false,
    },
    components: {
      Layout: {
        headerBg: isDark ? 'rgba(9, 13, 22, 0.92)' : 'rgba(255, 255, 255, 0.95)',
        siderBg: isDark ? '#090d16' : '#ffffff',
        bodyBg: isDark ? '#090d16' : '#f1f5f9',
      },
      Card: {
        colorBgContainer: isDark ? '#111827' : '#ffffff',
        colorBorderSecondary: isDark ? 'rgba(255, 255, 255, 0.09)' : '#dbe3ef',
        borderRadiusLG: 10,
        paddingLG: 18,
      },
      Table: {
        colorBgContainer: isDark ? '#111827' : '#ffffff',
        headerBg: isDark ? '#172033' : '#f8fafc',
        headerColor: isDark ? '#cbd5e1' : '#334155',
        rowHoverBg: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : '#e2e8f0',
        headerSplitColor: 'transparent',
        cellPaddingBlock: 12,
        cellPaddingInline: 14,
      },
      Menu: {
        darkItemBg: 'transparent',
        darkSubMenuItemBg: 'transparent',
        darkItemSelectedBg: 'rgba(59, 130, 246, 0.16)',
        darkItemSelectedColor: '#60a5fa',
        darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
        itemBg: 'transparent',
        itemSelectedBg: '#eff6ff',
        itemSelectedColor: '#1d4ed8',
        itemHoverBg: '#f1f5f9',
        itemBorderRadius: 7,
        itemMarginInline: 10,
        itemHeight: 38,
      },
      Button: {
        fontWeight: 600,
        controlHeight: 34,
        controlHeightLG: 40,
        controlHeightSM: 28,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
      },
      Input: {
        colorBgContainer: isDark ? '#0f1623' : '#ffffff',
        activeBorderColor: isDark ? '#3b82f6' : '#1d4ed8',
        hoverBorderColor: isDark ? '#60a5fa' : '#94a3b8',
        controlHeight: 34,
      },
      Select: {
        colorBgContainer: isDark ? '#0f1623' : '#ffffff',
        colorBgElevated: isDark ? '#172033' : '#ffffff',
        controlHeight: 34,
      },
      Modal: {
        contentBg: isDark ? '#111827' : '#ffffff',
        headerBg: isDark ? '#111827' : '#ffffff',
        borderRadiusLG: 12,
      },
      Tabs: {
        itemSelectedColor: isDark ? '#60a5fa' : '#1d4ed8',
        inkBarColor: isDark ? '#3b82f6' : '#1d4ed8',
        itemHoverColor: isDark ? '#93c5fd' : '#2563eb',
        titleFontSize: 13.5,
      },
      Tag: {
        borderRadiusSM: 5,
      },
      Segmented: {
        trackBg: isDark ? '#0f1623' : '#f1f5f9',
        itemSelectedBg: isDark ? '#1e293b' : '#ffffff',
        itemSelectedColor: isDark ? '#f8fafc' : '#0f172a',
        itemColor: isDark ? '#94a3b8' : '#475569',
      },
    },
  };
};

export const lightTheme = getAntdTheme(false);
export const darkTheme = getAntdTheme(true);
export default getAntdTheme;
