/**
 * Ant Design v5 Theme Configuration
 * High-end, Modern Enterprise SaaS Design Tokens (Linear / Supabase / Vercel style)
 */

export const darkTheme = {
  token: {
    // Primary & Accents
    colorPrimary: '#6366f1', // Electric Indigo
    colorPrimaryHover: '#818cf8',
    colorPrimaryActive: '#4f46e5',
    colorInfo: '#06b6d4', // Cyan
    colorSuccess: '#10b981', // Emerald
    colorWarning: '#f59e0b', // Amber
    colorError: '#ef4444', // Rose/Red

    // Backgrounds (Layered Deep Slate & Obsidian)
    colorBgLayout: '#090d16',
    colorBgContainer: '#101726',
    colorBgElevated: '#172033',
    colorBgSpotlight: '#1e293b',
    colorBgMask: 'rgba(0, 0, 0, 0.75)',

    // Text & Content (Sharp Contrast)
    colorText: '#f8fafc',
    colorTextSecondary: '#cbd5e1',
    colorTextTertiary: '#94a3b8',
    colorTextQuaternary: '#64748b',

    // Borders & Dividers (Subtle 1px Glass Highlight)
    colorBorder: 'rgba(255, 255, 255, 0.1)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
    colorSplit: 'rgba(255, 255, 255, 0.06)',

    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    fontSizeHeading1: 28,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 15,

    // Border Radius (Modern Soft Corners)
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Control Heights
    controlHeight: 38,
    controlHeightLG: 44,
    controlHeightSM: 30,

    // Shadows & Depth
    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
    boxShadowSecondary: '0 12px 32px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)',
  },
  components: {
    Layout: {
      headerBg: 'rgba(9, 13, 22, 0.85)',
      siderBg: '#090d16',
      bodyBg: '#090d16',
      headerHeight: 64,
      headerPadding: '0 28px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(99, 102, 241, 0.15)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
      darkItemSelectedColor: '#a5b4fc',
      darkItemColor: '#94a3b8',
      itemBorderRadius: 8,
      iconSize: 17,
      itemMarginInline: 10,
      itemPaddingInline: 14,
      itemHeight: 40,
    },
    Card: {
      colorBgContainer: '#101726',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
      paddingLG: 20,
    },
    Table: {
      colorBgContainer: '#101726',
      headerBg: '#0c121e',
      headerColor: '#cbd5e1',
      rowHoverBg: 'rgba(99, 102, 241, 0.06)',
      borderColor: 'rgba(255, 255, 255, 0.07)',
      headerSplitColor: 'rgba(255, 255, 255, 0.07)',
    },
    Modal: {
      contentBg: '#101726',
      headerBg: '#101726',
      titleColor: '#f8fafc',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    },
    Input: {
      colorBgContainer: '#141d2e',
      colorBorder: 'rgba(255, 255, 255, 0.12)',
      activeBorderColor: '#6366f1',
      hoverBorderColor: 'rgba(99, 102, 241, 0.6)',
    },
    Select: {
      colorBgContainer: '#141d2e',
      colorBgElevated: '#172033',
      colorBorder: 'rgba(255, 255, 255, 0.12)',
      optionSelectedBg: 'rgba(99, 102, 241, 0.2)',
    },
    InputNumber: {
      colorBgContainer: '#141d2e',
      colorBorder: 'rgba(255, 255, 255, 0.12)',
    },
    DatePicker: {
      colorBgContainer: '#141d2e',
      colorBgElevated: '#172033',
      colorBorder: 'rgba(255, 255, 255, 0.12)',
    },
    Button: {
      primaryShadow: '0 2px 10px rgba(99, 102, 241, 0.45)',
      defaultBg: '#141d2e',
      defaultBorderColor: 'rgba(255, 255, 255, 0.12)',
      defaultColor: '#e2e8f0',
      defaultHoverBg: '#1c283f',
      defaultHoverBorderColor: 'rgba(255, 255, 255, 0.25)',
      defaultHoverColor: '#ffffff',
    },
    Tabs: {
      inkBarColor: '#6366f1',
      itemSelectedColor: '#a5b4fc',
      itemColor: '#94a3b8',
      itemHoverColor: '#f8fafc',
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 24,
    },
    Slider: {
      trackBg: '#6366f1',
      handleColor: '#6366f1',
      railBg: '#1c283f',
      railHoverBg: '#253552',
    },
    Segmented: {
      trackBg: '#0c121e',
      itemSelectedBg: '#1c283f',
      itemSelectedColor: '#f8fafc',
      itemColor: '#94a3b8',
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Dropdown: {
      colorBgElevated: '#172033',
    },
    Popover: {
      colorBgElevated: '#172033',
    },
  },
};

export const lightTheme = {
  token: {
    // Primary & Accents
    colorPrimary: '#4f46e5', // Deep Indigo
    colorPrimaryHover: '#6366f1',
    colorPrimaryActive: '#4338ca',
    colorInfo: '#0284c7', // Sky
    colorSuccess: '#059669', // Emerald
    colorWarning: '#d97706', // Amber
    colorError: '#dc2626', // Red

    // Backgrounds (Clean layered surface)
    colorBgLayout: '#f8fafc',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgSpotlight: '#0f172a',
    colorBgMask: 'rgba(15, 23, 42, 0.45)',

    // Text (Sharp, rich slate)
    colorText: '#0f172a',
    colorTextSecondary: '#334155',
    colorTextTertiary: '#64748b',
    colorTextQuaternary: '#94a3b8',

    // Borders
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    colorSplit: '#f1f5f9',

    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    fontSizeHeading1: 28,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSizeHeading4: 15,

    // Border Radius
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Control Heights
    controlHeight: 38,
    controlHeightLG: 44,
    controlHeightSM: 30,

    // Shadows
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  },
  components: {
    Layout: {
      headerBg: 'rgba(255, 255, 255, 0.9)',
      siderBg: '#ffffff',
      bodyBg: '#f8fafc',
      headerHeight: 64,
      headerPadding: '0 28px',
    },
    Menu: {
      itemBg: '#ffffff',
      itemSelectedBg: '#eef2ff',
      itemHoverBg: '#f8fafc',
      itemSelectedColor: '#4f46e5',
      itemColor: '#475569',
      itemBorderRadius: 8,
      iconSize: 17,
      itemMarginInline: 10,
      itemPaddingInline: 14,
      itemHeight: 40,
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
      rowHoverBg: '#f8fafc',
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
      primaryShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
      defaultBg: '#ffffff',
      defaultBorderColor: '#cbd5e1',
      defaultColor: '#1e293b',
      defaultHoverBg: '#f8fafc',
      defaultHoverBorderColor: '#94a3b8',
      defaultHoverColor: '#0f172a',
    },
    Tabs: {
      inkBarColor: '#4f46e5',
      itemSelectedColor: '#4f46e5',
      itemColor: '#475569',
      itemHoverColor: '#0f172a',
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 24,
    },
    Slider: {
      trackBg: '#4f46e5',
      handleColor: '#4f46e5',
      railBg: '#e2e8f0',
      railHoverBg: '#cbd5e1',
    },
    Segmented: {
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#4f46e5',
      trackBg: '#f1f5f9',
      itemColor: '#64748b',
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Dropdown: {
      colorBgElevated: '#ffffff',
    },
    Popover: {
      colorBgElevated: '#ffffff',
    },
  },
};
