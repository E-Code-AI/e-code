import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  
  // Safelist dynamic classes that might be purged in production
  // These are classes generated dynamically via template literals or conditionals
  safelist: [
    // Status colors (used in getStatusColor functions)
    'bg-green-500', 'bg-green-600', 'bg-green-100', 'bg-green-500/10', 'bg-green-500/20',
    'bg-red-500', 'bg-red-600', 'bg-red-100', 'bg-red-500/10', 'bg-red-500/20',
    'bg-yellow-500', 'bg-yellow-600', 'bg-yellow-100', 'bg-yellow-500/10', 'bg-yellow-500/20',
    'bg-orange-500', 'bg-orange-600', 'bg-orange-100', 'bg-orange-500/10', 'bg-orange-500/20',
    'bg-blue-500', 'bg-blue-600', 'bg-blue-100', 'bg-blue-500/10', 'bg-blue-500/20',
    'bg-purple-500', 'bg-purple-600', 'bg-purple-100', 'bg-purple-500/10', 'bg-purple-500/20',
    'bg-gray-500', 'bg-gray-600', 'bg-gray-100', 'bg-gray-500/10', 'bg-gray-500/20',
    
    // Text status colors
    'text-green-500', 'text-green-600', 'text-green-400',
    'text-red-500', 'text-red-600', 'text-red-400',
    'text-yellow-500', 'text-yellow-600', 'text-yellow-400',
    'text-orange-500', 'text-orange-600', 'text-orange-400',
    'text-blue-500', 'text-blue-600', 'text-blue-400',
    'text-purple-500', 'text-purple-600', 'text-purple-400',
    'text-gray-500', 'text-gray-600', 'text-gray-400',
    
    // Border status colors
    'border-green-500', 'border-green-200', 'border-green-500/20',
    'border-red-500', 'border-red-200', 'border-red-500/20',
    'border-yellow-500', 'border-yellow-200', 'border-yellow-500/20',
    'border-orange-500', 'border-orange-200', 'border-orange-500/20',
    'border-blue-500', 'border-blue-200', 'border-blue-500/20',
    'border-purple-500', 'border-purple-200', 'border-purple-500/20',
    
    // Animation states
    'animate-spin', 'animate-pulse', 'animate-bounce',
    
    // Dynamic sizing/positioning used in components
    'w-1', 'w-2', 'w-3', 'w-4', 'h-1', 'h-2', 'h-3', 'h-4',
    'rounded-full', 'rounded-lg', 'rounded-md',
    
    // Opacity variants for overlays
    { pattern: /bg-(green|red|yellow|orange|blue|purple|gray)-(100|200|500|600)/ },
    { pattern: /text-(green|red|yellow|orange|blue|purple|gray)-(400|500|600)/ },
    { pattern: /border-(green|red|yellow|orange|blue|purple|gray)-(200|500)/ },
  ],
  
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Mobile landscape detection: wider than mobile but short height (phone rotated)
      // This allows showing mobile UI even when width exceeds md breakpoint
      'mobile-landscape': { 'raw': '(max-height: 500px) and (min-width: 568px) and (orientation: landscape)' },
      // Tablet portrait: medium width with tall height
      'tablet-portrait': { 'raw': '(min-width: 768px) and (min-height: 600px) and (orientation: portrait)' },
      // True tablet: not a phone in landscape
      'tablet': { 'raw': '(min-width: 768px) and (min-height: 500px)' },
      // Touch device detection for hover states
      'touch': { 'raw': '(hover: none) and (pointer: coarse)' },
      // Desktop with hover support
      'desktop': { 'raw': '(min-width: 1024px) and (hover: hover)' },
    },
    extend: {
      borderRadius: {
        lg: "var(--ecode-radius-lg)",
        md: "var(--ecode-radius-md)",
        sm: "var(--ecode-radius-sm)",
        'ecode-sm': '4px',
        'ecode-md': '8px',
        'ecode-lg': '12px',
      },
      spacing: {
        'ecode-1': '4px',
        'ecode-2': '8px',
        'ecode-3': '12px',
        'ecode-4': '16px',
        'ecode-5': '20px',
        'ecode-6': '24px',
        'ecode-8': '32px',
        'ecode-10': '40px',
        'ecode-12': '48px',
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', '"Fira Sans"', '"Droid Sans"', '"Helvetica Neue"', 'sans-serif'],
        mono: ["'IBM Plex Mono'", '"SF Mono"', 'Monaco', 'Inconsolata', '"Fira Mono"', '"Droid Sans Mono"', '"Source Code Pro"', 'monospace'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.75rem' }], // 10px for mobile bottom tabs
      },
      colors: {
        // E-Code brand colors using CSS variables (supports dark mode)
        'ecode-orange': {
          DEFAULT: 'var(--ecode-orange)',
          hover: 'var(--ecode-accent-hover)',
          light: 'var(--ecode-orange-light)',
          tint: 'var(--ecode-orange-tint)',
        },
        'ecode-yellow': 'var(--ecode-yellow)',
        
        // E-Code accent colors using CSS variables (supports dark mode)
        'ecode-accent': {
          DEFAULT: 'var(--ecode-accent)',
          hover: 'var(--ecode-accent-hover)',
        },
        'ecode-secondary-accent': 'var(--ecode-secondary-accent)',
        
        // Semantic Status Colors (Fortune 500 Theme Token System)
        // Using HSL wrapper to enable Tailwind opacity modifiers (/10, /20, etc.)
        status: {
          critical: 'hsl(var(--ecode-danger))',
          success: 'hsl(var(--ecode-green))',
          warning: 'hsl(var(--ecode-warning))',
          info: 'hsl(var(--ecode-info))',
        },
        
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        shimmer: {
          "0%": {
            transform: "translateX(-100%)",
          },
          "100%": {
            transform: "translateX(100%)",
          },
        },
        wave: {
          "0%": {
            transform: "translateX(-100%)",
          },
          "50%": {
            transform: "translateX(100%)",
          },
          "100%": {
            transform: "translateX(-100%)",
          },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s infinite",
        wave: "wave 1.5s ease-in-out infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in-up": "slideInUp 0.3s ease-out",
        "slide-in-down": "slideInDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
