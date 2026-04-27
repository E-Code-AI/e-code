export const colors = {
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  brand: {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    secondary: '#14b8a6',
    secondaryHover: '#0f766e',
  },
  semantic: {
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0284c7',
  },
  surface: {
    bg: 'hsl(var(--ecode-bg))',
    elevated: 'hsl(var(--ecode-elevated))',
    overlay: 'hsl(var(--ecode-overlay))',
    sunken: 'hsl(var(--ecode-sunken))',
  },
} as const;

export const typography = {
  fontSans: '"Inter", "Geist", ui-sans-serif, system-ui, sans-serif',
  fontMono: '"Geist Mono", "SFMono-Regular", Consolas, monospace',
  scale: {
    xs: ['0.75rem', '1rem'],
    sm: ['0.875rem', '1.25rem'],
    md: ['1rem', '1.5rem'],
    lg: ['1.125rem', '1.75rem'],
    xl: ['1.25rem', '1.75rem'],
    '2xl': ['1.5rem', '2rem'],
    '3xl': ['1.875rem', '2.25rem'],
    '4xl': ['2.25rem', '2.5rem'],
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
} as const;

export const radii = {
  none: '0',
  xs: '0.25rem',
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
} as const;

export const shadows = {
  xs: '0 1px 2px rgb(15 23 42 / 0.06)',
  sm: '0 1px 3px rgb(15 23 42 / 0.12)',
  md: '0 8px 24px rgb(15 23 42 / 0.12)',
  lg: '0 18px 48px rgb(15 23 42 / 0.16)',
  brand: '0 12px 32px rgb(37 99 235 / 0.24)',
  danger: '0 12px 32px rgb(220 38 38 / 0.20)',
} as const;

export const motionTokens = {
  durations: {
    instant: '75ms',
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  easings: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  },
} as const;

export const tokens = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  motion: motionTokens,
} as const;
