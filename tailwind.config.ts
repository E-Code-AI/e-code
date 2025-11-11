import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
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
      colors: {
        // E-Code brand colors
        'ecode-orange': {
          DEFAULT: '#F26207',
          hover: '#D04E00',
          light: '#FF7A2B',
          tint: '#ffe4d3',
        },
        'ecode-yellow': '#F99D25',
        
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
