import { Platform } from 'react-native';

export const Colors = {
  dark: {
    // Core Obsidian Backgrounds
    background: '#0A0B0E',
    backgroundElement: '#14171F',
    backgroundSelected: '#1E222D',
    backgroundGlass: 'rgba(20, 23, 31, 0.75)',
    card: '#12141A',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    cardBorderHover: 'rgba(6, 182, 212, 0.3)',

    // Typography
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',

    // Subsystem Neon Accents
    canvas: '#06B6D4', // Cyan
    synapse: '#8B5CF6', // Violet
    tasks: '#F59E0B', // Amber
    habits: '#10B981', // Emerald
    ledger: '#EC4899', // Rose / Pink

    // Status Colors
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  },
  light: {
    background: '#F8FAFC',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#E2E8F0',
    backgroundGlass: 'rgba(255, 255, 255, 0.85)',
    card: '#FFFFFF',
    cardBorder: 'rgba(0, 0, 0, 0.08)',
    cardBorderHover: 'rgba(6, 182, 212, 0.4)',

    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',

    canvas: '#0891B2',
    synapse: '#7C3AED',
    tasks: '#D97706',
    habits: '#059669',
    ledger: '#DB2777',

    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#2563EB',
  },
} as const;

export type ThemeColor = keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, Cambria, serif',
    rounded: 'system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 70, android: 80 }) ?? 75;
export const MaxContentWidth = 900;
