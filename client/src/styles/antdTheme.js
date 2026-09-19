/**
 * Ant Design Theme Configuration
 * Precision B2B Enterprise SaaS (Linear / Stripe / Vercel Craft Standard)
 * Completely eliminates AI tropes (purple gradients, glowing halos, washed-out glass)
 */

export const darkTheme = {
  token: {
    // Primary & Accents: Precision Royal Blue
    colorPrimary: '#2563eb',
    colorPrimaryHover: '#3b82f6',
    colorPrimaryActive: '#1d4ed8',
    colorInfo: '#0ea5e9',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',

    // Backgrounds: Clean Zinc / Obsidian Slate
    colorBgLayout: '#09090b',
    colorBgContainer: '#121215',
    colorBgElevated: '#18181b',
    colorBgSpotlight: '#27272a',
    colorBgMask: 'rgba(9, 9, 11, 0.85)',

    // Text: High Contrast Visual Hierarchy
    colorText: '#f4f4f5',
    colorTextSecondary: '#a1a1aa',
    colorTextTertiary: '#71717a',
    colorTextQuaternary: '#52525b',

    // Borders & Dividers: 1px Crisp Borders
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.05)',
    colorSplit: 'rgba(255, 255, 255, 0.06)',

    // Typography
    fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 13.5,
    fontSizeHeading1: 26,
    fontSizeHeading2: 20,
    fontSizeHeading3: 16,
    fontSizeHeading4: 14,

    // Border Radius: Restrained & Modern
    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Control Heights
    controlHeight: 36,
    controlHeightLG: 40,
    controlHeightSM: 28,

    // Shadows: Physical Real-World Shadows (Zero Neon Glow)
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.07)',
    boxShadowSecondary: '0 4px 16px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.12)',
  },
  components: {
    Layout: {
      headerBg: 'rgba(18, 18, 21, 0.92)',
      siderBg: '#0c0c0e',
      bodyBg: '#09090b',
      headerHeight: 56,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(37, 99, 235, 0.12)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.04)',
      darkItemSelectedColor: '#93c5fd',
      darkItemColor: '#a1a1aa',
      itemBorderRadius: 6,
      iconSize: 16,
      itemMarginInline: 8,
      itemPaddingInline: 12,
      itemHeight: 36,
    },
    Card: {
      colorBgContainer: '#121215',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
      paddingLG: 16,
    },
    Table: {
      colorBgContainer: '#121215',
      headerBg: '#0c0c0e',
      headerColor: '#a1a1aa',
      rowHoverBg: 'rgba(255, 255, 255, 0.035)',
      borderColor: 'rgba(255, 255, 255, 0.06)',
      headerSplitColor: 'rgba(255, 255, 255, 0.06)',
      fontSize: 13,
    },
    Modal: {
      contentBg: '#121215',
      headerBg: '#121215',
      titleColor: '#f4f4f5',
      boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    },
    Input: {
      colorBgContainer: '#18181b',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
      activeBorderColor: '#2563eb',
      hoverBorderColor: '#3b82f6',
    },
    Select: {
      colorBgContainer: '#18181b',
      colorBgElevated: '#18181b',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
      optionSelectedBg: 'rgba(37, 99, 235, 0.15)',
    },
    InputNumber: {
      colorBgContainer: '#18181b',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
    },
    DatePicker: {
      colorBgContainer: '#18181b',
      colorBgElevated: '#18181b',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
    },
    Button: {
      primaryShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
      defaultBg: '#18181b',
      defaultBorderColor: 'rgba(255, 255, 255, 0.1)',
      defaultColor: '#f4f4f5',
      defaultHoverBg: '#27272a',
      defaultHoverBorderColor: 'rgba(255, 255, 255, 0.2)',
      defaultHoverColor: '#ffffff',
    },
    Tabs: {
      inkBarColor: '#2563eb',
      itemSelectedColor: '#93c5fd',
      itemColor: '#71717a',
      itemHoverColor: '#f4f4f5',
    },
    Statistic: {
      titleFontSize: 12,
      contentFontSize: 22,
    },
    Slider: {
      trackBg: '#2563eb',
      handleColor: '#2563eb',
      railBg: '#27272a',
      railHoverBg: '#3f3f46',
    },
    Segmented: {
      trackBg: '#0c0c0e',
      itemSelectedBg: '#18181b',
      itemSelectedColor: '#f4f4f5',
      itemColor: '#a1a1aa',
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Dropdown: {
      colorBgElevated: '#18181b',
    },
    Popover: {
      colorBgElevated: '#18181b',
    },
  },
};

export const lightTheme = {
  token: {
    // Primary & Accents: Precision Royal Blue
    colorPrimary: '#2563eb',
    colorPrimaryHover: '#3b82f6',
    colorPrimaryActive: '#1d4ed8',
    colorInfo: '#0284c7',
    colorSuccess: '#059669',
    colorWarning: '#d97706',
    colorError: '#dc2626',

    // Backgrounds: Clean Crisp Slate
    colorBgLayout: '#f8fafc',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgSpotlight: '#0f172a',
    colorBgMask: 'rgba(15, 23, 42, 0.45)',

    // Text: Sharp Slate
    colorText: '#0f172a',
    colorTextSecondary: '#334155',
    colorTextTertiary: '#64748b',
    colorTextQuaternary: '#94a3b8',

    // Borders & Dividers
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    colorSplit: '#f1f5f9',

    // Typography
    fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 13.5,
    fontSizeHeading1: 26,
    fontSizeHeading2: 20,
    fontSizeHeading3: 16,
    fontSizeHeading4: 14,

    // Border Radius
    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Control Heights
    controlHeight: 36,
    controlHeightLG: 40,
    controlHeightSM: 28,

    // Shadows
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    boxShadowSecondary: '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
  },
  components: {
    Layout: {
      headerBg: 'rgba(255, 255, 255, 0.94)',
      siderBg: '#ffffff',
      bodyBg: '#f8fafc',
      headerHeight: 56,
      headerPadding: '0 24px',
    },
    Menu: {
      itemBg: '#ffffff',
      itemSelectedBg: '#eff6ff',
      itemHoverBg: '#f8fafc',
      itemSelectedColor: '#2563eb',
      itemColor: '#475569',
      itemBorderRadius: 6,
      iconSize: 16,
      itemMarginInline: 8,
      itemPaddingInline: 12,
      itemHeight: 36,
    },
    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#e2e8f0',
      paddingLG: 16,
    },
    Table: {
      colorBgContainer: '#ffffff',
      headerBg: '#f8fafc',
      headerColor: '#475569',
      rowHoverBg: '#f8fafc',
      borderColor: '#e2e8f0',
      headerSplitColor: '#e2e8f0',
      fontSize: 13,
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      titleColor: '#0f172a',
      boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)',
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#cbd5e1',
      activeBorderColor: '#2563eb',
      hoverBorderColor: '#3b82f6',
    },
    Select: {
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      colorBorder: '#cbd5e1',
      optionSelectedBg: '#eff6ff',
    },
    InputNumber: {
      colorBgContainer: '#ffffff',
      colorBorder: '#cbd5e1',
    },
    DatePicker: {
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      colorBorder: '#cbd5e1',
    },
    Button: {
      primaryShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.08)',
      defaultBg: '#ffffff',
      defaultBorderColor: '#e2e8f0',
      defaultColor: '#0f172a',
      defaultHoverBg: '#f8fafc',
      defaultHoverBorderColor: '#cbd5e1',
      defaultHoverColor: '#0f172a',
    },
    Tabs: {
      inkBarColor: '#2563eb',
      itemSelectedColor: '#2563eb',
      itemColor: '#64748b',
      itemHoverColor: '#0f172a',
    },
    Statistic: {
      titleFontSize: 12,
      contentFontSize: 22,
    },
    Slider: {
      trackBg: '#2563eb',
      handleColor: '#2563eb',
      railBg: '#e2e8f0',
      railHoverBg: '#cbd5e1',
    },
    Segmented: {
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#2563eb',
      trackBg: '#f1f5f9',
      itemColor: '#64748b',
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Dropdown: {
      colorBgElevated: '#ffffff',
    },
    Popover: {
      colorBgElevated: '#ffffff',
    },
  },
};
