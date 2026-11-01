/**
 * 全局视觉规范:颜色、圆角、阴影。
 * 各界面统一从这里取值,避免魔法色值散落;调整主题只改此文件。
 */

export const colors = {
  /** 页面底色 */
  bg: '#F5F6FA',
  /** 卡片 / 栏位底色 */
  surface: '#FFFFFF',
  /** 次级填充(按钮底、分段控件底) */
  surfaceMuted: '#F0F1F5',
  border: '#E6E8EF',
  borderStrong: '#D5D8E1',

  text: '#111827',
  textSecondary: '#5B6170',
  textMuted: '#9AA0AC',

  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primarySoft: '#EEF0FF',
  primaryBorder: '#C9CEFB',
  onPrimary: '#FFFFFF',

  warning: '#F59E0B',
  warningSoft: '#FFF8E6',
  warningBorder: '#FCE2A4',
  warningText: '#B45309',

  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  success: '#059669',
  successSoft: '#ECFDF5',

  weekend: '#E5484D',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** 阴影:RN 新架构与 RN Web 均支持 boxShadow */
export const shadow = {
  card: { boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04), 0 2px 8px rgba(17, 24, 39, 0.04)' },
  raised: { boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)' },
} as const;
