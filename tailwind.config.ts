import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  
  // Safelist for dynamic classes and utilities that might not be detected
  safelist: [
    // Responsive utilities that might be constructed dynamically
    'px-responsive',
    'py-responsive', 
    'p-responsive',
    'text-responsive-xs',
    'text-responsive-sm',
    'text-responsive-base',
    'text-responsive-lg',
    'text-responsive-xl',
    'text-responsive-2xl',
    'grid-responsive',
    'grid-responsive-2',
    'grid-responsive-3',
    'mobile-only',
    'desktop-only',
    'container-responsive',
    'max-w-responsive',
    'mobile-nav-spacing',
    // Touch target utility
    'touch-target',
    // Screen reader utility
    'sr-only-focusable',
    // Tablet-specific utilities
    'tablet:px-responsive',
    'tablet:py-responsive',
    'tablet:grid-cols-2',
    'tablet:grid-cols-3',
  ],
  
  theme: {
    // Override default screens to match our breakpoint system
    screens: {
      'sm': '640px',   // Mobile landscape / Small tablet
      'md': '768px',   // Tablet portrait
      'lg': '1024px',  // Desktop / Tablet landscape
      'xl': '1280px',  // Large desktop
      '2xl': '1536px', // Extra large desktop
      // Custom breakpoint aliases for clarity
      'mobile': {'max': '639px'},        // Mobile only
      'tablet': {'min': '640px', 'max': '1023px'},  // Tablet only
      'desktop': {'min': '1024px'},      // Desktop and above
    },
    
    extend: {
      borderRadius: {
        lg: "var(--ecode-radius-lg)",
        md: "var(--ecode-radius-md)",
        sm: "var(--ecode-radius-sm)",
      },
      colors: {
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
