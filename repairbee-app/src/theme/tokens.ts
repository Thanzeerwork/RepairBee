/**
 * RepairBee Design System — Theme Tokens
 * Extracted from Stitch design system (assets/16494985333067025194)
 */

export const Colors = {
  // Brand
  primary: '#d97706',
  primaryLight: '#fbbf24',
  primaryDark: '#b45309',
  primaryMuted: '#fef3c7',
  primaryContainer: '#b15f00',

  // Secondary
  secondary: '#1e293b',
  secondaryLight: '#334155',
  secondaryMuted: '#64748b',

  // Tertiary / Success
  tertiary: '#059669',
  tertiaryLight: '#34d399',
  tertiaryMuted: '#d1fae5',

  // Semantic
  success: '#059669',
  successLight: '#34d399',
  successBg: '#d1fae5',
  warning: '#f97316',
  warningBg: '#ffedd5',
  error: '#ef4444',
  errorBg: '#fee2e2',
  info: '#3b82f6',
  infoBg: '#dbeafe',

  // Surfaces
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceDim: '#f1f5f9',
  surfaceBorder: '#e2e8f0',
  surfaceHover: '#f8f9ff',

  // Text
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textInverse: '#ffffff',
  textLink: '#d97706',

  // Status Colors (for order pipeline)
  statusRequested: '#64748b',
  statusQuoted: '#3b82f6',
  statusApproved: '#8b5cf6',
  statusPaid: '#06b6d4',
  statusPickup: '#f59e0b',
  statusInProgress: '#d97706',
  statusCompleted: '#059669',
  statusDelivered: '#10b981',
  statusCancelled: '#ef4444',
  statusDisputed: '#dc2626',

  // Misc
  overlay: 'rgba(15, 23, 42, 0.5)',
  shimmer: '#e2e8f0',
  divider: '#e2e8f0',
  star: '#fbbf24',
  starEmpty: '#d1d5db',
};

export const Fonts = {
  heading: 'PlusJakartaSans',
  headingBold: 'PlusJakartaSans-Bold',
  headingSemiBold: 'PlusJakartaSans-SemiBold',
  headingMedium: 'PlusJakartaSans-Medium',
  body: 'Inter',
  bodyBold: 'Inter-Bold',
  bodySemiBold: 'Inter-SemiBold',
  bodyMedium: 'Inter-Medium',
  label: 'Inter-SemiBold',
};

export const FontSizes = {
  displayLg: 32,
  displayMd: 28,
  titleLg: 24,
  titleMd: 20,
  titleSm: 18,
  bodyLg: 16,
  bodyMd: 14,
  bodySm: 13,
  caption: 12,
  labelSm: 11,
  tiny: 10,
};

export const LineHeights = {
  displayLg: 40,
  displayMd: 36,
  titleLg: 32,
  titleMd: 28,
  titleSm: 24,
  bodyLg: 24,
  bodyMd: 20,
  bodySm: 18,
  caption: 16,
  labelSm: 14,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 24,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
};

export const HitSlop = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};

export const MinTouchTarget = 44;
