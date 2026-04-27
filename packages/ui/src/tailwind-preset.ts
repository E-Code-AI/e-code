import { colors, radii, shadows, spacing, typography } from './tokens/index.js';

const preset = {
  darkMode: ['selector', '[data-theme="dark"], [data-theme="black"]'],
  theme: {
    extend: {
      colors: {
        neutral: colors.neutral,
        brand: colors.brand,
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        danger: colors.semantic.danger,
        info: colors.semantic.info,
        background: 'hsl(var(--ecode-bg))',
        elevated: 'hsl(var(--ecode-elevated))',
        overlay: 'hsl(var(--ecode-overlay))',
        sunken: 'hsl(var(--ecode-sunken))',
        foreground: 'hsl(var(--ecode-fg))',
        muted: 'hsl(var(--ecode-muted))',
        border: 'hsl(var(--ecode-border))',
        primary: 'hsl(var(--ecode-primary))',
        'primary-foreground': 'hsl(var(--ecode-primary-fg))',
      },
      borderRadius: radii,
      boxShadow: shadows,
      spacing,
      fontFamily: {
        sans: typography.fontSans.split(', '),
        mono: typography.fontMono.split(', '),
      },
    },
  },
};

export default preset;
