/**
 * Ant Design v5 Theme Configuration
 * High-contrast, clean & modern Design Tokens for both Dark & Light themes
 */

export const darkTheme = {
  token: {
    // Primary & Accents
    colorPrimary: '#6366f1',
    colorInfo: '#3b82f6',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',

    // Backgrounds
    colorBgContainer: '#1e293b',
    colorBgElevated: '#1e293b',
    colorBgLayout: '#0f172a',
    colorBgSpotlight: '#334155',
    colorBgMask: 'rgba(0, 0, 0, 0.65)',

    // Text
    colorText: '#f8fafc',
    colorTextSecondary: '#cbd5e1',
    colorTextTertiary: '#94a3b8',
    colorTextQuaternary: '#64748b',

    // Borders
    colorBorder: 'rgba(148, 163, 184, 0.22)',
    colorBorderSecondary: 'rgba(148, 163, 184, 0.14)',

    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,

    // Border Radius
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,

    // Control Heights
    controlHeight: 38,
    controlHeightLG: 46,
    controlHeightSM: 30,

    // Shadows
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
    boxShadowSecondary: '0 8px 24px rgba(0, 0, 0, 0.45)',
  },
  components: {
    Layout: {
      headerBg: 'rgba(15, 23, 42, 0.9)',
      siderBg: '#0f172a',
      bodyBg: '#0f172a',
      headerHeight: 64,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(99, 102, 241, 0.18)',
      darkItemHoverBg: 'rgba(99, 102, 241, 0.08)',
      darkItemSelectedColor: '#818cf8',
      darkItemColor: '#cbd5e1',
      itemBorderRadius: 8,
      iconSize: 18,
      itemMarginInline: 8,
      itemPaddingInline: 16,
      itemHeight: 44,
    },
    Card: {
      colorBgContainer: '#1e293b',
      colorBorderSecondary: 'rgba(148, 163, 184, 0.16)',
      paddingLG: 20,
    },
    Table: {
      colorBgContainer: '#1e293b',
      headerBg: '#0f172a',
      headerColor: '#cbd5e1',
      rowHoverBg: 'rgba(51, 65, 85, 0.45)',
      borderColor: 'rgba(148, 163, 184, 0.12)',
      headerSplitColor: 'rgba(148, 163, 184, 0.12)',
    },
    Modal: {
      contentBg: '#1e293b',
      headerBg: '#1e293b',
      titleColor: '#f8fafc',
    },
    Input: {
      colorBgContainer: '#334155',
      colorBorder: 'rgba(148, 163, 184, 0.25)',
      activeBorderColor: '#6366f1',
    },
    Select: {
      colorBgContainer: '#334155',
      colorBgElevated: '#1e293b',
      colorBorder: 'rgba(148, 163, 184, 0.25)',
      optionSelectedBg: 'rgba(99, 102, 241, 0.2)',
    },
    InputNumber: {
      colorBgContainer: '#334155',
      colorBorder: 'rgba(148, 163, 184, 0.25)',
    },
    DatePicker: {
      colorBgContainer: '#334155',
      colorBgElevated: '#1e293b',
      colorBorder: 'rgba(148, 163, 184, 0.25)',
    },
    Button: {
      primaryShadow: '0 2px 6px rgba(99, 102, 241, 0.4)',
      defaultBg: '#334155',
      defaultBorderColor: 'rgba(148, 163, 184, 0.25)',
      defaultColor: '#e2e8f0',
    },
    Tabs: {
      inkBarColor: '#6366f1',
      itemSelectedColor: '#818cf8',
      itemColor: '#94a3b8',
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 26,
    },
    Slider: {
      trackBg: '#6366f1',
      handleColor: '#6366f1',
      railBg: '#334155',
    },
  },
};

export const lightTheme = {
  token: {
    // Primary & Accents (Vibrant & High-contrast)
    colorPrimary: '#4f46e5', // Deep Indigo 600
    colorInfo: '#2563eb', // Blue 600
    colorSuccess: '#059669', // Emerald 600
    colorWarning: '#d97706', // Amber 600
    colorError: '#dc2626', // Red 600

    // Backgrounds (Clean layered surface)
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f1f5f9', // Slate 100
    colorBgSpotlight: '#1e293b',

    // Text (Sharp, rich contrast)
    colorText: '#0f172a', // Slate 900
    colorTextSecondary: '#334155', // Slate 700
    colorTextTertiary: '#64748b', // Slate 500
    colorTextQuaternary: '#94a3b8',

    // Borders (Distinct & Crisp)
    colorBorder: '#cbd5e1', // Slate 300
    colorBorderSecondary: '#e2e8f0', // Slate 200

    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,

    // Border Radius
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,

    // Control Heights
    controlHeight: 38,
    controlHeightLG: 46,
    controlHeightSM: 30,

    // Shadows
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  },
  components: {
    Layout: {
      headerBg: 'rgba(255, 255, 255, 0.95)',
      siderBg: '#ffffff',
      bodyBg: '#f1f5f9',
      headerHeight: 64,
      headerPadding: '0 24px',
    },
    Menu: {
      itemBg: '#ffffff',
      itemSelectedBg: '#eef2ff',
      itemHoverBg: '#f8fafc',
      itemSelectedColor: '#4f46e5',
      itemColor: '#334155',
      itemBorderRadius: 8,
      iconSize: 18,
      itemMarginInline: 8,
      itemPaddingInline: 16,
      itemHeight: 44,
    },
    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#e2e8f0',
      paddingLG: 20,
    },
    Table: {
      colorBgContainer: '#ffffff',
      headerBg: '#f8fafc',
      headerColor: '#1e293b',
      rowHoverBg: '#f1f5f9',
      borderColor: '#e2e8f0',
      headerSplitColor: '#e2e8f0',
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      titleColor: '#0f172a',
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#cbd5e1',
      activeBorderColor: '#4f46e5',
      hoverBorderColor: '#818cf8',
    },
    Select: {
      colorBgContainer: '#ffffff',
      colorBorder: '#cbd5e1',
      optionSelectedBg: '#eef2ff',
    },
    InputNumber: {
      colorBgContainer: '#ffffff',
      colorBorder: '#cbd5e1',
    },
    DatePicker: {
      colorBgContainer: '#ffffff',
      colorBorder: '#cbd5e1',
    },
    Button: {
      primaryShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
      defaultBg: '#ffffff',
      defaultBorderColor: '#cbd5e1',
      defaultColor: '#1e293b',
    },
    Tabs: {
      inkBarColor: '#4f46e5',
      itemSelectedColor: '#4f46e5',
      itemColor: '#475569',
      itemHoverColor: '#1e293b',
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 26,
    },
    Slider: {
      trackBg: '#4f46e5',
      handleColor: '#4f46e5',
      railBg: '#e2e8f0',
    },
    Segmented: {
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#4f46e5',
      trackBg: '#e2e8f0',
      itemColor: '#475569',
    },
    Tag: {
      defaultBg: '#f1f5f9',
      defaultColor: '#334155',
    },
  },
};
